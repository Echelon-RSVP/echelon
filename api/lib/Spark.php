<?php
declare(strict_types=1);

/** Spark matching with user-defined filters (age, distance, height, rating). */
final class Spark
{
    public const LIKE_SCORE_RATE = 0.0005;
    public const PASS_SCORE_RATE = -0.0005;

    /** @return array<string, mixed> */
    public static function defaultPreferences(): array
    {
        return [
            'minScore' => 1.0,
            'maxScore' => 5.0,
            'minAge' => 18,
            'maxAge' => 99,
            'maxDistanceMi' => 25.0,
            'minHeightM' => 1.40,
            'maxHeightM' => 2.20,
        ];
    }

    /** @return array<string, mixed> */
    public static function preferencesFromRow(array $row): array
    {
        $d = self::defaultPreferences();
        if (!$row) return $d;
        return [
            'minScore' => (float)($row['spark_min_score'] ?? $d['minScore']),
            'maxScore' => (float)($row['spark_max_score'] ?? $d['maxScore']),
            'minAge' => (int)($row['spark_min_age'] ?? $d['minAge']),
            'maxAge' => (int)($row['spark_max_age'] ?? $d['maxAge']),
            'maxDistanceMi' => (float)($row['spark_max_distance_mi'] ?? $d['maxDistanceMi']),
            'minHeightM' => (float)($row['spark_min_height_m'] ?? $d['minHeightM']),
            'maxHeightM' => (float)($row['spark_max_height_m'] ?? $d['maxHeightM']),
        ];
    }

    /** @return array<string, mixed> */
    public static function preferencesForUser(PDO $pdo, string $userId): array
    {
        $st = $pdo->prepare('SELECT * FROM user_settings WHERE user_id = ?');
        $st->execute([$userId]);
        return self::preferencesFromRow($st->fetch() ?: []);
    }

    public static function ageFromBirthYear(?int $birthYear): ?int
    {
        if (!$birthYear || $birthYear < 1900) return null;
        return (int)date('Y') - $birthYear;
    }

    public static function distanceMiles(array $viewer, array $candidate): ?float
    {
        $myLat = isset($viewer['lat']) ? (float)$viewer['lat'] : null;
        $myLng = isset($viewer['lng']) ? (float)$viewer['lng'] : null;
        $cLat = isset($candidate['lat']) ? (float)$candidate['lat'] : null;
        $cLng = isset($candidate['lng']) ? (float)$candidate['lng'] : null;
        if ($myLat !== null && $myLng !== null && $cLat !== null && $cLng !== null) {
            require_once __DIR__ . '/Geo.php';
            return Geo::haversineMiles($myLat, $myLng, $cLat, $cLng);
        }
        if (isset($candidate['miles'])) {
            return (float)$candidate['miles'];
        }
        return null;
    }

    public static function passesFilters(array $viewer, array $candidate, array $prefs): bool
    {
        $score = (float)$candidate['score'];
        if ($score < $prefs['minScore'] || $score > $prefs['maxScore']) {
            return false;
        }

        $height = isset($candidate['height_m']) && $candidate['height_m'] !== null
            ? (float)$candidate['height_m']
            : null;
        if ($height === null) {
            return false;
        }
        if ($height < $prefs['minHeightM'] || $height > $prefs['maxHeightM']) {
            return false;
        }

        $age = self::ageFromBirthYear(isset($candidate['birth_year']) ? (int)$candidate['birth_year'] : null);
        if ($age === null) {
            return false;
        }
        if ($age < $prefs['minAge'] || $age > $prefs['maxAge']) {
            return false;
        }

        $maxDist = (float)$prefs['maxDistanceMi'];
        if ($maxDist > 0) {
            $dist = self::distanceMiles($viewer, $candidate);
            if ($dist === null || $dist > $maxDist) {
                return false;
            }
        }

        return true;
    }

    /** @return list<string> */
    public static function excludedFriendIds(PDO $pdo, string $userId): array
    {
        $st = $pdo->prepare('SELECT friend_id FROM friendships WHERE user_id = ?');
        $st->execute([$userId]);
        return array_column($st->fetchAll(), 'friend_id');
    }

    /** @return array<string, array{action:string,ts:int,passCount:int}> */
    public static function swipeDetailsByUser(PDO $pdo, string $userId): array
    {
        $st = $pdo->prepare('SELECT to_user_id, action, ts, pass_count FROM spark_swipes WHERE from_user_id = ?');
        $st->execute([$userId]);
        $out = [];
        foreach ($st->fetchAll() as $row) {
            $out[(string)$row['to_user_id']] = [
                'action' => (string)$row['action'],
                'ts' => (int)$row['ts'],
                'passCount' => (int)($row['pass_count'] ?? 0),
            ];
        }
        return $out;
    }

