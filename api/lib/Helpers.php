<?php
declare(strict_types=1);

final class Helpers
{
    private static string $assetBase = 'https://echelon.rsvp';

    public static function setAssetBase(string $base): void
    {
        self::$assetBase = rtrim($base, '/');
    }

    public static function absUrl(?string $url): ?string
    {
        if (!$url) return null;
        if (preg_match('#^https?://#i', $url)) return $url;
        if (str_starts_with($url, 'data:')) return $url;
        return self::$assetBase . (str_starts_with($url, '/') ? $url : '/' . $url);
    }

    public static function jsonBody(): array
    {
        $raw = file_get_contents('php://input') ?: '';
        $data = json_decode($raw, true);
        return is_array($data) ? $data : [];
    }

    public static function userPublic(array $row): array
    {
        return [
            'id' => $row['id'],
            'name' => $row['name'],
            'handle' => $row['handle'],
            'emoji' => $row['emoji'],
            'color' => $row['color'],
            'score' => (float)$row['score'],
            'miles' => (float)$row['miles'],
            'lensOn' => (bool)$row['lens_on'],
            'lensX' => (int)$row['lens_x'],
            'lensY' => (int)$row['lens_y'],
            'uid' => $row['uid_code'],
            'onboarded' => (bool)$row['onboarded'],
            'avatarUrl' => self::absUrl($row['avatar_url'] ?? null),
            'locked' => (bool)($row['locked'] ?? false),
            'authMethod' => $row['auth_method'] ?? 'password',
            'email' => $row['email'] ?? null,
            'instagram' => !empty($row['instagram_verified']) ? [
                'handle' => '@' . ltrim((string)($row['instagram_handle'] ?? ''), '@'),
                'verified' => true,
                'syncFeed' => (bool)($row['instagram_sync_feed'] ?? false),
            ] : null,
            'faceScanFallback' => (bool)($row['face_scan_fallback'] ?? false),
            'faceScanRetryAvailable' => !empty($row['face_scan_fallback']) && empty($row['face_scan_retry_used']),
            'birthYear' => isset($row['birth_year']) && $row['birth_year'] !== null ? (int)$row['birth_year'] : null,
            'heightM' => isset($row['height_m']) && $row['height_m'] !== null ? (float)$row['height_m'] : null,
            'chatStatus' => isset($row['chat_status']) ? (string)$row['chat_status'] : null,
        ];
    }

    public static function postPublic(array $row, array $rating = []): array
    {
        $avg = isset($rating['avg']) ? round((float)$rating['avg'], 1) : null;
        $count = (int)($rating['count'] ?? 0);
        return [
            'id' => $row['id'],
            'author' => $row['author_id'],
            'caption' => $row['caption'] ?? '',
            'mediaUrl' => self::absUrl($row['media_url']),
            'mediaType' => $row['media_type'],
            'fromStory' => (bool)($row['from_story'] ?? false),
            'source' => $row['source'] ?? 'echelon',
            'scene' => json_decode($row['scene_json'] ?? '[]', true) ?: [],
            'emoji' => $row['emoji'],
            'likes' => (int)$row['likes'],
            'premium' => (bool)$row['premium'],
            'ts' => (int)$row['ts'],
            'captionStyle' => json_decode($row['caption_style_json'] ?? '{}', true) ?: null,
            'musicTitle' => json_decode($row['caption_style_json'] ?? '{}', true)['musicTitle'] ?? null,
            'tags' => json_decode($row['tags_json'] ?? '[]', true) ?: [],
            'avgRating' => $count > 0 ? $avg : null,
            'ratingCount' => $count,
            'uiTest' => ($row['id'] ?? '') === 'ptest_ui',
        ];
    }

    /** Recent feed plus the viewer's own posts (never drop user uploads on refresh). */
    public static function feedRowsForUser(PDO $pdo, string $userId, int $limit = 150): array
    {
        $rows = $pdo->query('SELECT * FROM posts ORDER BY ts DESC LIMIT ' . max(50, min(300, $limit)))->fetchAll();
        $seen = [];
        foreach ($rows as $row) {
            $seen[$row['id']] = true;
        }
        $cutoff = (int)((time() - 90 * 86400) * 1000);
        $st = $pdo->prepare('SELECT * FROM posts WHERE author_id = ? AND ts >= ? ORDER BY ts DESC');
        $st->execute([$userId, $cutoff]);
        foreach ($st->fetchAll() as $row) {
            if (empty($seen[$row['id']])) {
                $rows[] = $row;
                $seen[$row['id']] = true;
            }
        }
        usort($rows, static fn($a, $b) => ((int)($b['ts'] ?? 0)) <=> ((int)($a['ts'] ?? 0)));
        return array_slice($rows, 0, 200);
    }

