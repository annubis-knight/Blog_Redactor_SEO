-- =====================================================
-- Migration 003: Tables dédiées exploration + fixes gaps
-- =====================================================

-- =====================================================
-- TABLE: keyword_tests (historique carousel capitaine)
-- Stocke chaque mot-clé testé par article avec KPIs,
-- verdict, PAA, et analyse IA. Données persistantes.
-- =====================================================
CREATE TABLE IF NOT EXISTS keyword_tests (
  id SERIAL PRIMARY KEY,
  article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  article_level TEXT NOT NULL,
  kpis JSONB NOT NULL DEFAULT '[]',
  verdict_level TEXT,
  verdict_green_count INTEGER,
  paa_questions JSONB,
  root_keywords TEXT[] DEFAULT '{}',
  ai_panel_markdown TEXT,
  tested_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(article_id, keyword)
);
CREATE INDEX IF NOT EXISTS idx_keyword_tests_article ON keyword_tests(article_id);

-- =====================================================
-- TABLE: lieutenant_proposals (propositions IA)
-- Stocke toutes les propositions de lieutenants avec
-- scores, justifications, sources. Conservées même si
-- le capitaine change.
-- =====================================================
CREATE TABLE IF NOT EXISTS lieutenant_proposals (
  id SERIAL PRIMARY KEY,
  article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'suggested',
  captain_keyword TEXT,
  reasoning TEXT,
  sources TEXT[] DEFAULT '{}',
  ai_confidence TEXT,
  suggested_hn_level INTEGER,
  score INTEGER DEFAULT 0,
  kpis JSONB,
  locked_at TIMESTAMPTZ,
  proposed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(article_id, keyword)
);
CREATE INDEX IF NOT EXISTS idx_lieutenant_proposals_article ON lieutenant_proposals(article_id);

-- =====================================================
-- Enrichir article_keywords (champs décision capitaine)
-- =====================================================
ALTER TABLE article_keywords ADD COLUMN IF NOT EXISTS captain_locked_at TIMESTAMPTZ;
ALTER TABLE article_keywords ADD COLUMN IF NOT EXISTS root_keywords TEXT[] DEFAULT '{}';

-- =====================================================
-- Micro-context : target_word_count manquant (Gap 2)
-- =====================================================
ALTER TABLE article_micro_contexts ADD COLUMN IF NOT EXISTS target_word_count INTEGER;

-- =====================================================
-- Semantic field : colonne source manquante (Gap 10)
-- =====================================================
ALTER TABLE article_semantic_fields ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';

-- =====================================================
-- Nettoyage : colonnes mortes (jamais lues/écrites)
-- =====================================================
ALTER TABLE articles DROP COLUMN IF EXISTS validation_history;
ALTER TABLE article_keywords DROP COLUMN IF EXISTS validation_history;
