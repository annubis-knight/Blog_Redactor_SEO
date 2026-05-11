/**
 * AUTHORITY: PostgreSQL `keyword_serp_results`, `keyword_serp_scrapes`,
 *            `keyword_paa_questions`, `keyword_autocomplete`.
 *            Source unique cross-article pour les artefacts SERP (URLs Top 10,
 *            HTML scrapé, questions PAA, autocomplete).
 * READS FROM: getSerpResults / getSerpScrapes / getPaaQuestions / getAutocomplete
 *             / getSerpResultsFresh / hasSerpScrape (pré-check léger).
 * WRITES TO: upsertSerpResults / upsertSerpScrapes / upsertPaaQuestions /
 *            upsertAutocomplete (idempotents, ON CONFLICT DO UPDATE / NOTHING).
 * CONSUMERS: serp-analysis.routes (/serp/analyze + /serp/tfidf), tfidf.service,
 *            keyword-queries.service (brief Capitaine), dataforseo/brief.ts,
 *            keywords.routes (/keywords/:keyword/serp/exists — pré-check UI Lexique).
 * RELATED: NFR-MOT-SCHEMA-KEYWORD-DECOMPOSITION, NFR-INT-SERP-ONCE,
 *          FR-LEX-TFIDF, FR-LIE-SERP-ANALYZE, FR-LEX-PRECHECK-SERP.
 */
import type { PoolClient } from 'pg'
import { query, pool } from '../../db/client.js'
import { log } from '../../utils/logger.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SerpResult {
  keyword: string
  lang: string
  country: string
  position: number
  url: string
  title: string | null
  domain: string | null
  fetchedAt: string
}

export interface SerpScrape {
  keyword: string
  lang: string
  country: string
  position: number
  url: string
  headings: unknown[]
  textContent: string | null
  isBlog: boolean | null
  scrapedAt: string
}

export interface PaaQuestionRow {
  id: number
  keyword: string
  lang: string
  country: string
  question: string
  answer: string | null
  depth: number
  parentQuestion: string | null
  fetchedAt: string
}

export interface AutocompleteEntry {
  keyword: string
  lang: string
  country: string
  position: number
  text: string
  source: string | null
  fetchedAt: string
}

export interface UpsertSerpResultInput {
  position: number
  url: string
  title?: string | null
  domain?: string | null
}

export interface UpsertSerpScrapeInput {
  position: number
  url: string
  headings: unknown[]
  textContent?: string | null
  isBlog?: boolean | null
}

export interface UpsertPaaInput {
  question: string
  answer?: string | null
  depth?: number
  parentQuestion?: string | null
}

export interface UpsertAutocompleteInput {
  position: number
  text: string
}

// ---------------------------------------------------------------------------
// Read API
// ---------------------------------------------------------------------------

interface SerpResultRow {
  keyword: string
  lang: string
  country: string
  position: number
  url: string
  title: string | null
  domain: string | null
  fetched_at: Date
}

export async function getSerpResults(
  keyword: string,
  lang: string = 'fr',
  country: string = 'fr',
): Promise<SerpResult[]> {
  const res = await query<SerpResultRow>(
    `SELECT keyword, lang, country, position, url, title, domain, fetched_at
       FROM keyword_serp_results
      WHERE keyword = $1 AND lang = $2 AND country = $3
      ORDER BY position`,
    [keyword, lang, country],
  )
  return res.rows.map((r) => ({
    keyword: r.keyword,
    lang: r.lang,
    country: r.country,
    position: r.position,
    url: r.url,
    title: r.title,
    domain: r.domain,
    fetchedAt: r.fetched_at.toISOString(),
  }))
}

interface SerpScrapeRow {
  keyword: string
  lang: string
  country: string
  position: number
  url: string
  headings: unknown[]
  text_content: string | null
  is_blog: boolean | null
  scraped_at: Date
}

