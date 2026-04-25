-- =====================================================
-- Migration 008: Table lexique_explorations
-- Persists TF-IDF extraction + AI recommendations per
-- (article, source_keyword) pair so multi-keyword exploration
-- is possible (D4) and AI streams aren't re-run needlessly (U5).
-- =====================================================

CREATE TABLE IF NOT EXISTS lexique_explorations (
  id SERIAL PRIMARY KEY,
  article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  source_keyword TEXT NOT NULL,
  tfidf_terms JSONB NOT NULL DEFAULT '{}',
  ai_recommendations JSONB NOT NULL DEFAULT '[]',
  ai_missing_terms JSONB NOT NULL DEFAULT '[]',
  ai_summary TEXT,
  explored_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (article_id, source_keyword)
);
CREATE INDEX IF NOT EXISTS idx_lexique_explorations_article ON lexique_explorations(article_id);
