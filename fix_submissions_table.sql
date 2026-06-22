DROP TABLE IF EXISTS submissions;

CREATE TABLE submissions (
  telegram_id INTEGER PRIMARY KEY,
  step TEXT NOT NULL,
  channel_type TEXT,
  channel_username TEXT,
  channel_link TEXT,
  invite_link TEXT,
  category TEXT,
  language TEXT,
  description TEXT,
  tags TEXT,
  admin_username TEXT,
  verification_code TEXT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_submissions_step ON submissions(step);
CREATE INDEX IF NOT EXISTS idx_submissions_updated_at ON submissions(updated_at);