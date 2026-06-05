SET NAMES utf8mb4;

ALTER TABLE posts ADD COLUMN caption_style_json TEXT NULL;
ALTER TABLE posts ADD COLUMN tags_json TEXT NULL;
