-- ============================================================
-- BOOTSTRAP — schéma rejouable de Blog Redactor SEO
-- ============================================================
-- ⚠️  Fichier généré par `npm run db:bootstrap` (ou db:snapshot).
-- NE PAS éditer à la main. Sert à créer une base vide (CI).
-- Usage : psql -v ON_ERROR_STOP=1 -d <base> -f server/db/bootstrap.sql
-- Empreinte schéma (schema.sql) : sha256:fe699ca76c0a21435de69501734017665a03fa1502f41bf772590fa4a1f48f88
-- ============================================================
--
-- PostgreSQL database dump
--

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: external_api_cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.external_api_cache (
    id integer CONSTRAINT api_cache_id_not_null NOT NULL,
    cache_key text CONSTRAINT api_cache_cache_key_not_null NOT NULL,
    cache_type text CONSTRAINT api_cache_cache_type_not_null NOT NULL,
    data jsonb CONSTRAINT api_cache_data_not_null NOT NULL,
    cached_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone CONSTRAINT api_cache_expires_at_not_null NOT NULL
);

--
-- Name: api_cache_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.api_cache_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: api_cache_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.api_cache_id_seq OWNED BY public.external_api_cache.id;

--
-- Name: article_content; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.article_content (
    article_id integer NOT NULL,
    outline jsonb,
    content text,
    updated_at timestamp with time zone DEFAULT now()
);

--
-- Name: article_keywords; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.article_keywords (
    article_id integer NOT NULL,
    capitaine text,
    lieutenants text[] DEFAULT '{}'::text[],
    lexique text[] DEFAULT '{}'::text[],
    hn_structure jsonb,
    updated_at timestamp with time zone DEFAULT now(),
    root_keywords text[] DEFAULT '{}'::text[]
);

--
-- Name: article_micro_contexts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.article_micro_contexts (
    article_id integer NOT NULL,
    angle text,
    tone text,
    directives text,
    updated_at timestamp with time zone DEFAULT now(),
    target_word_count integer
);

--
-- Name: article_strategies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.article_strategies (
    article_id integer NOT NULL,
    data jsonb NOT NULL,
    completed_steps integer DEFAULT 0,
    updated_at timestamp with time zone DEFAULT now()
);

--
-- Name: articles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.articles (
    id integer NOT NULL,
    cocoon_id integer,
    titre text NOT NULL,
    type text NOT NULL,
    slug text NOT NULL,
    topic text,
    status text DEFAULT 'à rédiger'::text,
    phase text DEFAULT 'proposed'::text,
    seo_score numeric,
    geo_score numeric,
    meta_title text,
    meta_description text,
    completed_checks text[] DEFAULT '{}'::text[],
    check_timestamps jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    suggested_keyword text,
    captain_keyword_locked text,
    pain_point text,
    pain_intent_expected text,
    CONSTRAINT articles_pain_intent_expected_check CHECK (((pain_intent_expected IS NULL) OR (pain_intent_expected = ANY (ARRAY['commercial'::text, 'transactional'::text, 'informational'::text, 'navigational'::text])))),
    CONSTRAINT articles_type_check CHECK ((type = ANY (ARRAY['Pilier'::text, 'Intermédiaire'::text, 'Spécialisé'::text])))
);

--
-- Name: captain_explorations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.captain_explorations (
    id integer CONSTRAINT keyword_tests_id_not_null NOT NULL,
    article_id integer CONSTRAINT keyword_tests_article_id_not_null NOT NULL,
    keyword text CONSTRAINT keyword_tests_keyword_not_null NOT NULL,
    article_level text CONSTRAINT keyword_tests_article_level_not_null NOT NULL,
    root_keywords text[] DEFAULT '{}'::text[],
    ai_panel_markdown text,
    explored_at timestamp with time zone DEFAULT now(),
    status text DEFAULT 'suggested'::text NOT NULL,
    locked_at timestamp with time zone
);

