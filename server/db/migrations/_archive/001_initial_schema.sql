-- =====================================================
-- Trigger function pour updated_at automatique
-- =====================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TABLE: theme_config (1 seule ligne)
-- =====================================================
CREATE TABLE IF NOT EXISTS theme_config (
  id SERIAL PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE OR REPLACE TRIGGER theme_config_updated_at
  BEFORE UPDATE ON theme_config
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================
-- TABLE: silos
-- =====================================================
CREATE TABLE IF NOT EXISTS silos (
  id SERIAL PRIMARY KEY,
  nom TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLE: cocoons
-- =====================================================
CREATE TABLE IF NOT EXISTS cocoons (
  id SERIAL PRIMARY KEY,
  silo_id INTEGER NOT NULL REFERENCES silos(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLE: articles
-- =====================================================
CREATE TABLE IF NOT EXISTS articles (
  id INTEGER PRIMARY KEY,
  cocoon_id INTEGER REFERENCES cocoons(id) ON DELETE SET NULL,
  titre TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('Pilier', 'Intermédiaire', 'Spécialisé')),
  slug TEXT UNIQUE NOT NULL,
  topic TEXT,
  status TEXT DEFAULT 'à rédiger',
  phase TEXT DEFAULT 'proposed',
  seo_score NUMERIC,
  geo_score NUMERIC,
  meta_title TEXT,
  meta_description TEXT,
  completed_checks TEXT[] DEFAULT '{}',
  check_timestamps JSONB DEFAULT '{}',
  validation_history JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE OR REPLACE TRIGGER articles_updated_at
  BEFORE UPDATE ON articles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================
-- TABLE: article_content (séparé pour les gros champs)
-- =====================================================
CREATE TABLE IF NOT EXISTS article_content (
  article_id INTEGER PRIMARY KEY REFERENCES articles(id) ON DELETE CASCADE,
  outline JSONB,
  content TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE OR REPLACE TRIGGER article_content_updated_at
  BEFORE UPDATE ON article_content
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================
-- TABLE: keywords_seo
-- =====================================================
CREATE TABLE IF NOT EXISTS keywords_seo (
  id SERIAL PRIMARY KEY,
  cocoon_name TEXT,
  mot_clef TEXT NOT NULL,
  type_mot_clef TEXT,
  statut TEXT DEFAULT 'suggested',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLE: article_keywords
-- =====================================================
CREATE TABLE IF NOT EXISTS article_keywords (
  article_id INTEGER PRIMARY KEY REFERENCES articles(id) ON DELETE CASCADE,
  capitaine TEXT,
  lieutenants TEXT[] DEFAULT '{}',
  lexique TEXT[] DEFAULT '{}',
  hn_structure JSONB,
  validation_history JSONB DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE OR REPLACE TRIGGER article_keywords_updated_at
  BEFORE UPDATE ON article_keywords
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================
-- TABLE: article_strategies
-- =====================================================
CREATE TABLE IF NOT EXISTS article_strategies (
  article_id INTEGER PRIMARY KEY REFERENCES articles(id) ON DELETE CASCADE,
  data JSONB NOT NULL,
  completed_steps INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE OR REPLACE TRIGGER article_strategies_updated_at
  BEFORE UPDATE ON article_strategies
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================
-- TABLE: article_micro_contexts
-- =====================================================
CREATE TABLE IF NOT EXISTS article_micro_contexts (
  article_id INTEGER PRIMARY KEY REFERENCES articles(id) ON DELETE CASCADE,
  angle TEXT,
  tone TEXT,
  directives TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE OR REPLACE TRIGGER article_micro_contexts_updated_at
  BEFORE UPDATE ON article_micro_contexts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================
-- TABLE: article_semantic_fields
-- =====================================================
CREATE TABLE IF NOT EXISTS article_semantic_fields (
  id SERIAL PRIMARY KEY,
  article_id INTEGER REFERENCES articles(id) ON DELETE CASCADE,
  term TEXT NOT NULL,
  occurrences INTEGER DEFAULT 0,
  target_count INTEGER DEFAULT 0,
  UNIQUE(article_id, term)
);

-- =====================================================
-- TABLE: internal_links
-- =====================================================
CREATE TABLE IF NOT EXISTS internal_links (
  id SERIAL PRIMARY KEY,
  source_id INTEGER NOT NULL,
  target_id INTEGER NOT NULL,
  position TEXT,
  anchor_text TEXT,
  reason TEXT,
  validated_at TIMESTAMPTZ,
  UNIQUE(source_id, target_id, position)
);

-- =====================================================
-- TABLE: local_entities
-- =====================================================
CREATE TABLE IF NOT EXISTS local_entities (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT,
  aliases TEXT[] DEFAULT '{}',
  region TEXT
);

-- =====================================================
-- TABLE: api_cache (cache unifié — 9 types)
-- cache_type values: 'paa', 'paa_reverse_index', 'serp',
--   'radar', 'discovery', 'autocomplete', 'suggest',
--   'validate', 'discussions', 'local-seo', 'intent'
-- =====================================================
CREATE TABLE IF NOT EXISTS api_cache (
  id SERIAL PRIMARY KEY,
  cache_key TEXT NOT NULL,
  cache_type TEXT NOT NULL,
  data JSONB NOT NULL,
  cached_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  UNIQUE(cache_key, cache_type)
);

-- =====================================================
-- INDEX
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_articles_cocoon_id ON articles(cocoon_id);
CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug);
CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status);
CREATE INDEX IF NOT EXISTS idx_keywords_seo_cocoon ON keywords_seo(cocoon_name);
CREATE INDEX IF NOT EXISTS idx_api_cache_key_type ON api_cache(cache_key, cache_type);
CREATE INDEX IF NOT EXISTS idx_api_cache_expires ON api_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_internal_links_source ON internal_links(source_id);
CREATE INDEX IF NOT EXISTS idx_internal_links_target ON internal_links(target_id);
CREATE INDEX IF NOT EXISTS idx_semantic_fields_article ON article_semantic_fields(article_id);
