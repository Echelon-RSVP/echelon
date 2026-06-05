<?php
declare(strict_types=1);

final class Auth
{
    public static function tokenFromRequest(): ?string
    {
        $hdr = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['HTTP_X_ECHELON_TOKEN'] ?? '';
        if (preg_match('/Bearer\s+(\S+)/i', $hdr, $m)) return $m[1];
        if ($hdr && !str_contains($hdr, ' ')) return trim($hdr);
        return $_GET['token'] ?? null;
    }

    public static function requireUser(PDO $pdo, array $cfg): array
    {
        $token = self::tokenFromRequest();
        if (!$token) Response::error('Unauthorized', 401);
        $st = $pdo->prepare('SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ? AND s.expires_at > NOW() LIMIT 1');
        $st->execute([$token]);
        $user = $st->fetch();
        if (!$user) Response::error('Invalid or expired session', 401);
        return $user;
    }

    public static function createSession(PDO $pdo, string $userId, int $days): string
    {
        $token = bin2hex(random_bytes(32));
        $st = $pdo->prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? DAY))');
        $st->execute([$token, $userId, $days]);
        return $token;
    }

    public static function newUserId(PDO $pdo): string
    {
        do {
            $id = 'u' . bin2hex(random_bytes(6));
            $st = $pdo->prepare('SELECT 1 FROM users WHERE id = ?');
            $st->execute([$id]);
        } while ($st->fetch());
        return $id;
    }
}
