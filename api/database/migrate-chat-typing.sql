-- Typing indicators for live chat
ALTER TABLE conversations ADD COLUMN typing_user_id VARCHAR(32) NULL;
ALTER TABLE conversations ADD COLUMN typing_at BIGINT NULL;