    /** @param list<array> $rows @return list<array> */
    public static function postsWithRatings(PDO $pdo, array $rows): array
    {
        if (!$rows) return [];
        $ids = array_column($rows, 'id');
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $st = $pdo->prepare("SELECT post_id, AVG(stars) AS avg_stars, COUNT(*) AS cnt FROM ratings WHERE post_id IN ($placeholders) GROUP BY post_id");
        $st->execute($ids);
        $map = [];
        foreach ($st->fetchAll() as $r) {
            $map[$r['post_id']] = ['avg' => (float)$r['avg_stars'], 'count' => (int)$r['cnt']];
        }
        return array_map(static fn(array $row) => self::postPublic($row, $map[$row['id']] ?? []), $rows);
    }

    public static function eventPublic(array $row, array $opts = []): array
    {
        $viewerId = $opts['viewerId'] ?? null;
        $rsvpIds = $opts['rsvpIds'] ?? [];
        $miles = $opts['miles'] ?? (float)($row['miles'] ?? 0);
        $hostId = $row['host_id'] ?? null;
        $isHost = $viewerId && $hostId && $hostId === $viewerId;
        $hasRsvp = in_array($row['id'], $rsvpIds, true);
        $secret = !empty($row['secret_address']);
        $city = trim((string)($row['city'] ?? ''));
        $countryCode = strtoupper(trim((string)($row['country_code'] ?? '')));
        $address = trim((string)($row['address'] ?? ''));
        $venue = trim((string)($row['venue'] ?? ''));
        $startsAt = isset($row['starts_at']) && $row['starts_at'] !== null ? (int)$row['starts_at'] : null;
        $nowMs = (int)(microtime(true) * 1000);

        $cityLabel = $city;
        if ($city !== '' && $countryCode !== '') {
            $cityLabel = $city . ', ' . $countryCode;
        }

        if ($secret && !$isHost && !$hasRsvp) {
            $locationLabel = $cityLabel !== '' ? $cityLabel : 'City disclosed after RSVP';
            $addressVisible = null;
        } else {
            $locationLabel = $address !== '' ? $address : ($venue !== '' ? $venue : $cityLabel);
            $addressVisible = $address !== '' ? $address : ($venue !== '' ? $venue : null);
        }

        $price = isset($row['price']) && $row['price'] !== null ? (float)$row['price'] : null;
        $currency = trim((string)($row['currency'] ?? 'EUR')) ?: 'EUR';
        $bannerUrl = trim((string)($row['banner_url'] ?? '')) ?: null;

        $out = [
            'id' => $row['id'],
            'name' => $row['name'],
            'type' => $row['type'],
            'emoji' => $row['emoji'],
            'scene' => json_decode($row['scene_json'] ?? '[]', true) ?: [],
            'miles' => round($miles, 2),
            'req' => (float)$row['req'],
            'venue' => $locationLabel,
            'when' => $row['when_text'],
            'kind' => $row['kind'] ?? 'curated',
            'city' => $city ?: null,
            'countryCode' => $countryCode ?: null,
            'secretAddress' => $secret,
            'hostId' => $hostId,
            'isHost' => $isHost,
            'hasRsvp' => $hasRsvp,
            'address' => $addressVisible,
            'ts' => isset($row['ts']) ? (int)$row['ts'] : null,
            'startsAt' => $startsAt,
            'description' => trim((string)($row['description'] ?? '')) ?: null,
            'bannerUrl' => $bannerUrl,
            'price' => $price !== null && $price > 0 ? round($price, 2) : null,
            'currency' => $currency,
        ];
        if ($isHost || $hasRsvp) {
            $out['fullLocation'] = $address !== '' ? $address : $venue;
        }

        $mapVisible = false;
        if (!empty($row['lat']) && !empty($row['lng'])) {
            if ($isHost) {
                $mapVisible = true;
            } elseif (!$secret) {
                $mapVisible = true;
            } elseif ($startsAt !== null && $nowMs >= $startsAt) {
                $mapVisible = true;
            }
        }
        $partyActive = ($row['kind'] ?? '') === 'party'
            && !empty($row['lat'])
            && !empty($row['lng'])
            && ($startsAt === null || $nowMs <= $startsAt + (72 * 3600 * 1000));
        if ($partyActive) {
            $out['lat'] = (float)$row['lat'];
            $out['lng'] = (float)$row['lng'];
        } elseif ($mapVisible) {
            $out['lat'] = (float)$row['lat'];
            $out['lng'] = (float)$row['lng'];
        }

        return $out;
    }

