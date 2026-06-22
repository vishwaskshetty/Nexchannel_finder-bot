CREATE TABLE IF NOT EXISTS youtube_verifications (
  telegram_id INTEGER PRIMARY KEY,
  status TEXT DEFAULT 'not_started',
  proof_file_id TEXT,
  clicked_at TEXT,
  submitted_at TEXT,
  approved_at TEXT,
  rejected_at TEXT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);