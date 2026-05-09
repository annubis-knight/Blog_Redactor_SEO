-- ============================================================
-- SCHEMA SNAPSHOT — Blog Redactor SEO
-- ============================================================
-- Généré le        : 2026-05-09T16:13:20.162Z
-- Commit git       : cbfede7 (chore/drop-serp-raw-json-column)
-- Sujet commit     : Merge branch 'feat/keyword-metrics-decomposition' into main
-- Working tree     : ⚠️  NON (modifs non commitées)
-- Tables           : 25
-- Empreinte schéma : sha256:fe699ca76c0a21435de69501734017665a03fa1502f41bf772590fa4a1f48f88
-- ============================================================
-- ⚠️  Fichier généré automatiquement. NE PAS éditer à la main.
--
-- Vérifier la fraîcheur : npm run db:check
--   → compare l'empreinte de la DB live à celle ci-dessus.
--   → si différentes, la DB a été modifiée depuis ce snapshot.
--
-- Régénérer            : npm run db:snapshot
-- ============================================================

CREATE TABLE "article_content" (
  "article_id" INTEGER NOT NULL,
  "outline" JSONB,
  "content" TEXT,
  "updated_at" TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT "article_content_article_id_fkey" FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
  CONSTRAINT "article_content_pkey" PRIMARY KEY (article_id)
);

CREATE TABLE "article_keywords" (
  "article_id" INTEGER NOT NULL,
  "capitaine" TEXT,
  "lieutenants" TEXT[] DEFAULT '{}'::text[],
  "lexique" TEXT[] DEFAULT '{}'::text[],
  "hn_structure" JSONB,
  "updated_at" TIMESTAMPTZ DEFAULT now(),
  "root_keywords" TEXT[] DEFAULT '{}'::text[],
  CONSTRAINT "article_keywords_article_id_fkey" FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
  CONSTRAINT "article_keywords_pkey" PRIMARY KEY (article_id)
);

CREATE TABLE "article_micro_contexts" (
  "article_id" INTEGER NOT NULL,
  "angle" TEXT,
  "tone" TEXT,
  "directives" TEXT,
  "updated_at" TIMESTAMPTZ DEFAULT now(),
  "target_word_count" INTEGER,
  CONSTRAINT "article_micro_contexts_article_id_fkey" FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
  CONSTRAINT "article_micro_contexts_pkey" PRIMARY KEY (article_id)
);

CREATE TABLE "article_strategies" (
  "article_id" INTEGER NOT NULL,
  "data" JSONB NOT NULL,
  "completed_steps" INTEGER DEFAULT 0,
  "updated_at" TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT "article_strategies_article_id_fkey" FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
  CONSTRAINT "article_strategies_pkey" PRIMARY KEY (article_id)
);

CREATE TABLE "articles" (
  "id" INTEGER NOT NULL,
  "cocoon_id" INTEGER,
  "titre" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "topic" TEXT,
  "status" TEXT DEFAULT 'à rédiger'::text,
  "phase" TEXT DEFAULT 'proposed'::text,
  "seo_score" NUMERIC,
  "geo_score" NUMERIC,
  "meta_title" TEXT,
  "meta_description" TEXT,
  "completed_checks" TEXT[] DEFAULT '{}'::text[],
  "check_timestamps" JSONB DEFAULT '{}'::jsonb,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now(),
  "suggested_keyword" TEXT,
  "captain_keyword_locked" TEXT,
  "pain_point" TEXT,
  "pain_intent_expected" TEXT,
  CONSTRAINT "articles_pain_intent_expected_check" CHECK (((pain_intent_expected IS NULL) OR (pain_intent_expected = ANY (ARRAY['commercial'::text, 'transactional'::text, 'informational'::text, 'navigational'::text])))),
  CONSTRAINT "articles_type_check" CHECK ((type = ANY (ARRAY['Pilier'::text, 'Intermédiaire'::text, 'Spécialisé'::text]))),
  CONSTRAINT "articles_cocoon_id_fkey" FOREIGN KEY (cocoon_id) REFERENCES cocoons(id) ON DELETE SET NULL,
  CONSTRAINT "articles_pkey" PRIMARY KEY (id),
  CONSTRAINT "articles_slug_key" UNIQUE (slug)
);

CREATE TABLE "captain_explorations" (
  "id" INTEGER NOT NULL DEFAULT nextval('keyword_tests_id_seq'::regclass),
  "article_id" INTEGER NOT NULL,
  "keyword" TEXT NOT NULL,
  "article_level" TEXT NOT NULL,
  "root_keywords" TEXT[] DEFAULT '{}'::text[],
  "ai_panel_markdown" TEXT,
  "explored_at" TIMESTAMPTZ DEFAULT now(),
  "status" TEXT NOT NULL DEFAULT 'suggested'::text,
  "locked_at" TIMESTAMPTZ,
  CONSTRAINT "keyword_tests_article_id_fkey" FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
  CONSTRAINT "captain_explorations_pkey" PRIMARY KEY (id),
  CONSTRAINT "captain_explorations_article_id_keyword_key" UNIQUE (article_id, keyword)
);

