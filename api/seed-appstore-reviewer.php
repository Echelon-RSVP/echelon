<?php
declare(strict_types=1);

/**
 * Idempotent seed for Apple App Store review demo account.
 * GET /api/seed-appstore-reviewer.php?key=<install_key>
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/lib/Database.php';
require_once __DIR__ . '/lib/Response.php';
require_once __DIR__ . '/lib/UserFactory.php';
require_once __DIR__ . '/lib/Helpers.php';
require_once __DIR__ . '/lib/Auth.php';

const REVIEW_EMAIL = 'review@echelon.rsvp';
const REVIEW_PASSWORD = 'EchelonReview2026!';
const REVIEW_USER_ID = 'apprev01';
const REVIEW_HANDLE = '@appreview';
const FRIEND_IDS = ['c1', 'c2', 'c9', 'c4', 'c3'];

$cfg = require __DIR__ . '/config.php';
$key = $_GET['key'] ?? '';
if (!$key || !hash_equals($cfg['install_key'] ?? '', $key)) {
    Response::error('Forbidden', 403);
}

function execSqlFile(PDO $pdo, string $path): void
{
    $sql = file_get_contents($path);
    if (!$sql) return;
    foreach (preg_split('/;\s*\n/', $sql) as $stmt) {
        $stmt = trim($stmt);
        if ($stmt === '' || str_starts_with(strtoupper($stmt), 'SET NAMES')) continue;
        try {
            $pdo->exec($stmt);
        } catch (PDOException $e) {
            $msg = $e->getMessage();
            if (
                str_contains($msg, 'Duplicate')
                || str_contains($msg, 'already exists')
                || str_contains($msg, 'Duplicate column')
                || str_contains($msg, 'Duplicate key name')
            ) {
                continue;
            }
            throw $e;
        }
    }
}

function ensureReviewUser(PDO $pdo): string
{
    $hash = password_hash(REVIEW_PASSWORD, PASSWORD_DEFAULT);
    $existing = UserFactory::findByEmail($pdo, REVIEW_EMAIL);
    $userId = $existing['id'] ?? REVIEW_USER_ID;

    if (!$existing) {
        $st = $pdo->prepare('SELECT id FROM users WHERE id = ?');
        $st->execute([REVIEW_USER_ID]);
        if ($st->fetch()) {
            $userId = Auth::newUserId($pdo);
        }
        $st = $pdo->prepare('SELECT id FROM users WHERE handle = ?');
        $st->execute([REVIEW_HANDLE]);
        if ($st->fetch()) {
            Response::error('Handle @appreview already taken by another account', 409);
        }
        $pdo->prepare(
            'INSERT INTO users (id, email, password_hash, auth_method, name, handle, emoji, color, score, miles, lens_on, lens_x, lens_y, uid_code, onboarded, birth_year, height_m)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)'
        )->execute([
            $userId,
            REVIEW_EMAIL,
            $hash,
            'password',
            'Jordan Lee',
            REVIEW_HANDLE,
            '✨',
            '#E8DEFF',
            4.38,
            0.42,
            1,
            50,
            50,
            'ID-AREV1',
            1995,
            1.75,
        ]);
        $pdo->prepare('INSERT INTO user_settings (user_id) VALUES (?)')->execute([$userId]);
    } else {
        $pdo->prepare(
            'UPDATE users SET email = ?, password_hash = ?, auth_method = ?, name = ?, handle = ?, emoji = ?, color = ?,
             score = ?, miles = ?, lens_on = 1, onboarded = 1, locked = 0, birth_year = ?, height_m = ? WHERE id = ?'
        )->execute([
            REVIEW_EMAIL,
            $hash,
            'password',
            'Jordan Lee',
            REVIEW_HANDLE,
            '✨',
            '#E8DEFF',
            4.38,
            0.42,
            1995,
            1.75,
            $userId,
        ]);
        $st = $pdo->prepare('SELECT 1 FROM user_settings WHERE user_id = ?');
        $st->execute([$userId]);
        if (!$st->fetch()) {
            $pdo->prepare('INSERT INTO user_settings (user_id) VALUES (?)')->execute([$userId]);
        }
    }

    return $userId;
}

function ensureFriendships(PDO $pdo, string $userId): int
{
    $count = 0;
    foreach (FRIEND_IDS as $friendId) {
        $st = $pdo->prepare('SELECT 1 FROM users WHERE id = ?');
        $st->execute([$friendId]);
        if (!$st->fetch()) continue;
        $pdo->prepare('INSERT IGNORE INTO friendships (user_id, friend_id) VALUES (?, ?), (?, ?)')->execute([
            $userId, $friendId, $friendId, $userId,
        ]);
        $count++;
    }
    return $count;
}

function ensureLensReviewLocations(PDO $pdo, string $userId): void
{
    $now = (int)(microtime(true) * 1000);
    $rows = [
        [$userId, 38.722252, -9.139337, 1, 0],
        ['c1', 38.723150, -9.138210, 1, 0],
        ['c9', 38.721410, -9.140880, 1, 0],
        ['c4', 38.724040, -9.136950, 1, 0],
    ];
    foreach ($rows as [$id, $lat, $lng, $lensOn, $mapHidden]) {
        $st = $pdo->prepare('SELECT 1 FROM users WHERE id = ?');
        $st->execute([$id]);
        if (!$st->fetch()) continue;
        $pdo->prepare(
            'UPDATE users SET lat = ?, lng = ?, location_ts = ?, lens_on = ?, map_hidden = ? WHERE id = ?'
        )->execute([$lat, $lng, $now, $lensOn, $mapHidden, $id]);
    }
}

function ensureScoreHistory(PDO $pdo, string $userId): void
{
    $st = $pdo->prepare('SELECT COUNT(*) FROM score_history WHERE user_id = ?');
    $st->execute([$userId]);
    if ((int)$st->fetchColumn() > 0) return;

    $now = (int)(microtime(true) * 1000);
    $scores = [4.05, 4.12, 4.22, 4.31, 4.38];
    foreach ($scores as $i => $score) {
        $pdo->prepare('INSERT INTO score_history (user_id, score, recorded_at) VALUES (?, ?, ?)')->execute([
            $userId,
            $score,
            $now - (count($scores) - $i) * 86400000 * 7,
        ]);
    }
}

function ensureNotifications(PDO $pdo, string $userId): void
{
    $now = (int)(microtime(true) * 1000);
    $rows = [
        ['n_arev_welcome', 'welcome', 'Welcome to Echelon', 'Your review demo account is ready. Explore Feed, Messages, Match, and Map.', null, null, null, null, $now - 3600000],
        ['n_arev_rate1', 'rating', 'Naomi rated you ★★★★★', 'Warm energy · +0.04 to your score', 'c1', 5, 0.04, 'Warm energy', $now - 7200000],
        ['n_arev_friend', 'friend', 'You are now friends', 'You and Iris Moon are connected.', 'c9', null, null, null, $now - 86400000],
    ];
    foreach ($rows as $r) {
        $pdo->prepare(
            'INSERT INTO notifications (id, user_id, kind, title, body, rater_id, stars, delta, tag, ts)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE title = VALUES(title), body = VALUES(body), ts = VALUES(ts)'
        )->execute([$r[0], $userId, $r[1], $r[2], $r[3], $r[4], $r[5], $r[6], $r[7], $r[8]]);
    }
}

function ensureReviewerPost(PDO $pdo, string $userId): void
{
    $now = (int)(microtime(true) * 1000);
    $pdo->prepare(
        'INSERT INTO posts (id, author_id, caption, scene_json, emoji, likes, premium, ts)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE caption = VALUES(caption), ts = VALUES(ts)'
    )->execute([
        'p_arev01',
        $userId,
        'Golden hour on the Tagus 🌅',
        '["#FFF8F0","#FFE8D6"]',
        '🌅',
        412,
        0,
        $now - 5400000,
    ]);
}

function seedConversation(PDO $pdo, string $userId, string $contactId, array $messages): void
{
    $st = $pdo->prepare('SELECT 1 FROM users WHERE id = ?');
    $st->execute([$contactId]);
    if (!$st->fetch()) return;

    $convId = Helpers::ensureConversation($pdo, $userId, $contactId);
    $st = $pdo->prepare('SELECT COUNT(*) FROM messages WHERE conversation_id = ?');
    $st->execute([$convId]);
    if ((int)$st->fetchColumn() > 0) return;

    $ts = (int)(microtime(true) * 1000) - count($messages) * 120000;
    foreach ($messages as $i => $m) {
        $msgId = 'msg_arev_' . $contactId . '_' . $i;
        $pdo->prepare(
            'INSERT INTO messages (id, conversation_id, sender_id, body, ts) VALUES (?, ?, ?, ?, ?)'
        )->execute([$msgId, $convId, $m['from'], $m['text'], $ts + $i * 120000]);
    }
    $pdo->prepare('UPDATE conversations SET updated_at = ? WHERE id = ?')->execute([
        $ts + count($messages) * 120000,
        $convId,
    ]);
}

try {
    $pdo = Database::pdo($cfg);
    $pdo->beginTransaction();

    execSqlFile($pdo, __DIR__ . '/database/seed.sql');

    $userId = ensureReviewUser($pdo);
    $friendCount = ensureFriendships($pdo, $userId);
    ensureLensReviewLocations($pdo, $userId);
    ensureScoreHistory($pdo, $userId);
    ensureNotifications($pdo, $userId);
    ensureReviewerPost($pdo, $userId);

    seedConversation($pdo, $userId, 'c1', [
        ['from' => 'c1', 'text' => 'That sunset post is stunning 🌅'],
        ['from' => $userId, 'text' => 'Thanks Naomi! Golden hour on the river'],
        ['from' => 'c1', 'text' => 'Try the stories row at the top of Feed'],
    ]);
    seedConversation($pdo, $userId, 'c9', [
        ['from' => 'c9', 'text' => 'Welcome to Echelon ✨'],
        ['from' => $userId, 'text' => 'Love the design so far'],
    ]);

    $pdo->commit();

    Response::json([
        'ok' => true,
        'message' => 'App Store review account seeded',
        'email' => REVIEW_EMAIL,
        'password' => REVIEW_PASSWORD,
        'userId' => $userId,
        'friends' => $friendCount,
        'onboarded' => true,
        'loginUrl' => rtrim($cfg['app_url'] ?? 'https://echelon.rsvp/app/', '/'),
    ]);
} catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    Response::error($e->getMessage(), 500);
}
