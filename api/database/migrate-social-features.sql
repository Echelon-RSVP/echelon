SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS user_blocks (
  blocker_id VARCHAR(32) NOT NULL,
  blocked_id VARCHAR(32) NOT NULL,
  ts BIGINT NOT NULL,
  PRIMARY KEY (blocker_id, blocked_id),
  INDEX idx_blocks_blocked (blocked_id),
  CONSTRAINT fk_blocks_blocker FOREIGN KEY (blocker_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_blocks_blocked FOREIGN KEY (blocked_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS spark_score_nudges (
  from_user_id VARCHAR(32) NOT NULL,
  to_user_id VARCHAR(32) NOT NULL,
  action VARCHAR(8) NOT NULL,
  ts BIGINT NOT NULL,
  PRIMARY KEY (from_user_id, to_user_id),
  CONSTRAINT fk_spark_nudge_from FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_spark_nudge_to FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE user_settings
  ADD COLUMN private_profile TINYINT(1) NOT NULL DEFAULT 0 AFTER spark_max_height_m;

ALTER TABLE events
  ADD COLUMN description TEXT NULL AFTER when_text;

DELETE FROM event_rsvps WHERE event_id IN (SELECT id FROM events WHERE kind != 'party' OR host_id IS NULL);
DELETE FROM events WHERE kind != 'party' OR host_id IS NULL;
