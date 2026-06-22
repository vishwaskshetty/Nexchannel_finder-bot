ALTER TABLE channels ADD COLUMN admin_username TEXT;
ALTER TABLE channels ADD COLUMN verification_code TEXT;
ALTER TABLE channels ADD COLUMN verification_status TEXT DEFAULT 'pending';
ALTER TABLE channels ADD COLUMN verification_created_at TEXT;
ALTER TABLE channels ADD COLUMN owner_verified INTEGER DEFAULT 0;