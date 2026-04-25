-- =====================================================
-- Migration 007: Tables *_explorations for keyword-centric analyses
-- Sort intent / local / content-gap data out of api_cache and into
-- article-scoped dedicated tables (Sprint 10, Catégorie 7).
-- Pattern mirrors captain_explorations / lieutenant_explorations.
-- =====================================================

-- Intent analyzer (SERP modules + classification + PAA questions)
CREATE TABLE IF NOT EXISTS intent_explorations (
  id SERIAL PRIMARY KEY,
  article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  classification TEXT,
  modules JSONB NOT NULL DEFAULT '[]',
  scores JSONB NOT NULL DEFAULT '[]',
  dominant_intent TEXT,
  recommendations JSONB NOT NULL DEFAULT '[]',
  top_organic_results JSONB NOT NULL DEFAULT '[]',
  paa_questions JSONB NOT NULL DEFAULT '[]',
  explored_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (article_id, keyword)
);
CREATE INDEX IF NOT EXISTS idx_intent_explorations_article ON intent_explorations(article_id);

-- Local SEO (maps / local pack comparison)
CREATE TABLE IF NOT EXISTS local_explorations (
  id SERIAL PRIMARY KEY,
  article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  has_local_pack BOOLEAN,
  listings JSONB NOT NULL DEFAULT '[]',
  review_gap JSONB,
  comparison JSONB,
  explored_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (article_id, keyword)
);
CREATE INDEX IF NOT EXISTS idx_local_explorations_article ON local_explorations(article_id);

-- Content gap (competitor analysis + themes + gaps)
CREATE TABLE IF NOT EXISTS content_gap_explorations (
  id SERIAL PRIMARY KEY,
  article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  captain_keyword TEXT NOT NULL,
  competitors JSONB NOT NULL DEFAULT '[]',
  themes JSONB NOT NULL DEFAULT '[]',
  gaps JSONB NOT NULL DEFAULT '[]',
  average_word_count INTEGER,
  local_entities JSONB NOT NULL DEFAULT '[]',
  explored_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (article_id, captain_keyword)
);
CREATE INDEX IF NOT EXISTS idx_content_gap_explorations_article ON content_gap_explorations(article_id);
