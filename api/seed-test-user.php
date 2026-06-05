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
require_once __DIR__ . '/lib/Auth.php';

const TEST_USER_ID = 'test01';
const TEST_POST_ID = 'ptest_ui';
const TEST_EMAIL = 'test@test.com';
const TEST_PASSWORD = 'test';
const TEST_HANDLE = '@test';
const TEST_NAME = 'test';
const TEST_POST_IMAGE = 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=1080&q=80';

$cfg = require __DIR__ . '/config.php';
$key = $_GET['key'] ?? '';
if (!$key || !hash_equals($cfg['install_key'] ?? '', $key)) {
    Response::error('Forbidden', 403);
}

try {
    $pdo = Database::pdo($cfg);
    $hash = password_hash(TEST_PASSWORD, PASSWORD_DEFAULT);
    $existing = UserFactory::findByIdentifier($pdo, 'test');

    if ($existing) {
        $pdo->prepare(
            'UPDATE users SET email = ?, password_hash = ?, auth_method = ?, name = ?, handle = ?, onboarded = 1, score = GREATEST(score, 4.20) WHERE id = ?'
        )->execute([TEST_EMAIL, $hash, 'password', TEST_NAME, TEST_HANDLE, $existing['id']]);
        $userId = $existing['id'];
    } else {
        $st = $pdo->prepare('SELECT id FROM users WHERE id = ? OR handle = ?');
        $st->execute([TEST_USER_ID, TEST_HANDLE]);
        if ($st->fetch()) {
            Response::error('Handle @test already taken by another account', 409);
        }
        $pdo->prepare(
            'INSERT INTO users (id, email, password_hash, auth_method, name, handle, emoji, color, score, miles, lens_on, lens_x, lens_y, uid_code, onboarded)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)'
        )->execute([
            TEST_USER_ID,
            TEST_EMAIL,
            $hash,
            'password',
            TEST_NAME,
            TEST_HANDLE,
            '✨',
            '#E6DBFF',
            4.20,
            0.50,
            1,
            50,
            50,
            'ID-TEST',
        ]);
        $pdo->prepare('INSERT IGNORE INTO user_settings (user_id) VALUES (?)')->execute([TEST_USER_ID]);
        $userId = TEST_USER_ID;
    }

    $postTs = (int)(microtime(true) * 1000);
    $postSt = $pdo->prepare('SELECT id FROM posts WHERE id = ?');
    $postSt->execute([TEST_POST_ID]);
    if (!$postSt->fetch()) {
        $style = json_encode(['musicTitle' => 'Echelon · UI Test Track', 'uiTest' => true], JSON_UNESCAPED_UNICODE);
        $pdo->prepare(
            'INSERT INTO posts (id, author_id, caption, media_url, media_type, from_story, source, scene_json, emoji, likes, premium, caption_style_json, ts)
             VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, 128, 0, ?, ?)'
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
    } else {
        $pdo->prepare(
            'UPDATE posts SET author_id = ?, caption = ?, media_url = ?, media_type = ?, likes = GREATEST(likes, 128) WHERE id = ?'
        )->execute([
            $userId,
            'UI test post · rate, like, comment, and share freely',
            TEST_POST_IMAGE,
            'image',
            TEST_POST_ID,
        ]);
    }

    Response::json([
        'ok' => true,
        'userId' => $userId,
        'postId' => TEST_POST_ID,
        'handle' => TEST_HANDLE,
        'email' => TEST_EMAIL,
        'password' => TEST_PASSWORD,
        'loginHint' => 'Sign in with identifier "test" or "@test" and password "test"',
    ]);
} catch (Throwable $e) {
    Response::error($e->getMessage(), 500);
}
