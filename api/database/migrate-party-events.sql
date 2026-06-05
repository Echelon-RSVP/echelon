-- User-created party events (4.0+ hosts)
SET NAMES utf8mb4;

ALTER TABLE events ADD COLUMN host_id VARCHAR(32) NULL;
ALTER TABLE events ADD COLUMN city VARCHAR(128) NULL;
ALTER TABLE events ADD COLUMN address VARCHAR(256) NULL;
ALTER TABLE events ADD COLUMN secret_address TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE events ADD COLUMN lat DECIMAL(10,7) NULL;
ALTER TABLE events ADD COLUMN lng DECIMAL(11,7) NULL;
ALTER TABLE events ADD COLUMN ts BIGINT NULL;
ALTER TABLE events ADD COLUMN kind ENUM('curated','party') NOT NULL DEFAULT 'curated';

UPDATE events SET city = venue, kind = 'curated' WHERE city IS NULL;

ALTER TABLE events ADD INDEX idx_events_kind_ts (kind, ts DESC);
ALTER TABLE events ADD CONSTRAINT fk_events_host FOREIGN KEY (host_id) REFERENCES users(id) ON DELETE SET NULL;
