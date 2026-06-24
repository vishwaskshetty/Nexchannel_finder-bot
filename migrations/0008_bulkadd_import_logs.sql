-- Migration 0008: Add import_logs table and bulkadd_wait/addchannel_wait modes to admin_states

-- 1. Add import_logs table for /bulkadd audit trail
CREATE TABLE IF NOT EXISTS import_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id INTEGER NOT NULL,
  total INTEGER NOT NULL DEFAULT 0,
  added INTEGER NOT NULL DEFAULT 0,
  duplicate INTEGER NOT NULL DEFAULT 0,
  invalid INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_import_logs_admin_id ON import_logs(admin_id, created_at DESC);

-- 2. Recreate admin_states with bulkadd_wait and addchannel_wait added to CHECK constraint
--    SQLite does not support ALTER COLUMN, so we rename + recreate + copy.

ALTER TABLE admin_states RENAME TO admin_states_old_008;

CREATE TABLE admin_states (
  telegram_id INTEGER PRIMARY KEY,
  mode TEXT NOT NULL
    CHECK (mode IN (
      'broadcast_wait', 'broadcast_confirm', 'search_wait',
      'import_paste_wait', 'import_csv_wait', 'add_public_wait', 'add_private_wait',
      'banner_wait', 'bulkadd_wait', 'addchannel_wait'
    )),
  payload TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (telegram_id) REFERENCES users(telegram_id) ON DELETE CASCADE
);

INSERT OR IGNORE INTO admin_states (telegram_id, mode, payload, updated_at)
SELECT telegram_id, mode, payload, updated_at
FROM admin_states_old_008
WHERE mode IN (
  'broadcast_wait', 'broadcast_confirm', 'search_wait',
  'import_paste_wait', 'import_csv_wait', 'add_public_wait', 'add_private_wait',
  'banner_wait'
);

DROP TABLE admin_states_old_008;

CREATE INDEX IF NOT EXISTS idx_admin_states_updated_at ON admin_states(updated_at DESC);
