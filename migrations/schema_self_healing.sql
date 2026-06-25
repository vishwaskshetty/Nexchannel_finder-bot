-- 1. Ensure required tables exist
CREATE TABLE IF NOT EXISTS users (
  telegram_id INTEGER PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT,
  username TEXT,
  language_code TEXT,
  is_bot INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  ui_language TEXT DEFAULT 'English',
  youtube_verified INTEGER DEFAULT 0
);

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

CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  channel_id INTEGER NOT NULL,
  reason TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, channel_id)
);

CREATE TABLE IF NOT EXISTS user_activity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  channel_id INTEGER NOT NULL,
  action TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS import_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id INTEGER,
  total INTEGER,
  added INTEGER,
  duplicate INTEGER,
  invalid INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Note: We are using a schema self-healing helper in the worker (ensureSchema)
-- because D1 does not fully support `ADD COLUMN IF NOT EXISTS`.
-- These statements below may cause duplicate column errors if ran manually
-- on an already migrated database, but the app handles it at runtime.

-- ALTER TABLE channels ADD COLUMN username TEXT;
-- ALTER TABLE channels ADD COLUMN views INTEGER DEFAULT 0;
-- ALTER TABLE channels ADD COLUMN clicks INTEGER DEFAULT 0;
-- ALTER TABLE channels ADD COLUMN rating REAL DEFAULT 0;
-- ALTER TABLE channels ADD COLUMN ownership_verified INTEGER DEFAULT 0;
-- ALTER TABLE channels ADD COLUMN owner_user_id INTEGER;
-- ALTER TABLE channels ADD COLUMN submitted_by INTEGER;
-- ALTER TABLE channels ADD COLUMN verified_at DATETIME;
-- ALTER TABLE channels ADD COLUMN is_scam INTEGER DEFAULT 0;
-- ALTER TABLE channels ADD COLUMN quality_status TEXT DEFAULT 'unchecked';
-- ALTER TABLE channels ADD COLUMN admin_notes TEXT;
-- ALTER TABLE channels ADD COLUMN last_checked_at DATETIME;
