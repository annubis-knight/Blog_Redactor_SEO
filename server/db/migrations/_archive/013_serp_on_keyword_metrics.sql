-- =====================================================
-- Migration 013: Move SERP scraping to keyword_metrics
-- Sprint 15.5-bis — one more JSONB column on keyword_metrics
-- replaces the article-scoped serp_explorations table.
-- =====================================================

ALTER TABLE keyword_metrics
  ADD COLUMN IF NOT EXISTS serp_raw_json JSONB;

DROP TABLE IF EXISTS serp_explorations CASCADE;
