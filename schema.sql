PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 100,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_id INTEGER NOT NULL UNIQUE,
  username TEXT,
  first_name TEXT NOT NULL DEFAULT '',
  is_admin INTEGER NOT NULL DEFAULT 0 CHECK (is_admin IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS channels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_telegram_id INTEGER,
  channel_type TEXT NOT NULL DEFAULT 'public'
    CHECK (channel_type IN ('public', 'private')),
  channel_username TEXT COLLATE NOCASE UNIQUE,
  channel_link TEXT,
  invite_link TEXT,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'Mixed',
  tags TEXT NOT NULL DEFAULT '',
  admin_username TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'hidden')),
  featured INTEGER NOT NULL DEFAULT 0 CHECK (featured IN (0, 1)),
  verified INTEGER NOT NULL DEFAULT 0 CHECK (verified IN (0, 1)),
  owner_verified INTEGER NOT NULL DEFAULT 0 CHECK (owner_verified IN (0, 1)),
  verification_code TEXT,
  verification_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (verification_status IN ('pending', 'verified', 'failed', 'manual_review')),
  verification_created_at TEXT,
  join_clicks INTEGER NOT NULL DEFAULT 0,
  reports INTEGER NOT NULL DEFAULT 0,
  rating_total INTEGER NOT NULL DEFAULT 0,
  rating_count INTEGER NOT NULL DEFAULT 0,
  rating_average REAL NOT NULL DEFAULT 0,
  trending_score REAL NOT NULL DEFAULT 0,
  source_name TEXT DEFAULT '',
  source_url TEXT DEFAULT '',
  source_rank INTEGER DEFAULT 0,
  subscribers_text TEXT DEFAULT '',
  import_batch_id TEXT DEFAULT '',
  last_imported_at TEXT,
  is_public_listing INTEGER NOT NULL DEFAULT 1 CHECK (is_public_listing IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_telegram_id) REFERENCES users(telegram_id) ON DELETE SET NULL,
  FOREIGN KEY (category) REFERENCES categories(slug) ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_channels_channel_link_unique
  ON channels(channel_link)
  WHERE channel_link IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_channels_invite_link_unique
  ON channels(invite_link)
  WHERE invite_link IS NOT NULL;

