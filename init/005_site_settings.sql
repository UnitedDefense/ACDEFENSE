CREATE TABLE IF NOT EXISTS site_settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed expected keys (empty values — admin fills in via UI)
INSERT INTO site_settings (key, value) VALUES
  ('google_calendar_refresh_token', ''),
  ('google_calendar_id',            ''),
  ('revere_api_key',                ''),
  ('revere_group_id',               '')
ON CONFLICT (key) DO NOTHING;
