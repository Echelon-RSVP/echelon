-- Run once on existing echelon_app database
SET NAMES utf8mb4;

ALTER TABLE users ADD COLUMN email VARCHAR(255) NULL;
ALTER TABLE users ADD COLUMN google_sub VARCHAR(255) NULL;
ALTER TABLE users ADD COLUMN password_hash VARCHAR(255) NULL;
ALTER TABLE users ADD COLUMN auth_method VARCHAR(16) NOT NULL DEFAULT 'password';

CREATE UNIQUE INDEX uq_users_email ON users (email);
CREATE UNIQUE INDEX uq_users_google_sub ON users (google_sub);

CREATE TABLE IF NOT EXISTS magic_links (
  token CHAR(64) PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  used TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_magic_email (email),
  INDEX idx_magic_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