export async function getSerpScrapes(
  keyword: string,
  lang: string = 'fr',
  country: string = 'fr',
): Promise<SerpScrape[]> {
  const res = await query<SerpScrapeRow>(
    `SELECT keyword, lang, country, position, url, headings, text_content, is_blog, scraped_at
       FROM keyword_serp_scrapes
      WHERE keyword = $1 AND lang = $2 AND country = $3
      ORDER BY position`,
    [keyword, lang, country],
  )
  return res.rows.map((r) => ({
    keyword: r.keyword,
    lang: r.lang,
    country: r.country,
    position: r.position,
    url: r.url,
    headings: Array.isArray(r.headings) ? r.headings : [],
    textContent: r.text_content,
    isBlog: r.is_blog,
    scrapedAt: r.scraped_at.toISOString(),
  }))
}

interface PaaRow {
  id: string
  keyword: string
  lang: string
  country: string
  question: string
  answer: string | null
  depth: number
  parent_question: string | null
  fetched_at: Date
}

export async function getPaaQuestions(
  keyword: string,
  lang: string = 'fr',
  country: string = 'fr',
): Promise<PaaQuestionRow[]> {
  const res = await query<PaaRow>(
    `SELECT id, keyword, lang, country, question, answer, depth, parent_question, fetched_at
       FROM keyword_paa_questions
      WHERE keyword = $1 AND lang = $2 AND country = $3
      ORDER BY depth, id`,
    [keyword, lang, country],
  )
  return res.rows.map((r) => ({
    id: Number(r.id),
    keyword: r.keyword,
    lang: r.lang,
    country: r.country,
    question: r.question,
    answer: r.answer,
    depth: r.depth,
    parentQuestion: r.parent_question,
    fetchedAt: r.fetched_at.toISOString(),
  }))
}

interface AutocompleteRow {
  keyword: string
  lang: string
  country: string
  position: number
  text: string
  source: string | null
  fetched_at: Date
}

export async function getAutocomplete(
  keyword: string,
  lang: string = 'fr',
  country: string = 'fr',
): Promise<AutocompleteEntry[]> {
  const res = await query<AutocompleteRow>(
    `SELECT keyword, lang, country, position, text, source, fetched_at
       FROM keyword_autocomplete
      WHERE keyword = $1 AND lang = $2 AND country = $3
      ORDER BY position`,
    [keyword, lang, country],
  )
  return res.rows.map((r) => ({
    keyword: r.keyword,
    lang: r.lang,
    country: r.country,
    position: r.position,
    text: r.text,
    source: r.source,
    fetchedAt: r.fetched_at.toISOString(),
  }))
}

/**
 * FR-LEX-PRECHECK-SERP — pré-check léger : un scrape SERP existe-t-il pour
 * ce keyword/lang/country ? Lit `keyword_serp_scrapes` en agrégat
 * (`MAX(scraped_at)`) sans charger `text_content`/`headings` (requête sub-ms
 * sur l'index PK). Aucun appel externe DataForSEO.
 *
 * Consommé par `GET /api/keywords/:keyword/serp/exists` pour gater l'UI
 * Lexique : si `exists:false`, le composant affiche un CTA explicite *« Lancer
 * l'analyse SERP »* au lieu de tenter un POST /serp/tfidf qui répondrait 404
 * (origine de la trace rouge console pré- */
export async function hasSerpScrape(
  keyword: string,
  lang: string = 'fr',
  country: string = 'fr',
): Promise<{ exists: boolean; scrapedAt: string | null }> {
  const res = await query<{ scraped_at: Date | null }>(
    `SELECT MAX(scraped_at) AS scraped_at
       FROM keyword_serp_scrapes
      WHERE keyword = $1 AND lang = $2 AND country = $3`,
    [keyword, lang, country],
  )
  const scrapedAt = res.rows[0]?.scraped_at ?? null
  if (!scrapedAt) return { exists: false, scrapedAt: null }
  return { exists: true, scrapedAt: scrapedAt.toISOString() }
}

/**
 * Returns SERP results if the most recent fetched_at is fresh (< ttlDays),
 * otherwise null. Useful as cache check before triggering a re-scrape.
 */
