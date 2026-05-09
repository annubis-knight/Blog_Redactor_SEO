/**
 * Sprint keyword-metrics-decomposition — Story A1
 *
 * Applique le DDL des 4 nouvelles tables d'éclatement de `keyword_metrics.serp_raw_json` :
 *   - keyword_serp_results    (URLs Google Top 10)
 *   - keyword_serp_scrapes    (HTML scrapé : headings, text_content, is_blog)
 *   - keyword_paa_questions   (questions People Also Ask)
 *   - keyword_autocomplete    (suggestions autocomplete)
 *
 * Idempotent (`CREATE TABLE IF NOT EXISTS …`) — re-jouable sur DB neuve.
 * Pas de DROP. Aucun fichier `migrations/NNN_*.sql` n'est créé : la source
 * de vérité est `server/db/schema.sql` (régénéré via `npm run db:snapshot`).
 *
 * Usage : npx tsx scripts/apply-keyword-serp-schema.ts
 *
 * Script jetable : supprimé en Story D3 (archivage).
 * Cf. tech-spec-keyword-metrics-decomposition.md §3.
 */
import { query, pool } from '../server/db/client.js'
import { log } from '../server/utils/logger.js'

const DDL_KEYWORD_SERP_RESULTS = `
CREATE TABLE IF NOT EXISTS keyword_serp_results (
  keyword       TEXT NOT NULL,
  lang          TEXT NOT NULL DEFAULT 'fr',
  country       TEXT NOT NULL DEFAULT 'fr',
  position      INTEGER NOT NULL,
  url           TEXT NOT NULL,
  title         TEXT,
  domain        TEXT,
  fetched_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (keyword, lang, country, position),
  FOREIGN KEY (keyword, lang, country)
    REFERENCES keyword_metrics(keyword, lang, country)
    ON DELETE CASCADE
);
`

const DDL_KEYWORD_SERP_SCRAPES = `
CREATE TABLE IF NOT EXISTS keyword_serp_scrapes (
  keyword       TEXT NOT NULL,
  lang          TEXT NOT NULL DEFAULT 'fr',
  country       TEXT NOT NULL DEFAULT 'fr',
  position      INTEGER NOT NULL,
  url           TEXT NOT NULL,
  headings      JSONB NOT NULL DEFAULT '[]'::jsonb,
  text_content  TEXT,
  is_blog       BOOLEAN,
  scraped_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (keyword, lang, country, position),
  FOREIGN KEY (keyword, lang, country, position)
    REFERENCES keyword_serp_results(keyword, lang, country, position)
    ON DELETE CASCADE
);
`

const DDL_KEYWORD_PAA_QUESTIONS = `
CREATE TABLE IF NOT EXISTS keyword_paa_questions (
  id              BIGSERIAL PRIMARY KEY,
  keyword         TEXT NOT NULL,
  lang            TEXT NOT NULL DEFAULT 'fr',
  country         TEXT NOT NULL DEFAULT 'fr',
  question        TEXT NOT NULL,
  answer          TEXT,
  depth           INTEGER DEFAULT 1,
  parent_question TEXT,
  fetched_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (keyword, lang, country)
    REFERENCES keyword_metrics(keyword, lang, country)
    ON DELETE CASCADE,
  UNIQUE (keyword, lang, country, question, depth)
);
`

const DDL_KEYWORD_AUTOCOMPLETE = `
CREATE TABLE IF NOT EXISTS keyword_autocomplete (
  keyword       TEXT NOT NULL,
  lang          TEXT NOT NULL DEFAULT 'fr',
  country       TEXT NOT NULL DEFAULT 'fr',
  position      INTEGER NOT NULL,
  text          TEXT NOT NULL,
  source        TEXT,
  fetched_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (keyword, lang, country, position),
  FOREIGN KEY (keyword, lang, country)
    REFERENCES keyword_metrics(keyword, lang, country)
    ON DELETE CASCADE
);
`

const INDEXES = [
  `CREATE INDEX IF NOT EXISTS idx_keyword_serp_results_domain ON keyword_serp_results(domain);`,
  `CREATE INDEX IF NOT EXISTS idx_keyword_serp_results_fetched ON keyword_serp_results(fetched_at);`,
  `CREATE INDEX IF NOT EXISTS idx_keyword_serp_scrapes_scraped ON keyword_serp_scrapes(scraped_at);`,
  `CREATE INDEX IF NOT EXISTS idx_keyword_paa_kw ON keyword_paa_questions(keyword, lang, country);`,
  `CREATE INDEX IF NOT EXISTS idx_keyword_autocomplete_fetched ON keyword_autocomplete(fetched_at);`,
]

async function main(): Promise<void> {
  log.info('[apply-keyword-serp-schema] start')

  await query(DDL_KEYWORD_SERP_RESULTS)
  log.info('[apply-keyword-serp-schema] keyword_serp_results ✓')

  await query(DDL_KEYWORD_SERP_SCRAPES)
  log.info('[apply-keyword-serp-schema] keyword_serp_scrapes ✓')

  await query(DDL_KEYWORD_PAA_QUESTIONS)
  log.info('[apply-keyword-serp-schema] keyword_paa_questions ✓')

  await query(DDL_KEYWORD_AUTOCOMPLETE)
  log.info('[apply-keyword-serp-schema] keyword_autocomplete ✓')

  for (const sql of INDEXES) {
    await query(sql)
  }
  log.info(`[apply-keyword-serp-schema] ${INDEXES.length} indexes ✓`)

  log.info('[apply-keyword-serp-schema] done — run `npm run db:snapshot` to refresh schema.sql')
  await pool.end()
}

main().catch((err) => {
  log.error('[apply-keyword-serp-schema] failed:', err)
  process.exit(1)
})
