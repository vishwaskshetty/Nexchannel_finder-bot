PRAGMA foreign_keys = OFF;

CREATE TABLE channels_next (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_telegram_id INTEGER,
  channel_type TEXT NOT NULL DEFAULT 'public'
    CHECK (channel_type IN ('public', 'private')),
  channel_username TEXT COLLATE NOCASE UNIQUE,
  channel_link TEXT,
  invite_link TEXT,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'Mixed',
  tags TEXT NOT NULL DEFAULT '',
  admin_username TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'hidden')),
  featured INTEGER NOT NULL DEFAULT 0 CHECK (featured IN (0, 1)),
  verified INTEGER NOT NULL DEFAULT 0 CHECK (verified IN (0, 1)),
  join_clicks INTEGER NOT NULL DEFAULT 0,
  reports INTEGER NOT NULL DEFAULT 0,
  rating_total INTEGER NOT NULL DEFAULT 0,
  rating_count INTEGER NOT NULL DEFAULT 0,
  rating_average REAL NOT NULL DEFAULT 0,
  trending_score REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_telegram_id) REFERENCES users(telegram_id) ON DELETE SET NULL,
  FOREIGN KEY (category) REFERENCES categories(slug) ON UPDATE CASCADE
);

INSERT INTO channels_next (
  id,
  owner_telegram_id,
  channel_type,
  channel_username,
  channel_link,
  invite_link,
  title,
  description,
  category,
  language,
  tags,
  admin_username,
  status,
  featured,
  verified,
  join_clicks,
  reports,
  rating_total,
  rating_count,
  rating_average,
  trending_score,
  created_at,
  updated_at
)
SELECT
  id,
  owner_telegram_id,
  CASE
    WHEN channel_username LIKE 'https://t.me/+%' OR channel_username LIKE 'https://t.me/joinchat/%'
      THEN 'private'
    ELSE 'public'
  END AS channel_type,
  CASE
    WHEN channel_username LIKE 'https://t.me/+%' OR channel_username LIKE 'https://t.me/joinchat/%'
      THEN NULL
    ELSE channel_username
  END AS channel_username,
  CASE
    WHEN channel_username LIKE 'https://t.me/+%' OR channel_username LIKE 'https://t.me/joinchat/%'
      THEN NULL
    ELSE 'https://t.me/' || replace(channel_username, '@', '')
  END AS channel_link,
  CASE
    WHEN channel_username LIKE 'https://t.me/+%' OR channel_username LIKE 'https://t.me/joinchat/%'
      THEN channel_username
    ELSE NULL
  END AS invite_link,
  title,
  description,
  category,
  language,
  tags,
  NULL AS admin_username,
  status,
  featured,
  verified,
  join_clicks,
  reports,
  votes * 5 AS rating_total,
  votes AS rating_count,
  CASE WHEN votes > 0 THEN 5.0 ELSE 0 END AS rating_average,
  ((join_clicks * 2.0) + ((CASE WHEN votes > 0 THEN 5.0 ELSE 0 END) * 10.0) + (votes * 2.0) - (reports * 10.0)) AS trending_score,
  created_at,
  updated_at
FROM channels;

DROP TABLE channels;
ALTER TABLE channels_next RENAME TO channels;

PRAGMA foreign_keys = ON;

CREATE UNIQUE INDEX IF NOT EXISTS idx_channels_channel_link_unique
  ON channels(channel_link)
  WHERE channel_link IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_channels_invite_link_unique
  ON channels(invite_link)
  WHERE invite_link IS NOT NULL;

CREATE TABLE IF NOT EXISTS ratings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_id INTEGER NOT NULL,
  channel_id INTEGER NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (telegram_id, channel_id),
  FOREIGN KEY (telegram_id) REFERENCES users(telegram_id) ON DELETE CASCADE,
  FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE
);

INSERT OR IGNORE INTO ratings (telegram_id, channel_id, rating, created_at)
SELECT telegram_id, channel_id, 5, created_at
FROM votes;

UPDATE channels
SET
  rating_total = (
    SELECT COALESCE(SUM(rating), 0)
    FROM ratings
    WHERE ratings.channel_id = channels.id
  ),
  rating_count = (
    SELECT COUNT(*)
    FROM ratings
    WHERE ratings.channel_id = channels.id
  );

UPDATE channels
SET
  rating_average = CASE
    WHEN rating_count > 0 THEN ROUND((rating_total * 1.0) / rating_count, 1)
    ELSE 0
  END,
  trending_score = ((join_clicks * 2.0) + (rating_average * 10.0) + (rating_count * 2.0) - (reports * 10.0)),
  updated_at = CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS owner_states (
  telegram_id INTEGER PRIMARY KEY,
  channel_id INTEGER NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('edit_description', 'edit_tags')),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (telegram_id) REFERENCES users(telegram_id) ON DELETE CASCADE,
  FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE
);

ALTER TABLE submissions ADD COLUMN channel_type TEXT CHECK (channel_type IN ('public', 'private'));
ALTER TABLE submissions ADD COLUMN admin_username TEXT;

CREATE INDEX IF NOT EXISTS idx_channels_status ON channels(status);
CREATE INDEX IF NOT EXISTS idx_channels_category ON channels(category);
CREATE INDEX IF NOT EXISTS idx_channels_language ON channels(language);
CREATE INDEX IF NOT EXISTS idx_channels_featured ON channels(featured);
CREATE INDEX IF NOT EXISTS idx_channels_verified ON channels(verified);
CREATE INDEX IF NOT EXISTS idx_channels_owner ON channels(owner_telegram_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_channels_trending_score ON channels(trending_score DESC);
CREATE INDEX IF NOT EXISTS idx_channels_rating ON channels(rating_average DESC, rating_count DESC);
CREATE INDEX IF NOT EXISTS idx_channels_created_at ON channels(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_channels_status_category ON channels(status, category);
CREATE INDEX IF NOT EXISTS idx_channels_status_trending ON channels(status, trending_score DESC);
CREATE INDEX IF NOT EXISTS idx_channels_status_created ON channels(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_channels_featured_verified_score
  ON channels(featured, verified DESC, trending_score DESC);
CREATE INDEX IF NOT EXISTS idx_ratings_channel_id ON ratings(channel_id);
CREATE INDEX IF NOT EXISTS idx_clicks_channel_id_created_at ON clicks(channel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_channel_id_created_at ON reports(channel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_owner_states_updated_at ON owner_states(updated_at DESC);
