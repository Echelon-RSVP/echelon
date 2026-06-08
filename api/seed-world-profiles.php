<?php
declare(strict_types=1);

/**
 * Idempotent seed: 100+ international women test profiles + feed posts.
 * GET /api/seed-world-profiles.php?key=<install_key>
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/lib/Database.php';
require_once __DIR__ . '/lib/Response.php';

$cfg = require __DIR__ . '/config.php';
$key = $_GET['key'] ?? '';
if (!$key || !hash_equals($cfg['install_key'] ?? '', $key)) {
    Response::error('Forbidden', 403);
}

$dataPath = __DIR__ . '/world-profiles.json';
if (!is_file($dataPath)) {
    Response::error('world-profiles.json missing; run npm run gen:world-profiles', 500);
}

$bundle = json_decode((string)file_get_contents($dataPath), true);
$profiles = $bundle['profiles'] ?? null;
$posts = $bundle['posts'] ?? null;
if (!is_array($profiles) || !is_array($posts)) {
    Response::error('Invalid world-profiles.json', 500);
}

try {
    $pdo = Database::pdo($cfg);
    $now = (int)(microtime(true) * 1000);

    $userSt = $pdo->prepare(
        'INSERT INTO users (id, name, handle, emoji, color, score, miles, lat, lng, lens_on, lens_x, lens_y,
         uid_code, onboarded, avatar_url, birth_year, height_m)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           name=VALUES(name), handle=VALUES(handle), emoji=VALUES(emoji), color=VALUES(color),
           score=VALUES(score), miles=VALUES(miles), lat=VALUES(lat), lng=VALUES(lng),
           lens_on=VALUES(lens_on), avatar_url=VALUES(avatar_url), birth_year=VALUES(birth_year),
           height_m=VALUES(height_m), onboarded=1'
    );

    $usersUpserted = 0;
    foreach ($profiles as $p) {
        $userSt->execute([
            $p['id'],
            $p['name'],
            $p['handle'],
            $p['emoji'] ?? '😊',
            $p['color'] ?? '#FFE0EC',
            $p['score'] ?? 4.0,
            $p['miles'] ?? 0.5,
            $p['lat'] ?? null,
            $p['lng'] ?? null,
            !empty($p['lensOn']) ? 1 : 0,
            (int)($p['lensX'] ?? 50),
            (int)($p['lensY'] ?? 50),
            $p['uid'] ?? null,
            $p['avatarUrl'] ?? null,
            $p['birthYear'] ?? null,
            $p['heightM'] ?? null,
        ]);
        $usersUpserted++;
    }

    $postSt = $pdo->prepare(
        'INSERT INTO posts (id, author_id, caption, media_url, media_type, scene_json, emoji, likes, premium, ts, source)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           caption=VALUES(caption), media_url=VALUES(media_url), likes=VALUES(likes), ts=VALUES(ts)'
    );

    $postsUpserted = 0;
    foreach ($posts as $post) {
        $scene = json_encode($post['scene'] ?? ['#FFE9A8', '#FFC6DA']);
        $postSt->execute([
            $post['id'],
            $post['author'],
            $post['caption'] ?? '',
            $post['mediaUrl'] ?? null,
            $post['mediaType'] ?? 'image',
            $scene,
            $post['emoji'] ?? null,
            (int)($post['likes'] ?? 0),
            !empty($post['premium']) ? 1 : 0,
            (int)($post['ts'] ?? $now),
            $post['source'] ?? 'echelon',
        ]);
        $postsUpserted++;
    }

    Response::json([
        'ok' => true,
        'users' => $usersUpserted,
        'posts' => $postsUpserted,
        'message' => 'World test profiles seeded',
    ]);
} catch (Throwable $e) {
    error_log('seed-world-profiles: ' . $e->getMessage());
    Response::error('Seed failed: ' . $e->getMessage(), 500);
}
