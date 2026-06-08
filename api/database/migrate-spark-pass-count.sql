-- Track how many times a user passed on each Spark profile (for deck recycle sorting).
SET NAMES utf8mb4;

ALTER TABLE spark_swipes
  ADD COLUMN pass_count INT NOT NULL DEFAULT 0 AFTER action;

UPDATE spark_swipes SET pass_count = 1 WHERE action = 'pass' AND pass_count = 0;
