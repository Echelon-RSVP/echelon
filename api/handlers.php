<?php
declare(strict_types=1);

require_once __DIR__ . '/lib/Response.php';
require_once __DIR__ . '/lib/Auth.php';
require_once __DIR__ . '/lib/Helpers.php';
require_once __DIR__ . '/lib/Scoring.php';

const FOLLOWER_LOW_QUALITY_RATE = 0.0001;
const FOLLOWER_MID_QUALITY_RATE = 0.0005;
const FOLLOWER_HIGH_QUALITY_RATE = 0.001;

/** Close pending/accepted follow rows so users can request again after unfollow or block. */
function close_friend_requests_between(PDO $pdo, string $userA, string $userB, int $ts): void
{
    $pdo->prepare(
        'UPDATE friend_requests SET status = ?, responded_at = ?
         WHERE ((from_user_id = ? AND to_user_id = ?) OR (from_user_id = ? AND to_user_id = ?))
         AND status IN (?, ?)'
    )->execute(['declined', $ts, $userA, $userB, $userB, $userA, 'pending', 'accepted']);
}

/** @return array{score: float, delta: float, locked: bool} */
function echelon_adjust_score(PDO $pdo, string $userId, float $delta, string $kind, string $title, string $body, ?string $peerId = null): array
{
    $st = $pdo->prepare('SELECT score, locked FROM users WHERE id = ?');
    $st->execute([$userId]);
    $row = $st->fetch();
    if (!$row) return ['score' => 0.0, 'delta' => 0.0, 'locked' => false];

    $prev = (float)$row['score'];
    $next = Scoring::applyDelta($prev, $delta);
    $actual = round($next - $prev, 2);
    $locked = (bool)$row['locked'];
    if ($next < 2.6) $locked = true;
    elseif ($next >= 2.8) $locked = false;

    $ts = (int)(microtime(true) * 1000);
    $pdo->prepare('UPDATE users SET score = ?, locked = ? WHERE id = ?')->execute([$next, $locked ? 1 : 0, $userId]);
    $pdo->prepare('INSERT INTO score_history (user_id, score, recorded_at) VALUES (?, ?, ?)')->execute([$userId, $next, $ts]);

    $notifId = 'n' . bin2hex(random_bytes(8));
    $pdo->prepare('INSERT INTO notifications (id, user_id, kind, title, body, rater_id, stars, delta, tag, appeal, ts) VALUES (?, ?, ?, ?, ?, ?, NULL, ?, NULL, NULL, ?)')->execute([
        $notifId, $userId, $kind, $title, $body, $peerId, $actual, $ts,
    ]);

    return ['score' => $next, 'delta' => $actual, 'locked' => $locked];
}

/** @return array{score: float, delta: float, locked: bool} */
function echelon_adjust_score_percent(PDO $pdo, string $userId, float $rate, string $kind, string $title, string $body, ?string $peerId = null): array
{
    $st = $pdo->prepare('SELECT score, locked FROM users WHERE id = ?');
    $st->execute([$userId]);
    $row = $st->fetch();
    if (!$row) return ['score' => 0.0, 'delta' => 0.0, 'locked' => false];

    $prev = (float)$row['score'];
    $next = Scoring::applyPercentDelta($prev, $rate);
    $actual = round($next - $prev, 2);
    $locked = (bool)$row['locked'];
    if ($next < 2.6) $locked = true;
    elseif ($next >= 2.8) $locked = false;

    $ts = (int)(microtime(true) * 1000);
    $pdo->prepare('UPDATE users SET score = ?, locked = ? WHERE id = ?')->execute([$next, $locked ? 1 : 0, $userId]);
    $pdo->prepare('INSERT INTO score_history (user_id, score, recorded_at) VALUES (?, ?, ?)')->execute([$userId, $next, $ts]);

    $notifId = 'n' . bin2hex(random_bytes(8));
    $pdo->prepare('INSERT INTO notifications (id, user_id, kind, title, body, rater_id, stars, delta, tag, appeal, ts) VALUES (?, ?, ?, ?, ?, ?, NULL, ?, NULL, NULL, ?)')->execute([
        $notifId, $userId, $kind, $title, $body, $peerId, $actual, $ts,
    ]);

    return ['score' => $next, 'delta' => $actual, 'locked' => $locked];
}

function follower_quality_rate_from_score(float $score): float
{
    $rounded = (int)round($score);
    if ($rounded >= 5) return FOLLOWER_HIGH_QUALITY_RATE;
    if ($rounded >= 4) return FOLLOWER_MID_QUALITY_RATE;
    return FOLLOWER_LOW_QUALITY_RATE;
}

function follower_quality_rate(PDO $pdo, string $followerId): float
{
    $st = $pdo->prepare('SELECT score FROM users WHERE id = ?');
    $st->execute([$followerId]);
    $row = $st->fetch();
    return follower_quality_rate_from_score($row ? (float)$row['score'] : 3.0);
}

function follower_quality_percent_label(float $rate): string
{
    return rtrim(rtrim(number_format(abs($rate) * 100, 2), '0'), '.') . '%';
}

function echelon_notify(PDO $pdo, string $userId, string $kind, string $title, string $body, ?string $peerId = null, ?string $tag = null): void
{
    $ts = (int)(microtime(true) * 1000);
    $notifId = 'n' . bin2hex(random_bytes(8));
    $pdo->prepare('INSERT INTO notifications (id, user_id, kind, title, body, rater_id, stars, delta, tag, appeal, ts) VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, ?, NULL, ?)')->execute([
        $notifId, $userId, $kind, $title, $body, $peerId, $tag, $ts,
    ]);
}

function friend_requests_for_bootstrap(PDO $pdo, string $userId): array
{
    $loadUser = function (string $id) use ($pdo): ?array {
        $st = $pdo->prepare('SELECT * FROM users WHERE id = ?');
        $st->execute([$id]);
        $row = $st->fetch();
        return $row ? Helpers::userPublic($row) : null;
    };

    $incoming = [];
    $stIn = $pdo->prepare('SELECT * FROM friend_requests WHERE to_user_id = ? AND status = ? ORDER BY ts DESC');
    $stIn->execute([$userId, 'pending']);
    foreach ($stIn->fetchAll() as $row) {
        $u = $loadUser($row['from_user_id']);
        if ($u) $incoming[] = ['requestId' => $row['id'], 'user' => $u, 'ts' => (int)$row['ts']];
    }

    $outgoing = [];
    $stOut = $pdo->prepare('SELECT * FROM friend_requests WHERE from_user_id = ? AND status = ? ORDER BY ts DESC');
    $stOut->execute([$userId, 'pending']);
    foreach ($stOut->fetchAll() as $row) {
        $u = $loadUser($row['to_user_id']);
        if ($u) $outgoing[] = ['requestId' => $row['id'], 'user' => $u, 'ts' => (int)$row['ts']];
    }

    return ['incoming' => $incoming, 'outgoing' => $outgoing];
}

function accept_friend_request(PDO $pdo, array $cfg, array $me, string $requestId): void
{
    $st = $pdo->prepare('SELECT * FROM friend_requests WHERE id = ? AND status = ?');
    $st->execute([$requestId, 'pending']);
    $req = $st->fetch();
    if (!$req) Response::error('Request not found', 404);
    if ($req['to_user_id'] !== $me['id']) Response::error('Forbidden', 403);

    $fromId = $req['from_user_id'];
    $toId = $req['to_user_id'];
    $ts = (int)(microtime(true) * 1000);

    $pdo->prepare('UPDATE friend_requests SET status = ?, responded_at = ? WHERE id = ?')->execute(['accepted', $ts, $requestId]);
    $pdo->prepare('INSERT IGNORE INTO friendships (user_id, friend_id) VALUES (?, ?)')->execute([$fromId, $toId]);

    $fromUser = $pdo->prepare('SELECT name FROM users WHERE id = ?');
    $fromUser->execute([$fromId]);
    $fromName = ($fromUser->fetch()['name'] ?? 'Someone');

    $rate = follower_quality_rate($pdo, $fromId);
    $label = follower_quality_percent_label($rate);
    $score = echelon_adjust_score_percent($pdo, $toId, $rate, 'follow_started', 'New follower', $fromName . ' followed you. Your score rose by ' . $label . '.', $fromId);
    echelon_notify($pdo, $fromId, 'friend_accept', 'Follow accepted', $me['name'] . ' accepted your follow request.', $toId);
    echelon_notify($pdo, $toId, 'follow_started', 'New follower', $fromName . ' followed you.', $fromId);

    Response::json(['ok' => true, 'friendId' => $fromId, 'yourScore' => $score['score']]);
}

