<?php
declare(strict_types=1);

$local = __DIR__ . '/config.local.php';
if (!is_file($local)) {
    http_response_code(503);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'API not configured. Run setup-db.mjs first.']);
    exit;
}

$cfg = require $local;
if (empty($cfg['google_client_id']) && ($envGoogle = getenv('GOOGLE_CLIENT_ID'))) {
    $cfg['google_client_id'] = trim($envGoogle);
}
if (empty($cfg['instagram_app_id']) && ($v = getenv('INSTAGRAM_APP_ID'))) {
    $cfg['instagram_app_id'] = trim($v);
}
if (empty($cfg['instagram_app_secret']) && ($v = getenv('INSTAGRAM_APP_SECRET'))) {
    $cfg['instagram_app_secret'] = trim($v);
}
return $cfg;
