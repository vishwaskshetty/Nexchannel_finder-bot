-- Migration 0005: Channel Import System

-- Add new columns to channels safely
ALTER TABLE channels ADD COLUMN source_name TEXT DEFAULT '';
ALTER TABLE channels ADD COLUMN source_url TEXT DEFAULT '';
ALTER TABLE channels ADD COLUMN source_rank INTEGER DEFAULT 0;
ALTER TABLE channels ADD COLUMN subscribers_text TEXT DEFAULT '';
ALTER TABLE channels ADD COLUMN import_batch_id TEXT DEFAULT '';
ALTER TABLE channels ADD COLUMN last_imported_at TEXT;
ALTER TABLE channels ADD COLUMN is_public_listing INTEGER DEFAULT 1;

-- Create table for import batches
CREATE TABLE IF NOT EXISTS channel_import_batches (
  id TEXT PRIMARY KEY,
  source_name TEXT,
  source_url TEXT,
  imported_by INTEGER,
  total_found INTEGER DEFAULT 0,
  total_imported INTEGER DEFAULT 0,
  total_skipped INTEGER DEFAULT 0,
  status TEXT DEFAULT 'completed',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Create table for rejected/skipped import logs
CREATE TABLE IF NOT EXISTS channel_import_skips (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  batch_id TEXT,
  title TEXT,
  username TEXT,
  external_category TEXT,
  reason TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
