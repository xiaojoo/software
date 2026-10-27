CREATE TABLE IF NOT EXISTS software_view_visitors (
  software_id TEXT NOT NULL REFERENCES software(id) ON DELETE CASCADE,
  ip_fingerprint TEXT NOT NULL,
  ip_encrypted TEXT NOT NULL,
  last_counted_at INTEGER NOT NULL,
  PRIMARY KEY (software_id, ip_fingerprint)
);

CREATE INDEX IF NOT EXISTS software_view_visitors_expiry
  ON software_view_visitors (last_counted_at);

CREATE TRIGGER IF NOT EXISTS count_software_view_on_visitor_insert
AFTER INSERT ON software_view_visitors
BEGIN
  INSERT INTO software_metrics (software_id, page_views, download_clicks)
  VALUES (NEW.software_id, 1, 0)
  ON CONFLICT (software_id) DO UPDATE SET
    page_views = software_metrics.page_views + 1,
    updated_at = CURRENT_TIMESTAMP;
END;

CREATE TRIGGER IF NOT EXISTS count_software_view_on_visitor_expiry
AFTER UPDATE OF last_counted_at ON software_view_visitors
BEGIN
  INSERT INTO software_metrics (software_id, page_views, download_clicks)
  VALUES (NEW.software_id, 1, 0)
  ON CONFLICT (software_id) DO UPDATE SET
    page_views = software_metrics.page_views + 1,
    updated_at = CURRENT_TIMESTAMP;
END;