function handle_auth(PDO $pdo, array $cfg, string $method, array $parts): void
{
    require_once __DIR__ . '/lib/UserFactory.php';

    if ($method === 'GET' && ($parts[0] ?? '') === 'config') {
        $methods = ['password', 'magic'];
        $out = ['methods' => $methods];
        if (trim($cfg['google_client_id'] ?? '')) {
            $methods[] = 'google';
            $out['googleClientId'] = trim($cfg['google_client_id']);
        }
        if (trim($cfg['google_ios_client_id'] ?? '')) {
            $out['googleIosClientId'] = trim($cfg['google_ios_client_id']);
        }
        if (trim($cfg['apple_client_id'] ?? '')) {
            $methods[] = 'apple';
            $out['appleClientId'] = trim($cfg['apple_client_id']);
            $out['appleRedirectUri'] = $cfg['apple_redirect_uri'] ?? 'https://echelon.rsvp/app/';
        }
        $out['methods'] = $methods;
        Response::json($out);
    }

    if ($method === 'GET' && ($parts[0] ?? '') === 'apple' && ($parts[1] ?? '') === 'config') {
        $cid = trim($cfg['apple_client_id'] ?? '');
        if (!$cid) Response::error('Apple Sign In not configured on server', 503);
        Response::json([
            'clientId' => $cid,
            'redirectUri' => $cfg['apple_redirect_uri'] ?? 'https://echelon.rsvp/app/',
        ]);
    }

    if ($method === 'POST' && ($parts[0] ?? '') === 'google') {
        require_once __DIR__ . '/lib/GoogleAuth.php';
        $body = Helpers::jsonBody();
        $idToken = trim($body['idToken'] ?? '');
        $code = trim($body['code'] ?? '');
        $codeVerifier = trim($body['codeVerifier'] ?? '');
        $redirectUri = trim($body['redirectUri'] ?? '');
        $clientId = trim($body['clientId'] ?? $cfg['google_client_id'] ?? '');
        $allowedClientIds = array_values(array_filter([
            trim($cfg['google_client_id'] ?? ''),
            trim($cfg['google_ios_client_id'] ?? ''),
        ]));
        if (!$allowedClientIds) Response::error('Google Sign In not configured', 503);
        if ($clientId && !in_array($clientId, $allowedClientIds, true)) {
            Response::error('Google client not allowed', 403);
        }
        if (!$clientId) $clientId = $allowedClientIds[0];
        if ($code) {
            if (!$codeVerifier || !$redirectUri) Response::error('Google OAuth verifier required');
            $tokenBody = http_build_query([
                'code' => $code,
                'client_id' => $clientId,
                'code_verifier' => $codeVerifier,
                'redirect_uri' => $redirectUri,
                'grant_type' => 'authorization_code',
            ]);
            $ctx = stream_context_create([
                'http' => [
                    'method' => 'POST',
                    'header' => "Content-Type: application/x-www-form-urlencoded\r\n",
                    'content' => $tokenBody,
                    'timeout' => 15,
                ],
            ]);
            $raw = file_get_contents('https://oauth2.googleapis.com/token', false, $ctx);
            $tok = $raw ? json_decode($raw, true) : null;
            if (!is_array($tok) || empty($tok['id_token'])) {
                Response::error('Google OAuth exchange failed', 401);
            }
            $idToken = (string)$tok['id_token'];
        }
        if (!$idToken) Response::error('Google credential required');
        try {
            $claims = GoogleAuth::verify($idToken, $clientId);
        } catch (Throwable $e) {
            Response::error('Google sign-in verification failed', 401);
        }
        $sub = $claims['sub'];
        $email = strtolower(trim($claims['email'] ?? ''));
        $name = trim($claims['name'] ?? $claims['given_name'] ?? '') ?: 'Echelon Member';
        $st = $pdo->prepare('SELECT * FROM users WHERE google_sub = ? LIMIT 1');
        $st->execute([$sub]);
        $existing = $st->fetch();
        if (!$existing && $email) {
            $existing = UserFactory::findByEmail($pdo, $email);
            if ($existing) {
                $pdo->prepare('UPDATE users SET google_sub = ?, auth_method = "google" WHERE id = ?')->execute([$sub, $existing['id']]);
                $st = $pdo->prepare('SELECT * FROM users WHERE id = ?');
                $st->execute([$existing['id']]);
                $existing = $st->fetch();
            }
        }
        if ($existing) {
            Response::json(UserFactory::sessionResponse($pdo, $existing, $cfg));
        }
        $user = UserFactory::create($pdo, [
            'google_sub' => $sub,
            'email' => $email ?: null,
            'name' => $name,
            'auth_method' => 'google',
        ]);
        Response::json(UserFactory::sessionResponse($pdo, $user, $cfg));
    }

    if ($method === 'POST' && ($parts[0] ?? '') === 'apple') {
        require_once __DIR__ . '/lib/AppleAuth.php';
        $body = Helpers::jsonBody();
        $idToken = trim($body['idToken'] ?? '');
        $appleIds = array_values(array_unique(array_filter([
            trim($cfg['apple_client_id'] ?? ''),
            trim($cfg['apple_web_client_id'] ?? ''),
        ])));
        if ($appleIds === []) Response::error('Apple Sign In not configured on server', 503);
        if (!$idToken) Response::error('Apple identity token required');
        try {
            $claims = AppleAuth::verify($idToken, $appleIds);
        } catch (Throwable $e) {
            Response::error('Apple sign-in verification failed', 401);
        }
        $sub = $claims['sub'];
        $name = trim($body['name'] ?? '') ?: 'Echelon Member';
        $st = $pdo->prepare('SELECT * FROM users WHERE apple_sub = ? LIMIT 1');
        $st->execute([$sub]);
        $existing = $st->fetch();
        if ($existing) {
            Response::json(UserFactory::sessionResponse($pdo, $existing, $cfg));
        }
        $user = UserFactory::create($pdo, [
            'apple_sub' => $sub,
            'name' => $name,
            'auth_method' => 'apple',
        ]);
        Response::json(UserFactory::sessionResponse($pdo, $user, $cfg));
    }

    if ($method === 'POST' && ($parts[0] ?? '') === 'register') {
        $body = Helpers::jsonBody();
        $email = strtolower(trim($body['email'] ?? ''));
        $password = $body['password'] ?? '';
        $name = trim($body['name'] ?? '') ?: 'Echelon Member';
        $handle = trim($body['handle'] ?? '');
        $birthYear = isset($body['birthYear']) ? (int)$body['birthYear'] : null;
        if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) Response::error('Valid email required');
        if ($password === '') Response::error('Password required');
        if ($birthYear !== null) {
            $year = (int)date('Y');
            if ($birthYear < 1900 || $birthYear > $year - 13) {
                Response::error('Enter a valid year of birth (13+)', 400);
            }
        }
        if (UserFactory::findByEmail($pdo, $email)) Response::error('Email already registered. Sign in instead');
        $user = UserFactory::create($pdo, [
            'email' => $email,
            'password_hash' => password_hash($password, PASSWORD_DEFAULT),
            'name' => $name,
            'handle' => $handle ?: null,
            'auth_method' => 'password',
            'birth_year' => $birthYear,
        ]);
        Response::json(UserFactory::sessionResponse($pdo, $user, $cfg));
    }

    if ($method === 'POST' && ($parts[0] ?? '') === 'login') {
        $body = Helpers::jsonBody();
        $identifier = trim($body['identifier'] ?? $body['email'] ?? '');
        $password = $body['password'] ?? '';
        if (!$identifier || !$password) Response::error('Email/username and password required');
        $user = UserFactory::findByIdentifier($pdo, $identifier);
        if (!$user && UserFactory::isTestCredentials($identifier, $password)) {
            $user = UserFactory::ensureTestUser($pdo);
        }
        if (!$user) Response::error('Account not found', 404);
        if (empty($user['password_hash'])) {
            $via = $user['auth_method'] ?? 'social';
            Response::error("This account uses {$via} sign-in. Use that method instead", 400);
        }
        if (!password_verify($password, $user['password_hash'])) Response::error('Incorrect password', 401);
        Response::json(UserFactory::sessionResponse($pdo, $user, $cfg));
    }

    if ($method === 'POST' && ($parts[0] ?? '') === 'magic' && ($parts[1] ?? '') === 'send') {
        require_once __DIR__ . '/lib/Mailer.php';
        $body = Helpers::jsonBody();
        $email = strtolower(trim($body['email'] ?? ''));
        if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) Response::error('Valid email required');
        $token = bin2hex(random_bytes(32));
        $pdo->prepare('INSERT INTO magic_links (token, email, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE))')->execute([$token, $email]);
        if (!Mailer::magicLink($email, $token, $cfg)) {
            Response::error('Could not send email. Try again or use password sign-in', 503);
        }
        Response::json(['ok' => true, 'message' => 'Check your inbox for a sign-in link']);
    }

    if ($method === 'POST' && ($parts[0] ?? '') === 'magic' && ($parts[1] ?? '') === 'verify') {
        $body = Helpers::jsonBody();
        $token = trim($body['token'] ?? '');
        if (!$token) Response::error('Magic link token required');
        $st = $pdo->prepare('SELECT * FROM magic_links WHERE token = ? AND used = 0 AND expires_at > NOW() LIMIT 1');
        $st->execute([$token]);
        $link = $st->fetch();
        if (!$link) Response::error('Link expired or invalid', 401);
        $pdo->prepare('UPDATE magic_links SET used = 1 WHERE token = ?')->execute([$token]);
        $email = strtolower($link['email']);
        $user = UserFactory::findByEmail($pdo, $email);
        if (!$user) {
            $user = UserFactory::create($pdo, [
                'email' => $email,
                'name' => explode('@', $email)[0],
                'auth_method' => 'email',
            ]);
        }
        Response::json(UserFactory::sessionResponse($pdo, $user, $cfg));
    }

    if ($method === 'POST' && ($parts[0] ?? '') === 'logout') {
        $token = Auth::tokenFromRequest();
        if ($token) $pdo->prepare('DELETE FROM sessions WHERE token = ?')->execute([$token]);
        Response::json(['ok' => true]);
    }
    Response::error('Not found', 404);
}

function handle_bootstrap(PDO $pdo, array $cfg, string $method, array $parts, array $me): void
{
    if ($method !== 'GET') Response::error('Method not allowed', 405);

    Scoring::applyInactivityDecay($pdo, $me['id']);
    $freshMe = $pdo->prepare('SELECT * FROM users WHERE id = ?');
    $freshMe->execute([$me['id']]);
    $me = $freshMe->fetch() ?: $me;

    $feed = Helpers::feedRowsForUser($pdo, $me['id']);
    $gatherings = Helpers::eventsForUser($pdo, $me);
    $contacts = $pdo->prepare('SELECT * FROM users WHERE id != ? ORDER BY score DESC');
    $contacts->execute([$me['id']]);
    $contactRows = $contacts->fetchAll();

    $stFriends = $pdo->prepare('SELECT friend_id FROM friendships WHERE user_id = ?');
    $stFriends->execute([$me['id']]);
    $friendIds = array_column($stFriends->fetchAll(), 'friend_id');

    $stNotif = $pdo->prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY ts DESC LIMIT 40');
    $stNotif->execute([$me['id']]);
    $notifs = $stNotif->fetchAll();

    $stSettings = $pdo->prepare('SELECT * FROM user_settings WHERE user_id = ?');
    $stSettings->execute([$me['id']]);
    $settings = $stSettings->fetch() ?: [];

    $stHist = $pdo->prepare('SELECT score, recorded_at FROM score_history WHERE user_id = ? ORDER BY recorded_at ASC LIMIT 48');
    $stHist->execute([$me['id']]);
    $history = array_map(fn($h) => ['t' => (int)$h['recorded_at'], 's' => (float)$h['score']], $stHist->fetchAll());

    $stRsvp = $pdo->prepare('SELECT event_id FROM event_rsvps WHERE user_id = ?');
    $stRsvp->execute([$me['id']]);
    $rsvps = array_column($stRsvp->fetchAll(), 'event_id');

    $friendReqs = friend_requests_for_bootstrap($pdo, $me['id']);

    $chats = Helpers::chatInboxForUser($pdo, $me['id']);

    $storyAuthors = array_values(array_unique([$me['id'], ...$friendIds]));
    $stories = Helpers::storiesForUser($pdo, $me['id'], $storyAuthors);

    $spark = spark_bootstrap($pdo, $me);
    $blocked = Helpers::blockedUserIds($pdo, $me['id']);

    Response::json([
        'user' => Helpers::userPublic($me),
        'feed' => Helpers::postsWithRatings($pdo, $feed),
        'stories' => $stories,
        'gatherings' => $gatherings,
        'contacts' => array_map(fn($r) => Helpers::userPublicForViewer($pdo, $r, $me['id']), $contactRows),
        'friends' => $friendIds,
        'friendRequests' => $friendReqs,
        'chats' => $chats,
        'rsvps' => $rsvps,
        'history' => $history,
        'notifications' => Helpers::notifsPublic($pdo, $notifs),
        'settings' => Helpers::settingsPublic($settings),
        'spark' => $spark,
        'blocked' => $blocked,
    ]);
}

function handle_me(PDO $pdo, array $cfg, string $method, array $parts, array $me): void
{
    if (($parts[0] ?? '') === 'face-retry' && $method === 'POST') {
        if (empty($me['face_scan_fallback']) || !empty($me['face_scan_retry_used'])) {
            Response::error('Profile photo retry not available', 403);
        }
        $body = Helpers::jsonBody();
        $image = $body['image'] ?? '';
        if (!$image || !is_string($image)) Response::error('Profile photo required');
        $binary = base64_decode(preg_replace('#^data:image/\w+;base64,#i', '', $image), true);
        if (!$binary || strlen($binary) < 1000) Response::error('Invalid profile photo');
        $dir = rtrim($cfg['upload_dir'], '/\\');
        if (!is_dir($dir)) mkdir($dir, 0755, true);
        $fname = 'face_' . bin2hex(random_bytes(10)) . '.jpg';
        file_put_contents($dir . DIRECTORY_SEPARATOR . $fname, $binary);
        $avatarUrl = Helpers::absUrl(rtrim($cfg['upload_url'], '/') . '/' . $fname);
        $pdo->prepare('UPDATE users SET avatar_url = ?, face_scan_fallback = 0, face_scan_retry_used = 1 WHERE id = ?')->execute([
            $avatarUrl, $me['id'],
        ]);
        $fresh = $pdo->prepare('SELECT * FROM users WHERE id = ?');
        $fresh->execute([$me['id']]);
        Response::json([
            'user' => Helpers::userPublic($fresh->fetch()),
            'score' => (float)$me['score'],
            'note' => 'Profile photo updated. Your Echelon Score reflects posts and positive community activity.',
        ]);
    }

    if ($method === 'GET') {
        Scoring::applyInactivityDecay($pdo, $me['id']);
        $fresh = $pdo->prepare('SELECT * FROM users WHERE id = ?');
        $fresh->execute([$me['id']]);
        Response::json(Helpers::userPublic($fresh->fetch() ?: $me));
    }
    if ($method === 'PATCH') {
        $body = Helpers::jsonBody();
        $fields = [];
        $params = [];
        $map = [
            'name' => 'name', 'handle' => 'handle', 'emoji' => 'emoji', 'color' => 'color',
            'lensOn' => 'lens_on', 'lensX' => 'lens_x', 'lensY' => 'lens_y',
            'onboarded' => 'onboarded', 'avatarUrl' => 'avatar_url',
            'birthYear' => 'birth_year', 'heightM' => 'height_m',
            'chatStatus' => 'chat_status',
        ];
        foreach ($map as $k => $col) {
            if (array_key_exists($k, $body)) {
                $val = $body[$k];
                if ($k === 'birthYear') {
                    $val = $val !== null && $val !== '' ? (int)$val : null;
                    if ($val !== null) {
                        $year = (int)date('Y');
                        if ($val < 1900 || $val > $year - 13) Response::error('Invalid year of birth', 400);
                    }
                }
                if ($k === 'heightM') {
                    $val = $val !== null && $val !== '' ? round((float)$val, 2) : null;
                    if ($val !== null && ($val < 1.0 || $val > 2.5)) Response::error('Height must be between 1.0 and 2.5 m', 400);
                }
                if ($k === 'handle') {
                    $slug = strtolower(preg_replace('/[^a-z0-9_]/', '', ltrim((string)$val, '@')));
                    if (strlen($slug) < 2) Response::error('Username must be at least 2 characters', 400);
                    if (strlen($slug) > 30) Response::error('Username is too long', 400);
                    $val = '@' . $slug;
                    $stHandle = $pdo->prepare('SELECT id FROM users WHERE handle = ? AND id != ? LIMIT 1');
                    $stHandle->execute([$val, $me['id']]);
                    if ($stHandle->fetch()) Response::error('Username already taken', 409);
                }
                $fields[] = "$col = ?";
                $params[] = $val;
            }
        }
        if ($fields) {
            $params[] = $me['id'];
            $pdo->prepare('UPDATE users SET ' . implode(', ', $fields) . ' WHERE id = ?')->execute($params);
        }
        $fresh = $pdo->prepare('SELECT * FROM users WHERE id = ?');
        $fresh->execute([$me['id']]);
        Response::json(Helpers::userPublic($fresh->fetch()));
    }
    if ($method === 'DELETE') {
        Helpers::deleteUserAccount($pdo, $me['id']);
        Response::json(['ok' => true]);
    }
    Response::error('Method not allowed', 405);
}

