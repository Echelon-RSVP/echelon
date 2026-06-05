SET NAMES utf8mb4;

ALTER TABLE story_items ADD COLUMN caption TEXT NULL;
ALTER TABLE story_items ADD COLUMN caption_style_json VARCHAR(256) NULL;
