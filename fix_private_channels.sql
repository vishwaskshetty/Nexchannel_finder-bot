PRAGMA foreign_keys=OFF;

DROP TABLE IF EXISTS channels_fixed;

CREATE TABLE channels_fixed (
  id INTEGER PRIMARY KEY,
  owner_telegram_id INTEGER,
  channel_username TEXT DEFAULT '',
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'Mixed',
  tags TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  featured INTEGER NOT NULL DEFAULT 0,
  verified INTEGER NOT NULL DEFAULT 0,
  join_clicks INTEGER NOT NULL DEFAULT 0,
  votes INTEGER NOT NULL DEFAULT 0,
  reports INTEGER NOT NULL DEFAULT 0,
  trending_score REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  channel_type TEXT DEFAULT 'public',
  channel_link TEXT DEFAULT '',
  invite_link TEXT DEFAULT '',
  admin_username TEXT,
  owner_verified INTEGER DEFAULT 0,
  verification_code TEXT,
  verification_status TEXT DEFAULT 'pending',
  verification_created_at TEXT,
  rating_total INTEGER DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  rating_average REAL DEFAULT 0
);

INSERT INTO channels_fixed (
  id,
  owner_telegram_id,
  channel_username,
  title,
  description,
  category,
  language,
  tags,
  status,
  featured,
  verified,
  join_clicks,
  votes,
  reports,
  trending_score,
  created_at,
  updated_at,
  channel_type,
  channel_link,
  invite_link,
  admin_username,
  owner_verified,
  verification_code,
  verification_status,
  verification_created_at,
  rating_total,
  rating_count,
  rating_average
)
SELECT
  id,
  owner_telegram_id,
  COALESCE(channel_username, ''),
  title,
  COALESCE(description, ''),
  category,
  COALESCE(language, 'Mixed'),
  COALESCE(tags, ''),
  COALESCE(status, 'pending'),
  COALESCE(featured, 0),
  COALESCE(verified, 0),
  COALESCE(join_clicks, 0),
  COALESCE(votes, 0),
  COALESCE(reports, 0),
  COALESCE(trending_score, 0),
  COALESCE(created_at, CURRENT_TIMESTAMP),
  COALESCE(updated_at, CURRENT_TIMESTAMP),
  COALESCE(channel_type, 'public'),
  COALESCE(channel_link, ''),
  COALESCE(invite_link, ''),
  admin_username,
  COALESCE(owner_verified, 0),
  verification_code,
  COALESCE(verification_status, 'pending'),
  verification_created_at,
  COALESCE(rating_total, 0),
  COALESCE(rating_count, 0),
  COALESCE(rating_average, 0)
FROM channels;

DROP TABLE channels;

ALTER TABLE channels_fixed RENAME TO channels;

CREATE INDEX IF NOT EXISTS idx_channels_status ON channels(status);
CREATE INDEX IF NOT EXISTS idx_channels_category ON channels(category);
CREATE INDEX IF NOT EXISTS idx_channels_owner ON channels(owner_telegram_id);
CREATE INDEX IF NOT EXISTS idx_channels_channel_type ON channels(channel_type);
CREATE INDEX IF NOT EXISTS idx_channels_rating_average ON channels(rating_average);
CREATE INDEX IF NOT EXISTS idx_channels_trending_score ON channels(trending_score);

PRAGMA foreign_keys=ON;