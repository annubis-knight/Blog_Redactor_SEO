-- =====================================================
-- Migration 009: Table serp_explorations
-- Persists DataForSEO SERP scraping per article to avoid
-- re-paying the same query. Replaces api_cache['serp'] for
-- article-scoped data (Sprint 13).
-- =====================================================

CREATE TABLE IF NOT EXISTS serp_explorations (
  id SERIAL PRIMARY KEY,
  article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  serp_json JSONB NOT NULL DEFAULT '{}',
  competitor_count INTEGER NOT NULL DEFAULT 0,
  scraped_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (article_id, keyword)
);
CREATE INDEX IF NOT EXISTS idx_serp_explorations_article ON serp_explorations(article_id);
