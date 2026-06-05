-- Chat reply quotes on messages
ALTER TABLE messages ADD COLUMN reply_to_id VARCHAR(48) NULL AFTER reaction;
ALTER TABLE messages ADD COLUMN reply_text VARCHAR(280) NULL AFTER reply_to_id;
