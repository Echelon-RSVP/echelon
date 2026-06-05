-- Chat status message shown near username in DMs
ALTER TABLE users ADD COLUMN chat_status VARCHAR(120) NULL;