    /** @return list<array> */
    public static function eventsForUser(PDO $pdo, array $me, array $query = []): array
    {
        require_once __DIR__ . '/Geo.php';

        $userLat = isset($me['lat']) && $me['lat'] !== null ? (float)$me['lat'] : null;
        $userLng = isset($me['lng']) && $me['lng'] !== null ? (float)$me['lng'] : null;

        $stRsvp = $pdo->prepare('SELECT event_id FROM event_rsvps WHERE user_id = ?');
        $stRsvp->execute([$me['id']]);
        $rsvpIds = array_column($stRsvp->fetchAll(), 'event_id');

        $nowMs = (int)(microtime(true) * 1000);
        $expireBefore = $nowMs - (72 * 3600 * 1000);
        $pdo->prepare("DELETE FROM events WHERE kind = 'party' AND starts_at IS NOT NULL AND starts_at < ?")->execute([$expireBefore]);

        $rows = $pdo->query("SELECT * FROM events WHERE kind = 'party' AND host_id IS NOT NULL ORDER BY COALESCE(ts, 0) DESC, id ASC")->fetchAll();
        $search = strtolower(trim((string)($query['q'] ?? '')));
        $typeFilter = trim((string)($query['type'] ?? ''));
        $kindFilter = 'party';
        $maxMiles = isset($query['maxMiles']) && $query['maxMiles'] !== '' ? (float)$query['maxMiles'] : null;
        $sort = (string)($query['sort'] ?? 'near');

        $out = [];
        foreach ($rows as $row) {
            $startsAt = isset($row['starts_at']) && $row['starts_at'] !== null ? (int)$row['starts_at'] : null;
            if ($startsAt !== null && $nowMs > $startsAt + (72 * 3600 * 1000)) {
                continue;
            }

            $miles = (float)$row['miles'];
            if ($userLat !== null && $userLng !== null && !empty($row['lat']) && !empty($row['lng'])) {
                $miles = Geo::haversineMiles($userLat, $userLng, (float)$row['lat'], (float)$row['lng']);
            }

            $ev = self::eventPublic($row, [
                'viewerId' => $me['id'],
                'rsvpIds' => $rsvpIds,
                'miles' => $miles,
            ]);

            if ($typeFilter !== '' && $typeFilter !== 'All' && strcasecmp($ev['type'], $typeFilter) !== 0) {
                continue;
            }
            if ($kindFilter !== '' && $kindFilter !== 'all' && strcasecmp($ev['kind'], $kindFilter) !== 0) {
                continue;
            }
            if ($maxMiles !== null && $ev['miles'] > $maxMiles) {
                continue;
            }
            if ($search !== '') {
                $hay = strtolower(implode(' ', [
                    $ev['name'],
                    $ev['type'],
                    $ev['venue'],
                    $ev['city'] ?? '',
                    $ev['when'],
                ]));
                if (!str_contains($hay, $search)) {
                    continue;
                }
            }
            $out[] = $ev;
        }

        usort($out, function ($a, $b) use ($sort) {
            switch ($sort) {
                case 'rating':
                case 'rank':
                    return $b['req'] <=> $a['req'] ?: $a['miles'] <=> $b['miles'];
                case 'name':
                    return strcasecmp($a['name'], $b['name']);
                case 'when':
                    return strcmp($a['when'], $b['when']);
                case 'newest':
                    return ($b['ts'] ?? 0) <=> ($a['ts'] ?? 0);
                case 'near':
                default:
                    return $a['miles'] <=> $b['miles'] ?: $b['req'] <=> $a['req'];
            }
        });

        return $out;
    }

