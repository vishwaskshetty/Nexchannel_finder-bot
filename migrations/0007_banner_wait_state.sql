-- Migration: Add banner_wait to admin_states mode CHECK constraint
-- and ensure bot_settings table exists.
--
-- SQLite does not support ALTER TABLE ... ALTER COLUMN constraints,
-- so we recreate admin_states with the updated CHECK constraint.

-- 1. Rename old table
ALTER TABLE admin_states RENAME TO admin_states_old;

-- 2. Create new table with banner_wait added to CHECK constraint
CREATE TABLE admin_states (
  telegram_id INTEGER PRIMARY KEY,
  mode TEXT NOT NULL
    CHECK (mode IN (
      'broadcast_wait', 'broadcast_confirm', 'search_wait',
      'import_paste_wait', 'import_csv_wait', 'add_public_wait', 'add_private_wait',
      'banner_wait'
    )),
  payload TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (telegram_id) REFERENCES users(telegram_id) ON DELETE CASCADE
);

-- 3. Copy existing rows (any rows in unsupported modes will be skipped)
INSERT OR IGNORE INTO admin_states (telegram_id, mode, payload, updated_at)
SELECT telegram_id, mode, payload, updated_at
FROM admin_states_old
WHERE mode IN (
  'broadcast_wait', 'broadcast_confirm', 'search_wait',
  'import_paste_wait', 'import_csv_wait', 'add_public_wait', 'add_private_wait'
);

-- 4. Drop old table
DROP TABLE admin_states_old;

-- 5. Recreate the index
CREATE INDEX IF NOT EXISTS idx_admin_states_updated_at ON admin_states(updated_at DESC);

-- 6. Ensure bot_settings table exists (idempotent)
CREATE TABLE IF NOT EXISTS bot_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