function handle_onboard(PDO $pdo, array $cfg, string $method, array $parts, array $me): void
{
    if ($method !== 'POST') Response::error('Method not allowed', 405);

    $body = Helpers::jsonBody();
    $image = $body['image'] ?? '';
    if (!$image || !is_string($image)) Response::error('Profile photo required');

    $binary = base64_decode(preg_replace('#^data:image/\w+;base64,#i', '', $image), true);
    if (!$binary || strlen($binary) < 1000) Response::error('Invalid profile photo');

    $score = 3.0;
    $analysis = [
        'score' => $score,
        'note' => 'Welcome to Echelon! Your score grows from posts, stories, and positive community participation.',
    ];
    $fallback = false;
    $dir = rtrim($cfg['upload_dir'], '/\\');
    if (!is_dir($dir)) mkdir($dir, 0755, true);
    $fname = 'face_' . bin2hex(random_bytes(10)) . '.jpg';
    file_put_contents($dir . DIRECTORY_SEPARATOR . $fname, $binary);
    $avatarUrl = Helpers::absUrl(rtrim($cfg['upload_url'], '/') . '/' . $fname);

    $pdo->prepare('UPDATE users SET onboarded = 1, lens_on = 0, score = ?, avatar_url = ?, face_scan_fallback = ? WHERE id = ?')->execute([
        $score, $avatarUrl, $fallback ? 1 : 0, $me['id'],
    ]);
    $pdo->prepare('UPDATE user_settings SET lens = 0 WHERE user_id = ?')->execute([$me['id']]);
    $ts = (int)(microtime(true) * 1000);
    $pdo->prepare('INSERT INTO score_history (user_id, score, recorded_at) VALUES (?, ?, ?)')->execute([$me['id'], $score, $ts]);

    $notifId = 'n' . bin2hex(random_bytes(6));
    $pdo->prepare('INSERT INTO notifications (id, user_id, kind, title, body, ts) VALUES (?, ?, ?, ?, ?, ?)')->execute([
        $notifId, $me['id'], 'welcome', 'Welcome to Echelon ✨', $analysis['note'], $ts,
    ]);

    $fresh = $pdo->prepare('SELECT * FROM users WHERE id = ?');
    $fresh->execute([$me['id']]);
    Response::json([
        'user' => Helpers::userPublic($fresh->fetch()),
        'score' => $score,
        'note' => $analysis['note'],
        'faceFallback' => $fallback,
    ]);
}

function handle_ratings(PDO $pdo, array $cfg, string $method, array $parts, array $me): void
{
    if ($method === 'GET' && ($parts[0] ?? '') === 'can') {
        $targetId = $_GET['targetId'] ?? '';
        $context = $_GET['context'] ?? 'proximity';
        $postId = $_GET['postId'] ?? '';
        if (!$targetId) Response::error('targetId required');
        if ($postId !== '') {
            $chk = $pdo->prepare('SELECT 1 FROM ratings WHERE rater_id = ? AND post_id = ? LIMIT 1');
            $chk->execute([$me['id'], $postId]);
            if ($chk->fetch()) {
                Response::json(['canRate' => false, 'reason' => 'already_rated']);
            }
            Response::json(['canRate' => true]);
        }
        $since = (int)(microtime(true) * 1000) - 86400000;
        $chk = $pdo->prepare('SELECT ts FROM ratings WHERE rater_id = ? AND ratee_id = ? AND post_id IS NULL AND ts > ? ORDER BY ts DESC LIMIT 1');
        $chk->execute([$me['id'], $targetId, $since]);
        $row = $chk->fetch();
        if ($row) {
            $nextAt = (int)$row['ts'] + 86400000;
            Response::json(['canRate' => false, 'nextAt' => $nextAt, 'reason' => 'cooldown']);
        }
        Response::json(['canRate' => true]);
    }

    if ($method === 'GET' && ($parts[0] ?? '') === 'received') {
        $since = (int)($_GET['since'] ?? 0);
        $st = $pdo->prepare('SELECT r.*, u.name AS rater_name, u.score AS rater_user_score FROM ratings r JOIN users u ON u.id = r.rater_id WHERE r.ratee_id = ? AND r.ts > ? ORDER BY r.ts DESC LIMIT 20');
        $st->execute([$me['id'], $since]);
        $rows = $st->fetchAll();
        Response::json(array_map(fn($r) => [
            'id' => $r['id'],
            'rater' => $r['rater_id'],
            'raterScore' => (float)$r['rater_score'],
            'stars' => (int)$r['stars'],
            'tag' => $r['tag'],
            'delta' => (float)$r['delta'],
            'ts' => (int)$r['ts'],
        ], $rows));
    }
    if ($method !== 'POST') Response::error('Method not allowed', 405);
    $body = Helpers::jsonBody();
    $targetId = $body['targetId'] ?? '';
    $stars = (int)($body['stars'] ?? 0);
    $tag = $body['tag'] ?? null;
    $context = $body['context'] ?? 'feed';
    $postId = isset($body['postId']) && $body['postId'] !== '' ? (string)$body['postId'] : null;
    $allowed = ['feed', 'chat', 'call', 'proximity', 'story', 'explore'];
    if (!in_array($context, $allowed, true)) $context = 'feed';
    if (!$targetId || $stars < 1 || $stars > 5) Response::error('Invalid rating');
    if ($targetId === $me['id']) Response::error('Cannot rate yourself');

    $isUiTestPost = $postId === 'ptest_ui';
    if (!$postId && !$isUiTestPost) {
        Response::error('Echelon supports media ratings only. Rate a post, story, or reel instead.', 403);
    }

    if ($postId && !$isUiTestPost) {
        $chk = $pdo->prepare('SELECT 1 FROM ratings WHERE rater_id = ? AND post_id = ? LIMIT 1');
        $chk->execute([$me['id'], $postId]);
        if ($chk->fetch()) {
            Response::error('You already rated this post', 429);
        }
    }

    $since = (int)(microtime(true) * 1000) - 86400000;
    if (!$isUiTestPost && !$postId) {
        $chk = $pdo->prepare('SELECT 1 FROM ratings WHERE rater_id = ? AND ratee_id = ? AND post_id IS NULL AND ts > ? LIMIT 1');
        $chk->execute([$me['id'], $targetId, $since]);
        if ($chk->fetch()) {
            Response::error('You can only evaluate this person once every 24 hours', 429);
        }
    }

    $st = $pdo->prepare('SELECT * FROM users WHERE id = ?');
    $st->execute([$targetId]);
    $target = $st->fetch();
    if (!$target) Response::error('User not found', 404);

    $raterScore = (float)$me['score'];
    $prev = (float)$target['score'];
    $ts = (int)(microtime(true) * 1000);
    $id = 'rt' . bin2hex(random_bytes(8));

    $pdo->prepare('INSERT INTO ratings (id, rater_id, ratee_id, stars, tag, context, post_id, rater_score, delta, ts) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')->execute([
        $id, $me['id'], $targetId, $stars, $tag, $context, $postId, $raterScore, 0, $ts,
    ]);
    Scoring::markRatingActivity($pdo, $me['id'], $ts);
    $scoreUpdate = Scoring::syncUserScore($pdo, $targetId, $prev, $ts);
    $newScore = $scoreUpdate['score'];
    $delta = $scoreUpdate['delta'];
    $pdo->prepare('UPDATE ratings SET delta = ? WHERE id = ?')->execute([$delta, $id]);
    Scoring::applyInactivityDecay($pdo, $targetId);
    $freshTarget = $pdo->prepare('SELECT score FROM users WHERE id = ?');
    $freshTarget->execute([$targetId]);
    $newScore = (float)($freshTarget->fetch()['score'] ?? $newScore);

    [$title, $notifBody] = Helpers::feedbackCopy($delta, $stars);
    $notifId = 'n' . bin2hex(random_bytes(8));
    $pdo->prepare('INSERT INTO notifications (id, user_id, kind, title, body, rater_id, stars, delta, tag, ts) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')->execute([
        $notifId, $targetId, $stars <= 2 ? 'penalty' : 'rating', $title, $notifBody, $me['id'], $stars, $delta, $tag, $ts,
    ]);

    Response::json([
        'ok' => true,
        'id' => $id,
        'delta' => $delta,
        'newScore' => $newScore,
        'postId' => $postId,
    ]);
}

function handle_users(PDO $pdo, array $cfg, string $method, array $parts, array $me): void
{
    $userId = $parts[0] ?? '';

    if ($userId === 'search' && $method === 'GET') {
        $q = trim($_GET['q'] ?? '');
        if (strlen($q) < 2) {
            Response::json(['users' => []]);
        }
        $like = '%' . str_replace(['%', '_'], ['\\%', '\\_'], $q) . '%';
        $blocked = Helpers::blockedUserIds($pdo, $me['id']);
        $blockedBy = Helpers::blockedByUserIds($pdo, $me['id']);
        $exclude = array_unique([...$blocked, ...$blockedBy]);
        $st = $pdo->prepare(
            'SELECT * FROM users WHERE id != ? AND onboarded = 1 AND (name LIKE ? OR handle LIKE ?)
             ORDER BY score DESC LIMIT 40'
        );
        $st->execute([$me['id'], $like, $like]);
        $users = [];
        foreach ($st->fetchAll() as $row) {
            if (in_array($row['id'], $exclude, true)) continue;
            $users[] = Helpers::userPublicForViewer($pdo, $row, $me['id']);
        }
        Response::json(['users' => $users]);
    }

    if ($userId && ($parts[1] ?? '') === 'block') {
        if ($userId === $me['id']) Response::error('Cannot block yourself', 400);
        $st = $pdo->prepare('SELECT id FROM users WHERE id = ?');
        $st->execute([$userId]);
        if (!$st->fetch()) Response::error('User not found', 404);

        if ($method === 'POST') {
            $ts = (int)(microtime(true) * 1000);
            $pdo->prepare(
                'INSERT IGNORE INTO user_blocks (blocker_id, blocked_id, ts) VALUES (?, ?, ?)'
            )->execute([$me['id'], $userId, $ts]);
            $pdo->prepare('DELETE FROM friendships WHERE user_id = ? AND friend_id = ?')->execute([$me['id'], $userId]);
            $pdo->prepare('DELETE FROM friendships WHERE user_id = ? AND friend_id = ?')->execute([$userId, $me['id']]);
            close_friend_requests_between($pdo, $me['id'], $userId, $ts);
            Response::json(['ok' => true]);
        }
        if ($method === 'DELETE') {
            $pdo->prepare('DELETE FROM user_blocks WHERE blocker_id = ? AND blocked_id = ?')->execute([$me['id'], $userId]);
            Response::json(['ok' => true]);
        }
        Response::error('Method not allowed', 405);
    }

    if ($userId && $method === 'GET' && !($parts[1] ?? '')) {
        $st = $pdo->prepare('SELECT * FROM users WHERE id = ?');
        $st->execute([$userId]);
        $row = $st->fetch();
        if (!$row) Response::error('User not found', 404);
        Response::json(Helpers::userPublicForViewer($pdo, $row, $me['id']));
    }

    Response::error('Not found', 404);
}

