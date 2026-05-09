-- =====================================================
-- Migration 012: Extend keyword_metrics with local + content_gap analyses
-- Sprint 15.5 — keep the number of tables low by hosting all
-- cross-article keyword analyses in one place.
-- =====================================================

ALTER TABLE keyword_metrics
  ADD COLUMN IF NOT EXISTS local_analysis JSONB,
  ADD COLUMN IF NOT EXISTS content_gap_analysis JSONB,
  ADD COLUMN IF NOT EXISTS local_comparison JSONB;

-- Drop the article-scoped tables. Sprint 15.4 decision A1: lost traceability
-- article↔keyword is acceptable (reconstructible via article_keywords).
DROP TABLE IF EXISTS local_explorations CASCADE;
DROP TABLE IF EXISTS content_gap_explorations CASCADE;