    public static function messagePublic(array $row, string $viewerId): array
    {
        $replyTo = null;
        if (!empty($row['reply_to_id'])) {
            $replyTo = [
                'id' => $row['reply_to_id'],
                'text' => $row['reply_text'] ?? '',
            ];
        }
        $voice = (bool)$row['voice'];
        $burnMode = $row['burn_mode'] ?? null;
        $isSender = $row['sender_id'] === $viewerId;
        $consumed = !empty($row['consumed_at']);
        $viewOnce = $burnMode === 'view_once';
        $now = (int)(microtime(true) * 1000);
        $expired = !empty($row['expires_at']) && (int)$row['expires_at'] <= $now;

        if ($expired) {
            return [
                'id' => $row['id'],
                'from' => $isSender ? 'me' : $row['sender_id'],
                'expired' => true,
                'text' => null,
                'ts' => (int)$row['ts'],
            ];
        }

        $mediaUrl = self::absUrl($row['media_url']);
        $locked = $viewOnce && !$isSender && !$consumed;
        if ($locked) {
            $mediaUrl = null;
        }

        return [
            'id' => $row['id'],
            'from' => $isSender ? 'me' : $row['sender_id'],
            'text' => $row['body'],
            'mediaUrl' => $mediaUrl,
            'mediaType' => $row['media_type'],
            'voice' => $voice,
            'voiceUrl' => $voice && !$locked ? self::absUrl($row['media_url']) : null,
            'voiceDur' => $row['voice_dur'],
            'voiceSeed' => $row['voice_seed'] ? (int)$row['voice_seed'] : null,
            'replyTo' => $replyTo,
            'replyToId' => $row['reply_to_id'] ?? null,
            'replyText' => $row['reply_text'] ?? null,
            'reaction' => $row['reaction'],
            'burnMode' => $burnMode,
            'burnSeconds' => isset($row['burn_seconds']) ? (int)$row['burn_seconds'] : null,
            'expiresAt' => !empty($row['expires_at']) ? (int)$row['expires_at'] : null,
            'viewOnce' => $viewOnce,
            'consumed' => $consumed,
            'locked' => $locked,
            'ts' => (int)$row['ts'],
        ];
    }

    /** @return list<array{contactId:string,lastTs:int,lastPreview:string,lastFrom:string,unread:int}> */
    public static function chatInboxForUser(PDO $pdo, string $userId): array
    {
        $st = $pdo->prepare('SELECT * FROM conversations WHERE user_a = ? OR user_b = ? ORDER BY updated_at DESC');
        $st->execute([$userId, $userId]);
        $rows = $st->fetchAll();
        $out = [];
        foreach ($rows as $c) {
            $contactId = $c['user_a'] === $userId ? $c['user_b'] : $c['user_a'];
            $readTs = $c['user_a'] === $userId ? (int)($c['read_ts_a'] ?? 0) : (int)($c['read_ts_b'] ?? 0);

            $lm = $pdo->prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY ts DESC LIMIT 1');
            $lm->execute([$c['id']]);
            $last = $lm->fetch();
            if (!$last) continue;

            $uc = $pdo->prepare('SELECT COUNT(*) FROM messages WHERE conversation_id = ? AND ts > ? AND sender_id != ?');
            $uc->execute([$c['id'], $readTs, $userId]);
            $unread = (int)$uc->fetchColumn();

            $preview = self::messagePreview($last);
            $out[] = [
                'contactId' => $contactId,
                'lastTs' => (int)$last['ts'],
                'lastPreview' => $preview,
                'lastFrom' => $last['sender_id'] === $userId ? 'me' : $last['sender_id'],
                'unread' => $unread,
            ];
        }
        return $out;
    }

    public static function messagePreview(array $row): string
    {
        if (!empty($row['voice'])) return '🎤 Voice message';
        if (!empty($row['burn_mode']) && $row['burn_mode'] === 'view_once' && !empty($row['media_type'])) {
            return $row['media_type'] === 'video' ? '👁 View-once video' : '👁 View-once photo';
        }
        if (($row['media_type'] ?? '') === 'video') return '🎬 Video';
        if (!empty($row['media_url']) && ($row['media_type'] ?? '') === 'image') return '📷 Photo';
        if (!empty($row['burn_mode']) && $row['burn_mode'] === 'timer') {
            $t = trim((string)($row['body'] ?? ''));
            return $t !== '' ? '⏱ ' . mb_substr($t, 0, 80) : '⏱ Disappearing message';
        }
        $t = trim((string)($row['body'] ?? ''));
        return $t !== '' ? mb_substr($t, 0, 120) : 'Message';
    }