function handle_friends(PDO $pdo, array $cfg, string $method, array $parts, array $me): void
{
    $sub = $parts[0] ?? '';

    if ($sub === 'requests') {
        $action = $parts[1] ?? '';
        $requestId = $parts[1] ?? '';
        $verb = $parts[2] ?? '';

        if ($method === 'GET' && !$action) {
            Response::json(friend_requests_for_bootstrap($pdo, $me['id']));
        }

        if ($method === 'POST' && !$action) {
            $body = Helpers::jsonBody();
            $friendId = $body['friendId'] ?? '';
            if (!$friendId || $friendId === $me['id']) Response::error('friendId required');

            if (Helpers::isBlocked($pdo, $me['id'], $friendId) || Helpers::isBlocked($pdo, $friendId, $me['id'])) {
                Response::error('Cannot send request to this user', 403);
            }

            $st = $pdo->prepare('SELECT 1 FROM friendships WHERE user_id = ? AND friend_id = ?');
            $st->execute([$me['id'], $friendId]);
            if ($st->fetch()) Response::error('Already friends');

            $rev = $pdo->prepare('SELECT id FROM friend_requests WHERE from_user_id = ? AND to_user_id = ? AND status = ?');
            $rev->execute([$friendId, $me['id'], 'pending']);
            $reverse = $rev->fetch();
            if ($reverse) {
                accept_friend_request($pdo, $cfg, $me, $reverse['id']);
                return;
            }

            if (!Helpers::userIsPrivate($pdo, $friendId)) {
                $ts = (int)(microtime(true) * 1000);
                $id = 'fr_' . bin2hex(random_bytes(8));
                $pdo->prepare('INSERT INTO friend_requests (id, from_user_id, to_user_id, status, ts, responded_at) VALUES (?, ?, ?, ?, ?, ?)')
                    ->execute([$id, $me['id'], $friendId, 'accepted', $ts, $ts]);
                $pdo->prepare('INSERT IGNORE INTO friendships (user_id, friend_id) VALUES (?, ?)')
                    ->execute([$me['id'], $friendId]);
                $rate = follower_quality_rate_from_score((float)$me['score']);
                $label = follower_quality_percent_label($rate);
                $followed = echelon_adjust_score_percent($pdo, $friendId, $rate, 'follow_started', 'New follower', $me['name'] . ' followed you. Your score rose by ' . $label . '.', $me['id']);
                echelon_notify($pdo, $friendId, 'follow_started', 'New follower', $me['name'] . ' followed you.', $me['id']);
                Response::json(['ok' => true, 'friendId' => $friendId, 'requestId' => $id, 'theirScore' => $followed['score']]);
                return;
            }

            $dup = $pdo->prepare('SELECT id, status FROM friend_requests WHERE from_user_id = ? AND to_user_id = ?');
            $dup->execute([$me['id'], $friendId]);
            $existing = $dup->fetch();
            $ts = (int)(microtime(true) * 1000);
            if ($existing) {
                if ($existing['status'] === 'pending') {
                    Response::json(['ok' => true, 'requestId' => $existing['id'], 'pending' => true]);
                }
                if (in_array($existing['status'], ['declined', 'accepted'], true)) {
                    $pdo->prepare('UPDATE friend_requests SET status = ?, ts = ?, responded_at = NULL WHERE id = ?')
                        ->execute(['pending', $ts, $existing['id']]);
                    echelon_notify($pdo, $friendId, 'friend_request', 'Follow request', $me['name'] . ' requested to follow you.', $me['id'], $existing['id']);
                    Response::json(['ok' => true, 'requestId' => $existing['id'], 'pending' => true], 201);
                }
                Response::error('Request already sent');
            }

            $id = 'fr_' . bin2hex(random_bytes(8));
            $pdo->prepare('INSERT INTO friend_requests (id, from_user_id, to_user_id, status, ts) VALUES (?, ?, ?, ?, ?)')->execute([
                $id, $me['id'], $friendId, 'pending', $ts,
            ]);

            echelon_notify($pdo, $friendId, 'friend_request', 'Follow request', $me['name'] . ' requested to follow you.', $me['id'], $id);

            Response::json(['ok' => true, 'requestId' => $id, 'pending' => true], 201);
        }

        if ($method === 'POST' && $requestId && $verb === 'accept') {
            accept_friend_request($pdo, $cfg, $me, $requestId);
            return;
        }

        if ($method === 'POST' && $requestId && $verb === 'decline') {
            $st = $pdo->prepare('SELECT * FROM friend_requests WHERE id = ? AND status = ?');
            $st->execute([$requestId, 'pending']);
            $req = $st->fetch();
            if (!$req) Response::error('Request not found', 404);
            if ($req['to_user_id'] !== $me['id']) Response::error('Forbidden', 403);
            $ts = (int)(microtime(true) * 1000);
            $pdo->prepare('UPDATE friend_requests SET status = ?, responded_at = ? WHERE id = ?')->execute(['declined', $ts, $requestId]);
            Response::json(['ok' => true]);
        }

        Response::error('Method not allowed', 405);
    }

    if ($method === 'GET' && !$sub) {
        $st = $pdo->prepare('SELECT u.* FROM friendships f JOIN users u ON u.id = f.friend_id WHERE f.user_id = ?');
        $st->execute([$me['id']]);
        Response::json(array_map([Helpers::class, 'userPublic'], $st->fetchAll()));
    }

    if ($sub === 'map' && $method === 'GET') {
        require_once __DIR__ . '/lib/Geo.php';
        $cutoff = (int)(microtime(true) * 1000) - (24 * 60 * 60 * 1000);
        $myLat = isset($me['lat']) && $me['lat'] !== null ? (float)$me['lat'] : null;
        $myLng = isset($me['lng']) && $me['lng'] !== null ? (float)$me['lng'] : null;
        $blocked = Helpers::blockedUserIds($pdo, $me['id']);
        $blockedBy = Helpers::blockedByUserIds($pdo, $me['id']);
        $exclude = array_unique([...$blocked, ...$blockedBy]);
        $st = $pdo->prepare(
            'SELECT u.* FROM friendships f
             JOIN users u ON u.id = f.friend_id
             WHERE f.user_id = ? AND u.onboarded = 1
             AND COALESCE(u.map_hidden, 0) = 0
             AND COALESCE(u.lens_on, 0) = 1
             AND u.lat IS NOT NULL AND u.lng IS NOT NULL AND u.location_ts >= ?'
        );
        $st->execute([$me['id'], $cutoff]);
        $out = [];
        foreach ($st->fetchAll() as $row) {
            if (in_array($row['id'], $exclude, true)) continue;
            $u = Helpers::userPublic($row);
            $lat = $row['lat'] ?? null;
            $lng = $row['lng'] ?? null;
            if ($lat !== null && $lng !== null) {
                $u['lat'] = (float)$lat;
                $u['lng'] = (float)$lng;
                $u['miles'] = ($myLat !== null && $myLng !== null)
                    ? round(Geo::haversineMiles($myLat, $myLng, (float)$lat, (float)$lng), 2)
                    : (float)$row['miles'];
                $u['locationAt'] = isset($row['location_ts']) ? (int)$row['location_ts'] : null;
                $u['recentLens'] = true;
                $u['mapHidden'] = !empty($row['map_hidden']);
            } else {
                $u['lat'] = null;
                $u['lng'] = null;
            }
            $out[] = $u;
        }
        usort($out, fn($a, $b) => (($a['miles'] ?? 999999) <=> ($b['miles'] ?? 999999)));
        Response::json($out);
    }

    if ($method === 'DELETE' && $sub && $sub !== 'requests') {
        $friendId = $sub;
        $st = $pdo->prepare('SELECT 1 FROM friendships WHERE user_id = ? AND friend_id = ?');
        $st->execute([$me['id'], $friendId]);
        if (!$st->fetch()) Response::error('Not friends', 404);

        $other = $pdo->prepare('SELECT name FROM users WHERE id = ?');
        $other->execute([$friendId]);
        $otherName = ($other->fetch()['name'] ?? 'Someone');

        $pdo->beginTransaction();
        try {
            $pdo->prepare('DELETE FROM friendships WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)')->execute([
                $me['id'], $friendId, $friendId, $me['id'],
            ]);
            close_friend_requests_between($pdo, $me['id'], $friendId, (int)(microtime(true) * 1000));
            $rate = -follower_quality_rate_from_score((float)$me['score']);
            $label = follower_quality_percent_label($rate);
            $theirs = echelon_adjust_score_percent($pdo, $friendId, $rate, 'friend', 'Follower lost', $me['name'] . ' unfollowed you. Your score dipped by ' . $label . '.', $me['id']);
            $pdo->commit();
        } catch (Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }

        Response::json([
            'ok' => true,
            'penalty' => $rate,
            'yourScore' => (float)$me['score'],
            'theirScore' => $theirs['score'],
        ]);
    }

    Response::error('Method not allowed', 405);
}

function handle_posts(PDO $pdo, array $cfg, string $method, array $parts, array $me): void
{
    $sub = $parts[0] ?? '';
    if ($sub !== '' && ($parts[1] ?? '') === 'like') {
        handle_post_like($pdo, $method, $sub, $me);
        return;
    }

    if ($method === 'GET' && $sub === '') {
        $feed = Helpers::feedRowsForUser($pdo, $me['id']);
        Response::json(Helpers::postsWithRatings($pdo, $feed));
    }
    if ($method === 'POST' && $sub === '') {
        $body = Helpers::jsonBody();
        $id = 'p' . bin2hex(random_bytes(8));
        $scene = json_encode($body['scene'] ?? ['#FFD1E1', '#FFE9A8']);
        $captionStyle = json_encode($body['captionStyle'] ?? null);
        $tags = json_encode($body['tags'] ?? []);
        $ts = (int)(microtime(true) * 1000);
        $pdo->prepare('INSERT INTO posts (id, author_id, caption, media_url, media_type, from_story, source, scene_json, emoji, likes, premium, caption_style_json, tags_json, ts) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)')->execute([
            $id, $me['id'], $body['caption'] ?? '', $body['mediaUrl'] ?? null, $body['mediaType'] ?? null,
            !empty($body['fromStory']) ? 1 : 0, $body['source'] ?? 'echelon', $scene, $body['emoji'] ?? '✨',
            !empty($body['premium']) ? 1 : 0, $captionStyle, $tags, $ts,
        ]);
        $row = $pdo->prepare('SELECT * FROM posts WHERE id = ?');
        $row->execute([$id]);
        Response::json(Helpers::postPublic($row->fetch()), 201);
    }
    if ($method === 'DELETE' && $sub !== '') {
        $st = $pdo->prepare('SELECT author_id FROM posts WHERE id = ?');
        $st->execute([$sub]);
        $row = $st->fetch();
        if (!$row) {
            Response::error('Post not found', 404);
        }
        if ((string)$row['author_id'] !== (string)$me['id']) {
            Response::error('Forbidden', 403);
        }
        $pdo->prepare('DELETE FROM post_likes WHERE post_id = ?')->execute([$sub]);
        $pdo->prepare('DELETE FROM posts WHERE id = ?')->execute([$sub]);
        Response::json(['ok' => true]);
        return;
    }
    Response::error('Method not allowed', 405);
}

function handle_post_like(PDO $pdo, string $method, string $postId, array $me): void
{
    $st = $pdo->prepare('SELECT id, likes FROM posts WHERE id = ?');
    $st->execute([$postId]);
    $post = $st->fetch();
    if (!$post) Response::error('Post not found', 404);

    $uid = $me['id'];
    $now = (int)(microtime(true) * 1000);

    if ($method === 'POST') {
        $chk = $pdo->prepare('SELECT 1 FROM post_likes WHERE user_id = ? AND post_id = ?');
        $chk->execute([$uid, $postId]);
        if (!$chk->fetch()) {
            $pdo->prepare('INSERT INTO post_likes (user_id, post_id, ts) VALUES (?, ?, ?)')->execute([$uid, $postId, $now]);
            $pdo->prepare('UPDATE posts SET likes = likes + 1 WHERE id = ?')->execute([$postId]);
        }
    } elseif ($method === 'DELETE') {
        $del = $pdo->prepare('DELETE FROM post_likes WHERE user_id = ? AND post_id = ?');
        $del->execute([$uid, $postId]);
        if ($del->rowCount() > 0) {
            $pdo->prepare('UPDATE posts SET likes = GREATEST(0, likes - 1) WHERE id = ?')->execute([$postId]);
        }
    } else {
        Response::error('Method not allowed', 405);
    }

    $st->execute([$postId]);
    $row = $st->fetch();
    Response::json(['ok' => true, 'likes' => (int)($row['likes'] ?? 0), 'liked' => $method === 'POST']);
}

function handle_stories(PDO $pdo, array $cfg, string $method, array $parts, array $me): void
{
    if ($method !== 'POST') Response::error('Method not allowed', 405);

    $body = Helpers::jsonBody();
    $mediaUrl = $body['mediaUrl'] ?? null;
    if (!$mediaUrl) Response::error('mediaUrl required');

    $mediaType = ($body['mediaType'] ?? 'image') === 'video' ? 'video' : 'image';
    $caption = (string)($body['caption'] ?? '');
    $captionStyle = json_encode($body['captionStyle'] ?? ['color' => '#ffffff', 'size' => 'md', 'align' => 'center']);
    $scene = json_encode($body['scene'] ?? ['#FFD1E1', '#E6DBFF']);
    $now = (int)(microtime(true) * 1000);
    $expiresAt = $now + 86400000;
    $authorId = $me['id'];

    $st = $pdo->prepare("SELECT id FROM stories WHERE author_id = ? AND id NOT LIKE 'ig_ss_%' AND expires_at > ? ORDER BY ts DESC LIMIT 1");
    $st->execute([$authorId, $now]);
    $existing = $st->fetch();

    if ($existing) {
        $storyId = (string)$existing['id'];
        $pdo->prepare('UPDATE stories SET ts = ?, expires_at = ? WHERE id = ?')->execute([$now, $expiresAt, $storyId]);
    } else {
        $storyId = 'ss_' . bin2hex(random_bytes(8));
        $pdo->prepare('INSERT INTO stories (id, author_id, expires_at, ts) VALUES (?, ?, ?, ?)')->execute([
            $storyId, $authorId, $expiresAt, $now,
        ]);
    }

    $itemId = 'si_' . bin2hex(random_bytes(8));
    $pdo->prepare('INSERT INTO story_items (id, story_id, media_url, media_type, emoji, scene_json, caption, caption_style_json, ts) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')->execute([
        $itemId, $storyId, $mediaUrl, $mediaType, $body['emoji'] ?? '✨', $scene, $caption ?: null, $captionStyle, $now,
    ]);

    $storyRow = $pdo->prepare('SELECT * FROM stories WHERE id = ?');
    $storyRow->execute([$storyId]);
    $items = $pdo->prepare('SELECT * FROM story_items WHERE story_id = ? ORDER BY ts ASC');
    $items->execute([$storyId]);

    Response::json([
        'story' => Helpers::storyPublic($storyRow->fetch(), $items->fetchAll()),
    ], 201);
}

