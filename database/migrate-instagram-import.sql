-- Instagram import preferences (past vs future sync)
SET NAMES utf8mb4;

ALTER TABLE users
  ADD COLUMN instagram_import_past TINYINT(1) NOT NULL DEFAULT 1;
