-- Fix missing columns in channels table
ALTER TABLE channels ADD COLUMN channel_type TEXT DEFAULT 'public';
ALTER TABLE channels ADD COLUMN channel_link TEXT;
ALTER TABLE channels ADD COLUMN invite_link TEXT;
ALTER TABLE channels ADD COLUMN admin_username TEXT;
ALTER TABLE channels ADD COLUMN owner_verified INTEGER DEFAULT 0;
ALTER TABLE channels ADD COLUMN verification_code TEXT;
ALTER TABLE channels ADD COLUMN verification_status TEXT DEFAULT 'pending';
ALTER TABLE channels ADD COLUMN verification_created_at TEXT;
ALTER TABLE channels ADD COLUMN rating_total INTEGER DEFAULT 0;
ALTER TABLE channels ADD COLUMN rating_count INTEGER DEFAULT 0;
ALTER TABLE channels ADD COLUMN rating_average REAL DEFAULT 0;

-- Saved channels table
CREATE TABLE IF NOT EXISTS saved_channels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_id INTEGER NOT NULL,
  channel_id INTEGER NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (telegram_id, channel_id)
);

-- Ratings table
CREATE TABLE IF NOT EXISTS ratings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_id INTEGER NOT NULL,
  channel_id INTEGER NOT NULL,
  rating INTEGER NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (telegram_id, channel_id)
);

-- Ownership verification table
CREATE TABLE IF NOT EXISTS ownership_verifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_id INTEGER NOT NULL,
  channel_id INTEGER NOT NULL,
  verification_code TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  method TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  verified_at TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_saved_channels_user ON saved_channels(telegram_id);
CREATE INDEX IF NOT EXISTS idx_saved_channels_channel ON saved_channels(channel_id);
CREATE INDEX IF NOT EXISTS idx_ratings_channel ON ratings(channel_id);
CREATE INDEX IF NOT EXISTS idx_ratings_user ON ratings(telegram_id);
CREATE INDEX IF NOT EXISTS idx_channels_channel_type ON channels(channel_type);
CREATE INDEX IF NOT EXISTS idx_channels_rating_average ON channels(rating_average);