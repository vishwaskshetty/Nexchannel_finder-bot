-- Note: If you run these in Cloudflare D1 and get a "duplicate column" error for ALTER TABLE, you can safely ignore it.
-- Cloudflare D1 currently does not support IF NOT EXISTS for ALTER TABLE ADD COLUMN.

-- 1. Create or Update Users table
CREATE TABLE IF NOT EXISTS users (
  telegram_id INTEGER PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT,
  username TEXT,
  language_code TEXT,
  is_bot INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  ui_language TEXT DEFAULT 'English'
);

ALTER TABLE users ADD COLUMN ui_language TEXT DEFAULT 'English';

-- 2. Update Channels table for Ownership Verification
ALTER TABLE channels ADD COLUMN ownership_verified INTEGER DEFAULT 0;
ALTER TABLE channels ADD COLUMN owner_user_id INTEGER;
ALTER TABLE channels ADD COLUMN verification_code TEXT;
ALTER TABLE channels ADD COLUMN verified_at DATETIME;

-- 3. Update Channels table for Quality Check
ALTER TABLE channels ADD COLUMN quality_status TEXT DEFAULT 'unchecked';
ALTER TABLE channels ADD COLUMN admin_notes TEXT;
ALTER TABLE channels ADD COLUMN is_scam INTEGER DEFAULT 0;
ALTER TABLE channels ADD COLUMN last_checked_at DATETIME;

-- 4. Create user_activity table for Smart Recommendations and Analytics
CREATE TABLE IF NOT EXISTS user_activity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  channel_id INTEGER NOT NULL,
  action TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_user_activity_user ON user_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_channel ON user_activity(channel_id);

-- 5. Create reports table
CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  channel_id INTEGER NOT NULL,
  reason TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, channel_id)
);

-- Note: Ensure existing tables like saved_channels and ratings exist.
CREATE TABLE IF NOT EXISTS saved_channels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_id INTEGER NOT NULL,
  channel_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (telegram_id, channel_id)
);

CREATE TABLE IF NOT EXISTS ratings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_id INTEGER NOT NULL,
  channel_id INTEGER NOT NULL,
  rating INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (telegram_id, channel_id)
);
