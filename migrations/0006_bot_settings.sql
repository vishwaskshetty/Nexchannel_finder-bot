-- Migration: Create bot_settings table for storing banner file IDs and other settings
-- This table is also created dynamically via CREATE TABLE IF NOT EXISTS in db.ts
-- Running this migration ensures it is available from the start.

CREATE TABLE IF NOT EXISTS bot_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