export async function getSerpResultsFresh(
  keyword: string,
  lang: string = 'fr',
  country: string = 'fr',
  ttlDays: number = 7,
): Promise<SerpResult[] | null> {
  const results = await getSerpResults(keyword, lang, country)
  if (results.length === 0) return null
  const newest = results.reduce((max, r) => (r.fetchedAt > max ? r.fetchedAt : max), results[0].fetchedAt)
  const ageMs = Date.now() - new Date(newest).getTime()
  if (ageMs >= ttlDays * 24 * 60 * 60 * 1000) return null
  return results
}

// ---------------------------------------------------------------------------
// Write API — batched UPSERTs
// ---------------------------------------------------------------------------

type ExecQuery = (text: string, params?: unknown[]) => Promise<{ rowCount: number | null }>

function getExec(client?: PoolClient): ExecQuery {
  if (client) {
    return (text, params) => client.query(text, params) as unknown as Promise<{ rowCount: number | null }>
  }
  return (text, params) => query(text, params) as unknown as Promise<{ rowCount: number | null }>
}

export async function upsertSerpResults(
  keyword: string,
  rows: UpsertSerpResultInput[],
  lang: string = 'fr',
  country: string = 'fr',
  client?: PoolClient,
): Promise<void> {
  if (rows.length === 0) return
  const exec = getExec(client)

  const values: string[] = []
  const params: unknown[] = []
  let p = 1
  for (const r of rows) {
    values.push(`($${p++}, $${p++}, $${p++}, $${p++}, $${p++}, $${p++}, $${p++}, NOW())`)
    params.push(keyword, lang, country, r.position, r.url, r.title ?? null, r.domain ?? null)
  }

  await exec(
    `INSERT INTO keyword_serp_results
       (keyword, lang, country, position, url, title, domain, fetched_at)
     VALUES ${values.join(', ')}
     ON CONFLICT (keyword, lang, country, position) DO UPDATE
       SET url = EXCLUDED.url,
           title = EXCLUDED.title,
           domain = EXCLUDED.domain,
           fetched_at = EXCLUDED.fetched_at`,
    params,
  )
}

export async function upsertSerpScrapes(
  keyword: string,
  rows: UpsertSerpScrapeInput[],
  lang: string = 'fr',
  country: string = 'fr',
  client?: PoolClient,
): Promise<void> {
  if (rows.length === 0) return
  const exec = getExec(client)

  const values: string[] = []
  const params: unknown[] = []
  let p = 1
  for (const r of rows) {
    values.push(
      `($${p++}, $${p++}, $${p++}, $${p++}, $${p++}, $${p++}::jsonb, $${p++}, $${p++}, NOW())`,
    )
    params.push(
      keyword,
      lang,
      country,
      r.position,
      r.url,
      JSON.stringify(r.headings ?? []),
      r.textContent ?? null,
      r.isBlog ?? null,
    )
  }

  try {
    await exec(
      `INSERT INTO keyword_serp_scrapes
         (keyword, lang, country, position, url, headings, text_content, is_blog, scraped_at)
       VALUES ${values.join(', ')}
       ON CONFLICT (keyword, lang, country, position) DO UPDATE
         SET url = EXCLUDED.url,
             headings = EXCLUDED.headings,
             text_content = EXCLUDED.text_content,
             is_blog = EXCLUDED.is_blog,
             scraped_at = EXCLUDED.scraped_at`,
      params,
    )
  } catch (err) {
    const code = (err as { code?: string }).code
    if (code === '23503') {
      // FK violation : la row parent dans keyword_serp_results n'existe pas.
      // On loggue explicitement et on relance pour que l'appelant gère
      // (typiquement une transaction qui doit rollback).
      log.warn(
        `[keyword-serp] upsertSerpScrapes FK violation pour keyword="${keyword}" : ` +
          `row parente manquante dans keyword_serp_results. Appeler upsertSerpResults d'abord.`,
      )
    }
    throw err
  }
}

