-- Echelon production schema (MySQL 8 / MariaDB 10.6+)
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(32) PRIMARY KEY,
  apple_sub VARCHAR(255) UNIQUE NULL,
  name VARCHAR(128) NOT NULL,
  handle VARCHAR(64) NOT NULL UNIQUE,
  emoji VARCHAR(16) NOT NULL DEFAULT '😊',
  color VARCHAR(16) NOT NULL DEFAULT '#FFE0EC',
  avatar_url MEDIUMTEXT NULL,
  score DECIMAL(4,2) NOT NULL DEFAULT 4.20,
  locked TINYINT(1) NOT NULL DEFAULT 0,
  instagram_handle VARCHAR(64) NULL,
  instagram_user_id VARCHAR(64) NULL,
  instagram_access_token TEXT NULL,
  instagram_token_expires BIGINT NULL,
  instagram_verified TINYINT(1) NOT NULL DEFAULT 0,
  instagram_sync_feed TINYINT(1) NOT NULL DEFAULT 0,
  lens_on TINYINT(1) NOT NULL DEFAULT 1,
  miles DECIMAL(6,2) NOT NULL DEFAULT 0.50,
  lat DECIMAL(10,7) NULL,
  lng DECIMAL(11,7) NULL,
  location_ts BIGINT NULL,
  lens_x INT NOT NULL DEFAULT 50,
  lens_y INT NOT NULL DEFAULT 50,
  uid_code VARCHAR(16) NULL,
  onboarded TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_score (score DESC),
  INDEX idx_users_handle (handle)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sessions (
  token CHAR(64) PRIMARY KEY,
  user_id VARCHAR(32) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_sessions_user (user_id),
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_settings (
  user_id VARCHAR(32) PRIMARY KEY,
  lang VARCHAR(5) NOT NULL DEFAULT 'en',
  lens TINYINT(1) NOT NULL DEFAULT 1,
  live TINYINT(1) NOT NULL DEFAULT 1,
  sound TINYINT(1) NOT NULL DEFAULT 1,
  proximity_alerts TINYINT(1) NOT NULL DEFAULT 1,
  rating_notifs TINYINT(1) NOT NULL DEFAULT 1,
  stranger_ratings TINYINT(1) NOT NULL DEFAULT 1,
  public_tier TINYINT(1) NOT NULL DEFAULT 1,
  public_score TINYINT(1) NOT NULL DEFAULT 1,
  reduce_motion TINYINT(1) NOT NULL DEFAULT 0,
  proximity_auto_scan TINYINT(1) NOT NULL DEFAULT 0,
  CONSTRAINT fk_settings_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS friendships (
  user_id VARCHAR(32) NOT NULL,
  friend_id VARCHAR(32) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, friend_id),
  CONSTRAINT fk_friends_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_friends_friend FOREIGN KEY (friend_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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

CREATE TABLE IF NOT EXISTS posts (
  id VARCHAR(48) PRIMARY KEY,
  author_id VARCHAR(32) NOT NULL,
  caption TEXT NULL,
  media_url MEDIUMTEXT NULL,
  media_type ENUM('image','video') NULL,
  from_story TINYINT(1) NOT NULL DEFAULT 0,
  source ENUM('echelon','instagram') NOT NULL DEFAULT 'echelon',
  scene_json VARCHAR(128) NULL,
  emoji VARCHAR(16) NULL,
  likes INT NOT NULL DEFAULT 0,
  premium TINYINT(1) NOT NULL DEFAULT 0,
  ts BIGINT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_posts_author_ts (author_id, ts DESC),
  CONSTRAINT fk_posts_author FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stories (
  id VARCHAR(48) PRIMARY KEY,
  author_id VARCHAR(32) NOT NULL,
  expires_at BIGINT NOT NULL,
  ts BIGINT NOT NULL,
  INDEX idx_stories_author (author_id),
  CONSTRAINT fk_stories_author FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS story_items (
  id VARCHAR(48) PRIMARY KEY,
  story_id VARCHAR(48) NOT NULL,
  media_url MEDIUMTEXT NULL,
  media_type ENUM('image','video') NOT NULL DEFAULT 'image',
  emoji VARCHAR(16) NULL,
  scene_json VARCHAR(128) NULL,
  ts BIGINT NOT NULL,
  CONSTRAINT fk_story_items_story FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS story_views (
  user_id VARCHAR(32) NOT NULL,
  story_id VARCHAR(48) NOT NULL,
  viewed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, story_id),
  CONSTRAINT fk_story_views_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_story_views_story FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ratings (
  id VARCHAR(48) PRIMARY KEY,
  rater_id VARCHAR(32) NOT NULL,
  ratee_id VARCHAR(32) NOT NULL,
  stars TINYINT NOT NULL,
  tag VARCHAR(64) NULL,
  context ENUM('feed','chat','call','proximity','story') NOT NULL DEFAULT 'feed',
  post_id VARCHAR(48) NULL,
  rater_score DECIMAL(4,2) NULL,
  delta DECIMAL(5,2) NULL,
  ts BIGINT NOT NULL,
  INDEX idx_ratings_ratee (ratee_id, ts DESC),
  CONSTRAINT fk_ratings_rater FOREIGN KEY (rater_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_ratings_ratee FOREIGN KEY (ratee_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS score_history (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(32) NOT NULL,
  score DECIMAL(4,2) NOT NULL,
  recorded_at BIGINT NOT NULL,
  INDEX idx_score_history_user (user_id, recorded_at),
  CONSTRAINT fk_score_history_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(48) PRIMARY KEY,
  user_id VARCHAR(32) NOT NULL,
  kind VARCHAR(24) NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT NULL,
  rater_id VARCHAR(32) NULL,
  stars TINYINT NULL,
  delta DECIMAL(5,2) NULL,
  tag VARCHAR(64) NULL,
  appeal ENUM('none','reviewing','denied','upheld') NULL,
  ts BIGINT NOT NULL,
  INDEX idx_notifs_user (user_id, ts DESC),
  CONSTRAINT fk_notifs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS boosts (
  user_id VARCHAR(32) PRIMARY KEY,
  amount DECIMAL(4,2) NOT NULL,
  until_ts BIGINT NOT NULL,
  from_user_id VARCHAR(32) NULL,
  CONSTRAINT fk_boosts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS conversations (
  id VARCHAR(48) PRIMARY KEY,
  user_a VARCHAR(32) NOT NULL,
  user_b VARCHAR(32) NOT NULL,
  updated_at BIGINT NOT NULL,
  UNIQUE KEY uq_conversation_pair (user_a, user_b),
  CONSTRAINT fk_conv_a FOREIGN KEY (user_a) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_conv_b FOREIGN KEY (user_b) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS messages (
  id VARCHAR(48) PRIMARY KEY,
  conversation_id VARCHAR(48) NOT NULL,
  sender_id VARCHAR(32) NOT NULL,
  body TEXT NULL,
  media_url MEDIUMTEXT NULL,
  media_type ENUM('image','video') NULL,
  voice TINYINT(1) NOT NULL DEFAULT 0,
  voice_dur VARCHAR(16) NULL,
  voice_seed INT NULL,
  reaction VARCHAR(16) NULL,
  ts BIGINT NOT NULL,
  INDEX idx_messages_conv (conversation_id, ts),
  CONSTRAINT fk_messages_conv FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  CONSTRAINT fk_messages_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS events (
  id VARCHAR(32) PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  type VARCHAR(64) NOT NULL,
  emoji VARCHAR(16) NOT NULL,
  scene_json VARCHAR(128) NOT NULL,
  miles DECIMAL(6,2) NOT NULL,
  req DECIMAL(3,1) NOT NULL,
  venue VARCHAR(128) NOT NULL,
  when_text VARCHAR(64) NOT NULL,
  host_id VARCHAR(32) NULL,
  city VARCHAR(128) NULL,
  address VARCHAR(256) NULL,
  secret_address TINYINT(1) NOT NULL DEFAULT 0,
  lat DECIMAL(10,7) NULL,
  lng DECIMAL(11,7) NULL,
  ts BIGINT NULL,
  kind ENUM('curated','party') NOT NULL DEFAULT 'curated',
  INDEX idx_events_kind_ts (kind, ts DESC),
  CONSTRAINT fk_events_host FOREIGN KEY (host_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS event_rsvps (
  user_id VARCHAR(32) NOT NULL,
  event_id VARCHAR(32) NOT NULL,
  ts BIGINT NOT NULL,
  PRIMARY KEY (user_id, event_id),
  CONSTRAINT fk_rsvp_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_rsvp_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS media_uploads (
  id VARCHAR(48) PRIMARY KEY,
  user_id VARCHAR(32) NOT NULL,
  path VARCHAR(512) NOT NULL,
  mime VARCHAR(64) NOT NULL,
  size_bytes INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_media_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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

SET FOREIGN_KEY_CHECKS = 1;