function handle_events(PDO $pdo, array $cfg, string $method, array $parts, array $me): void
{
    $sub = $parts[0] ?? '';

    if ($method === 'GET' && $sub === '') {
        $query = [
            'q' => $_GET['q'] ?? '',
            'sort' => $_GET['sort'] ?? 'near',
            'type' => $_GET['type'] ?? '',
            'kind' => 'party',
            'maxMiles' => $_GET['maxMiles'] ?? '',
        ];
        Response::json(Helpers::eventsForUser($pdo, $me, $query));
    }

    if ($method === 'GET' && ($parts[1] ?? '') === 'guests' && ($parts[0] ?? '') !== '') {
        $eventId = $parts[0];
        $st = $pdo->prepare("SELECT * FROM events WHERE id = ? AND kind = 'party' AND host_id IS NOT NULL");
        $st->execute([$eventId]);
        $row = $st->fetch();
        if (!$row) Response::error('Party not found', 404);
        if (($row['host_id'] ?? '') !== $me['id']) {
            Response::error('Only the host can view the guest list', 403);
        }
        $stGuests = $pdo->prepare(
            'SELECT u.id, u.name, u.handle, u.score, u.emoji, u.avatar_url, r.ts AS rsvp_ts
             FROM event_rsvps r
             JOIN users u ON u.id = r.user_id
             WHERE r.event_id = ?
             ORDER BY u.score DESC, u.name ASC'
        );
        $stGuests->execute([$eventId]);
        $guests = [];
        foreach ($stGuests->fetchAll() as $g) {
            $guests[] = [
                'id' => $g['id'],
                'name' => $g['name'],
                'handle' => $g['handle'],
                'score' => round((float)$g['score'], 2),
                'emoji' => $g['emoji'],
                'avatarUrl' => Helpers::absUrl($g['avatar_url'] ?? null),
                'rsvpTs' => (int)$g['rsvp_ts'],
            ];
        }
        Response::json([
            'eventId' => $eventId,
            'eventName' => $row['name'] ?? '',
            'guests' => $guests,
        ]);
    }

    if ($method === 'GET' && $sub !== '' && $sub !== 'rsvp') {
        $st = $pdo->prepare("SELECT * FROM events WHERE id = ? AND kind = 'party' AND host_id IS NOT NULL");
        $st->execute([$sub]);
        $row = $st->fetch();
        if (!$row) Response::error('Party not found', 404);
        $nowMs = (int)(microtime(true) * 1000);
        $startsAt = isset($row['starts_at']) && $row['starts_at'] !== null ? (int)$row['starts_at'] : null;
        $isHost = ($row['host_id'] ?? '') === $me['id'];
        if ($startsAt !== null && $nowMs > $startsAt + (72 * 3600 * 1000) && !$isHost) {
            Response::error('Party not found', 404);
        }
        $stRsvp = $pdo->prepare('SELECT event_id FROM event_rsvps WHERE user_id = ?');
        $stRsvp->execute([$me['id']]);
        $rsvpIds = array_column($stRsvp->fetchAll(), 'event_id');
        $milesOut = (float)$row['miles'];
        if (isset($me['lat'], $me['lng']) && !empty($row['lat']) && !empty($row['lng'])) {
            require_once __DIR__ . '/lib/Geo.php';
            $milesOut = Geo::haversineMiles((float)$me['lat'], (float)$me['lng'], (float)$row['lat'], (float)$row['lng']);
        }
        Response::json(Helpers::eventPublic($row, [
            'viewerId' => $me['id'],
            'rsvpIds' => $rsvpIds,
            'miles' => $milesOut,
        ]));
    }

    if ($method === 'POST' && $sub === '') {
        $handle = strtolower(ltrim((string)($me['handle'] ?? ''), '@'));
        $isTestHost = $handle === 'test' || ($me['id'] ?? '') === 'test01';
        if ((float)$me['score'] < 4.0 && !$isTestHost) {
            Response::error('Reach Radiance 4.0 to host party events', 403);
        }
        $body = Helpers::jsonBody();
        $title = trim((string)($body['title'] ?? $body['name'] ?? ''));
        $city = trim((string)($body['city'] ?? ''));
        $location = trim((string)($body['location'] ?? $body['address'] ?? ''));
        $minRating = (float)($body['minRating'] ?? $body['req'] ?? 2.6);
        $secretAddress = !empty($body['secretAddress']);
        $when = trim((string)($body['when'] ?? 'TBD'));
        $description = trim((string)($body['description'] ?? ''));
        $lat = isset($body['lat']) ? (float)$body['lat'] : null;
        $lng = isset($body['lng']) ? (float)$body['lng'] : null;
        $startsAt = isset($body['startsAt']) ? (int)$body['startsAt'] : null;
        $bannerUrl = trim((string)($body['bannerUrl'] ?? ''));
        $price = isset($body['price']) && $body['price'] !== '' && $body['price'] !== null ? (float)$body['price'] : null;
        $currency = strtoupper(trim((string)($body['currency'] ?? 'EUR'))) ?: 'EUR';
        $countryCode = strtoupper(trim((string)($body['countryCode'] ?? '')));

        if ($title === '' || strlen($title) < 2) Response::error('Title required', 400);
        if ($city === '') Response::error('City required', 400);
        if (!$secretAddress && $location === '') Response::error('Location required unless address is secret', 400);
        if ($minRating < 1.0 || $minRating > 5.0) Response::error('Minimum rating must be between 1.0 and 5.0', 400);
        if ($price !== null && $price < 0) Response::error('Price cannot be negative', 400);

        if ($lat === null && isset($me['lat'], $me['lng'])) {
            $lat = (float)$me['lat'];
            $lng = (float)$me['lng'];
        }

        $id = 'pe_' . bin2hex(random_bytes(8));
        $ts = (int)(microtime(true) * 1000);
        $venue = $secretAddress ? $city : ($location !== '' ? $location : $city);
        $miles = 0.5;
        if ($lat !== null && $lng !== null && isset($me['lat'], $me['lng'])) {
            require_once __DIR__ . '/lib/Geo.php';
            $miles = Geo::haversineMiles((float)$me['lat'], (float)$me['lng'], $lat, $lng);
        }

        $pdo->prepare(
            'INSERT INTO events (id, name, type, emoji, scene_json, miles, req, venue, when_text, starts_at, description, banner_url, price, currency, host_id, city, country_code, address, secret_address, lat, lng, ts, kind)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        )->execute([
            $id,
            $title,
            'Party',
            '🎉',
            json_encode(['#FFE9A8', '#E6DBFF']),
            round($miles, 2),
            round($minRating, 1),
            $venue,
            $when !== '' ? $when : 'TBD',
            $startsAt,
            $description !== '' ? $description : null,
            $bannerUrl !== '' ? $bannerUrl : null,
            $price !== null && $price > 0 ? round($price, 2) : null,
            $currency,
            $me['id'],
            $city,
            $countryCode !== '' ? $countryCode : null,
            $location !== '' ? $location : null,
            $secretAddress ? 1 : 0,
            $lat,
            $lng,
            $ts,
            'party',
        ]);

        $st = $pdo->prepare('SELECT * FROM events WHERE id = ?');
        $st->execute([$id]);
        $row = $st->fetch();
        $stRsvp = $pdo->prepare('SELECT event_id FROM event_rsvps WHERE user_id = ?');
        $stRsvp->execute([$me['id']]);
        $rsvpIds = array_column($stRsvp->fetchAll(), 'event_id');
        $milesOut = (float)$row['miles'];
        if (isset($me['lat'], $me['lng']) && !empty($row['lat']) && !empty($row['lng'])) {
            require_once __DIR__ . '/lib/Geo.php';
            $milesOut = Geo::haversineMiles((float)$me['lat'], (float)$me['lng'], (float)$row['lat'], (float)$row['lng']);
        }
        Response::json(Helpers::eventPublic($row, [
            'viewerId' => $me['id'],
            'rsvpIds' => $rsvpIds,
            'miles' => $milesOut,
        ]), 201);
    }

    if ($method === 'POST' && $sub === 'rsvp') {
        $body = Helpers::jsonBody();
        $eventId = trim((string)($body['eventId'] ?? ''));
        if (!$eventId) Response::error('eventId required', 400);

        $st = $pdo->prepare('SELECT * FROM events WHERE id = ?');
        $st->execute([$eventId]);
        $event = $st->fetch();
        if (!$event) Response::error('Event not found', 404);

        if ((float)$me['score'] < (float)$event['req']) {
            Response::error('Your score is below the minimum rating for this event', 403);
        }

        $ts = (int)(microtime(true) * 1000);
        $pdo->prepare('INSERT IGNORE INTO event_rsvps (user_id, event_id, ts) VALUES (?, ?, ?)')->execute([$me['id'], $eventId, $ts]);
        Response::json(['ok' => true]);
    }

    if (($method === 'PATCH' || $method === 'DELETE') && $sub !== '' && $sub !== 'rsvp') {
        $st = $pdo->prepare("SELECT * FROM events WHERE id = ? AND kind = 'party' AND host_id IS NOT NULL");
        $st->execute([$sub]);
        $row = $st->fetch();
        if (!$row) Response::error('Party not found', 404);
        if (($row['host_id'] ?? '') !== $me['id']) {
            Response::error('Only the host can modify this party', 403);
        }

        if ($method === 'DELETE') {
            $pdo->prepare('DELETE FROM event_rsvps WHERE event_id = ?')->execute([$sub]);
            $pdo->prepare('DELETE FROM events WHERE id = ?')->execute([$sub]);
            Response::json(['ok' => true]);
        }

        $body = Helpers::jsonBody();
        $title = trim((string)($body['title'] ?? $body['name'] ?? $row['name']));
        $city = trim((string)($body['city'] ?? $row['city'] ?? ''));
        $location = trim((string)($body['location'] ?? $body['address'] ?? $row['address'] ?? ''));
        $minRating = (float)($body['minRating'] ?? $body['req'] ?? $row['req']);
        $secretAddress = array_key_exists('secretAddress', $body) ? !empty($body['secretAddress']) : !empty($row['secret_address']);
        $when = trim((string)($body['when'] ?? $row['when_text'] ?? 'TBD'));
        $description = trim((string)($body['description'] ?? $row['description'] ?? ''));
        $lat = array_key_exists('lat', $body) ? (isset($body['lat']) ? (float)$body['lat'] : null) : (isset($row['lat']) ? (float)$row['lat'] : null);
        $lng = array_key_exists('lng', $body) ? (isset($body['lng']) ? (float)$body['lng'] : null) : (isset($row['lng']) ? (float)$row['lng'] : null);
        $startsAt = array_key_exists('startsAt', $body) ? (isset($body['startsAt']) ? (int)$body['startsAt'] : null) : (isset($row['starts_at']) ? (int)$row['starts_at'] : null);
        $bannerUrl = trim((string)($body['bannerUrl'] ?? $row['banner_url'] ?? ''));
        $price = array_key_exists('price', $body)
            ? ($body['price'] !== '' && $body['price'] !== null ? (float)$body['price'] : null)
            : (isset($row['price']) ? (float)$row['price'] : null);
        $currency = strtoupper(trim((string)($body['currency'] ?? $row['currency'] ?? 'EUR'))) ?: 'EUR';
        $countryCode = strtoupper(trim((string)($body['countryCode'] ?? $row['country_code'] ?? '')));

        if ($title === '' || strlen($title) < 2) Response::error('Title required', 400);
        if ($city === '') Response::error('City required', 400);
        if (!$secretAddress && $location === '') Response::error('Location required unless address is secret', 400);
        if ($minRating < 1.0 || $minRating > 5.0) Response::error('Minimum rating must be between 1.0 and 5.0', 400);
        if ($price !== null && $price < 0) Response::error('Price cannot be negative', 400);

        $venue = $secretAddress ? $city : ($location !== '' ? $location : $city);
        $miles = (float)$row['miles'];
        if ($lat !== null && $lng !== null && isset($me['lat'], $me['lng'])) {
            require_once __DIR__ . '/lib/Geo.php';
            $miles = Geo::haversineMiles((float)$me['lat'], (float)$me['lng'], $lat, $lng);
        }

        $pdo->prepare(
            'UPDATE events SET name = ?, req = ?, venue = ?, when_text = ?, starts_at = ?, description = ?, banner_url = ?, price = ?, currency = ?, city = ?, country_code = ?, address = ?, secret_address = ?, lat = ?, lng = ?, miles = ? WHERE id = ?'
        )->execute([
            $title,
            round($minRating, 1),
            $venue,
            $when !== '' ? $when : 'TBD',
            $startsAt,
            $description !== '' ? $description : null,
            $bannerUrl !== '' ? $bannerUrl : null,
            $price !== null && $price > 0 ? round($price, 2) : null,
            $currency,
            $city,
            $countryCode !== '' ? $countryCode : null,
            $location !== '' ? $location : null,
            $secretAddress ? 1 : 0,
            $lat,
            $lng,
            round($miles, 2),
            $sub,
        ]);

        $st = $pdo->prepare('SELECT * FROM events WHERE id = ?');
        $st->execute([$sub]);
        $updated = $st->fetch();
        $stRsvp = $pdo->prepare('SELECT event_id FROM event_rsvps WHERE user_id = ?');
        $stRsvp->execute([$me['id']]);
        $rsvpIds = array_column($stRsvp->fetchAll(), 'event_id');
        $milesOut = (float)$updated['miles'];
        if (isset($me['lat'], $me['lng']) && !empty($updated['lat']) && !empty($updated['lng'])) {
            require_once __DIR__ . '/lib/Geo.php';
            $milesOut = Geo::haversineMiles((float)$me['lat'], (float)$me['lng'], (float)$updated['lat'], (float)$updated['lng']);
        }
        Response::json(Helpers::eventPublic($updated, [
            'viewerId' => $me['id'],
            'rsvpIds' => $rsvpIds,
            'miles' => $milesOut,
        ]));
    }

    Response::error('Method not allowed', 405);
}

function handle_chats(PDO $pdo, array $cfg, string $method, array $parts, array $me): void
{
    if ($method !== 'GET') Response::error('Method not allowed', 405);
    Response::json(Helpers::chatInboxForUser($pdo, $me['id']));
}

