<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/lib/Database.php';
require_once __DIR__ . '/lib/Response.php';

$cfg = require __DIR__ . '/config.php';
$key = $_GET['key'] ?? '';
if (!$key || !hash_equals($cfg['install_key'] ?? '', $key)) {
    Response::error('Forbidden', 403);
}

$sql = file_get_contents(__DIR__ . '/database/migrate-auth.sql');
if (!$sql) Response::error('migrate-auth.sql missing', 500);

try {
    $pdo = Database::pdo($cfg);
    foreach (preg_split('/;\s*\n/', $sql) as $stmt) {
        $stmt = trim($stmt);
        if ($stmt === '' || str_starts_with(strtoupper($stmt), 'SET NAMES')) continue;
        try {
            $pdo->exec($stmt);
        } catch (PDOException $e) {
            if (str_contains($e->getMessage(), 'Duplicate') || str_contains($e->getMessage(), 'already exists')) continue;
            throw $e;
        }
    }
    Response::json(['ok' => true, 'message' => 'Auth migration applied']);
} catch (Throwable $e) {
    Response::error($e->getMessage(), 500);
}