--
-- Name: cocoon_strategies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cocoon_strategies (
    cocoon_id integer NOT NULL,
    data jsonb DEFAULT '{}'::jsonb NOT NULL,
    generated_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: cocoons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cocoons (
    id integer NOT NULL,
    silo_id integer NOT NULL,
    nom text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

--
-- Name: cocoons_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cocoons_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: cocoons_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cocoons_id_seq OWNED BY public.cocoons.id;

--
-- Name: internal_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.internal_links (
    id integer NOT NULL,
    source_id integer NOT NULL,
    target_id integer NOT NULL,
    "position" text,
    anchor_text text,
    reason text,
    validated_at timestamp with time zone
);

--
-- Name: internal_links_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.internal_links_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: internal_links_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.internal_links_id_seq OWNED BY public.internal_links.id;

--
-- Name: keyword_autocomplete; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.keyword_autocomplete (
    keyword text NOT NULL,
    lang text DEFAULT 'fr'::text NOT NULL,
    country text DEFAULT 'fr'::text NOT NULL,
    "position" integer NOT NULL,
    text text NOT NULL,
    source text,
    fetched_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: keyword_discoveries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.keyword_discoveries (
    seed text NOT NULL,
    lang text DEFAULT 'fr'::text NOT NULL,
    sources_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    ai_analysis_json jsonb,
    fetched_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: keyword_intent_analyses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.keyword_intent_analyses (
    keyword text NOT NULL,
    location_code integer DEFAULT 2250 NOT NULL,
    classification text,
    modules jsonb DEFAULT '[]'::jsonb NOT NULL,
    scores jsonb DEFAULT '[]'::jsonb NOT NULL,
    dominant_intent text,
    recommendations jsonb DEFAULT '[]'::jsonb NOT NULL,
    top_organic_results jsonb DEFAULT '[]'::jsonb NOT NULL,
    paa_questions jsonb DEFAULT '[]'::jsonb NOT NULL,
    fetched_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: keyword_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.keyword_metrics (
    keyword text NOT NULL,
    lang text DEFAULT 'fr'::text NOT NULL,
    country text DEFAULT 'fr'::text NOT NULL,
    search_volume integer,
    keyword_difficulty integer,
    cpc numeric,
    competition numeric,
    intent_raw numeric,
    autocomplete_suggestions jsonb DEFAULT '[]'::jsonb NOT NULL,
    autocomplete_source text,
    paa_questions jsonb DEFAULT '[]'::jsonb NOT NULL,
    fetched_at timestamp with time zone DEFAULT now() NOT NULL,
    local_analysis jsonb,
    content_gap_analysis jsonb,
    local_comparison jsonb,
    intent_label text,
    CONSTRAINT keyword_metrics_intent_label_check CHECK (((intent_label IS NULL) OR (intent_label = ANY (ARRAY['commercial'::text, 'transactional'::text, 'informational'::text, 'navigational'::text]))))
);

--
-- Name: keyword_paa_questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.keyword_paa_questions (
    id bigint NOT NULL,
    keyword text NOT NULL,
    lang text DEFAULT 'fr'::text NOT NULL,
    country text DEFAULT 'fr'::text NOT NULL,
    question text NOT NULL,
    answer text,
    depth integer DEFAULT 1,
    parent_question text,
    fetched_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: keyword_paa_questions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.keyword_paa_questions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: keyword_paa_questions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.keyword_paa_questions_id_seq OWNED BY public.keyword_paa_questions.id;

--
-- Name: keyword_serp_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.keyword_serp_results (
    keyword text NOT NULL,
    lang text DEFAULT 'fr'::text NOT NULL,
    country text DEFAULT 'fr'::text NOT NULL,
    "position" integer NOT NULL,
    url text NOT NULL,
    title text,
    domain text,
    fetched_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: keyword_serp_scrapes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.keyword_serp_scrapes (
    keyword text NOT NULL,
    lang text DEFAULT 'fr'::text NOT NULL,
    country text DEFAULT 'fr'::text NOT NULL,
    "position" integer NOT NULL,
    url text NOT NULL,
    headings jsonb DEFAULT '[]'::jsonb NOT NULL,
    text_content text,
    is_blog boolean,
    scraped_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: keyword_tests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.keyword_tests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: keyword_tests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.keyword_tests_id_seq OWNED BY public.captain_explorations.id;

--
-- Name: keywords_seo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.keywords_seo (
    id integer NOT NULL,
    cocoon_name text,
    mot_clef text NOT NULL,
    type_mot_clef text,
    statut text DEFAULT 'suggested'::text,
    created_at timestamp with time zone DEFAULT now()
);

--
-- Name: keywords_seo_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.keywords_seo_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: keywords_seo_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.keywords_seo_id_seq OWNED BY public.keywords_seo.id;

--
-- Name: lexique_explorations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lexique_explorations (
    id integer NOT NULL,
    article_id integer NOT NULL,
    source_keyword text NOT NULL,
    tfidf_terms jsonb DEFAULT '{}'::jsonb NOT NULL,
    ai_recommendations jsonb DEFAULT '[]'::jsonb NOT NULL,
    ai_missing_terms jsonb DEFAULT '[]'::jsonb NOT NULL,
    ai_summary text,
    explored_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: lexique_explorations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lexique_explorations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: lexique_explorations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lexique_explorations_id_seq OWNED BY public.lexique_explorations.id;

--
-- Name: lieutenant_explorations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lieutenant_explorations (
    id integer CONSTRAINT lieutenant_proposals_id_not_null NOT NULL,
    article_id integer CONSTRAINT lieutenant_proposals_article_id_not_null NOT NULL,
    keyword text CONSTRAINT lieutenant_proposals_keyword_not_null NOT NULL,
    status text DEFAULT 'suggested'::text CONSTRAINT lieutenant_proposals_status_not_null NOT NULL,
    captain_keyword text,
    reasoning text,
    sources text[] DEFAULT '{}'::text[],
    suggested_hn_level integer,
    score integer DEFAULT 0,
    kpis jsonb,
    explored_at timestamp with time zone DEFAULT now()
);

--
-- Name: lieutenant_proposals_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lieutenant_proposals_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: lieutenant_proposals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lieutenant_proposals_id_seq OWNED BY public.lieutenant_explorations.id;

--
-- Name: local_entities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.local_entities (
    id integer NOT NULL,
    name text NOT NULL,
    type text,
    aliases text[] DEFAULT '{}'::text[],
    region text
);

--
-- Name: local_entities_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.local_entities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: local_entities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.local_entities_id_seq OWNED BY public.local_entities.id;

--
-- Name: paa_explorations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.paa_explorations (
    id integer NOT NULL,
    article_id integer NOT NULL,
    keyword text NOT NULL,
    question text NOT NULL,
    answer text,
    is_match boolean DEFAULT false,
    match_quality text,
    explored_at timestamp with time zone DEFAULT now()
);

--
-- Name: paa_explorations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.paa_explorations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: paa_explorations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.paa_explorations_id_seq OWNED BY public.paa_explorations.id;

--
-- Name: radar_explorations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.radar_explorations (
    article_id integer NOT NULL,
    seed text NOT NULL,
    broad_keyword text,
    specific_topic text,
    pain_point text,
    depth integer DEFAULT 1 NOT NULL,
    generated_keywords jsonb DEFAULT '[]'::jsonb NOT NULL,
    scan_result jsonb DEFAULT '{}'::jsonb NOT NULL,
    scanned_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: silos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.silos (
    id integer NOT NULL,
    nom text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now()
);

--
-- Name: silos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.silos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: silos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.silos_id_seq OWNED BY public.silos.id;

--
-- Name: theme_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.theme_config (
    id integer NOT NULL,
    data jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);

--
-- Name: theme_config_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.theme_config_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: theme_config_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.theme_config_id_seq OWNED BY public.theme_config.id;

--
-- Name: captain_explorations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.captain_explorations ALTER COLUMN id SET DEFAULT nextval('public.keyword_tests_id_seq'::regclass);

--
-- Name: cocoons id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cocoons ALTER COLUMN id SET DEFAULT nextval('public.cocoons_id_seq'::regclass);

--
-- Name: external_api_cache id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_api_cache ALTER COLUMN id SET DEFAULT nextval('public.api_cache_id_seq'::regclass);

--
-- Name: internal_links id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.internal_links ALTER COLUMN id SET DEFAULT nextval('public.internal_links_id_seq'::regclass);

--
-- Name: keyword_paa_questions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.keyword_paa_questions ALTER COLUMN id SET DEFAULT nextval('public.keyword_paa_questions_id_seq'::regclass);

--
-- Name: keywords_seo id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.keywords_seo ALTER COLUMN id SET DEFAULT nextval('public.keywords_seo_id_seq'::regclass);

--
-- Name: lexique_explorations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lexique_explorations ALTER COLUMN id SET DEFAULT nextval('public.lexique_explorations_id_seq'::regclass);

--
-- Name: lieutenant_explorations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lieutenant_explorations ALTER COLUMN id SET DEFAULT nextval('public.lieutenant_proposals_id_seq'::regclass);

--
-- Name: local_entities id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.local_entities ALTER COLUMN id SET DEFAULT nextval('public.local_entities_id_seq'::regclass);

--
-- Name: paa_explorations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.paa_explorations ALTER COLUMN id SET DEFAULT nextval('public.paa_explorations_id_seq'::regclass);

--
-- Name: silos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.silos ALTER COLUMN id SET DEFAULT nextval('public.silos_id_seq'::regclass);

--
-- Name: theme_config id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.theme_config ALTER COLUMN id SET DEFAULT nextval('public.theme_config_id_seq'::regclass);

--
-- Name: external_api_cache api_cache_cache_key_cache_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_api_cache
    ADD CONSTRAINT api_cache_cache_key_cache_type_key UNIQUE (cache_key, cache_type);

--
-- Name: external_api_cache api_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_api_cache
    ADD CONSTRAINT api_cache_pkey PRIMARY KEY (id);

--
-- Name: article_content article_content_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.article_content
    ADD CONSTRAINT article_content_pkey PRIMARY KEY (article_id);

--
-- Name: article_keywords article_keywords_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.article_keywords
    ADD CONSTRAINT article_keywords_pkey PRIMARY KEY (article_id);

--
-- Name: article_micro_contexts article_micro_contexts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.article_micro_contexts
    ADD CONSTRAINT article_micro_contexts_pkey PRIMARY KEY (article_id);

--
-- Name: article_strategies article_strategies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.article_strategies
    ADD CONSTRAINT article_strategies_pkey PRIMARY KEY (article_id);

--
-- Name: articles articles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.articles
    ADD CONSTRAINT articles_pkey PRIMARY KEY (id);

--
-- Name: articles articles_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.articles
    ADD CONSTRAINT articles_slug_key UNIQUE (slug);

--
-- Name: captain_explorations captain_explorations_article_id_keyword_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.captain_explorations
    ADD CONSTRAINT captain_explorations_article_id_keyword_key UNIQUE (article_id, keyword);

--
-- Name: captain_explorations captain_explorations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.captain_explorations
    ADD CONSTRAINT captain_explorations_pkey PRIMARY KEY (id);

--
-- Name: cocoon_strategies cocoon_strategies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cocoon_strategies
    ADD CONSTRAINT cocoon_strategies_pkey PRIMARY KEY (cocoon_id);

--
-- Name: cocoons cocoons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cocoons
    ADD CONSTRAINT cocoons_pkey PRIMARY KEY (id);

--
-- Name: internal_links internal_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.internal_links
    ADD CONSTRAINT internal_links_pkey PRIMARY KEY (id);

--
-- Name: internal_links internal_links_source_id_target_id_position_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.internal_links
    ADD CONSTRAINT internal_links_source_id_target_id_position_key UNIQUE (source_id, target_id, "position");

--
-- Name: keyword_autocomplete keyword_autocomplete_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.keyword_autocomplete
    ADD CONSTRAINT keyword_autocomplete_pkey PRIMARY KEY (keyword, lang, country, "position");

--
-- Name: keyword_discoveries keyword_discoveries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.keyword_discoveries
    ADD CONSTRAINT keyword_discoveries_pkey PRIMARY KEY (seed, lang);

--
-- Name: keyword_intent_analyses keyword_intent_analyses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.keyword_intent_analyses
    ADD CONSTRAINT keyword_intent_analyses_pkey PRIMARY KEY (keyword, location_code);

--
-- Name: keyword_metrics keyword_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.keyword_metrics
    ADD CONSTRAINT keyword_metrics_pkey PRIMARY KEY (keyword, lang, country);

--
-- Name: keyword_paa_questions keyword_paa_questions_keyword_lang_country_question_depth_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.keyword_paa_questions
    ADD CONSTRAINT keyword_paa_questions_keyword_lang_country_question_depth_key UNIQUE (keyword, lang, country, question, depth);

--
-- Name: keyword_paa_questions keyword_paa_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.keyword_paa_questions
    ADD CONSTRAINT keyword_paa_questions_pkey PRIMARY KEY (id);

--
-- Name: keyword_serp_results keyword_serp_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.keyword_serp_results
    ADD CONSTRAINT keyword_serp_results_pkey PRIMARY KEY (keyword, lang, country, "position");

--
-- Name: keyword_serp_scrapes keyword_serp_scrapes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.keyword_serp_scrapes
    ADD CONSTRAINT keyword_serp_scrapes_pkey PRIMARY KEY (keyword, lang, country, "position");

--
-- Name: keywords_seo keywords_seo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.keywords_seo
    ADD CONSTRAINT keywords_seo_pkey PRIMARY KEY (id);

--
-- Name: lexique_explorations lexique_explorations_article_id_source_keyword_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lexique_explorations
    ADD CONSTRAINT lexique_explorations_article_id_source_keyword_key UNIQUE (article_id, source_keyword);

--
-- Name: lexique_explorations lexique_explorations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lexique_explorations
    ADD CONSTRAINT lexique_explorations_pkey PRIMARY KEY (id);

--
-- Name: lieutenant_explorations lieutenant_explorations_article_id_keyword_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lieutenant_explorations
    ADD CONSTRAINT lieutenant_explorations_article_id_keyword_key UNIQUE (article_id, keyword);

--
-- Name: lieutenant_explorations lieutenant_explorations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lieutenant_explorations
    ADD CONSTRAINT lieutenant_explorations_pkey PRIMARY KEY (id);

--
-- Name: local_entities local_entities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.local_entities
    ADD CONSTRAINT local_entities_pkey PRIMARY KEY (id);

--
-- Name: paa_explorations paa_explorations_article_id_keyword_question_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.paa_explorations
    ADD CONSTRAINT paa_explorations_article_id_keyword_question_key UNIQUE (article_id, keyword, question);

--
-- Name: paa_explorations paa_explorations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.paa_explorations
    ADD CONSTRAINT paa_explorations_pkey PRIMARY KEY (id);

--
-- Name: radar_explorations radar_explorations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.radar_explorations
    ADD CONSTRAINT radar_explorations_pkey PRIMARY KEY (article_id);

--
-- Name: silos silos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.silos
    ADD CONSTRAINT silos_pkey PRIMARY KEY (id);

--
-- Name: theme_config theme_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.theme_config
    ADD CONSTRAINT theme_config_pkey PRIMARY KEY (id);

--
-- Name: idx_articles_cocoon_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_articles_cocoon_id ON public.articles USING btree (cocoon_id);

--
-- Name: idx_articles_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_articles_slug ON public.articles USING btree (slug);

--
-- Name: idx_articles_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_articles_status ON public.articles USING btree (status);

--
-- Name: idx_captain_explorations_article; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_captain_explorations_article ON public.captain_explorations USING btree (article_id);

--
-- Name: idx_external_api_cache_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_external_api_cache_expires ON public.external_api_cache USING btree (expires_at);

--
-- Name: idx_external_api_cache_key_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_external_api_cache_key_type ON public.external_api_cache USING btree (cache_key, cache_type);

--
-- Name: idx_internal_links_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_internal_links_source ON public.internal_links USING btree (source_id);

--
-- Name: idx_internal_links_target; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_internal_links_target ON public.internal_links USING btree (target_id);

--
-- Name: idx_keyword_autocomplete_fetched; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_keyword_autocomplete_fetched ON public.keyword_autocomplete USING btree (fetched_at);

--
-- Name: idx_keyword_metrics_fetched; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_keyword_metrics_fetched ON public.keyword_metrics USING btree (fetched_at);

--
-- Name: idx_keyword_paa_kw; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_keyword_paa_kw ON public.keyword_paa_questions USING btree (keyword, lang, country);

--
-- Name: idx_keyword_serp_results_domain; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_keyword_serp_results_domain ON public.keyword_serp_results USING btree (domain);

--
-- Name: idx_keyword_serp_results_fetched; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_keyword_serp_results_fetched ON public.keyword_serp_results USING btree (fetched_at);

--
-- Name: idx_keyword_serp_scrapes_scraped; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_keyword_serp_scrapes_scraped ON public.keyword_serp_scrapes USING btree (scraped_at);

--
-- Name: idx_keywords_seo_cocoon; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_keywords_seo_cocoon ON public.keywords_seo USING btree (cocoon_name);

--
-- Name: idx_lexique_explorations_article; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lexique_explorations_article ON public.lexique_explorations USING btree (article_id);

--
-- Name: idx_lieutenant_explorations_article; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lieutenant_explorations_article ON public.lieutenant_explorations USING btree (article_id);

--
-- Name: idx_paa_explorations_article_keyword; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_paa_explorations_article_keyword ON public.paa_explorations USING btree (article_id, keyword);

--
-- Name: idx_radar_explorations_scanned; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_radar_explorations_scanned ON public.radar_explorations USING btree (scanned_at);

--
-- Name: article_content article_content_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER article_content_updated_at BEFORE UPDATE ON public.article_content FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

--
-- Name: article_keywords article_keywords_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER article_keywords_updated_at BEFORE UPDATE ON public.article_keywords FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

--
-- Name: article_micro_contexts article_micro_contexts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER article_micro_contexts_updated_at BEFORE UPDATE ON public.article_micro_contexts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

--
-- Name: article_strategies article_strategies_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER article_strategies_updated_at BEFORE UPDATE ON public.article_strategies FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

--
-- Name: articles articles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER articles_updated_at BEFORE UPDATE ON public.articles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

--
-- Name: theme_config theme_config_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER theme_config_updated_at BEFORE UPDATE ON public.theme_config FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

--
-- Name: article_content article_content_article_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.article_content
    ADD CONSTRAINT article_content_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.articles(id) ON DELETE CASCADE;

--
-- Name: article_keywords article_keywords_article_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.article_keywords
    ADD CONSTRAINT article_keywords_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.articles(id) ON DELETE CASCADE;

--
-- Name: article_micro_contexts article_micro_contexts_article_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.article_micro_contexts
    ADD CONSTRAINT article_micro_contexts_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.articles(id) ON DELETE CASCADE;

--
-- Name: article_strategies article_strategies_article_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.article_strategies
    ADD CONSTRAINT article_strategies_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.articles(id) ON DELETE CASCADE;

--
-- Name: articles articles_cocoon_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.articles
    ADD CONSTRAINT articles_cocoon_id_fkey FOREIGN KEY (cocoon_id) REFERENCES public.cocoons(id) ON DELETE SET NULL;

--
-- Name: cocoon_strategies cocoon_strategies_cocoon_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cocoon_strategies
    ADD CONSTRAINT cocoon_strategies_cocoon_id_fkey FOREIGN KEY (cocoon_id) REFERENCES public.cocoons(id) ON DELETE CASCADE;

--
-- Name: cocoons cocoons_silo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cocoons
    ADD CONSTRAINT cocoons_silo_id_fkey FOREIGN KEY (silo_id) REFERENCES public.silos(id) ON DELETE CASCADE;

--
-- Name: keyword_autocomplete keyword_autocomplete_keyword_lang_country_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.keyword_autocomplete
    ADD CONSTRAINT keyword_autocomplete_keyword_lang_country_fkey FOREIGN KEY (keyword, lang, country) REFERENCES public.keyword_metrics(keyword, lang, country) ON DELETE CASCADE;

--
-- Name: keyword_paa_questions keyword_paa_questions_keyword_lang_country_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.keyword_paa_questions
    ADD CONSTRAINT keyword_paa_questions_keyword_lang_country_fkey FOREIGN KEY (keyword, lang, country) REFERENCES public.keyword_metrics(keyword, lang, country) ON DELETE CASCADE;

--
-- Name: keyword_serp_results keyword_serp_results_keyword_lang_country_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.keyword_serp_results
    ADD CONSTRAINT keyword_serp_results_keyword_lang_country_fkey FOREIGN KEY (keyword, lang, country) REFERENCES public.keyword_metrics(keyword, lang, country) ON DELETE CASCADE;

--
-- Name: keyword_serp_scrapes keyword_serp_scrapes_keyword_lang_country_position_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.keyword_serp_scrapes
    ADD CONSTRAINT keyword_serp_scrapes_keyword_lang_country_position_fkey FOREIGN KEY (keyword, lang, country, "position") REFERENCES public.keyword_serp_results(keyword, lang, country, "position") ON DELETE CASCADE;

--
-- Name: captain_explorations keyword_tests_article_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.captain_explorations
    ADD CONSTRAINT keyword_tests_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.articles(id) ON DELETE CASCADE;

--
-- Name: lexique_explorations lexique_explorations_article_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lexique_explorations
    ADD CONSTRAINT lexique_explorations_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.articles(id) ON DELETE CASCADE;

--
-- Name: lieutenant_explorations lieutenant_proposals_article_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lieutenant_explorations
    ADD CONSTRAINT lieutenant_proposals_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.articles(id) ON DELETE CASCADE;

--
-- Name: paa_explorations paa_explorations_article_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.paa_explorations
    ADD CONSTRAINT paa_explorations_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.articles(id) ON DELETE CASCADE;

--
-- Name: radar_explorations radar_explorations_article_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.radar_explorations
    ADD CONSTRAINT radar_explorations_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.articles(id) ON DELETE CASCADE;

--
-- PostgreSQL database dump complete
--
