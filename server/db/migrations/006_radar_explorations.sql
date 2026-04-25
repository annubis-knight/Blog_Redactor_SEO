-- =====================================================
-- Migration 006: Table radar_explorations
-- Sort radar scan data out of api_cache[radar] into a
-- dedicated article-scoped table (Sprint 9, D1 + Cat.7)
-- =====================================================

CREATE TABLE IF NOT EXISTS radar_explorations (
  article_id INTEGER PRIMARY KEY REFERENCES articles(id) ON DELETE CASCADE,
  seed TEXT NOT NULL,
  broad_keyword TEXT,
  specific_topic TEXT,
  pain_point TEXT,
  depth INTEGER NOT NULL DEFAULT 1,
  generated_keywords JSONB NOT NULL DEFAULT '[]',
  scan_result JSONB NOT NULL DEFAULT '{}',
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_radar_explorations_scanned ON radar_explorations(scanned_at);
