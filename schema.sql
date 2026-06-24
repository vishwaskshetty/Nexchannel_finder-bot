CREATE TABLE IF NOT EXISTS channels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  title TEXT,
  category TEXT,
  language TEXT,
  description TEXT,
  tags TEXT,
  added_by INTEGER,
  owner_username TEXT,
  status TEXT DEFAULT 'pending',
  verified INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  rating REAL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_states (
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

CREATE TABLE IF NOT EXISTS import_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id INTEGER,
  total INTEGER,
  added INTEGER,
  duplicate INTEGER,
  invalid INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
