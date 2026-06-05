SET NAMES utf8mb4;

ALTER TABLE users
  ADD COLUMN birth_year SMALLINT UNSIGNED NULL AFTER onboarded,
  ADD COLUMN height_m DECIMAL(4,2) NULL AFTER birth_year;

ALTER TABLE user_settings
  ADD COLUMN spark_min_score DECIMAL(3,2) NOT NULL DEFAULT 1.00 AFTER proximity_auto_scan,
  ADD COLUMN spark_max_score DECIMAL(3,2) NOT NULL DEFAULT 5.00 AFTER spark_min_score,
  ADD COLUMN spark_min_age TINYINT UNSIGNED NOT NULL DEFAULT 18 AFTER spark_max_score,
  ADD COLUMN spark_max_age TINYINT UNSIGNED NOT NULL DEFAULT 99 AFTER spark_min_age,
  ADD COLUMN spark_max_distance_mi DECIMAL(5,2) NOT NULL DEFAULT 25.00 AFTER spark_max_age,
  ADD COLUMN spark_min_height_m DECIMAL(4,2) NOT NULL DEFAULT 1.40 AFTER spark_max_distance_mi,
  ADD COLUMN spark_max_height_m DECIMAL(4,2) NOT NULL DEFAULT 2.20 AFTER spark_min_height_m;
