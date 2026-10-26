PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS software (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  repository TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL
);

INSERT OR IGNORE INTO software (id, name, repository, category) VALUES
  ('book', '长文阅读', 'book', 'Reading'),
  ('video', 'Player', 'video', 'Video'),
  ('music', '本地媒体播放器', 'music', 'Music'),
  ('wallpaper', 'Wallpaper', 'wallpaper', 'Wallpaper'),
  ('phone-camera', 'PhoneCamera', 'phone-camera', 'Phone Camera'),
  ('smartclip', 'SmartClip', 'SmartClip', 'Clipboard Manager');

CREATE TABLE IF NOT EXISTS software_metrics (
  software_id TEXT PRIMARY KEY REFERENCES software(id) ON DELETE CASCADE,
  page_views INTEGER NOT NULL DEFAULT 0 CHECK (page_views >= 0),
  download_clicks INTEGER NOT NULL DEFAULT 0 CHECK (download_clicks >= 0),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  software_id TEXT NOT NULL REFERENCES software(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  content TEXT NOT NULL CHECK (length(content) BETWEEN 10 AND 3000),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS reviews_software_created ON reviews (software_id, created_at DESC);
