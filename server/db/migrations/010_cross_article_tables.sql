-- =====================================================
-- Migration 010: Cross-article data tables (Sprint 15)
-- Pull keyword-scoped and cocoon-scoped data out of api_cache into
-- proper DB tables, so the same keyword tested by multiple articles
-- doesn't repeatedly pay DataForSEO / Google Autocomplete.
-- =====================================================

-- =====================================================
-- 1. keyword_metrics — cross-article raw data for a keyword
-- Stores everything Google / DataForSEO know about a keyword:
-- KPIs, autocomplete suggestions, PAA questions. One row per
-- (keyword, lang, country). Shared by /validate, autocomplete,
-- PAA cache, and the DataForSEO brief panel.
-- =====================================================
CREATE TABLE IF NOT EXISTS keyword_metrics (
  keyword TEXT NOT NULL,
  lang TEXT NOT NULL DEFAULT 'fr',
  country TEXT NOT NULL DEFAULT 'fr',
  search_volume INTEGER,
  keyword_difficulty INTEGER,
  cpc NUMERIC,
  competition NUMERIC,
  intent_raw NUMERIC,
  autocomplete_suggestions JSONB NOT NULL DEFAULT '[]',
  autocomplete_source TEXT,  -- 'google' | 'dataforseo' | null
  paa_questions JSONB NOT NULL DEFAULT '[]',
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (keyword, lang, country)
);
CREATE INDEX IF NOT EXISTS idx_keyword_metrics_fetched ON keyword_metrics(fetched_at);

-- =====================================================
-- 2. keyword_intent_analyses — cross-article SERP intent analysis
-- Shared between articles that test the same keyword as capitaine,
-- lieutenant or candidate. Analysis is independent of the article's
-- pain point (Google doesn't know it).
-- =====================================================
CREATE TABLE IF NOT EXISTS keyword_intent_analyses (
  keyword TEXT NOT NULL,
  location_code INTEGER NOT NULL DEFAULT 2250,
  classification TEXT,
  modules JSONB NOT NULL DEFAULT '[]',
  scores JSONB NOT NULL DEFAULT '[]',
  dominant_intent TEXT,
  recommendations JSONB NOT NULL DEFAULT '[]',
  top_organic_results JSONB NOT NULL DEFAULT '[]',
  paa_questions JSONB NOT NULL DEFAULT '[]',
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (keyword, location_code)
);

-- =====================================================
-- 3. keyword_discoveries — multi-source discovery results per seed
-- Replaces api_cache[discovery, suggest]. AI analysis output stored
-- alongside the raw source results.
-- =====================================================
CREATE TABLE IF NOT EXISTS keyword_discoveries (
  seed TEXT NOT NULL,
  lang TEXT NOT NULL DEFAULT 'fr',
  sources_json JSONB NOT NULL DEFAULT '{}',
  ai_analysis_json JSONB,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (seed, lang)
);

-- =====================================================
-- 4. cocoon_strategies — strategy per cocoon
-- Parallels article_strategies; replaces api_cache[cocoon-strategy].
-- =====================================================
CREATE TABLE IF NOT EXISTS cocoon_strategies (
  cocoon_id INTEGER PRIMARY KEY REFERENCES cocoons(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
