<?php
declare(strict_types=1);

/**
 * Idempotent seed for Meta App Review test account + community mock data.
 * GET /api/seed-meta-reviewer.php?key=<install_key>
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/lib/Database.php';
require_once __DIR__ . '/lib/Response.php';
require_once __DIR__ . '/lib/UserFactory.php';
require_once __DIR__ . '/lib/Helpers.php';
require_once __DIR__ . '/lib/Auth.php';

const META_EMAIL = 'meta.reviewer@echelon.rsvp';
const META_PASSWORD = 'EchelonMeta2026!';
const META_USER_ID = 'meta01';
const META_HANDLE = '@metareviewer';
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

function ensureMetaUser(PDO $pdo): string
{
    $hash = password_hash(META_PASSWORD, PASSWORD_DEFAULT);
    $existing = UserFactory::findByEmail($pdo, META_EMAIL);
    $userId = $existing['id'] ?? META_USER_ID;

    if (!$existing) {
        $st = $pdo->prepare('SELECT id FROM users WHERE id = ?');
        $st->execute([META_USER_ID]);
        if ($st->fetch()) {
            $userId = Auth::newUserId($pdo);
        }
        $st = $pdo->prepare('SELECT id FROM users WHERE handle = ?');
        $st->execute([META_HANDLE]);
        if ($st->fetch()) {
            Response::error('Handle @metareviewer already taken by another account', 409);
        }
        $pdo->prepare(
            'INSERT INTO users (id, email, password_hash, auth_method, name, handle, emoji, color, score, miles, lens_on, lens_x, lens_y, uid_code, onboarded)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)'
        )->execute([
            $userId,
            META_EMAIL,
            $hash,
            'password',
            'Meta Reviewer',
            META_HANDLE,
            '✨',
            '#FFE0EC',
            4.25,
            0.42,
            1,
            50,
            50,
            'ID-META1',
        ]);
        $pdo->prepare('INSERT INTO user_settings (user_id) VALUES (?)')->execute([$userId]);
    } else {
        $pdo->prepare(
            'UPDATE users SET email = ?, password_hash = ?, auth_method = ?, name = ?, handle = ?, emoji = ?, color = ?,
             score = ?, miles = ?, lens_on = 1, onboarded = 1, locked = 0 WHERE id = ?'
        )->execute([
            META_EMAIL,
            $hash,
            'password',
            'Meta Reviewer',
            META_HANDLE,
            '✨',
            '#FFE0EC',
            4.25,
            0.42,
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

function ensureScoreHistory(PDO $pdo, string $userId): void
{
    $st = $pdo->prepare('SELECT COUNT(*) FROM score_history WHERE user_id = ?');
    $st->execute([$userId]);
    if ((int)$st->fetchColumn() > 0) return;

    $now = (int)(microtime(true) * 1000);
    $scores = [4.05, 4.08, 4.12, 4.15, 4.18, 4.20, 4.22, 4.25];
    foreach ($scores as $i => $score) {
        $pdo->prepare('INSERT INTO score_history (user_id, score, recorded_at) VALUES (?, ?, ?)')->execute([
            $userId,
            $score,
            $now - (count($scores) - $i) * 86400000,
        ]);
    }
}

function ensureNotifications(PDO $pdo, string $userId): void
{
    $now = (int)(microtime(true) * 1000);
    $rows = [
        ['n_meta_welcome', 'welcome', 'Welcome to Echelon ✨', 'Your Meta review account is ready. Explore Feed, Messages, and Connect Instagram in Settings.', null, null, null, null, $now - 3600000],
        ['n_meta_rate1', 'rating', 'Naomi rated you ★★★★★', 'Warm energy · +0.04 to your score', 'c1', 5, 0.04, 'Warm energy', $now - 7200000],
        ['n_meta_friend', 'friend', 'You are now friends', 'You and Iris Moon are connected.', 'c9', null, null, null, $now - 86400000],
        ['n_meta_req', 'friend_request', 'Friend request', 'Davey Cruz wants to connect on Echelon.', 'c6', null, null, null, $now - 1800000],
    ];
    foreach ($rows as $r) {
        $pdo->prepare(
            'INSERT INTO notifications (id, user_id, kind, title, body, rater_id, stars, delta, tag, ts)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE title = VALUES(title), body = VALUES(body), ts = VALUES(ts)'
        )->execute([$r[0], $userId, $r[1], $r[2], $r[3], $r[4], $r[5], $r[6], $r[7], $r[8]]);
    }

    $st = $pdo->prepare('SELECT id FROM friend_requests WHERE from_user_id = ? AND to_user_id = ?');
    $st->execute(['c6', $userId]);
    if (!$st->fetch()) {
        $pdo->prepare('INSERT INTO friend_requests (id, from_user_id, to_user_id, status, ts) VALUES (?, ?, ?, ?, ?)')->execute([
            'fr_meta_c6', 'c6', $userId, 'pending', $now - 1800000,
        ]);
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
        'p_meta01',
        $userId,
        'Review account · radiant morning on Echelon ✨ open for community rating',
        '["#FFE9A8","#FFD1E1"]',
        '🌸',
        42,
        0,
        $now - 5400000,
    ]);
}

function ensureRsvp(PDO $pdo, string $userId): void
{
    $now = (int)(microtime(true) * 1000);
    $pdo->prepare('INSERT IGNORE INTO event_rsvps (user_id, event_id, ts) VALUES (?, ?, ?)')->execute([
        $userId, 'ev2', $now - 86400000,
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
        $msgId = 'msg_meta_' . $contactId . '_' . $i;
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

    $userId = ensureMetaUser($pdo);
    $friendCount = ensureFriendships($pdo, $userId);
    ensureScoreHistory($pdo, $userId);
    ensureNotifications($pdo, $userId);
    ensureReviewerPost($pdo, $userId);
    ensureRsvp($pdo, $userId);

    seedConversation($pdo, $userId, 'c1', [
        ['from' => 'c1', 'text' => 'Hey! Good to see you on Echelon ✨'],
        ['from' => $userId, 'text' => 'Hi Naomi! Loving the feed so far 🤍'],
        ['from' => 'c1', 'text' => 'Try the stories row at the top — tap through friends\' updates!'],
    ]);
    seedConversation($pdo, $userId, 'c9', [
        ['from' => 'c9', 'text' => 'Welcome to the radiance tier 🌸'],
        ['from' => $userId, 'text' => 'Thanks Iris! This app is beautiful'],
        ['from' => 'c9', 'text' => 'Share a post via DM — tap Send on any post 💬'],
    ]);
    seedConversation($pdo, $userId, 'c2', [
        ['from' => 'c2', 'text' => 'Ready to rate some moments today? 😁'],
        ['from' => $userId, 'text' => 'Always! Lens mode is fun too'],
    ]);

    $pdo->commit();

    Response::json([
        'ok' => true,
        'message' => 'Meta reviewer account seeded',
        'email' => META_EMAIL,
        'userId' => $userId,
        'friends' => $friendCount,
        'onboarded' => true,
        'loginUrl' => rtrim($cfg['app_url'] ?? 'https://echelon.rsvp/app/', '/'),
    ]);
} catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    Response::error($e->getMessage(), 500);
}
