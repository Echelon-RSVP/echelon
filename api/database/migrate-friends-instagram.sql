-- Friend requests + Instagram OAuth tokens (run once on production DB)
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS friend_requests (
  id VARCHAR(48) PRIMARY KEY,
  from_user_id VARCHAR(32) NOT NULL,
  to_user_id VARCHAR(32) NOT NULL,
  status ENUM('pending','accepted','declined') NOT NULL DEFAULT 'pending',
  ts BIGINT NOT NULL,
  responded_at BIGINT NULL,
  UNIQUE KEY uq_friend_req_pair (from_user_id, to_user_id),
  INDEX idx_fr_to_pending (to_user_id, status),
  INDEX idx_fr_from_pending (from_user_id, status),
  CONSTRAINT fk_fr_from FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_fr_to FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE users
  ADD COLUMN instagram_user_id VARCHAR(64) NULL,
  ADD COLUMN instagram_access_token TEXT NULL,
  ADD COLUMN instagram_token_expires BIGINT NULL;