CREATE TABLE "cocoon_strategies" (
  "cocoon_id" INTEGER NOT NULL,
  "data" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "generated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "cocoon_strategies_cocoon_id_fkey" FOREIGN KEY (cocoon_id) REFERENCES cocoons(id) ON DELETE CASCADE,
  CONSTRAINT "cocoon_strategies_pkey" PRIMARY KEY (cocoon_id)
);

CREATE TABLE "cocoons" (
  "id" INTEGER NOT NULL DEFAULT nextval('cocoons_id_seq'::regclass),
  "silo_id" INTEGER NOT NULL,
  "nom" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT "cocoons_silo_id_fkey" FOREIGN KEY (silo_id) REFERENCES silos(id) ON DELETE CASCADE,
  CONSTRAINT "cocoons_pkey" PRIMARY KEY (id)
);

CREATE TABLE "external_api_cache" (
  "id" INTEGER NOT NULL DEFAULT nextval('api_cache_id_seq'::regclass),
  "cache_key" TEXT NOT NULL,
  "cache_type" TEXT NOT NULL,
  "data" JSONB NOT NULL,
  "cached_at" TIMESTAMPTZ DEFAULT now(),
  "expires_at" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "api_cache_pkey" PRIMARY KEY (id),
  CONSTRAINT "api_cache_cache_key_cache_type_key" UNIQUE (cache_key, cache_type)
);

CREATE TABLE "internal_links" (
  "id" INTEGER NOT NULL DEFAULT nextval('internal_links_id_seq'::regclass),
  "source_id" INTEGER NOT NULL,
  "target_id" INTEGER NOT NULL,
  "position" TEXT,
  "anchor_text" TEXT,
  "reason" TEXT,
  "validated_at" TIMESTAMPTZ,
  CONSTRAINT "internal_links_pkey" PRIMARY KEY (id),
  CONSTRAINT "internal_links_source_id_target_id_position_key" UNIQUE (source_id, target_id, "position")
);

CREATE TABLE "keyword_autocomplete" (
  "keyword" TEXT NOT NULL,
  "lang" TEXT NOT NULL DEFAULT 'fr'::text,
  "country" TEXT NOT NULL DEFAULT 'fr'::text,
  "position" INTEGER NOT NULL,
  "text" TEXT NOT NULL,
  "source" TEXT,
  "fetched_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "keyword_autocomplete_keyword_lang_country_fkey" FOREIGN KEY (keyword, lang, country) REFERENCES keyword_metrics(keyword, lang, country) ON DELETE CASCADE,
  CONSTRAINT "keyword_autocomplete_pkey" PRIMARY KEY (keyword, lang, country, "position")
);

CREATE TABLE "keyword_discoveries" (
  "seed" TEXT NOT NULL,
  "lang" TEXT NOT NULL DEFAULT 'fr'::text,
  "sources_json" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "ai_analysis_json" JSONB,
  "fetched_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "keyword_discoveries_pkey" PRIMARY KEY (seed, lang)
);

CREATE TABLE "keyword_intent_analyses" (
  "keyword" TEXT NOT NULL,
  "location_code" INTEGER NOT NULL DEFAULT 2250,
  "classification" TEXT,
  "modules" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "scores" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "dominant_intent" TEXT,
  "recommendations" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "top_organic_results" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "paa_questions" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "fetched_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "keyword_intent_analyses_pkey" PRIMARY KEY (keyword, location_code)
);

CREATE TABLE "keyword_metrics" (
  "keyword" TEXT NOT NULL,
  "lang" TEXT NOT NULL DEFAULT 'fr'::text,
  "country" TEXT NOT NULL DEFAULT 'fr'::text,
  "search_volume" INTEGER,
  "keyword_difficulty" INTEGER,
  "cpc" NUMERIC,
  "competition" NUMERIC,
  "intent_raw" NUMERIC,
  "autocomplete_suggestions" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "autocomplete_source" TEXT,
  "paa_questions" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "fetched_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "local_analysis" JSONB,
  "content_gap_analysis" JSONB,
  "local_comparison" JSONB,
  "intent_label" TEXT,
  CONSTRAINT "keyword_metrics_intent_label_check" CHECK (((intent_label IS NULL) OR (intent_label = ANY (ARRAY['commercial'::text, 'transactional'::text, 'informational'::text, 'navigational'::text])))),
  CONSTRAINT "keyword_metrics_pkey" PRIMARY KEY (keyword, lang, country)
);

