<?php
declare(strict_types=1);

final class Instagram
{
    private const VERIFY_BONUS = 0.05;
    /** Valid Instagram Login scopes (Meta docs, Jan 2025+). Do not use legacy names like instagram_manage_comments. */
    private const SCOPES = 'instagram_business_basic';

    public static function scopes(): string
    {
        return self::SCOPES;
    }

    public static function configured(array $cfg): bool
    {
        return !empty($cfg['instagram_app_id']) && !empty($cfg['instagram_app_secret']);
    }

    public static function redirectUri(array $cfg): string
    {
        if (!empty($cfg['instagram_redirect_uri'])) {
            return rtrim((string)$cfg['instagram_redirect_uri'], '/');
        }
        $app = rtrim((string)($cfg['app_url'] ?? 'https://echelon.rsvp/app/'), '/');
        $base = preg_replace('#/app/?$#', '', $app) ?: 'https://echelon.rsvp';
        return $base . '/api/v1/instagram/callback';
    }

    /** @return 'past'|'future'|'both' */
    public static function normalizeImportMode(string $mode): string
    {
        return in_array($mode, ['past', 'future', 'both'], true) ? $mode : 'both';
    }

    public static function makeState(string $userId, array $cfg, string $importMode = 'both'): string
    {
        $payload = json_encode([
            'u' => $userId,
            'e' => time() + 900,
            'm' => self::normalizeImportMode($importMode),
        ], JSON_THROW_ON_ERROR);
        $sig = hash_hmac('sha256', $payload, (string)($cfg['install_key'] ?? 'echelon'));
        return rtrim(strtr(base64_encode($payload . '.' . $sig), '+/', '-_'), '=');
    }

    /** @return array{userId:string,importMode:string}|null */
    public static function parseState(string $state, array $cfg): ?array
    {
        $raw = base64_decode(strtr($state, '-_', '+/'), true);
        if (!$raw || !str_contains($raw, '.')) return null;
        [$payload, $sig] = explode('.', $raw, 2);
        $expect = hash_hmac('sha256', $payload, (string)($cfg['install_key'] ?? 'echelon'));
        if (!hash_equals($expect, $sig)) return null;
        $data = json_decode($payload, true);
        if (!is_array($data) || empty($data['u']) || empty($data['e']) || (int)$data['e'] < time()) return null;
        return [
            'userId' => (string)$data['u'],
            'importMode' => self::normalizeImportMode((string)($data['m'] ?? 'both')),
        ];
    }

    public static function authorizeUrl(string $userId, array $cfg, string $importMode = 'both'): string
    {
        $params = http_build_query([
            'client_id' => $cfg['instagram_app_id'],
            'redirect_uri' => self::redirectUri($cfg),
            'scope' => self::SCOPES,
            'response_type' => 'code',
            'state' => self::makeState($userId, $cfg, $importMode),
            'enable_fb_login' => 'false',
        ]);
        return 'https://www.instagram.com/oauth/authorize?' . $params;
    }

    /** @return array{access_token:string,user_id:string,expires_in:int} */
    public static function exchangeCode(string $code, array $cfg): array
    {
        $body = http_build_query([
            'client_id' => $cfg['instagram_app_id'],
            'client_secret' => $cfg['instagram_app_secret'],
            'grant_type' => 'authorization_code',
            'redirect_uri' => self::redirectUri($cfg),
            'code' => $code,
        ]);
        $res = self::httpPost('https://api.instagram.com/oauth/access_token', $body, 'application/x-www-form-urlencoded');
        $row = self::normalizeTokenResponse($res);
        if (empty($row['access_token'])) {
            $msg = $row['error_message'] ?? $row['error'] ?? 'Instagram token exchange failed';
            throw new RuntimeException((string)$msg);
        }
        $short = (string)$row['access_token'];
        $igUserId = (string)($row['user_id'] ?? '');

        $long = self::httpGet('https://graph.instagram.com/access_token', [
            'grant_type' => 'ig_exchange_token',
            'client_secret' => $cfg['instagram_app_secret'],
            'access_token' => $short,
        ]);
        $token = (string)($long['access_token'] ?? $short);
        $expiresIn = (int)($long['expires_in'] ?? 5184000);

        return ['access_token' => $token, 'user_id' => $igUserId, 'expires_in' => $expiresIn];
    }