    public static function markConversationRead(PDO $pdo, string $userId, string $contactId): void
    {
        $convId = self::ensureConversation($pdo, $userId, $contactId);
        $st = $pdo->prepare('SELECT user_a, user_b FROM conversations WHERE id = ?');
        $st->execute([$convId]);
        $c = $st->fetch();
        if (!$c) return;
        $ts = (int)(microtime(true) * 1000);
        if ($c['user_a'] === $userId) {
            $pdo->prepare('UPDATE conversations SET read_ts_a = ? WHERE id = ?')->execute([$ts, $convId]);
        } else {
            $pdo->prepare('UPDATE conversations SET read_ts_b = ? WHERE id = ?')->execute([$ts, $convId]);
        }
    }

    public static function setConversationTyping(PDO $pdo, string $convId, string $userId): void
    {
        $ts = (int)(microtime(true) * 1000);
        try {
            $pdo->prepare('UPDATE conversations SET typing_user_id = ?, typing_at = ? WHERE id = ?')->execute([$userId, $ts, $convId]);
        } catch (Throwable $e) {
            /* typing columns may not exist yet */
        }
    }

    public static function getPeerTyping(PDO $pdo, string $convId, string $userId): bool
    {
        try {
            $st = $pdo->prepare('SELECT typing_user_id, typing_at FROM conversations WHERE id = ?');
            $st->execute([$convId]);
            $c = $st->fetch();
            if (!$c || empty($c['typing_user_id']) || $c['typing_user_id'] === $userId) return false;
            return ((int)(microtime(true) * 1000) - (int)$c['typing_at']) < 4000;
        } catch (Throwable $e) {
            return false;
        }
    }

    public static function deleteConversation(PDO $pdo, string $userId, string $contactId): void
    {
        $ids = [$userId, $contactId];
        sort($ids);
        $st = $pdo->prepare('SELECT id FROM conversations WHERE user_a = ? AND user_b = ?');
        $st->execute($ids);
        $row = $st->fetch();
        if (!$row) return;
        $pdo->prepare('DELETE FROM messages WHERE conversation_id = ?')->execute([$row['id']]);
        $pdo->prepare('DELETE FROM conversations WHERE id = ?')->execute([$row['id']]);
    }

    /** Remove Instagram/Meta-derived data for a user (Meta data-deletion callback). */
    public static function purgeInstagramData(PDO $pdo, string $userId): void
    {
        $pdo->prepare("DELETE FROM posts WHERE author_id = ? AND source = 'instagram'")->execute([$userId]);
        $st = $pdo->prepare('SELECT id FROM stories WHERE author_id = ? AND id LIKE ?');
        $st->execute([$userId, 'ig_ss_%']);
        foreach ($st->fetchAll() as $row) {
            $pdo->prepare('DELETE FROM stories WHERE id = ?')->execute([$row['id']]);
        }
        $pdo->prepare('UPDATE users SET instagram_handle = NULL, instagram_user_id = NULL, instagram_access_token = NULL, instagram_token_expires = NULL, instagram_verified = 0, instagram_sync_feed = 0 WHERE id = ?')->execute([$userId]);
    }

    /** @return list<array> */
    public static function storiesForUser(PDO $pdo, string $userId, array $authorIds): array
    {
        if (!$authorIds) {
            return [];
        }
        $now = (int)(microtime(true) * 1000);
        $placeholders = implode(',', array_fill(0, count($authorIds), '?'));
        $st = $pdo->prepare("SELECT * FROM stories WHERE author_id IN ($placeholders) AND expires_at > ? ORDER BY ts DESC");
        $st->execute([...$authorIds, $now]);
        $rows = $st->fetchAll();
        $out = [];
        foreach ($rows as $story) {
            $items = $pdo->prepare('SELECT * FROM story_items WHERE story_id = ? ORDER BY ts ASC');
            $items->execute([$story['id']]);
            $out[] = self::storyPublic($story, $items->fetchAll());
        }
        return $out;
    }