function handle_messages(PDO $pdo, array $cfg, string $method, array $parts, array $me): void
{
    $contactId = $parts[0] ?? '';
    if (!$contactId) Response::error('Contact id required');

    Helpers::assertCanInteract($pdo, $me['id'], $contactId);

    if ($method === 'PATCH' && ($parts[1] ?? '') === 'read') {
        Helpers::markConversationRead($pdo, $me['id'], $contactId);
        Response::json(['ok' => true]);
    }

    if ($method === 'DELETE' && count($parts) === 1) {
        Helpers::deleteConversation($pdo, $me['id'], $contactId);
        Response::json(['ok' => true]);
    }

    if ($method === 'DELETE' && count($parts) === 2) {
        $msgId = $parts[1];
        $st = $pdo->prepare('SELECT m.*, c.id AS conv_id FROM messages m JOIN conversations c ON c.id = m.conversation_id WHERE m.id = ? AND (c.user_a = ? OR c.user_b = ?)');
        $st->execute([$msgId, $me['id'], $me['id']]);
        $row = $st->fetch();
        if (!$row) Response::error('Message not found', 404);
        if ($row['sender_id'] !== $me['id']) Response::error('You can only delete your own messages', 403);
        $pdo->prepare('DELETE FROM messages WHERE id = ?')->execute([$msgId]);
        $lm = $pdo->prepare('SELECT ts FROM messages WHERE conversation_id = ? ORDER BY ts DESC LIMIT 1');
        $lm->execute([$row['conv_id']]);
        $lastTs = $lm->fetchColumn();
        $pdo->prepare('UPDATE conversations SET updated_at = ? WHERE id = ?')->execute([(int)($lastTs ?: microtime(true) * 1000), $row['conv_id']]);
        Response::json(['ok' => true]);
    }

    if (($parts[1] ?? '') === 'typing') {
        $convId = Helpers::ensureConversation($pdo, $me['id'], $contactId);
        if ($method === 'POST') {
            Helpers::setConversationTyping($pdo, $convId, $me['id']);
            Response::json(['ok' => true]);
        }
        if ($method === 'GET') {
            Response::json(['typing' => Helpers::getPeerTyping($pdo, $convId, $me['id'])]);
        }
    }

    if ($method === 'GET') {
        $convId = Helpers::ensureConversation($pdo, $me['id'], $contactId);
        $markRead = !isset($_GET['markRead']) || $_GET['markRead'] !== '0';
        if ($markRead) {
            Helpers::markConversationRead($pdo, $me['id'], $contactId);
        }
        $convSt = $pdo->prepare('SELECT user_a, user_b, read_ts_a, read_ts_b FROM conversations WHERE id = ?');
        $convSt->execute([$convId]);
        $conv = $convSt->fetch() ?: [];
        $peerReadTs = ($conv['user_a'] ?? '') === $me['id']
            ? (int)($conv['read_ts_b'] ?? 0)
            : (int)($conv['read_ts_a'] ?? 0);
        $st = $pdo->prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY ts ASC');
        $st->execute([$convId]);
        $rows = $st->fetchAll();
        $now = (int)(microtime(true) * 1000);
        $out = [];
        foreach ($rows as $r) {
            if (!empty($r['expires_at']) && (int)$r['expires_at'] <= $now) {
                $out[] = [
                    'id' => $r['id'],
                    'from' => $r['sender_id'] === $me['id'] ? 'me' : $r['sender_id'],
                    'expired' => true,
                    'ts' => (int)$r['ts'],
                ];
                continue;
            }
            $out[] = Helpers::messagePublic($r, $me['id']);
        }
        Response::json(['messages' => $out, 'peerReadTs' => $peerReadTs]);
    }

    if ($method === 'POST') {
        $body = Helpers::jsonBody();
        $convId = Helpers::ensureConversation($pdo, $me['id'], $contactId);
        $id = 'm' . bin2hex(random_bytes(8));
        $ts = (int)(microtime(true) * 1000);
        $voice = !empty($body['voice']) ? 1 : 0;
        $replyToId = $body['replyToId'] ?? null;
        $replyText = isset($body['replyText']) ? mb_substr((string)$body['replyText'], 0, 280) : null;
        $burnMode = $body['burnMode'] ?? null;
        if ($burnMode && !in_array($burnMode, ['timer', 'view_once'], true)) $burnMode = null;
        $burnSeconds = isset($body['burnSeconds']) ? max(3, min(3600, (int)$body['burnSeconds'])) : null;
        $expiresAt = null;
        if ($burnMode === 'timer' && $burnSeconds) {
            $expiresAt = $ts + ($burnSeconds * 1000);
        }
        if (!empty($body['viewOnce']) && !empty($body['mediaUrl'])) {
            $burnMode = 'view_once';
        }
        try {
            $pdo->prepare('INSERT INTO messages (id, conversation_id, sender_id, body, media_url, media_type, voice, voice_dur, voice_seed, reply_to_id, reply_text, burn_mode, burn_seconds, expires_at, ts) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')->execute([
                $id, $convId, $me['id'], $body['text'] ?? null, $body['mediaUrl'] ?? null,
                $body['mediaType'] ?? null, $voice, $body['voiceDur'] ?? null, $body['voiceSeed'] ?? null,
                $replyToId, $replyText, $burnMode, $burnSeconds, $expiresAt, $ts,
            ]);
        } catch (Throwable $e) {
            $pdo->prepare('INSERT INTO messages (id, conversation_id, sender_id, body, media_url, media_type, voice, voice_dur, voice_seed, ts) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')->execute([
                $id, $convId, $me['id'], $body['text'] ?? null, $body['mediaUrl'] ?? null,
                $body['mediaType'] ?? null, $voice, $body['voiceDur'] ?? null, $body['voiceSeed'] ?? null, $ts,
            ]);
        }
        $pdo->prepare('UPDATE conversations SET updated_at = ? WHERE id = ?')->execute([$ts, $convId]);
        Response::json(['id' => $id, 'ts' => $ts, 'expiresAt' => $expiresAt], 201);
    }

    if ($method === 'PATCH' && ($parts[2] ?? '') === 'react') {
        $msgId = $parts[1];
        $body = Helpers::jsonBody();
        $emoji = $body['emoji'] ?? '❤️';
        $st = $pdo->prepare('SELECT m.* FROM messages m JOIN conversations c ON c.id = m.conversation_id WHERE m.id = ? AND (c.user_a = ? OR c.user_b = ?)');
        $st->execute([$msgId, $me['id'], $me['id']]);
        if (!$st->fetch()) Response::error('Message not found', 404);
        $pdo->prepare('UPDATE messages SET reaction = ? WHERE id = ?')->execute([$emoji, $msgId]);
        Response::json(['ok' => true]);
    }

    if ($method === 'PATCH' && ($parts[2] ?? '') === 'consume') {
        $msgId = $parts[1];
        $st = $pdo->prepare('SELECT m.* FROM messages m JOIN conversations c ON c.id = m.conversation_id WHERE m.id = ? AND (c.user_a = ? OR c.user_b = ?)');
        $st->execute([$msgId, $me['id'], $me['id']]);
        $row = $st->fetch();
        if (!$row) Response::error('Message not found', 404);
        if (($row['burn_mode'] ?? '') !== 'view_once') Response::error('Not a view-once message', 400);
        if ($row['sender_id'] === $me['id']) Response::error('Sender cannot consume', 400);
        if (empty($row['consumed_at'])) {
            $ts = (int)(microtime(true) * 1000);
            $pdo->prepare('UPDATE messages SET consumed_at = ? WHERE id = ?')->execute([$ts, $msgId]);
            $row['consumed_at'] = $ts;
        }
        Response::json(Helpers::messagePublic($row, $me['id']));
    }

    Response::error('Method not allowed', 405);
}

function handle_settings(PDO $pdo, array $cfg, string $method, array $parts, array $me): void
{
    if ($method === 'GET') {
        $st = $pdo->prepare('SELECT * FROM user_settings WHERE user_id = ?');
        $st->execute([$me['id']]);
        Response::json(Helpers::settingsPublic($st->fetch() ?: []));
    }
    if ($method === 'PATCH') {
        $body = Helpers::jsonBody();
        $map = [
            'lang' => 'lang', 'lens' => 'lens', 'live' => 'live', 'sound' => 'sound',
            'proximityAlerts' => 'proximity_alerts', 'ratingNotifs' => 'rating_notifs',
            'strangerRatings' => 'stranger_ratings', 'publicTier' => 'public_tier',
            'publicScore' => 'public_score', 'reduceMotion' => 'reduce_motion',
            'proximityAutoScan' => 'proximity_auto_scan',
            'sparkMinScore' => 'spark_min_score', 'sparkMaxScore' => 'spark_max_score',
            'sparkMinAge' => 'spark_min_age', 'sparkMaxAge' => 'spark_max_age',
            'sparkMaxDistanceMi' => 'spark_max_distance_mi',
            'sparkMinHeightM' => 'spark_min_height_m', 'sparkMaxHeightM' => 'spark_max_height_m',
            'privateProfile' => 'private_profile',
        ];
        $fields = [];
        $params = [];
        foreach ($map as $k => $col) {
            if (array_key_exists($k, $body)) {
                $fields[] = "$col = ?";
                $params[] = is_bool($body[$k]) ? ($body[$k] ? 1 : 0) : $body[$k];
            }
        }
        if ($fields) {
            $params[] = $me['id'];
            $pdo->prepare('UPDATE user_settings SET ' . implode(', ', $fields) . ' WHERE user_id = ?')->execute($params);
        }
        if (array_key_exists('lens', $body)) {
            $pdo->prepare('UPDATE users SET lens_on = ? WHERE id = ?')->execute([!empty($body['lens']) ? 1 : 0, $me['id']]);
        }
        handle_settings($pdo, $cfg, 'GET', $parts, $me);
    }
    if ($method === 'POST' && ($parts[0] ?? '') === 'disconnect-google') {
        if (($me['auth_method'] ?? '') !== 'google') Response::error('Not connected with Google', 400);
        $pdo->prepare('UPDATE users SET google_sub = NULL, auth_method = ? WHERE id = ?')->execute([
            !empty($me['email']) ? 'email' : 'password',
            $me['id'],
        ]);
        Response::json(['ok' => true]);
    }
    Response::error('Method not allowed', 405);
}

function handle_presence(PDO $pdo, array $cfg, string $method, array $parts, array $me): void
{
    require_once __DIR__ . '/lib/Geo.php';

    $staleMs = 24 * 60 * 60 * 1000;
    $maxRadius = 5.0;

    if ($method === 'POST' || $method === 'PATCH') {
        $body = Helpers::jsonBody();
        if (!array_key_exists('lat', $body) || !array_key_exists('lng', $body)) {
            Response::error('lat and lng required');
        }
        $ts = (int)(microtime(true) * 1000);
        $lensOn = array_key_exists('lensOn', $body)
            ? (!empty($body['lensOn']) ? 1 : 0)
            : (int)$me['lens_on'];
        $hideMapLocation = !empty($body['hideMapLocation']) ? 1 : 0;

        if ($body['lat'] === null || $body['lng'] === null) {
            $pdo->prepare('UPDATE users SET lens_on = ?, map_hidden = ? WHERE id = ?')->execute([
                $lensOn, $hideMapLocation, $me['id'],
            ]);
            Response::json(['ok' => true, 'ts' => $ts, 'hidden' => true]);
        }

        $lat = (float)$body['lat'];
        $lng = (float)$body['lng'];
        if (abs($lat) > 90 || abs($lng) > 180) Response::error('Invalid coordinates');

        $pdo->prepare('UPDATE users SET lat = ?, lng = ?, location_ts = ?, lens_on = ?, map_hidden = ? WHERE id = ?')->execute([
            $lat, $lng, $ts, $lensOn, $hideMapLocation, $me['id'],
        ]);
        Response::json(['ok' => true, 'ts' => $ts]);
    }

    if ($method === 'GET' && ($parts[0] ?? '') === 'nearby') {
        $radius = max($maxRadius, max(0.1, (float)($_GET['radiusMiles'] ?? $maxRadius)));
        $lensOnly = ($_GET['lensOnly'] ?? '1') !== '0';
        $cutoff = (int)(microtime(true) * 1000) - $staleMs;

        $stMe = $pdo->prepare('SELECT lat, lng, location_ts FROM users WHERE id = ?');
        $stMe->execute([$me['id']]);
        $myLoc = $stMe->fetch();
        if (
            !$myLoc
            || $myLoc['lat'] === null
            || $myLoc['lng'] === null
            || (int)$myLoc['location_ts'] < $cutoff
        ) {
            Response::json(['nearby' => [], 'needLocation' => true, 'radiusMiles' => $radius]);
        }

        $myLat = (float)$myLoc['lat'];
        $myLng = (float)$myLoc['lng'];

        $st = $pdo->prepare(
            'SELECT u.* FROM users u
             WHERE u.id <> ? AND u.onboarded = 1
             AND u.lat IS NOT NULL AND u.lng IS NOT NULL AND u.location_ts >= ?'
        );
        $st->execute([$me['id'], $cutoff]);

        $nearby = [];
        foreach ($st->fetchAll() as $row) {
            $lat = (float)$row['lat'];
            $lng = (float)$row['lng'];
            $miles = Geo::haversineMiles($myLat, $myLng, $lat, $lng);

            $bearing = Geo::bearingDeg($myLat, $myLng, $lat, $lng);
            $hud = Geo::lensHudFromBearing($bearing, $miles, max(1.0, $miles));
            $pub = Helpers::userPublic($row);
            $pub['miles'] = round($miles, 2);
            $pub['locationAt'] = isset($row['location_ts']) ? (int)$row['location_ts'] : null;
            $pub['recentLens'] = true;
            $pub['mapHidden'] = !empty($row['map_hidden']);
            $pub['lensX'] = $hud['lensX'];
            $pub['lensY'] = $hud['lensY'];
            $pub['bearing'] = round($bearing, 1);
            $nearby[] = $pub;
        }

        usort($nearby, fn($a, $b) => $a['miles'] <=> $b['miles']);
        $nearby = array_slice($nearby, 0, 100);
        Response::json(['nearby' => $nearby, 'radiusMiles' => $radius, 'needLocation' => false]);
    }

    Response::error('Method not allowed', 405);
}