export async function upsertPaaQuestions(
  keyword: string,
  rows: UpsertPaaInput[],
  lang: string = 'fr',
  country: string = 'fr',
  client?: PoolClient,
): Promise<void> {
  if (rows.length === 0) return
  const exec = getExec(client)

  const values: string[] = []
  const params: unknown[] = []
  let p = 1
  for (const r of rows) {
    values.push(`($${p++}, $${p++}, $${p++}, $${p++}, $${p++}, $${p++}, $${p++}, NOW())`)
    params.push(
      keyword,
      lang,
      country,
      r.question,
      r.answer ?? null,
      r.depth ?? 1,
      r.parentQuestion ?? null,
    )
  }

  await exec(
    `INSERT INTO keyword_paa_questions
       (keyword, lang, country, question, answer, depth, parent_question, fetched_at)
     VALUES ${values.join(', ')}
     ON CONFLICT (keyword, lang, country, question, depth) DO NOTHING`,
    params,
  )
}

export async function upsertAutocomplete(
  keyword: string,
  rows: UpsertAutocompleteInput[],
  source: string,
  lang: string = 'fr',
  country: string = 'fr',
  client?: PoolClient,
): Promise<void> {
  if (rows.length === 0) return
  const exec = getExec(client)

  const values: string[] = []
  const params: unknown[] = []
  let p = 1
  for (const r of rows) {
    values.push(`($${p++}, $${p++}, $${p++}, $${p++}, $${p++}, $${p++}, NOW())`)
    params.push(keyword, lang, country, r.position, r.text, source)
  }

  await exec(
    `INSERT INTO keyword_autocomplete
       (keyword, lang, country, position, text, source, fetched_at)
     VALUES ${values.join(', ')}
     ON CONFLICT (keyword, lang, country, position) DO UPDATE
       SET text = EXCLUDED.text,
           source = EXCLUDED.source,
           fetched_at = EXCLUDED.fetched_at`,
    params,
  )
}

/**
 * * des 4 tables filles. Utilisé par /serp/analyze quand la cache check (via
 * getSerpResultsFresh) renvoie un hit. La forme reproduit l'ancien
 * keyword_metrics.serp_raw_json pour ne pas casser les consommateurs front.
 *
 * Cas mixte : si N rows dans keyword_serp_results mais < N dans
 * keyword_serp_scrapes, on remplit avec headings=[] / textContent=null pour
 * les positions sans scrape (cf. */
export interface ReconstructedSerpAnalysisResult {
  keyword: string
  competitors: Array<{
    position: number
    title: string
    url: string
    domain: string
    headings: unknown[]
    textContent: string
    isBlog?: boolean | null
  }>
  paaQuestions: Array<{ question: string; answer: string | null }>
  maxScraped: number
  cachedAt: string
  fromCache: boolean
}

export async function reconstructSerpAnalysisResult(
  keyword: string,
  lang: string = 'fr',
  country: string = 'fr',
): Promise<ReconstructedSerpAnalysisResult | null> {
  const [results, scrapes, paa] = await Promise.all([
    getSerpResults(keyword, lang, country),
    getSerpScrapes(keyword, lang, country),
    getPaaQuestions(keyword, lang, country),
  ])
  if (results.length === 0) return null

  const scrapesByPosition = new Map<number, (typeof scrapes)[number]>()
  for (const s of scrapes) scrapesByPosition.set(s.position, s)

  const competitors = results.map((r) => {
    const scrape = scrapesByPosition.get(r.position)
    return {
      position: r.position,
      title: r.title ?? '',
      url: r.url,
      domain: r.domain ?? '',
      headings: scrape?.headings ?? [],
      textContent: scrape?.textContent ?? '',
      isBlog: scrape?.isBlog ?? null,
    }
  })

  const newest = results.reduce(
    (max, r) => (r.fetchedAt > max ? r.fetchedAt : max),
    results[0].fetchedAt,
  )

  return {
    keyword,
    competitors,
    paaQuestions: paa.map((p) => ({ question: p.question, answer: p.answer })),
    maxScraped: competitors.length,
    cachedAt: newest,
    fromCache: true,
  }
}

/**
 * Helper transactionnel : ouvre une transaction, exécute la callback avec
 * un client pg dédié, commit/rollback automatique.
 *
 * Utilisé par `scrape-corpus.fetchAndPersist` pour
 * garantir l'atomicité du dual-write SERP/scrapes/PAA.
 */
export async function withSerpTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}
