<?php
declare(strict_types=1);

final class Scoring
{
    public const DAILY_INACTIVITY_FACTOR = 0.99;
    public const FOLLOWER_LOW_QUALITY_RATE = 0.0001;
    public const FOLLOWER_MID_QUALITY_RATE = 0.0005;
    public const FOLLOWER_HIGH_QUALITY_RATE = 0.001;

    public static function clamp(float $s): float
    {
        return max(1.0, min(5.0, $s));
    }

    public static function round2(float $s): float
    {
        return round($s, 2);
    }

    public static function raterInfluence(float $raterScore): float
    {
        return 0.5 + ($raterScore / 5.0);
    }

    public static function nudge(float $current, int $stars, float $raterScore): float
    {
        $inf = self::raterInfluence($raterScore);
        $pull = ($stars - $current) * 0.08 * $inf;
        return self::round2(self::clamp($current + $pull));
    }

    public static function applyDelta(float $current, float $delta): float
    {
        return self::round2(self::clamp($current + $delta));
    }

    public static function applyPercentDelta(float $current, float $rate): float
    {
        return self::round2(self::clamp($current * (1.0 + $rate)));
    }

    private static function ensureMeta(PDO $pdo): void
    {
        $pdo->exec(
            'CREATE TABLE IF NOT EXISTS user_score_meta (
                user_id VARCHAR(32) PRIMARY KEY,
                last_decay_ts BIGINT NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
        );
    }

    public static function markRatingActivity(PDO $pdo, string $userId, ?int $ts = null): void
    {
        self::ensureMeta($pdo);
        $ts ??= (int)(microtime(true) * 1000);
        $st = $pdo->prepare(
            'INSERT INTO user_score_meta (user_id, last_decay_ts) VALUES (?, ?)
             ON DUPLICATE KEY UPDATE last_decay_ts = VALUES(last_decay_ts)'
        );
        $st->execute([$userId, $ts]);
    }

    public static function applyInactivityDecay(PDO $pdo, string $userId): ?array
    {
        self::ensureMeta($pdo);
        $now = (int)(microtime(true) * 1000);
        $dayMs = 86400000;

        $stUser = $pdo->prepare('SELECT score, locked, created_at FROM users WHERE id = ?');
        $stUser->execute([$userId]);
        $user = $stUser->fetch();
        if (!$user) return null;

        $stMeta = $pdo->prepare('SELECT last_decay_ts FROM user_score_meta WHERE user_id = ?');
        $stMeta->execute([$userId]);
        $meta = $stMeta->fetch();

        $stLastRating = $pdo->prepare('SELECT MAX(ts) AS ts FROM ratings WHERE rater_id = ?');
        $stLastRating->execute([$userId]);
        $lastRating = (int)($stLastRating->fetch()['ts'] ?? 0);
        if ($lastRating > 0) {
            $base = max($lastRating, (int)($meta['last_decay_ts'] ?? 0));
        } else {
            $created = isset($user['created_at']) ? strtotime((string)$user['created_at']) * 1000 : $now;
            $base = max($created ?: $now, (int)($meta['last_decay_ts'] ?? 0));
        }

        if ($base <= 0 || $now <= $base) {
            self::markRatingActivity($pdo, $userId, $base > 0 ? $base : $now);
            return ['score' => (float)$user['score'], 'delta' => 0.0, 'days' => 0];
        }

        $days = intdiv($now - $base, $dayMs);
        if ($days <= 0) {
            if (!$meta) self::markRatingActivity($pdo, $userId, $base);
            return ['score' => (float)$user['score'], 'delta' => 0.0, 'days' => 0];
        }

        $prev = (float)$user['score'];
        $next = self::round2(self::clamp($prev * (self::DAILY_INACTIVITY_FACTOR ** $days)));
        $actual = self::round2($next - $prev);
        $locked = (bool)$user['locked'];
        if ($next < 2.6) $locked = true;
        elseif ($next >= 2.8) $locked = false;
        $decayTs = $base + ($days * $dayMs);

        $pdo->prepare('UPDATE users SET score = ?, locked = ? WHERE id = ?')->execute([$next, $locked ? 1 : 0, $userId]);
        $pdo->prepare('INSERT INTO score_history (user_id, score, recorded_at) VALUES (?, ?, ?)')->execute([$userId, $next, $now]);
        self::markRatingActivity($pdo, $userId, $decayTs);

        return ['score' => $next, 'delta' => $actual, 'days' => $days];
    }

    public static function recalculatedUserScore(PDO $pdo, string $userId, ?float $fallback = null): float
    {
        $stUser = $pdo->prepare('SELECT score FROM users WHERE id = ?');
        $stUser->execute([$userId]);
        $row = $stUser->fetch();
        $current = $fallback ?? (float)($row['score'] ?? 3.0);

        $stDirect = $pdo->prepare('SELECT AVG(stars) AS avg_stars FROM ratings WHERE ratee_id = ? AND post_id IS NULL');
        $stDirect->execute([$userId]);
        $direct = $stDirect->fetch()['avg_stars'] ?? null;
        $directAvg = $direct !== null ? (float)$direct : null;

        $stMedia = $pdo->prepare(
            'SELECT AVG(post_avg) AS avg_stars
             FROM (
                SELECT AVG(r.stars) AS post_avg
                FROM posts p
                JOIN ratings r ON r.post_id = p.id
                WHERE p.author_id = ?
                GROUP BY p.id
             ) media_scores'
        );
        $stMedia->execute([$userId]);
        $media = $stMedia->fetch()['avg_stars'] ?? null;
        $mediaAvg = $media !== null ? (float)$media : null;

        if ($directAvg !== null && $mediaAvg !== null) {
            return self::round2(self::clamp(($directAvg * 0.25) + ($mediaAvg * 0.75)));
        }
        if ($mediaAvg !== null) return self::round2(self::clamp($mediaAvg));
        if ($directAvg !== null) return self::round2(self::clamp($directAvg));
        return self::round2(self::clamp($current));
    }

    public static function syncUserScore(PDO $pdo, string $userId, ?float $fallback = null, ?int $ts = null): array
    {
        $ts ??= (int)(microtime(true) * 1000);
        $stUser = $pdo->prepare('SELECT score, locked FROM users WHERE id = ?');
        $stUser->execute([$userId]);
        $user = $stUser->fetch();
        if (!$user) return ['score' => 0.0, 'delta' => 0.0, 'locked' => false];

        $prev = (float)$user['score'];
        $next = self::recalculatedUserScore($pdo, $userId, $fallback ?? $prev);
        $locked = (bool)$user['locked'];
        if ($next < 2.6) $locked = true;
        elseif ($next >= 2.8) $locked = false;
        $delta = self::round2($next - $prev);

        $pdo->prepare('UPDATE users SET score = ?, locked = ? WHERE id = ?')->execute([$next, $locked ? 1 : 0, $userId]);
        $pdo->prepare('INSERT INTO score_history (user_id, score, recorded_at) VALUES (?, ?, ?)')->execute([$userId, $next, $ts]);
        return ['score' => $next, 'delta' => $delta, 'locked' => $locked];
    }
}
