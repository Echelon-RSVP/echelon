<?php
declare(strict_types=1);

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Echelon-Token');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/lib/Database.php';
require_once __DIR__ . '/lib/Response.php';
require_once __DIR__ . '/lib/Auth.php';
require_once __DIR__ . '/lib/Scoring.php';
require_once __DIR__ . '/lib/Helpers.php';
require_once __DIR__ . '/handlers.php';

$cfg = require __DIR__ . '/config.php';
Helpers::setAssetBase(rtrim((string)($cfg['public_url'] ?? 'https://echelon.rsvp'), '/'));
$pdo = null;

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?? '';
$uri = preg_replace('#^/api(/v1)?#', '', $uri);
$uri = trim($uri, '/');
$parts = $uri === '' ? [] : explode('/', $uri);
$resource = $parts[0] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($resource === 'health') {
        Response::json(['ok' => true, 'ts' => time()]);
    }

    $pdo = Database::pdo($cfg);

    if ($resource === 'auth') {
        handle_auth($pdo, $cfg, $method, array_slice($parts, 1));
    }

    if ($resource === 'instagram' && in_array($parts[1] ?? '', ['callback', 'webhook', 'deletion'], true)) {
        handle_instagram($pdo, $cfg, $method, array_slice($parts, 1), null);
    }

    $me = Auth::requireUser($pdo, $cfg);

    match ($resource) {
        'bootstrap' => handle_bootstrap($pdo, $cfg, $method, array_slice($parts, 1), $me),
        'me' => handle_me($pdo, $cfg, $method, array_slice($parts, 1), $me),
        'onboard' => handle_onboard($pdo, $cfg, $method, array_slice($parts, 1), $me),
        'ratings' => handle_ratings($pdo, $cfg, $method, array_slice($parts, 1), $me),
        'friends' => handle_friends($pdo, $cfg, $method, array_slice($parts, 1), $me),
        'posts' => handle_posts($pdo, $cfg, $method, array_slice($parts, 1), $me),
        'stories' => handle_stories($pdo, $cfg, $method, array_slice($parts, 1), $me),
        'events' => handle_events($pdo, $cfg, $method, array_slice($parts, 1), $me),
        'messages' => handle_messages($pdo, $cfg, $method, array_slice($parts, 1), $me),
        'chats' => handle_chats($pdo, $cfg, $method, array_slice($parts, 1), $me),
        'settings' => handle_settings($pdo, $cfg, $method, array_slice($parts, 1), $me),
        'upload' => handle_upload($pdo, $cfg, $method, array_slice($parts, 1), $me),
        'notifications' => handle_notifications($pdo, $cfg, $method, array_slice($parts, 1), $me),
        'instagram' => handle_instagram($pdo, $cfg, $method, array_slice($parts, 1), $me),
        'presence' => handle_presence($pdo, $cfg, $method, array_slice($parts, 1), $me),
        'users' => handle_users($pdo, $cfg, $method, array_slice($parts, 1), $me),
        'spark' => handle_spark($pdo, $cfg, $method, array_slice($parts, 1), $me),
        default => Response::error('Not found', 404),
    };
} catch (Throwable $e) {
    error_log('Echelon API: ' . $e->getMessage());
    Response::error('Server error', 500);
}
