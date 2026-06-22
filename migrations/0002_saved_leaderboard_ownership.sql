ALTER TABLE channels ADD COLUMN owner_verified INTEGER NOT NULL DEFAULT 0 CHECK (owner_verified IN (0, 1));
ALTER TABLE channels ADD COLUMN verification_code TEXT;
ALTER TABLE channels ADD COLUMN verification_status TEXT NOT NULL DEFAULT 'pending'
  CHECK (verification_status IN ('pending', 'verified', 'failed', 'manual_review'));
ALTER TABLE channels ADD COLUMN verification_created_at TEXT;

CREATE TABLE IF NOT EXISTS saved_channels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_id INTEGER NOT NULL,
  channel_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (telegram_id, channel_id),
  FOREIGN KEY (telegram_id) REFERENCES users(telegram_id) ON DELETE CASCADE,
  FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ownership_verifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_id INTEGER NOT NULL,
  channel_id INTEGER NOT NULL,
  verification_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'verified', 'failed', 'manual_review')),
  method TEXT NOT NULL DEFAULT 'auto',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  verified_at TEXT,
  FOREIGN KEY (telegram_id) REFERENCES users(telegram_id) ON DELETE CASCADE,
  FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_channels_owner_verified ON channels(owner_verified);
CREATE INDEX IF NOT EXISTS idx_channels_verification_status ON channels(verification_status);
CREATE INDEX IF NOT EXISTS idx_saved_channels_user_created_at
  ON saved_channels(telegram_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saved_channels_channel_id ON saved_channels(channel_id);
CREATE INDEX IF NOT EXISTS idx_ownership_verifications_channel_id
  ON ownership_verifications(channel_id);
CREATE INDEX IF NOT EXISTS idx_ownership_verifications_status
  ON ownership_verifications(status, created_at DESC);