CREATE TABLE "keyword_paa_questions" (
  "id" BIGINT NOT NULL DEFAULT nextval('keyword_paa_questions_id_seq'::regclass),
  "keyword" TEXT NOT NULL,
  "lang" TEXT NOT NULL DEFAULT 'fr'::text,
  "country" TEXT NOT NULL DEFAULT 'fr'::text,
  "question" TEXT NOT NULL,
  "answer" TEXT,
  "depth" INTEGER DEFAULT 1,
  "parent_question" TEXT,
  "fetched_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "keyword_paa_questions_keyword_lang_country_fkey" FOREIGN KEY (keyword, lang, country) REFERENCES keyword_metrics(keyword, lang, country) ON DELETE CASCADE,
  CONSTRAINT "keyword_paa_questions_pkey" PRIMARY KEY (id),
  CONSTRAINT "keyword_paa_questions_keyword_lang_country_question_depth_key" UNIQUE (keyword, lang, country, question, depth)
);

CREATE TABLE "keyword_serp_results" (
  "keyword" TEXT NOT NULL,
  "lang" TEXT NOT NULL DEFAULT 'fr'::text,
  "country" TEXT NOT NULL DEFAULT 'fr'::text,
  "position" INTEGER NOT NULL,
  "url" TEXT NOT NULL,
  "title" TEXT,
  "domain" TEXT,
  "fetched_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "keyword_serp_results_keyword_lang_country_fkey" FOREIGN KEY (keyword, lang, country) REFERENCES keyword_metrics(keyword, lang, country) ON DELETE CASCADE,
  CONSTRAINT "keyword_serp_results_pkey" PRIMARY KEY (keyword, lang, country, "position")
);

CREATE TABLE "keyword_serp_scrapes" (
  "keyword" TEXT NOT NULL,
  "lang" TEXT NOT NULL DEFAULT 'fr'::text,
  "country" TEXT NOT NULL DEFAULT 'fr'::text,
  "position" INTEGER NOT NULL,
  "url" TEXT NOT NULL,
  "headings" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "text_content" TEXT,
  "is_blog" BOOLEAN,
  "scraped_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "keyword_serp_scrapes_keyword_lang_country_position_fkey" FOREIGN KEY (keyword, lang, country, "position") REFERENCES keyword_serp_results(keyword, lang, country, "position") ON DELETE CASCADE,
  CONSTRAINT "keyword_serp_scrapes_pkey" PRIMARY KEY (keyword, lang, country, "position")
);

CREATE TABLE "keywords_seo" (
  "id" INTEGER NOT NULL DEFAULT nextval('keywords_seo_id_seq'::regclass),
  "cocoon_name" TEXT,
  "mot_clef" TEXT NOT NULL,
  "type_mot_clef" TEXT,
  "statut" TEXT DEFAULT 'suggested'::text,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT "keywords_seo_pkey" PRIMARY KEY (id)
);

CREATE TABLE "lexique_explorations" (
  "id" INTEGER NOT NULL DEFAULT nextval('lexique_explorations_id_seq'::regclass),
  "article_id" INTEGER NOT NULL,
  "source_keyword" TEXT NOT NULL,
  "tfidf_terms" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "ai_recommendations" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "ai_missing_terms" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "ai_summary" TEXT,
  "explored_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "lexique_explorations_article_id_fkey" FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
  CONSTRAINT "lexique_explorations_pkey" PRIMARY KEY (id),
  CONSTRAINT "lexique_explorations_article_id_source_keyword_key" UNIQUE (article_id, source_keyword)
);

CREATE TABLE "lieutenant_explorations" (
  "id" INTEGER NOT NULL DEFAULT nextval('lieutenant_proposals_id_seq'::regclass),
  "article_id" INTEGER NOT NULL,
  "keyword" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'suggested'::text,
  "captain_keyword" TEXT,
  "reasoning" TEXT,
  "sources" TEXT[] DEFAULT '{}'::text[],
  "suggested_hn_level" INTEGER,
  "score" INTEGER DEFAULT 0,
  "kpis" JSONB,
  "explored_at" TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT "lieutenant_proposals_article_id_fkey" FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
  CONSTRAINT "lieutenant_explorations_pkey" PRIMARY KEY (id),
  CONSTRAINT "lieutenant_explorations_article_id_keyword_key" UNIQUE (article_id, keyword)
);

CREATE TABLE "local_entities" (
  "id" INTEGER NOT NULL DEFAULT nextval('local_entities_id_seq'::regclass),
  "name" TEXT NOT NULL,
  "type" TEXT,
  "aliases" TEXT[] DEFAULT '{}'::text[],
  "region" TEXT,
  CONSTRAINT "local_entities_pkey" PRIMARY KEY (id)
);

