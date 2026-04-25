-- =====================================================
-- Migration 004: Tables d'exploration symétriques
-- Renommage + alignement colonnes + table PAA dédiée
-- =====================================================

-- =====================================================
-- STEP 1: Rename keyword_tests → captain_explorations
-- =====================================================
ALTER TABLE keyword_tests RENAME TO captain_explorations;
ALTER INDEX keyword_tests_pkey RENAME TO captain_explorations_pkey;
ALTER INDEX keyword_tests_article_id_keyword_key RENAME TO captain_explorations_article_id_keyword_key;
ALTER INDEX idx_keyword_tests_article RENAME TO idx_captain_explorations_article;

-- Ajouter colonnes manquantes (alignement avec lieutenants)
ALTER TABLE captain_explorations ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'suggested';
ALTER TABLE captain_explorations ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;

-- Renommer tested_at → explored_at
ALTER TABLE captain_explorations RENAME COLUMN tested_at TO explored_at;

-- Supprimer colonnes inutiles
ALTER TABLE captain_explorations DROP COLUMN IF EXISTS verdict_level;
ALTER TABLE captain_explorations DROP COLUMN IF EXISTS verdict_green_count;
ALTER TABLE captain_explorations DROP COLUMN IF EXISTS paa_questions;

-- =====================================================
-- STEP 2: Rename lieutenant_proposals → lieutenant_explorations
-- =====================================================
ALTER TABLE lieutenant_proposals RENAME TO lieutenant_explorations;
ALTER INDEX lieutenant_proposals_pkey RENAME TO lieutenant_explorations_pkey;
ALTER INDEX lieutenant_proposals_article_id_keyword_key RENAME TO lieutenant_explorations_article_id_keyword_key;
ALTER INDEX idx_lieutenant_proposals_article RENAME TO idx_lieutenant_explorations_article;

-- Renommer proposed_at → explored_at
ALTER TABLE lieutenant_explorations RENAME COLUMN proposed_at TO explored_at;

-- Supprimer colonne redondante
ALTER TABLE lieutenant_explorations DROP COLUMN IF EXISTS ai_confidence;

-- =====================================================
-- STEP 3: Table PAA dédiée
-- =====================================================
CREATE TABLE IF NOT EXISTS paa_explorations (
  id SERIAL PRIMARY KEY,
  article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT,
  is_match BOOLEAN DEFAULT FALSE,
  match_quality TEXT,
  explored_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(article_id, keyword, question)
);
CREATE INDEX IF NOT EXISTS idx_paa_explorations_article_keyword ON paa_explorations(article_id, keyword);
