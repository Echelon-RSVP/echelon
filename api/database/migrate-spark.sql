-- Echelon Spark: rank-gated Tinder-style matching
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS spark_swipes (
  from_user_id VARCHAR(32) NOT NULL,
  to_user_id VARCHAR(32) NOT NULL,
  action ENUM('like','pass','super') NOT NULL DEFAULT 'like',
  ts BIGINT NOT NULL,
  PRIMARY KEY (from_user_id, to_user_id),
  INDEX idx_spark_swipes_to (to_user_id, action),
  CONSTRAINT fk_spark_swipe_from FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_spark_swipe_to FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS spark_matches (
  id VARCHAR(48) PRIMARY KEY,
  user_a VARCHAR(32) NOT NULL,
  user_b VARCHAR(32) NOT NULL,
  ts BIGINT NOT NULL,
  UNIQUE KEY uq_spark_match_pair (user_a, user_b),
  INDEX idx_spark_matches_a (user_a, ts DESC),
  INDEX idx_spark_matches_b (user_b, ts DESC),
  CONSTRAINT fk_spark_match_a FOREIGN KEY (user_a) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_spark_match_b FOREIGN KEY (user_b) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
