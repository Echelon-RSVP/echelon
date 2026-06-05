<?php
declare(strict_types=1);

final class GoogleAuth
{
    public static function verify(string $idToken, string $clientId): array
    {
        $url = 'https://oauth2.googleapis.com/tokeninfo?id_token=' . urlencode($idToken);
        $raw = file_get_contents($url);
        if (!$raw) {
            throw new InvalidArgumentException('Could not verify Google token');
        }
        $data = json_decode($raw, true);
        if (!is_array($data) || isset($data['error'])) {
            throw new InvalidArgumentException('Invalid Google token');
        }
        if (($data['aud'] ?? '') !== $clientId) {
            throw new InvalidArgumentException('Google token audience mismatch');
        }
        if (($data['email_verified'] ?? 'false') !== 'true' && ($data['email_verified'] ?? false) !== true) {
            throw new InvalidArgumentException('Google email not verified');
        }
        if (empty($data['sub'])) {
            throw new InvalidArgumentException('Google token missing subject');
        }
        return $data;
    }
}