    /** @param list<array> $items */
    public static function storyPublic(array $storyRow, array $items): array
    {
        return [
            'id' => $storyRow['id'],
            'author' => $storyRow['author_id'],
            'items' => array_map(static fn(array $i) => [
                'id' => $i['id'],
                'mediaUrl' => self::absUrl($i['media_url']),
                'mediaType' => $i['media_type'] ?? 'image',
                'emoji' => $i['emoji'],
                'scene' => json_decode($i['scene_json'] ?? '[]', true) ?: [],
                'caption' => $i['caption'] ?? null,
                'captionStyle' => json_decode($i['caption_style_json'] ?? '{}', true) ?: null,
                'ts' => (int)$i['ts'],
            ], $items),
            'ts' => (int)$storyRow['ts'],
            'expiresAt' => (int)$storyRow['expires_at'],
        ];
    }

    /** Permanently delete an Echelon account and related rows (FK cascades). */
    public static function deleteUserAccount(PDO $pdo, string $userId): void
    {
        $pdo->prepare('DELETE FROM sessions WHERE user_id = ?')->execute([$userId]);
        $pdo->prepare('DELETE FROM users WHERE id = ?')->execute([$userId]);
    }

    public static function siteBase(array $cfg): string
    {
        $app = rtrim((string)($cfg['app_url'] ?? 'https://echelon.rsvp/app/'), '/');
        $base = preg_replace('#/app/?$#', '', $app);
        return $base ?: 'https://echelon.rsvp';
    }

    public static function notifPublic(array $n): array
    {
        return [
            'id' => $n['id'],
            'kind' => $n['kind'],
            'title' => $n['title'],
            'body' => $n['body'],
            'rater' => $n['rater_id'],
            'stars' => $n['stars'] !== null ? (int)$n['stars'] : null,
            'delta' => $n['delta'] !== null ? (float)$n['delta'] : null,
            'tag' => $n['tag'],
            'appeal' => $n['appeal'],
            'ts' => (int)$n['ts'],
        ];
    }

    /** @param array<int, array<string, mixed>> $rows */
    public static function notifsPublic(PDO $pdo, array $rows): array
    {
        if (!$rows) return [];
        $peerIds = array_values(array_unique(array_filter(array_column($rows, 'rater_id'))));
        $peers = [];
        if ($peerIds) {
            $placeholders = implode(',', array_fill(0, count($peerIds), '?'));
            $st = $pdo->prepare("SELECT * FROM users WHERE id IN ($placeholders)");
            $st->execute($peerIds);
            foreach ($st->fetchAll() as $u) {
                $peers[$u['id']] = self::userPublic($u);
            }
        }
        return array_map(function ($n) use ($peers) {
            $out = self::notifPublic($n);
            $rid = $n['rater_id'] ?? null;
            if ($rid && isset($peers[$rid])) {
                $out['peer'] = $peers[$rid];
            }
            return $out;
        }, $rows);
    }

    public static function settingsPublic(array $s): array
    {
        return [
            'lang' => $s['lang'] ?? 'en',
            'lens' => (bool)($s['lens'] ?? false),
            'live' => (bool)($s['live'] ?? true),
            'sound' => (bool)($s['sound'] ?? true),
            'proximityAlerts' => (bool)($s['proximity_alerts'] ?? true),
            'ratingNotifs' => (bool)($s['rating_notifs'] ?? true),
            'strangerRatings' => (bool)($s['stranger_ratings'] ?? true),
            'publicTier' => (bool)($s['public_tier'] ?? true),
            'publicScore' => (bool)($s['public_score'] ?? true),
            'reduceMotion' => (bool)($s['reduce_motion'] ?? false),
            'proximityAutoScan' => (bool)($s['proximity_auto_scan'] ?? false),
            'sparkMinScore' => (float)($s['spark_min_score'] ?? 1.0),
            'sparkMaxScore' => (float)($s['spark_max_score'] ?? 5.0),
            'sparkMinAge' => (int)($s['spark_min_age'] ?? 18),
            'sparkMaxAge' => (int)($s['spark_max_age'] ?? 99),
            'sparkMaxDistanceMi' => (float)($s['spark_max_distance_mi'] ?? 25.0),
            'sparkMinHeightM' => (float)($s['spark_min_height_m'] ?? 1.40),
            'sparkMaxHeightM' => (float)($s['spark_max_height_m'] ?? 2.20),
            'privateProfile' => (bool)($s['private_profile'] ?? false),
        ];
    }

    public static function areFriends(PDO $pdo, string $a, string $b): bool
    {
        $st = $pdo->prepare('SELECT 1 FROM friendships WHERE user_id = ? AND friend_id = ?');
        $st->execute([$a, $b]);
        return (bool)$st->fetch();
    }

