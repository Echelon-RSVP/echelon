-- Real-time proximity / Lens presence (run once on production DB)
SET NAMES utf8mb4;

ALTER TABLE users
  ADD COLUMN lat DECIMAL(10, 7) NULL,
  ADD COLUMN lng DECIMAL(11, 7) NULL,
  ADD COLUMN location_ts BIGINT NULL;

CREATE INDEX idx_users_location ON users (location_ts, lat, lng);
