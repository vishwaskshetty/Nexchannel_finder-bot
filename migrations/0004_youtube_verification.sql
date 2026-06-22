-- Migration 0004: YouTube verification system

-- Add youtube_verified column to users table (safe: ignored if column already exists by app logic)
ALTER TABLE users ADD COLUMN youtube_verified INTEGER DEFAULT 0;

-- YouTube verification tracking table
CREATE TABLE IF NOT EXISTS youtube_verifications (
  telegram_id INTEGER PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'not_started',
  proof_file_id TEXT,
  clicked_at TEXT,
  submitted_at TEXT,
  approved_at TEXT,
  rejected_at TEXT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
