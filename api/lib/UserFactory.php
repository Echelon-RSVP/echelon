<?php
declare(strict_types=1);

final class UserFactory
{
    public static function findByEmail(PDO $pdo, string $email): ?array
    {
        $st = $pdo->prepare('SELECT * FROM users WHERE email = ? LIMIT 1');
        $st->execute([strtolower(trim($email))]);
        $row = $st->fetch();
        return $row ?: null;
    }

    public static function findByIdentifier(PDO $pdo, string $identifier): ?array
    {
        $id = trim($identifier);
        if (str_contains($id, '@') && !str_starts_with($id, '@')) {
            return self::findByEmail($pdo, $id);
        }
        $handle = str_starts_with($id, '@') ? $id : '@' . $id;
        $st = $pdo->prepare('SELECT * FROM users WHERE handle = ? LIMIT 1');
        $st->execute([$handle]);
        $row = $st->fetch();
        return $row ?: null;
    }

    public static function create(PDO $pdo, array $opts): array
    {
        $name = trim($opts['name'] ?? 'Echelon Member') ?: 'Echelon Member';
        $email = isset($opts['email']) ? strtolower(trim($opts['email'])) : null;
        $authMethod = $opts['auth_method'] ?? 'password';
        $id = Auth::newUserId($pdo);
        $handle = $opts['handle'] ?? null;
        if (!$handle) {
            $base = $email ? preg_replace('/[^a-z0-9]/', '', explode('@', $email)[0]) : preg_replace('/[^a-z0-9]/', '', $name);
            $handle = '@' . (strtolower($base) ?: 'member') . random_int(10, 99);
        }
        if (!str_starts_with($handle, '@')) $handle = '@' . $handle;
        $uid = Helpers::uidCode($pdo);
        $colors = ['#FFD1E1', '#FFE9A8', '#D8ECFF', '#E6DBFF', '#CFF5E7', '#FFD9B0'];
        $emojis = ['🙂', '✨', '🌸', '😎', '🫧', '🌿'];

        $st = $pdo->prepare('INSERT INTO users (id, apple_sub, google_sub, email, password_hash, auth_method, name, handle, emoji, color, score, miles, lens_on, lens_x, lens_y, uid_code, onboarded, birth_year) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 3.00, 0.50, 0, 50, 50, ?, 0, ?)');
        $st->execute([
            $id,
            $opts['apple_sub'] ?? null,
            $opts['google_sub'] ?? null,
            $email,
            $opts['password_hash'] ?? null,
            $authMethod,
            $name,
            $handle,
            $emojis[array_rand($emojis)],
            $colors[array_rand($colors)],
            $uid,
            $opts['birth_year'] ?? null,
        ]);
        $pdo->prepare('INSERT INTO user_settings (user_id) VALUES (?)')->execute([$id]);
        $st = $pdo->prepare('SELECT * FROM users WHERE id = ?');
        $st->execute([$id]);
        return $st->fetch();
    }

    public static function sessionResponse(PDO $pdo, array $user, array $cfg): array
    {
        $token = Auth::createSession($pdo, $user['id'], (int)$cfg['session_days']);
        return ['token' => $token, 'user' => Helpers::userPublic($user)];
    }

    public static function isTestCredentials(string $identifier, string $password): bool
    {
        if ($password !== 'test') {
            return false;
        }
        $id = strtolower(trim($identifier));
        return in_array($id, ['test', '@test', 'test@test.com'], true);
    }

    /** Idempotent demo account for App Review / QA (test / test). */
    public static function ensureTestUser(PDO $pdo): array
    {
        $hash = password_hash('test', PASSWORD_DEFAULT);
        $existing = self::findByIdentifier($pdo, 'test');
        if ($existing) {
            $pdo->prepare(
                'UPDATE users SET email = ?, password_hash = ?, auth_method = ?, name = ?, handle = ?, onboarded = 1, score = GREATEST(score, 4.20) WHERE id = ?'
            )->execute(['test@test.com', $hash, 'password', 'test', '@test', $existing['id']]);
            $st = $pdo->prepare('SELECT * FROM users WHERE id = ?');
            $st->execute([$existing['id']]);
            return $st->fetch();
        }
        $id = 'test01';
        $st = $pdo->prepare('SELECT id FROM users WHERE id = ? OR handle = ?');
        $st->execute([$id, '@test']);
        if ($st->fetch()) {
            return self::findByIdentifier($pdo, '@test');
        }
        $pdo->prepare(
            'INSERT INTO users (id, email, password_hash, auth_method, name, handle, emoji, color, score, miles, lens_on, lens_x, lens_y, uid_code, onboarded)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)'
        )->execute([
            $id, 'test@test.com', $hash, 'password', 'test', '@test', '✨', '#E6DBFF', 4.20, 0.50, 1, 50, 50, 'ID-TEST',
        ]);
        $pdo->prepare('INSERT IGNORE INTO user_settings (user_id) VALUES (?)')->execute([$id]);
        $st = $pdo->prepare('SELECT * FROM users WHERE id = ?');
        $st->execute([$id]);
        return $st->fetch();
    }
}