    /** @return list<array> */
    public static function deckForUser(PDO $pdo, array $me, int $limit = 24): array
    {
        if (empty($me['height_m'])) {
            return [];
        }

        $prefs = self::preferencesForUser($pdo, $me['id']);
        $friendIds = self::excludedFriendIds($pdo, $me['id']);
        $swipes = self::swipeDetailsByUser($pdo, $me['id']);
        $recycleCutoff = (int)(microtime(true) * 1000) - 86400000;

        $st = $pdo->prepare(
            'SELECT * FROM users
             WHERE id != ? AND onboarded = 1 AND height_m IS NOT NULL AND birth_year IS NOT NULL
             ORDER BY score DESC LIMIT 300'
        );
        $st->execute([$me['id']]);
        $rows = $st->fetchAll();
        $candidates = [];
        $recycle = [];

        foreach ($rows as $row) {
            $id = (string)$row['id'];
            if (in_array($id, $friendIds, true)) continue;
            if (!self::passesFilters($me, $row, $prefs)) continue;

            $sw = $swipes[$id] ?? null;
            if (!$sw) {
                $candidates[] = $row;
                continue;
            }
            if ($sw['action'] !== 'pass') continue;

            if ($sw['ts'] <= $recycleCutoff) {
                $recycle[] = ['row' => $row, 'passCount' => $sw['passCount'], 'ts' => $sw['ts']];
            }
        }

        $usingRecycle = false;
        if (!$candidates && $recycle) {
            usort($recycle, static function ($a, $b) {
                if ($a['passCount'] !== $b['passCount']) return $a['passCount'] <=> $b['passCount'];
                return $a['ts'] <=> $b['ts'];
            });
            $candidates = array_map(static fn($r) => $r['row'], array_slice($recycle, 0, $limit));
            $usingRecycle = true;
        } else {
            shuffle($candidates);
            $candidates = array_slice($candidates, 0, $limit);
        }

        $deck = array_map(function ($row) use ($pdo, $me, $prefs, $usingRecycle) {
            $u = Helpers::userPublic($row);
            $stPosts = $pdo->prepare(
                'SELECT media_url, media_type, caption, scene_json FROM posts WHERE author_id = ? AND media_url IS NOT NULL ORDER BY ts DESC LIMIT 3'
            );
            $stPosts->execute([$row['id']]);
            $photos = [];
            foreach ($stPosts->fetchAll() as $p) {
                $photos[] = [
                    'url' => Helpers::absUrl($p['media_url']),
                    'type' => $p['media_type'],
                    'caption' => $p['caption'] ?? '',
                    'scene' => json_decode($p['scene_json'] ?? '[]', true) ?: ['#FFE9A8', '#FFC6DA'],
                ];
            }
            if (!$photos && !empty($u['avatarUrl'])) {
                $photos[] = [
                    'url' => $u['avatarUrl'],
                    'type' => 'image',
                    'caption' => '',
                    'scene' => [$u['color'] ?? '#FFE0EC', '#ffffff'],
                ];
            }
            $u['photos'] = $photos;
            $dist = self::distanceMiles($me, $row);
            if ($dist !== null) {
                $u['miles'] = round($dist, 2);
            }
            $u['age'] = self::ageFromBirthYear(isset($row['birth_year']) ? (int)$row['birth_year'] : null);
            if ($usingRecycle) {
                $u['sparkRecycled'] = true;
            }
            return $u;
        }, $candidates);

        return $deck;
    }

    /** @return list<array> */
    public static function matchesForUser(PDO $pdo, string $userId): array
    {
        $st = $pdo->prepare(
            'SELECT m.*, u.id AS peer_id FROM spark_matches m
             JOIN users u ON (u.id = CASE WHEN m.user_a = ? THEN m.user_b ELSE m.user_a END)
             WHERE m.user_a = ? OR m.user_b = ?
             ORDER BY m.ts DESC LIMIT 60'
        );
        $st->execute([$userId, $userId, $userId]);
        $out = [];
        foreach ($st->fetchAll() as $row) {
            $peerSt = $pdo->prepare('SELECT * FROM users WHERE id = ?');
            $peerId = $row['user_a'] === $userId ? $row['user_b'] : $row['user_a'];
            $peerSt->execute([$peerId]);
            $peer = $peerSt->fetch();
            if (!$peer) continue;
            $out[] = [
                'matchId' => $row['id'],
                'ts' => (int)$row['ts'],
                'user' => Helpers::userPublic($peer),
            ];
        }
        return $out;
    }

    public static function ensureMatch(PDO $pdo, string $userA, string $userB): ?string
    {
        $ids = [$userA, $userB];
        sort($ids);
        $st = $pdo->prepare('SELECT id FROM spark_matches WHERE user_a = ? AND user_b = ?');
        $st->execute($ids);
        $existing = $st->fetch();
        if ($existing) return (string)$existing['id'];

        $id = 'sm_' . bin2hex(random_bytes(10));
        $ts = (int)(microtime(true) * 1000);
        $pdo->prepare('INSERT INTO spark_matches (id, user_a, user_b, ts) VALUES (?, ?, ?, ?)')->execute([
            $id, $ids[0], $ids[1], $ts,
        ]);
        Helpers::ensureConversation($pdo, $userA, $userB);
        return $id;
    }

    public static function maybeApplySwipeScoreNudge(PDO $pdo, string $fromUserId, array $target, string $action): bool
    {
        // App Store Guideline 1.2: Match swipes must not change another user's score.
        return false;
    }
}