    /** @return array{username:string,id:string} */
    public static function fetchProfile(string $accessToken): array
    {
        $data = self::httpGet('https://graph.instagram.com/me', [
            'fields' => 'id,username',
            'access_token' => $accessToken,
        ]);
        if (empty($data['username'])) {
            throw new RuntimeException('Could not load Instagram profile');
        }
        return ['username' => (string)$data['username'], 'id' => (string)($data['id'] ?? '')];
    }

    /** @return list<array> */
    public static function fetchRecentMedia(string $accessToken, int $limit = 12): array
    {
        $data = self::httpGet('https://graph.instagram.com/me/media', [
            'fields' => 'id,caption,media_type,media_url,thumbnail_url,timestamp',
            'limit' => (string)$limit,
            'access_token' => $accessToken,
        ]);
        return is_array($data['data'] ?? null) ? $data['data'] : [];
    }

    /** @return list<array> */
    public static function fetchStories(string $accessToken, string $igUserId = '', int $limit = 25): array
    {
        $path = $igUserId !== ''
            ? 'https://graph.instagram.com/' . rawurlencode($igUserId) . '/stories'
            : 'https://graph.instagram.com/me/stories';
        $data = self::httpGet($path, [
            'fields' => 'id,caption,media_type,media_url,thumbnail_url,timestamp',
            'limit' => (string)$limit,
            'access_token' => $accessToken,
        ]);
        if (is_array($data['data'] ?? null) && $data['data']) {
            return $data['data'];
        }
        if (!empty($data['error']) && $igUserId !== '') {
            return self::fetchStories($accessToken, '', $limit);
        }
        return [];
    }

    public static function verifyBonus(): float
    {
        return self::VERIFY_BONUS;
    }

    /** @return array<string, mixed>|null */
    public static function parseSignedRequest(string $signedRequest, array $cfg): ?array
    {
        $secret = (string)($cfg['instagram_app_secret'] ?? '');
        if ($secret === '' || !str_contains($signedRequest, '.')) {
            return null;
        }
        [$encodedSig, $payload] = explode('.', $signedRequest, 2);
        $sig = base64_decode(strtr($encodedSig, '-_', '+/'), true);
        if ($sig === false) {
            return null;
        }
        $expected = hash_hmac('sha256', $payload, $secret, true);
        if (!hash_equals($expected, $sig)) {
            return null;
        }
        $json = base64_decode(strtr($payload, '-_', '+/'), true);
        if ($json === false) {
            return null;
        }
        $data = json_decode($json, true);
        return is_array($data) ? $data : null;
    }

    /** @param array<string, mixed> $res */
    private static function normalizeTokenResponse(array $res): array
    {
        if (!empty($res['data']) && is_array($res['data'])) {
            $first = $res['data'][0] ?? null;
            if (is_array($first)) {
                return $first;
            }
        }
        return $res;
    }

    private static function httpGet(string $url, array $query): array
    {
        $full = $url . (str_contains($url, '?') ? '&' : '?') . http_build_query($query);
        $ctx = stream_context_create(['http' => ['timeout' => 20, 'ignore_errors' => true]]);
        $raw = @file_get_contents($full, false, $ctx);
        $data = json_decode($raw ?: '{}', true);
        return is_array($data) ? $data : [];
    }

    private static function httpPost(string $url, string $body, string $contentType): array
    {
        $ctx = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => "Content-Type: $contentType\r\n",
                'content' => $body,
                'timeout' => 20,
                'ignore_errors' => true,
            ],
        ]);
        $raw = @file_get_contents($url, false, $ctx);
        $data = json_decode($raw ?: '{}', true);
        return is_array($data) ? $data : [];
    }
}
