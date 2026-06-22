PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS report_fingerprints (
  telegram_id INTEGER NOT NULL,
  channel_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (telegram_id, channel_id),
  FOREIGN KEY (telegram_id) REFERENCES users(telegram_id) ON DELETE CASCADE,
  FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE
);

INSERT OR IGNORE INTO report_fingerprints (telegram_id, channel_id, created_at)
SELECT telegram_id, channel_id, MIN(created_at)
FROM reports
WHERE telegram_id IS NOT NULL
GROUP BY telegram_id, channel_id;

CREATE INDEX IF NOT EXISTS idx_report_fingerprints_channel_id
  ON report_fingerprints(channel_id);
