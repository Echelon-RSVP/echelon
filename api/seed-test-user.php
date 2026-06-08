<?php
declare(strict_types=1);

/**
 * Idempotent seed: test account (login: test / test or @test / test).
 * GET /api/seed-test-user.php?key=<install_key>
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/lib/Database.php';
require_once __DIR__ . '/lib/Response.php';
require_once __DIR__ . '/lib/UserFactory.php';
require_once __DIR__ . '/lib/Helpers.php';

const TEST_USER_ID = 'test01';
const TEST_POST_ID = 'ptest_ui';
const TEST_EMAIL = 'test@test.com';
const TEST_PASSWORD = 'test';
const TEST_HANDLE = '@test';
const TEST_NAME = 'test';
const TEST_POST_IMAGE = 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=1080&q=80';
const FRIEND_IDS = ['c1', 'c2', 'c9', 'c4'];

$cfg = require __DIR__ . '/config.php';
$key = $_GET['key'] ?? '';
if (!$key || !hash_equals($cfg['install_key'] ?? '', $key)) {
    Response::error('Forbidden', 403);
}

function execSqlFile(PDO $pdo, string $path): void
{
    if (!is_file($path)) return;
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

function ensureDiscoverPosts(PDO $pdo): int
{
    $now = (int)(microtime(true) * 1000);
    $rows = [
        ['p_disc_1', 'c1', 'morning light + oat flat white', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=1080&q=80', 4.8, $now - 3600000],
        ['p_disc_2', 'c9', 'petals before pilates ✨', 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=1080&q=80', 4.9, $now - 7200000],
        ['p_disc_3', 'c2', 'checked in early · see you tier-side', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1080&q=80', 4.6, $now - 10800000],
        ['p_disc_4', 'c4', 'matcha + gratitude list', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=1080&q=80', 4.1, $now - 14400000],
    ];
    $count = 0;
    foreach ($rows as [$id, $author, $caption, $media, $avgHint, $ts]) {
        $pdo->prepare(
            'INSERT INTO posts (id, author_id, caption, media_url, media_type, from_story, source, scene_json, emoji, likes, premium, ts)
             VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, 0, ?)
             ON DUPLICATE KEY UPDATE caption = VALUES(caption), media_url = VALUES(media_url), media_type = VALUES(media_type), ts = VALUES(ts), likes = GREATEST(likes, VALUES(likes))'
        )->execute([
            $id,
            $author,
            $caption,
            $media,
            'image',
            'echelon',
            '["#FFE9A8","#FFC6DA"]',
            '✨',
            200 + $count * 40,
            $ts,
        ]);
        $count++;
    }
    return $count;
}

try {
    $pdo = Database::pdo($cfg);
    $pdo->beginTransaction();

    execSqlFile($pdo, __DIR__ . '/database/seed.sql');

    $hash = password_hash(TEST_PASSWORD, PASSWORD_DEFAULT);
    $existing = UserFactory::findByIdentifier($pdo, 'test');

    if ($existing) {
        $pdo->prepare(
            'UPDATE users SET email = ?, password_hash = ?, auth_method = ?, name = ?, handle = ?, onboarded = 1,
             score = GREATEST(score, 4.50), locked = 0, birth_year = 1998, height_m = 1.72 WHERE id = ?'
        )->execute([TEST_EMAIL, $hash, 'password', TEST_NAME, TEST_HANDLE, $existing['id']]);
        $userId = $existing['id'];
    } else {
        $st = $pdo->prepare('SELECT id FROM users WHERE id = ? OR handle = ?');
        $st->execute([TEST_USER_ID, TEST_HANDLE]);
        if ($st->fetch()) {
            Response::error('Handle @test already taken by another account', 409);
        }
        $pdo->prepare(
            'INSERT INTO users (id, email, password_hash, auth_method, name, handle, emoji, color, score, miles, lens_on, lens_x, lens_y, uid_code, onboarded, birth_year, height_m)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)'
        )->execute([
            TEST_USER_ID,
            TEST_EMAIL,
            $hash,
            'password',
            TEST_NAME,
            TEST_HANDLE,
            '✨',
            '#E6DBFF',
            4.50,
            0.50,
            1,
            50,
            50,
            'ID-TEST',
            1998,
            1.72,
        ]);
        $pdo->prepare('INSERT IGNORE INTO user_settings (user_id) VALUES (?)')->execute([TEST_USER_ID]);
        $userId = TEST_USER_ID;
    }

    $st = $pdo->prepare('SELECT 1 FROM user_settings WHERE user_id = ?');
    $st->execute([$userId]);
    if (!$st->fetch()) {
        $pdo->prepare('INSERT INTO user_settings (user_id) VALUES (?)')->execute([$userId]);
    }

    $postTs = (int)(microtime(true) * 1000) - 1800000;
    $style = json_encode(['musicTitle' => 'Echelon · UI Test Track', 'uiTest' => true], JSON_UNESCAPED_UNICODE);
    $pdo->prepare(
        'INSERT INTO posts (id, author_id, caption, media_url, media_type, from_story, source, scene_json, emoji, likes, premium, caption_style_json, ts)
         VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, 128, 0, ?, ?)
         ON DUPLICATE KEY UPDATE author_id = VALUES(author_id), caption = VALUES(caption), media_url = VALUES(media_url),
         media_type = VALUES(media_type), caption_style_json = VALUES(caption_style_json), ts = VALUES(ts), likes = GREATEST(likes, 128)'
    )->execute([
        TEST_POST_ID,
        $userId,
        'UI test post · rate, like, comment, and share freely',
        TEST_POST_IMAGE,
        'image',
        'echelon',
        '["#FFE9A8","#FFC6DA"]',
        '✨',
        $style,
        $postTs,
    ]);

    $friends = ensureFriendships($pdo, $userId);
    $discoverPosts = ensureDiscoverPosts($pdo);

    $pdo->commit();

    Response::json([
        'ok' => true,
        'userId' => $userId,
        'postId' => TEST_POST_ID,
        'handle' => TEST_HANDLE,
        'email' => TEST_EMAIL,
        'password' => TEST_PASSWORD,
        'friendsSeeded' => $friends,
        'discoverPosts' => $discoverPosts,
        'loginHint' => 'Sign in with identifier "test" or "@test" and password "test"',
    ]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    Response::error($e->getMessage(), 500);
}
