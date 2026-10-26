ALTER TABLE reviews ADD COLUMN is_hidden INTEGER NOT NULL DEFAULT 0 CHECK (is_hidden IN (0, 1));

CREATE TABLE IF NOT EXISTS software_screenshots (
  id TEXT PRIMARY KEY,
  software_id TEXT NOT NULL REFERENCES software(id) ON DELETE CASCADE,
  object_key TEXT NOT NULL UNIQUE,
  mime_type TEXT NOT NULL CHECK (mime_type IN ('image/png', 'image/jpeg', 'image/webp')),
  size_bytes INTEGER NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 10485760),
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  deleting_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS software_screenshots_public_order
  ON software_screenshots (software_id, deleting_at, sort_order);