CREATE TABLE IF NOT EXISTS ratings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_id INTEGER NOT NULL,
  channel_id INTEGER NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (telegram_id, channel_id),
  FOREIGN KEY (telegram_id) REFERENCES users(telegram_id) ON DELETE CASCADE,
  FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS clicks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_id INTEGER,
  channel_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (telegram_id) REFERENCES users(telegram_id) ON DELETE SET NULL,
  FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS saved_channels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_id INTEGER NOT NULL,
  channel_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (telegram_id, channel_id),
  FOREIGN KEY (telegram_id) REFERENCES users(telegram_id) ON DELETE CASCADE,
  FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_id INTEGER,
  channel_id INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (telegram_id) REFERENCES users(telegram_id) ON DELETE SET NULL,
  FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS report_fingerprints (
  telegram_id INTEGER NOT NULL,
  channel_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (telegram_id, channel_id),
  FOREIGN KEY (telegram_id) REFERENCES users(telegram_id) ON DELETE CASCADE,
  FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS submissions (
  telegram_id INTEGER PRIMARY KEY,
  step TEXT NOT NULL DEFAULT 'type',
  channel_type TEXT CHECK (channel_type IN ('public', 'private')),
  channel_username TEXT,
  category TEXT,
  language TEXT,
  description TEXT,
  tags TEXT,
  admin_username TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (telegram_id) REFERENCES users(telegram_id) ON DELETE CASCADE,
  FOREIGN KEY (category) REFERENCES categories(slug) ON UPDATE CASCADE
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

CREATE TABLE IF NOT EXISTS owner_states (
  telegram_id INTEGER PRIMARY KEY,
  channel_id INTEGER NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('edit_description', 'edit_tags')),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (telegram_id) REFERENCES users(telegram_id) ON DELETE CASCADE,
  FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS admin_states (
  telegram_id INTEGER PRIMARY KEY,
  mode TEXT NOT NULL
    CHECK (mode IN (
      'broadcast_wait', 'broadcast_confirm', 'search_wait',
      'import_paste_wait', 'import_csv_wait', 'add_public_wait', 'add_private_wait'
    )),
  payload TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (telegram_id) REFERENCES users(telegram_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS search_states (
  telegram_id INTEGER PRIMARY KEY,
  query TEXT NOT NULL DEFAULT '',
  sort TEXT NOT NULL DEFAULT 'trending'
    CHECK (sort IN ('trending', 'rating', 'clicks', 'newest', 'votes')),
  language TEXT,
  verified_only INTEGER NOT NULL DEFAULT 0 CHECK (verified_only IN (0, 1)),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (telegram_id) REFERENCES users(telegram_id) ON DELETE CASCADE
);

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

CREATE TABLE IF NOT EXISTS channel_import_skips (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  batch_id TEXT,
  title TEXT,
  username TEXT,
  external_category TEXT,
  reason TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_channels_status ON channels(status);
CREATE INDEX IF NOT EXISTS idx_channels_category ON channels(category);
CREATE INDEX IF NOT EXISTS idx_channels_language ON channels(language);
CREATE INDEX IF NOT EXISTS idx_channels_featured ON channels(featured);
CREATE INDEX IF NOT EXISTS idx_channels_verified ON channels(verified);
CREATE INDEX IF NOT EXISTS idx_channels_owner_verified ON channels(owner_verified);
CREATE INDEX IF NOT EXISTS idx_channels_verification_status ON channels(verification_status);
CREATE INDEX IF NOT EXISTS idx_channels_owner ON channels(owner_telegram_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_channels_trending_score ON channels(trending_score DESC);
CREATE INDEX IF NOT EXISTS idx_channels_rating ON channels(rating_average DESC, rating_count DESC);
CREATE INDEX IF NOT EXISTS idx_channels_created_at ON channels(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_channels_status_category ON channels(status, category);
CREATE INDEX IF NOT EXISTS idx_channels_status_trending ON channels(status, trending_score DESC);
CREATE INDEX IF NOT EXISTS idx_channels_status_created ON channels(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_channels_featured_verified_score
  ON channels(featured, verified DESC, trending_score DESC);
CREATE INDEX IF NOT EXISTS idx_ratings_channel_id ON ratings(channel_id);
CREATE INDEX IF NOT EXISTS idx_clicks_channel_id_created_at ON clicks(channel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saved_channels_user_created_at
  ON saved_channels(telegram_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saved_channels_channel_id ON saved_channels(channel_id);
CREATE INDEX IF NOT EXISTS idx_ownership_verifications_channel_id
  ON ownership_verifications(channel_id);
CREATE INDEX IF NOT EXISTS idx_ownership_verifications_status
  ON ownership_verifications(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_channel_id_created_at ON reports(channel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_report_fingerprints_channel_id
  ON report_fingerprints(channel_id);
CREATE INDEX IF NOT EXISTS idx_admin_states_updated_at ON admin_states(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_owner_states_updated_at ON owner_states(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_states_updated_at ON search_states(updated_at DESC);

INSERT INTO categories (slug, name, sort_order) VALUES
  ('education', '📚 Education', 10),
  ('jobs', '💼 Jobs & Internships', 20),
  ('ai', '🤖 AI', 30),
  ('tech', '📱 Tech / Telegram', 40),
  ('news', '📰 News', 50),
  ('deals', '🛒 Deals', 60),
  ('sports', '🏏 Sports', 70),
  ('gaming', '🎮 Gaming', 80),
  ('creators', '🎨 Creators', 90),
  ('business', '🏢 Business', 100),
  ('earning', '💰 Earning', 110),
  ('movies', '🎬 Movies', 120),
  ('books', '📖 Books', 130),
  ('motivation', '💬 Motivation', 140),
  ('entertainment', '🎭 Entertainment', 150),
  ('music', '🎵 Music', 160),
  ('tools', '🧰 Tools', 170),
  ('apps', '📱 Apps', 180),
  ('other', '🌐 Other', 190)
ON CONFLICT(slug) DO UPDATE SET
  name = excluded.name,
  sort_order = excluded.sort_order;

INSERT INTO channels (
  owner_telegram_id,
  channel_type,
  channel_username,
  channel_link,
  invite_link,
  title,
  description,
  category,
  language,
  tags,
  status,
  featured,
  verified
) VALUES
  (NULL, 'public', '@telegram', 'https://t.me/telegram', NULL, 'Telegram', 'Official Telegram channel listing.', 'tech', 'Mixed', 'telegram, official', 'approved', 1, 1),
  (NULL, 'public', '@botnews', 'https://t.me/botnews', NULL, 'BotNews', 'Official Telegram bot platform news listing.', 'tech', 'Mixed', 'telegram, bots, official', 'approved', 1, 1),
  (NULL, 'public', '@durov', 'https://t.me/durov', NULL, 'Durov', 'Official Pavel Durov channel listing.', 'tech', 'Mixed', 'telegram, official', 'approved', 1, 1),
  (NULL, 'public', '@Best_AI_tools', 'https://t.me/Best_AI_tools', NULL, 'Best AI Tools', 'Featured AI tools channel listing.', 'ai', 'Mixed', 'ai, tools', 'approved', 1, 0),
  (NULL, 'public', '@AiIndiaJobs', 'https://t.me/AiIndiaJobs', NULL, 'AI India Jobs', 'Featured AI jobs channel listing.', 'jobs', 'Mixed', 'ai, jobs', 'approved', 1, 0),
  (NULL, 'public', '@jobs_and_internships_updates', 'https://t.me/jobs_and_internships_updates', NULL, 'Jobs and Internships Updates', 'Featured jobs and internships channel listing.', 'jobs', 'Mixed', 'jobs, internships', 'approved', 1, 0),
  (NULL, 'public', '@ksgindia', 'https://t.me/ksgindia', NULL, 'KSG India', 'Featured education channel listing.', 'education', 'Mixed', 'education', 'approved', 1, 0),
  (NULL, 'public', '@Loot_Dealsx', 'https://t.me/Loot_Dealsx', NULL, 'Loot Dealsx', 'Featured deals and offers channel listing.', 'deals', 'Mixed', 'deals, offers', 'approved', 1, 0),
  (NULL, 'public', '@realshoppingdeals', 'https://t.me/realshoppingdeals', NULL, 'Real Shopping Deals', 'Featured shopping deals channel listing.', 'deals', 'Mixed', 'shopping, deals', 'approved', 1, 0),
  (NULL, 'public', '@dealdost', 'https://t.me/dealdost', NULL, 'Deal Dost', 'Featured deals channel listing.', 'deals', 'Mixed', 'deals, offers', 'approved', 1, 0),
  (NULL, 'public', '@indian_cricket', 'https://t.me/indian_cricket', NULL, 'Indian Cricket', 'Featured sports channel listing.', 'sports', 'Mixed', 'cricket, sports', 'approved', 1, 0),
  (NULL, 'public', '@cricketkidiwaniTG', 'https://t.me/cricketkidiwaniTG', NULL, 'Cricket Ki Diwani TG', 'Featured cricket channel listing.', 'sports', 'Mixed', 'cricket, sports', 'approved', 1, 0),
  (NULL, 'public', '@gamingdiscovery', 'https://t.me/gamingdiscovery', NULL, 'Gaming Discovery', 'Featured gaming channel listing.', 'gaming', 'Mixed', 'gaming', 'approved', 1, 0),
  (NULL, 'public', '@cinderellagaming321', 'https://t.me/cinderellagaming321', NULL, 'Cinderella Gaming 321', 'Featured gaming channel listing.', 'gaming', 'Mixed', 'gaming', 'approved', 1, 0),
  (NULL, 'public', '@ezedit', 'https://t.me/ezedit', NULL, 'Ez Edit', 'Featured editing and creators channel listing.', 'creators', 'Mixed', 'editing, creators', 'approved', 1, 0),
  (NULL, 'public', '@tipseditor_official', 'https://t.me/tipseditor_official', NULL, 'Tips Editor Official', 'Featured editing channel listing.', 'creators', 'Mixed', 'editing, creators', 'approved', 1, 0),
  (NULL, 'public', '@tamizhantechofficial', 'https://t.me/tamizhantechofficial', NULL, 'Tamizhan Tech Official', 'Featured tech channel listing.', 'tech', 'Mixed', 'tech, telegram', 'approved', 1, 0)
ON CONFLICT(channel_username) DO UPDATE SET
  channel_type = excluded.channel_type,
  channel_link = excluded.channel_link,
  invite_link = excluded.invite_link,
  title = excluded.title,
  description = excluded.description,
  category = excluded.category,
  language = excluded.language,
  tags = excluded.tags,
  status = 'approved',
  featured = 1,
  verified = excluded.verified,
  updated_at = CURRENT_TIMESTAMP;

UPDATE channels
SET trending_score = ((join_clicks * 2.0) + (rating_average * 10.0) + (rating_count * 2.0) - (reports * 10.0)),
  updated_at = CURRENT_TIMESTAMP;