function handle_upload(PDO $pdo, array $cfg, string $method, array $parts, array $me): void
{
    if ($method !== 'POST') Response::error('Method not allowed', 405);
    if (empty($_FILES['file'])) Response::error('No file uploaded');
    $file = $_FILES['file'];
    if ($file['error'] !== UPLOAD_ERR_OK) Response::error('Upload failed');
    $allowed = [
        'image/jpeg', 'image/png', 'image/webp', 'image/gif',
        'video/mp4', 'video/webm', 'video/quicktime', 'video/3gpp', 'video/x-m4v',
        'audio/webm', 'audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/ogg', 'audio/wav',
    ];
    $mime = mime_content_type($file['tmp_name']) ?: $file['type'];
    if (!in_array($mime, $allowed, true)) {
        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        $extMap = [
            'mov' => 'video/quicktime', 'm4v' => 'video/mp4', '3gp' => 'video/3gpp',
            'm4a' => 'audio/mp4', 'aac' => 'audio/aac', 'caf' => 'audio/mp4',
        ];
        if (isset($extMap[$ext])) $mime = $extMap[$ext];
    }
    if (!in_array($mime, $allowed, true) && !str_starts_with($mime, 'audio/') && !str_starts_with($mime, 'video/')) {
        Response::error('File type not allowed');
    }
    $ext = pathinfo($file['name'], PATHINFO_EXTENSION) ?: 'bin';
    $name = bin2hex(random_bytes(12)) . '.' . strtolower($ext);
    $dir = rtrim($cfg['upload_dir'], '/\\');
    if (!is_dir($dir)) mkdir($dir, 0755, true);
    $dest = $dir . DIRECTORY_SEPARATOR . $name;
    if (!move_uploaded_file($file['tmp_name'], $dest)) Response::error('Could not save file');
    $url = Helpers::absUrl(rtrim($cfg['upload_url'], '/') . '/' . $name);
    $id = 'med' . bin2hex(random_bytes(6));
    $pdo->prepare('INSERT INTO media_uploads (id, user_id, path, mime, size_bytes) VALUES (?, ?, ?, ?, ?)')->execute([
        $id, $me['id'], $url, $mime, (int)$file['size'],
    ]);
    Response::json(['url' => $url], 201);
}

function handle_notifications(PDO $pdo, array $cfg, string $method, array $parts, array $me): void
{
    if ($method !== 'GET') Response::error('Method not allowed', 405);
    $since = (int)($_GET['since'] ?? 0);
    $st = $since
        ? $pdo->prepare('SELECT * FROM notifications WHERE user_id = ? AND ts > ? ORDER BY ts DESC LIMIT 30')
        : $pdo->prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY ts DESC LIMIT 40');
    $since ? $st->execute([$me['id'], $since]) : $st->execute([$me['id']]);
    Response::json(Helpers::notifsPublic($pdo, $st->fetchAll()));
}

function instagram_sync_user_feed(PDO $pdo, array $userRow, string $token): int
{
    require_once __DIR__ . '/lib/Instagram.php';

    $media = Instagram::fetchRecentMedia($token);
    $synced = 0;
    foreach ($media as $m) {
        $igId = (string)($m['id'] ?? '');
        if (!$igId) continue;
        $postId = 'ig_' . preg_replace('/[^a-zA-Z0-9_]/', '', $igId);
        $exists = $pdo->prepare('SELECT 1 FROM posts WHERE id = ?');
        $exists->execute([$postId]);
        if ($exists->fetch()) continue;

        $type = strtoupper((string)($m['media_type'] ?? 'IMAGE')) === 'VIDEO' ? 'video' : 'image';
        $url = $m['media_url'] ?? $m['thumbnail_url'] ?? null;
        $ts = isset($m['timestamp']) ? strtotime((string)$m['timestamp']) * 1000 : (int)(microtime(true) * 1000);
        $caption = (string)($m['caption'] ?? '');
        if ($caption === '' || preg_match('/synced from instagram|imported from instagram|open for community rating/i', $caption)) {
            $caption = '';
        }
        $scene = json_encode(['#FFD1E1', '#FFE9A8']);

        $pdo->prepare('INSERT INTO posts (id, author_id, caption, media_url, media_type, from_story, source, scene_json, emoji, likes, premium, ts) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, 0, 0, ?)')->execute([
            $postId, $userRow['id'], $caption, $url, $type, 'instagram', $scene, '📸', $ts,
        ]);
        $synced++;
    }
    return $synced;
}

function instagram_sync_user_stories(PDO $pdo, array $userRow, string $token): int
{
    require_once __DIR__ . '/lib/Instagram.php';
    $igUserId = (string)($userRow['instagram_user_id'] ?? '');
    $items = Instagram::fetchStories($token, $igUserId);
    if (!$items) return 0;

    $authorId = (string)$userRow['id'];
    $storyId = 'ig_ss_' . preg_replace('/[^a-zA-Z0-9_]/', '', $authorId);
    $now = (int)(microtime(true) * 1000);
    $expiresAt = $now + 86400000;

    $exists = $pdo->prepare('SELECT id FROM stories WHERE id = ?');
    $exists->execute([$storyId]);
    if ($exists->fetch()) {
        $pdo->prepare('UPDATE stories SET ts = ?, expires_at = ? WHERE id = ?')->execute([$now, $expiresAt, $storyId]);
    } else {
        $pdo->prepare('INSERT INTO stories (id, author_id, expires_at, ts) VALUES (?, ?, ?, ?)')->execute([
            $storyId, $authorId, $expiresAt, $now,
        ]);
    }

    $synced = 0;
    foreach ($items as $m) {
        $igId = (string)($m['id'] ?? '');
        if (!$igId) continue;
        $itemId = 'ig_si_' . preg_replace('/[^a-zA-Z0-9_]/', '', $igId);
        $existsItem = $pdo->prepare('SELECT 1 FROM story_items WHERE id = ?');
        $existsItem->execute([$itemId]);
        if ($existsItem->fetch()) continue;

        $type = strtoupper((string)($m['media_type'] ?? 'IMAGE')) === 'VIDEO' ? 'video' : 'image';
        $url = $m['media_url'] ?? $m['thumbnail_url'] ?? null;
        $ts = isset($m['timestamp']) ? strtotime((string)$m['timestamp']) * 1000 : $now;
        $scene = json_encode(['#FFD1E1', '#E6DBFF']);

        $pdo->prepare('INSERT INTO story_items (id, story_id, media_url, media_type, emoji, scene_json, ts) VALUES (?, ?, ?, ?, ?, ?, ?)')->execute([
            $itemId, $storyId, $url, $type, '📸', $scene, $ts,
        ]);

        $postId = 'ig_story_' . preg_replace('/[^a-zA-Z0-9_]/', '', $igId);
        $existsPost = $pdo->prepare('SELECT 1 FROM posts WHERE id = ?');
        $existsPost->execute([$postId]);
        if (!$existsPost->fetch()) {
            $caption = (string)($m['caption'] ?? '');
            if ($caption === '') {
                $caption = 'Instagram Story · open for community rating ✨';
            }
            $pdo->prepare('INSERT INTO posts (id, author_id, caption, media_url, media_type, from_story, source, scene_json, emoji, likes, premium, ts) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, 0, 0, ?)')->execute([
                $postId, $authorId, $caption, $url, $type, 'instagram', $scene, '🌅', $ts,
            ]);
        }
        $synced++;
    }
    return $synced;
}

/** @return array{posts:int,stories:int} */
function instagram_sync_user_content(PDO $pdo, array $userRow, bool $forcePast = false): array
{
    if (empty($userRow['instagram_access_token'])) {
        return ['posts' => 0, 'stories' => 0];
    }
    $importPast = $forcePast || !empty($userRow['instagram_import_past']);
    $syncFuture = !empty($userRow['instagram_sync_feed']);
    if (!$importPast && !$syncFuture) {
        return ['posts' => 0, 'stories' => 0];
    }
    $token = (string)$userRow['instagram_access_token'];
    return [
        'posts' => $importPast ? instagram_sync_user_feed($pdo, $userRow, $token) : 0,
        'stories' => $importPast ? instagram_sync_user_stories($pdo, $userRow, $token) : 0,
    ];
}

function instagram_sync_response(PDO $pdo, array $userRow, array $me): array
{
    $counts = instagram_sync_user_content($pdo, $userRow);
    $feed = Helpers::feedRowsForUser($pdo, $me['id']);
    $stFriends = $pdo->prepare('SELECT friend_id FROM friendships WHERE user_id = ?');
    $stFriends->execute([$me['id']]);
    $friendIds = array_column($stFriends->fetchAll(), 'friend_id');
    $storyAuthors = array_values(array_unique([$me['id'], ...$friendIds]));
    return [
        'synced' => $counts['posts'],
        'storiesSynced' => $counts['stories'],
        'feed' => Helpers::postsWithRatings($pdo, $feed),
        'stories' => Helpers::storiesForUser($pdo, $me['id'], $storyAuthors),
    ];
}

function instagram_webhook_sync(PDO $pdo, array $body): void
{
    if (($body['object'] ?? '') !== 'instagram') {
        return;
    }
    foreach ($body['entry'] ?? [] as $entry) {
        if (!is_array($entry)) continue;
        $igUserId = (string)($entry['id'] ?? '');
        if ($igUserId === '') continue;
        $st = $pdo->prepare('SELECT * FROM users WHERE instagram_user_id = ? AND instagram_verified = 1 AND instagram_sync_feed = 1');
        $st->execute([$igUserId]);
        $userRow = $st->fetch();
        if ($userRow) {
            instagram_sync_user_content($pdo, $userRow);
        }
    }
}

