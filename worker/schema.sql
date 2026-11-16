-- Find Your Impact: sign-ups table.
-- Paste this into the Cloudflare D1 console (database "impact-fair") and press Execute.

CREATE TABLE IF NOT EXISTS fair_leads (
  id            TEXT PRIMARY KEY,
  created_at    TEXT NOT NULL,
  received_at   TEXT NOT NULL,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL,
  school        TEXT NOT NULL,
  study_year    TEXT,
  phone         TEXT,
  consent       INTEGER NOT NULL,
  marketing     INTEGER NOT NULL,
  study         TEXT,
  people_nature INTEGER,
  destination   TEXT,
  priorities    TEXT,
  learns_by     TEXT,
  months        INTEGER,
  start         TEXT,
  match         TEXT,
  second_match  TEXT,
  print_no      TEXT,
  source        TEXT,
  ip_hash       TEXT,
  emailed       INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS fair_leads_received ON fair_leads (received_at);
