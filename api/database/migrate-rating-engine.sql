SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS user_score_meta (
  user_id VARCHAR(32) PRIMARY KEY,
  last_decay_ts BIGINT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE user_settings
  MODIFY lens TINYINT(1) NOT NULL DEFAULT 1;

UPDATE user_settings SET lens = 1 WHERE lens IS NULL;

ALTER TABLE users
  MODIFY lens_on TINYINT(1) NOT NULL DEFAULT 1;