function handle_instagram(PDO $pdo, array $cfg, string $method, array $parts, ?array $me): void
{
    require_once __DIR__ . '/lib/Instagram.php';

    $action = $parts[0] ?? '';

    if ($action === 'webhook') {
        $verifyToken = (string)($cfg['instagram_webhook_verify_token'] ?? '');
        if ($method === 'GET') {
            $mode = (string)($_GET['hub_mode'] ?? '');
            $token = (string)($_GET['hub_verify_token'] ?? '');
            $challenge = (string)($_GET['hub_challenge'] ?? '');
            if ($mode === 'subscribe' && $verifyToken !== '' && hash_equals($verifyToken, $token)) {
                header('Content-Type: text/plain; charset=utf-8');
                echo $challenge;
                exit;
            }
            http_response_code(403);
            exit;
        }
        if ($method === 'POST') {
            $body = Helpers::jsonBody();
            try {
                instagram_webhook_sync($pdo, $body);
            } catch (Throwable $e) {
                error_log('Instagram webhook sync: ' . $e->getMessage());
            }
            Response::json(['ok' => true]);
        }
        Response::error('Not found', 404);
    }

    if ($action === 'deletion') {
        if ($method !== 'POST') {
            Response::error('Method not allowed', 405);
        }
        $signed = (string)($_POST['signed_request'] ?? '');
        if ($signed === '') {
            $body = Helpers::jsonBody();
            $signed = (string)($body['signed_request'] ?? '');
        }
        if ($signed === '') {
            Response::error('Missing signed_request', 400);
        }
        $data = Instagram::parseSignedRequest($signed, $cfg);
        if (!$data || empty($data['user_id'])) {
            Response::error('Invalid signed_request', 400);
        }
        $igUserId = (string)$data['user_id'];
        $code = 'DEL-' . strtoupper(substr(hash('sha256', $igUserId . microtime(true)), 0, 10));
        $st = $pdo->prepare('SELECT id FROM users WHERE instagram_user_id = ?');
        $st->execute([$igUserId]);
        $row = $st->fetch();
        if ($row) {
            Helpers::purgeInstagramData($pdo, (string)$row['id']);
        }
        $base = Helpers::siteBase($cfg);
        Response::json([
            'url' => $base . '/data-deletion.html?code=' . rawurlencode($code),
            'confirmation_code' => $code,
        ]);
    }

    if ($action === 'callback' && $method === 'GET') {
        $appUrl = rtrim((string)($cfg['app_url'] ?? 'https://echelon.rsvp/app/'), '/') . '/';
        if (!empty($_GET['error'])) {
            $detail = (string)($_GET['error_description'] ?? $_GET['error_reason'] ?? $_GET['error'] ?? 'oauth');
            header('Location: ' . $appUrl . '?ig=error&reason=oauth&detail=' . rawurlencode($detail));
            exit;
        }
        $code = $_GET['code'] ?? '';
        $state = $_GET['state'] ?? '';
        if (!$code || !$state) {
            header('Location: ' . $appUrl . '?ig=error&reason=missing');
            exit;
        }
        $stateData = Instagram::parseState($state, $cfg);
        if (!$stateData) {
            header('Location: ' . $appUrl . '?ig=error&reason=state');
            exit;
        }
        $userId = $stateData['userId'];
        $importMode = $stateData['importMode'];
        $importPast = in_array($importMode, ['past', 'both'], true);
        $importFuture = in_array($importMode, ['future', 'both'], true);
        if (!Instagram::configured($cfg)) {
            header('Location: ' . $appUrl . '?ig=error&reason=config');
            exit;
        }
        try {
            $tokens = Instagram::exchangeCode($code, $cfg);
            $profile = Instagram::fetchProfile($tokens['access_token']);
            $handle = '@' . ltrim($profile['username'], '@');
            $expires = (int)(microtime(true) * 1000) + ($tokens['expires_in'] * 1000);

            $st = $pdo->prepare('SELECT * FROM users WHERE id = ?');
            $st->execute([$userId]);
            $userRow = $st->fetch();
            if (!$userRow) {
                header('Location: ' . $appUrl . '?ig=error&reason=user');
                exit;
            }

            $wasVerified = (bool)$userRow['instagram_verified'];
            $pdo->prepare('UPDATE users SET instagram_handle = ?, instagram_user_id = ?, instagram_access_token = ?, instagram_token_expires = ?, instagram_verified = 1, instagram_sync_feed = ?, instagram_import_past = ? WHERE id = ?')->execute([
                $handle, $profile['id'] ?: $tokens['user_id'], $tokens['access_token'], $expires,
                $importFuture ? 1 : 0, $importPast ? 1 : 0, $userId,
            ]);

            $st->execute([$userId]);
            $userRow = $st->fetch();

            if (!$wasVerified) {
                echelon_adjust_score($pdo, $userId, Instagram::verifyBonus(), 'rating', 'Instagram verified', 'Your linked Instagram earned +' . Instagram::verifyBonus() . ' trust.', null);
            }
            if ($importPast) {
                instagram_sync_user_content($pdo, $userRow, true);
            }

            header('Location: ' . $appUrl . '?ig=connected');
        } catch (Throwable $e) {
            error_log('Instagram OAuth: ' . $e->getMessage());
            header('Location: ' . $appUrl . '?ig=error&reason=oauth&detail=' . rawurlencode($e->getMessage()));
        }
        exit;
    }

    if (!$me) Response::error('Unauthorized', 401);

    if ($action === 'auth' && $method === 'GET') {
        if (!Instagram::configured($cfg)) Response::error('Instagram is not configured on the server', 503);
        $importMode = Instagram::normalizeImportMode((string)($_GET['importMode'] ?? 'both'));
        $redirectUri = Instagram::redirectUri($cfg);
        Response::json([
            'url' => Instagram::authorizeUrl($me['id'], $cfg, $importMode),
            'redirectUri' => $redirectUri,
            'scopes' => Instagram::scopes(),
            'importMode' => $importMode,
        ]);
    }

    if ($action === 'status' && $method === 'GET') {
        Response::json([
            'connected' => (bool)$me['instagram_verified'],
            'instagram' => Helpers::userPublic($me)['instagram'] ?? null,
        ]);
    }

    if ($action === 'sync' && $method === 'POST') {
        if (empty($me['instagram_verified'])) Response::error('Instagram not connected');
        $st = $pdo->prepare('SELECT * FROM users WHERE id = ?');
        $st->execute([$me['id']]);
        $userRow = $st->fetch();
        Response::json(instagram_sync_response($pdo, $userRow, $me));
    }

    if ($action === 'sync-feed' && $method === 'PATCH') {
        if (empty($me['instagram_verified'])) Response::error('Instagram not connected');
        $body = Helpers::jsonBody();
        if (!array_key_exists('syncFeed', $body)) Response::error('syncFeed required');
        $syncFeed = !empty($body['syncFeed']) ? 1 : 0;
        $pdo->prepare('UPDATE users SET instagram_sync_feed = ? WHERE id = ?')->execute([$syncFeed, $me['id']]);
        $st = $pdo->prepare('SELECT * FROM users WHERE id = ?');
        $st->execute([$me['id']]);
        $userRow = $st->fetch();
        if ($syncFeed) {
            instagram_sync_user_content($pdo, $userRow);
            $st->execute([$me['id']]);
            $userRow = $st->fetch();
        }
        Response::json([
            'instagram' => Helpers::userPublic($userRow)['instagram'],
        ]);
    }

    if ($action === 'disconnect' && $method === 'POST') {
        require_once __DIR__ . '/lib/Instagram.php';
        if (!empty($me['instagram_verified'])) {
            echelon_adjust_score(
                $pdo,
                $me['id'],
                -Instagram::verifyBonus(),
                'rating',
                'Instagram disconnected',
                'Verification bonus removed.',
                null
            );
        }
        $pdo->prepare("DELETE FROM posts WHERE author_id = ? AND source = 'instagram'")->execute([$me['id']]);
        $pdo->prepare('UPDATE users SET instagram_handle = NULL, instagram_user_id = NULL, instagram_access_token = NULL, instagram_token_expires = NULL, instagram_verified = 0, instagram_sync_feed = 0 WHERE id = ?')->execute([$me['id']]);
        $fresh = $pdo->prepare('SELECT * FROM users WHERE id = ?');
        $fresh->execute([$me['id']]);
        Response::json(['ok' => true, 'user' => Helpers::userPublic($fresh->fetch())]);
    }

    Response::error('Not found', 404);
}

function spark_bootstrap(PDO $pdo, array $me): array
{
    require_once __DIR__ . '/lib/Spark.php';
    try {
        $matches = Spark::matchesForUser($pdo, $me['id']);
        $st = $pdo->prepare(
            'SELECT COUNT(*) FROM spark_swipes s
             WHERE s.to_user_id = ? AND s.action IN (?, ?)
             AND NOT EXISTS (
               SELECT 1 FROM spark_matches m
               WHERE (m.user_a = s.from_user_id AND m.user_b = s.to_user_id)
                  OR (m.user_a = s.to_user_id AND m.user_b = s.from_user_id)
             )'
        );
        $st->execute([$me['id'], 'like', 'super']);
        $likesReceived = (int) $st->fetchColumn();
        return [
            'matches' => $matches,
            'likesReceived' => $likesReceived,
            'preferences' => Spark::preferencesForUser($pdo, $me['id']),
        ];
    } catch (Throwable $e) {
        error_log('Spark bootstrap: ' . $e->getMessage());
        return ['matches' => [], 'likesReceived' => 0, 'preferences' => Spark::defaultPreferences()];
    }
}

function handle_spark(PDO $pdo, array $cfg, string $method, array $parts, array $me): void
{
    require_once __DIR__ . '/lib/Spark.php';
    $sub = $parts[0] ?? '';

    if ($sub === 'deck' && $method === 'GET') {
        if (empty($me['height_m'])) {
            Response::json([
                'deck' => [],
                'needsHeight' => true,
                'preferences' => Spark::preferencesForUser($pdo, $me['id']),
            ]);
        }
        $deck = Spark::deckForUser($pdo, $me);
        Response::json([
            'deck' => $deck,
            'recycled' => !empty($deck) && !empty($deck[0]['sparkRecycled']),
            'needsHeight' => false,
            'preferences' => Spark::preferencesForUser($pdo, $me['id']),
        ]);
    }

    if ($sub === 'preferences') {
        if ($method === 'GET') {
            Response::json(['preferences' => Spark::preferencesForUser($pdo, $me['id'])]);
        }
        if ($method === 'PATCH') {
            $body = Helpers::jsonBody();
            $prefs = Spark::preferencesForUser($pdo, $me['id']);
            $map = [
                'minScore' => 'spark_min_score', 'maxScore' => 'spark_max_score',
                'minAge' => 'spark_min_age', 'maxAge' => 'spark_max_age',
                'maxDistanceMi' => 'spark_max_distance_mi',
                'minHeightM' => 'spark_min_height_m', 'maxHeightM' => 'spark_max_height_m',
            ];
            $fields = [];
            $params = [];
            foreach ($map as $k => $col) {
                if (!array_key_exists($k, $body)) continue;
                $val = $body[$k];
                if (str_contains($col, 'score') || str_contains($col, 'height') || str_contains($col, 'distance')) {
                    $val = round((float)$val, str_contains($col, 'score') ? 2 : (str_contains($col, 'height') ? 2 : 2));
                } else {
                    $val = (int)$val;
                }
                $fields[] = "$col = ?";
                $params[] = $val;
                $prefs[$k] = $val;
            }
            if ($fields) {
                $params[] = $me['id'];
                $pdo->prepare('UPDATE user_settings SET ' . implode(', ', $fields) . ' WHERE user_id = ?')->execute($params);
            }
            Response::json(['preferences' => Spark::preferencesForUser($pdo, $me['id'])]);
        }
        Response::error('Method not allowed', 405);
    }

    if ($sub === 'matches' && $method === 'GET') {
        Response::json(['matches' => Spark::matchesForUser($pdo, $me['id'])]);
    }

    if ($sub === 'likes' && $method === 'GET') {
        $st = $pdo->prepare(
            'SELECT u.* FROM spark_swipes s
             JOIN users u ON u.id = s.from_user_id
             WHERE s.to_user_id = ? AND s.action IN (?, ?)
             AND NOT EXISTS (
               SELECT 1 FROM spark_matches m
               WHERE (m.user_a = s.from_user_id AND m.user_b = s.to_user_id)
                  OR (m.user_a = s.to_user_id AND m.user_b = s.from_user_id)
             )
             ORDER BY s.ts DESC LIMIT 40'
        );
        $st->execute([$me['id'], 'like', 'super']);
        $users = array_map([Helpers::class, 'userPublic'], $st->fetchAll());
        Response::json(['likes' => $users]);
    }

    if ($sub === 'swipe' && $method === 'POST') {
        $body = Helpers::jsonBody();
        $targetId = trim((string) ($body['targetId'] ?? ''));
        $action = (string) ($body['action'] ?? 'like');
        if (!$targetId || $targetId === $me['id']) Response::error('Invalid target', 400);
        if (!in_array($action, ['like', 'pass', 'super'], true)) Response::error('Invalid action', 400);

        $st = $pdo->prepare('SELECT * FROM users WHERE id = ?');
        $st->execute([$targetId]);
        $target = $st->fetch();
        if (!$target) Response::error('User not found', 404);

        if (empty($me['height_m'])) {
            Response::error('Set your height before using Spark', 403);
        }

        $friendSt = $pdo->prepare('SELECT 1 FROM friendships WHERE user_id = ? AND friend_id = ?');
        $friendSt->execute([$me['id'], $targetId]);
        if ($friendSt->fetch()) Response::error('Already friends', 409);

        $prevSt = $pdo->prepare('SELECT action FROM spark_swipes WHERE from_user_id = ? AND to_user_id = ?');
        $prevSt->execute([$me['id'], $targetId]);
        $prevSwipe = $prevSt->fetch();
        $isNewSwipe = !$prevSwipe;

        if ($isNewSwipe && !Spark::passesFilters($me, $target, Spark::preferencesForUser($pdo, $me['id']))) {
            Response::error('User outside your Spark filters', 403);
        }

        $ts = (int) (microtime(true) * 1000);
        $passCount = $action === 'pass' ? 1 : 0;
        $pdo->prepare(
            'INSERT INTO spark_swipes (from_user_id, to_user_id, action, ts, pass_count) VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
               action = VALUES(action),
               ts = VALUES(ts),
               pass_count = IF(VALUES(action) = \'pass\', pass_count + 1, pass_count)'
        )->execute([$me['id'], $targetId, $action, $ts, $passCount]);

        Spark::maybeApplySwipeScoreNudge($pdo, $me['id'], $target, $action);

        $matched = false;
        $matchId = null;
        $peer = null;

        if ($action === 'like' || $action === 'super') {
            $rev = $pdo->prepare(
                'SELECT 1 FROM spark_swipes WHERE from_user_id = ? AND to_user_id = ? AND action IN (?, ?)'
            );
            $rev->execute([$targetId, $me['id'], 'like', 'super']);
            if ($rev->fetch()) {
                $matchId = Spark::ensureMatch($pdo, $me['id'], $targetId);
                $matched = true;
                $peer = Helpers::userPublic($target);

                echelon_notify(
                    $pdo,
                    $targetId,
                    'spark_match',
                    "It's a Spark! ✨",
                    $me['name'] . ' matched with you. Say hello.',
                    $me['id'],
                    $matchId
                );
                echelon_notify(
                    $pdo,
                    $me['id'],
                    'spark_match',
                    "It's a Spark! ✨",
                    $target['name'] . ' matched with you. Say hello.',
                    $targetId,
                    $matchId
                );
            } elseif ($action === 'super') {
                echelon_notify(
                    $pdo,
                    $targetId,
                    'spark_super',
                    'Super Spark! ⚡',
                    $me['name'] . ' Super Sparked you.',
                    $me['id'],
                    null
                );
            }
        }

        Response::json([
            'ok' => true,
            'matched' => $matched,
            'matchId' => $matchId,
            'peer' => $peer,
        ]);
    }

    if ($sub === 'can' && $method === 'GET') {
        $targetId = trim((string) ($_GET['targetId'] ?? ''));
        if (!$targetId) Response::error('targetId required', 400);
        $st = $pdo->prepare('SELECT * FROM users WHERE id = ?');
        $st->execute([$targetId]);
        $row = $st->fetch();
        if (!$row) Response::error('User not found', 404);
        $prefs = Spark::preferencesForUser($pdo, $me['id']);
        Response::json([
            'canLike' => Spark::passesFilters($me, $row, $prefs),
            'preferences' => $prefs,
        ]);
    }

    Response::error('Not found', 404);
}
