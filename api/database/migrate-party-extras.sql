-- Party extras: start time, banner, price, country code
SET NAMES utf8mb4;

ALTER TABLE events ADD COLUMN starts_at BIGINT NULL AFTER when_text;
ALTER TABLE events ADD COLUMN banner_url VARCHAR(512) NULL AFTER description;
ALTER TABLE events ADD COLUMN price DECIMAL(10,2) NULL AFTER banner_url;
ALTER TABLE events ADD COLUMN currency VARCHAR(8) NULL DEFAULT 'EUR' AFTER price;
ALTER TABLE events ADD COLUMN country_code VARCHAR(4) NULL AFTER city;

ALTER TABLE events ADD INDEX idx_events_starts_at (starts_at);
