SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS post_likes (
  user_id VARCHAR(64) NOT NULL,
  post_id VARCHAR(64) NOT NULL,
  ts BIGINT NOT NULL,
  PRIMARY KEY (user_id, post_id),
  INDEX idx_post_likes_post (post_id)
);