    public static function isBlocked(PDO $pdo, string $blockerId, string $blockedId): bool
    {
        $st = $pdo->prepare('SELECT 1 FROM user_blocks WHERE blocker_id = ? AND blocked_id = ?');
        $st->execute([$blockerId, $blockedId]);
        return (bool)$st->fetch();
    }

    /** @return list<string> */
    public static function blockedUserIds(PDO $pdo, string $userId): array
    {
        $st = $pdo->prepare('SELECT blocked_id FROM user_blocks WHERE blocker_id = ?');
        $st->execute([$userId]);
        return array_column($st->fetchAll(), 'blocked_id');
    }

    /** @return list<string> */
    public static function blockedByUserIds(PDO $pdo, string $userId): array
    {
        $st = $pdo->prepare('SELECT blocker_id FROM user_blocks WHERE blocked_id = ?');
        $st->execute([$userId]);
        return array_column($st->fetchAll(), 'blocker_id');
    }

    public static function userIsPrivate(PDO $pdo, string $userId): bool
    {
        $st = $pdo->prepare('SELECT private_profile FROM user_settings WHERE user_id = ?');
        $st->execute([$userId]);
        $row = $st->fetch();
        return (bool)($row['private_profile'] ?? false);
    }

    public static function userPublicForViewer(PDO $pdo, array $row, ?string $viewerId): array
    {
        $id = (string)$row['id'];
        if (!$viewerId || $viewerId === $id) {
            return self::userPublic($row);
        }
        if (self::isBlocked($pdo, $viewerId, $id) || self::isBlocked($pdo, $id, $viewerId)) {
            return [
                'id' => $id,
                'name' => $row['name'],
                'handle' => $row['handle'],
                'emoji' => $row['emoji'],
                'color' => $row['color'],
                'blocked' => true,
                'profileLocked' => true,
            ];
        }
        if (self::userIsPrivate($pdo, $id) && !self::areFriends($pdo, $viewerId, $id)) {
            return [
                'id' => $id,
                'name' => $row['name'],
                'handle' => $row['handle'],
                'emoji' => $row['emoji'],
                'color' => $row['color'],
                'privateProfile' => true,
                'profileLocked' => true,
            ];
        }
        return self::userPublic($row);
    }

    public static function assertCanInteract(PDO $pdo, string $viewerId, string $targetId): void
    {
        if ($viewerId === $targetId) return;
        if (self::isBlocked($pdo, $viewerId, $targetId) || self::isBlocked($pdo, $targetId, $viewerId)) {
            Response::error('User unavailable', 403);
        }
    }

    public static function feedbackCopy(float $delta, int $stars): array
    {
        if ($delta > 0.03) return ["✨ You're glowing today", "The community feels your warmth. Keep radiating."];
        if ($delta > 0) return ["💫 A little lift", "Tiny gains compound. Stay lovely."];
        if ($delta === 0.0) return ["🤍 Steady", "Consistency is its own kind of charisma."];
        if ($delta > -0.04) return ["🙂 A gentle dip", "Growth can feel uncomfortable. Soften and try again."];
        if ($stars <= 2) return ["😟 That interaction stung", "Consider a warmer tone next time. We believe in you."];
        return ["📉 Trending cooler", "Your authenticity may be showing. A brighter smile helps."];
    }

    public static function uidCode(PDO $pdo): string
    {
        do {
            $code = 'ID-' . random_int(1000, 9999);
            $st = $pdo->prepare('SELECT 1 FROM users WHERE uid_code = ?');
            $st->execute([$code]);
        } while ($st->fetch());
        return $code;
    }

    public static function ensureConversation(PDO $pdo, string $a, string $b): string
    {
        $ids = [$a, $b];
        sort($ids);
        $st = $pdo->prepare('SELECT id FROM conversations WHERE user_a = ? AND user_b = ?');
        $st->execute($ids);
        $row = $st->fetch();
        if ($row) return $row['id'];
        $id = 'conv_' . bin2hex(random_bytes(8));
        $ts = (int)(microtime(true) * 1000);
        $ins = $pdo->prepare('INSERT INTO conversations (id, user_a, user_b, updated_at) VALUES (?, ?, ?, ?)');
        $ins->execute([$id, $ids[0], $ids[1], $ts]);
        return $id;
    }
}
