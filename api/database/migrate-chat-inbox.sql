-- Chat inbox read state + ephemeral / view-once messages
ALTER TABLE conversations ADD COLUMN read_ts_a BIGINT NOT NULL DEFAULT 0;
ALTER TABLE conversations ADD COLUMN read_ts_b BIGINT NOT NULL DEFAULT 0;
ALTER TABLE messages ADD COLUMN burn_mode VARCHAR(16) NULL AFTER reply_text;
ALTER TABLE messages ADD COLUMN burn_seconds INT NULL AFTER burn_mode;
ALTER TABLE messages ADD COLUMN consumed_at BIGINT NULL AFTER burn_seconds;
ALTER TABLE messages ADD COLUMN expires_at BIGINT NULL AFTER consumed_at;