CREATE TABLE "paa_explorations" (
  "id" INTEGER NOT NULL DEFAULT nextval('paa_explorations_id_seq'::regclass),
  "article_id" INTEGER NOT NULL,
  "keyword" TEXT NOT NULL,
  "question" TEXT NOT NULL,
  "answer" TEXT,
  "is_match" BOOLEAN DEFAULT false,
  "match_quality" TEXT,
  "explored_at" TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT "paa_explorations_article_id_fkey" FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
  CONSTRAINT "paa_explorations_pkey" PRIMARY KEY (id),
  CONSTRAINT "paa_explorations_article_id_keyword_question_key" UNIQUE (article_id, keyword, question)
);

CREATE TABLE "radar_explorations" (
  "article_id" INTEGER NOT NULL,
  "seed" TEXT NOT NULL,
  "broad_keyword" TEXT,
  "specific_topic" TEXT,
  "pain_point" TEXT,
  "depth" INTEGER NOT NULL DEFAULT 1,
  "generated_keywords" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "scan_result" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "scanned_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "radar_explorations_article_id_fkey" FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
  CONSTRAINT "radar_explorations_pkey" PRIMARY KEY (article_id)
);

CREATE TABLE "silos" (
  "id" INTEGER NOT NULL DEFAULT nextval('silos_id_seq'::regclass),
  "nom" TEXT NOT NULL,
  "description" TEXT,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT "silos_pkey" PRIMARY KEY (id)
);

CREATE TABLE "theme_config" (
  "id" INTEGER NOT NULL DEFAULT nextval('theme_config_id_seq'::regclass),
  "data" JSONB NOT NULL,
  "updated_at" TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT "theme_config_pkey" PRIMARY KEY (id)
);

-- Indexes

CREATE INDEX idx_articles_cocoon_id ON public.articles USING btree (cocoon_id);

CREATE INDEX idx_articles_slug ON public.articles USING btree (slug);

CREATE INDEX idx_articles_status ON public.articles USING btree (status);

CREATE INDEX idx_captain_explorations_article ON public.captain_explorations USING btree (article_id);

CREATE INDEX idx_external_api_cache_expires ON public.external_api_cache USING btree (expires_at);

CREATE INDEX idx_external_api_cache_key_type ON public.external_api_cache USING btree (cache_key, cache_type);

CREATE INDEX idx_internal_links_source ON public.internal_links USING btree (source_id);

CREATE INDEX idx_internal_links_target ON public.internal_links USING btree (target_id);

CREATE INDEX idx_keyword_autocomplete_fetched ON public.keyword_autocomplete USING btree (fetched_at);

CREATE INDEX idx_keyword_metrics_fetched ON public.keyword_metrics USING btree (fetched_at);

CREATE INDEX idx_keyword_paa_kw ON public.keyword_paa_questions USING btree (keyword, lang, country);

CREATE INDEX idx_keyword_serp_results_domain ON public.keyword_serp_results USING btree (domain);

CREATE INDEX idx_keyword_serp_results_fetched ON public.keyword_serp_results USING btree (fetched_at);

CREATE INDEX idx_keyword_serp_scrapes_scraped ON public.keyword_serp_scrapes USING btree (scraped_at);

CREATE INDEX idx_keywords_seo_cocoon ON public.keywords_seo USING btree (cocoon_name);

CREATE INDEX idx_lexique_explorations_article ON public.lexique_explorations USING btree (article_id);

CREATE INDEX idx_lieutenant_explorations_article ON public.lieutenant_explorations USING btree (article_id);

CREATE INDEX idx_paa_explorations_article_keyword ON public.paa_explorations USING btree (article_id, keyword);

CREATE INDEX idx_radar_explorations_scanned ON public.radar_explorations USING btree (scanned_at);

-- Sequences

-- (auto-créée par SERIAL/IDENTITY) "api_cache_id_seq"

-- (auto-créée par SERIAL/IDENTITY) "cocoons_id_seq"

-- (auto-créée par SERIAL/IDENTITY) "internal_links_id_seq"

-- (auto-créée par SERIAL/IDENTITY) "keyword_paa_questions_id_seq"

-- (auto-créée par SERIAL/IDENTITY) "keyword_tests_id_seq"

-- (auto-créée par SERIAL/IDENTITY) "keywords_seo_id_seq"

-- (auto-créée par SERIAL/IDENTITY) "lexique_explorations_id_seq"

-- (auto-créée par SERIAL/IDENTITY) "lieutenant_proposals_id_seq"

-- (auto-créée par SERIAL/IDENTITY) "local_entities_id_seq"

-- (auto-créée par SERIAL/IDENTITY) "paa_explorations_id_seq"

-- (auto-créée par SERIAL/IDENTITY) "silos_id_seq"

-- (auto-créée par SERIAL/IDENTITY) "theme_config_id_seq"
