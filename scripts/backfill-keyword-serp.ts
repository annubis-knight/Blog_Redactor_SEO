/**
 * Sprint keyword-metrics-decomposition — Story A2
 *
 * Backfill des 4 nouvelles tables `keyword_serp_*` à partir des colonnes
 * legacy de `keyword_metrics` :
 *   - `serp_raw_json`           → keyword_serp_results + keyword_serp_scrapes
 *   - `paa_questions` JSONB     → keyword_paa_questions (cas où SERP n'a jamais été scrapée)
 *   - `autocomplete_suggestions`→ keyword_autocomplete
 *
 * Idempotent : `ON CONFLICT DO NOTHING` sur chaque INSERT, donc rejouable.
 * Tolérant aux payloads partiels (champs `headings` / `textContent` / `isBlog` absents).
 *
 * Usage : npx tsx scripts/backfill-keyword-serp.ts
 *
 * Script jetable : supprimé en Story D3 (archivage).
 */
import { query, pool } from '../server/db/client.js'
import { log } from '../server/utils/logger.js'

interface KeywordRow {
  keyword: string
  lang: string
  country: string
  serp_raw_json: unknown | null
  paa_questions: unknown | null
  autocomplete_suggestions: unknown | null
  autocomplete_source: string | null
  fetched_at: Date
}

interface BackfillStats {
  rowsScanned: number
  serpResults: number
  serpScrapes: number
  paaQuestions: number
  autocomplete: number
  warnings: number
}

interface SerpRawJsonShape {
  competitors?: Array<{
    position?: number
    url?: string
    title?: string
    domain?: string
    headings?: unknown
    textContent?: unknown
    isBlog?: unknown
    [k: string]: unknown
  }>
  paaQuestions?: Array<{
    question?: string
    answer?: string | null
    depth?: number
    parentQuestion?: string | null
    [k: string]: unknown
  }>
  [k: string]: unknown
}

function asObject(value: unknown): SerpRawJsonShape | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as SerpRawJsonShape
  }
  return null
}

function asArray(value: unknown): unknown[] | null {
  return Array.isArray(value) ? value : null
}

async function backfillSerpForRow(row: KeywordRow, stats: BackfillStats): Promise<void> {
  const serp = asObject(row.serp_raw_json)
  if (!serp) return

  const competitors = asArray(serp.competitors)
  if (!competitors) {
    log.warn(
      `[backfill] keyword="${row.keyword}" (${row.lang}/${row.country}) : ` +
        `serp_raw_json sans tableau competitors — skip`,
    )
    stats.warnings++
    return
  }

  const fetchedAt = row.fetched_at.toISOString()

  for (const c of competitors) {
    const competitor = c as Record<string, unknown>
    const position = typeof competitor.position === 'number' ? competitor.position : null
    const url = typeof competitor.url === 'string' ? competitor.url : null
    if (position === null || url === null) {
      log.warn(
        `[backfill] keyword="${row.keyword}" : competitor sans position/url — skip`,
      )
      stats.warnings++
      continue
    }
    const title = typeof competitor.title === 'string' ? competitor.title : null
    const domain = typeof competitor.domain === 'string' ? competitor.domain : null

    const insertResult = await query(
      `INSERT INTO keyword_serp_results
         (keyword, lang, country, position, url, title, domain, fetched_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (keyword, lang, country, position) DO NOTHING`,
      [row.keyword, row.lang, row.country, position, url, title, domain, fetchedAt],
    )
    if ((insertResult.rowCount ?? 0) > 0) stats.serpResults++

    const headings = asArray(competitor.headings) ?? []
    const textContent = typeof competitor.textContent === 'string' ? competitor.textContent : null
    const isBlog = typeof competitor.isBlog === 'boolean' ? competitor.isBlog : null
    const hasScrapeSignal =
      headings.length > 0 || textContent !== null || isBlog !== null

    if (hasScrapeSignal) {
      const scrapeResult = await query(
        `INSERT INTO keyword_serp_scrapes
           (keyword, lang, country, position, url, headings, text_content, is_blog, scraped_at)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9)
         ON CONFLICT (keyword, lang, country, position) DO NOTHING`,
        [
          row.keyword,
          row.lang,
          row.country,
          position,
          url,
          JSON.stringify(headings),
          textContent,
          isBlog,
          fetchedAt,
        ],
      )
      if ((scrapeResult.rowCount ?? 0) > 0) stats.serpScrapes++
    }
  }

  // PAA depuis serp_raw_json (Capitaine les colle parfois ici, en plus de paa_questions JSONB)
  const paaFromSerp = asArray(serp.paaQuestions) ?? []
  for (const p of paaFromSerp) {
    const item = p as Record<string, unknown>
    const question = typeof item.question === 'string' ? item.question : null
    if (!question) continue
    const answer = typeof item.answer === 'string' ? item.answer : null
    const depth = typeof item.depth === 'number' ? item.depth : 1
    const parent = typeof item.parentQuestion === 'string' ? item.parentQuestion : null

    const result = await query(
      `INSERT INTO keyword_paa_questions
         (keyword, lang, country, question, answer, depth, parent_question, fetched_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (keyword, lang, country, question, depth) DO NOTHING`,
      [row.keyword, row.lang, row.country, question, answer, depth, parent, fetchedAt],
    )
    if ((result.rowCount ?? 0) > 0) stats.paaQuestions++
  }
}

async function backfillPaaJsonbFallback(row: KeywordRow, stats: BackfillStats): Promise<void> {
  // Cas : keyword_metrics.paa_questions JSONB peuplée mais pas de serp_raw_json,
  // ou serp_raw_json sans paaQuestions. On migre les questions du JSONB legacy.
  const paaJsonb = asArray(row.paa_questions) ?? []
  if (paaJsonb.length === 0) return

  for (const p of paaJsonb) {
    const item = p as Record<string, unknown>
    const question = typeof item.question === 'string' ? item.question : null
    if (!question) continue
    const answer = typeof item.answer === 'string' ? item.answer : null
    const depth = typeof item.depth === 'number' ? item.depth : 1
    const parent = typeof item.parentQuestion === 'string' ? item.parentQuestion : null

    const result = await query(
      `INSERT INTO keyword_paa_questions
         (keyword, lang, country, question, answer, depth, parent_question, fetched_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (keyword, lang, country, question, depth) DO NOTHING`,
      [row.keyword, row.lang, row.country, question, answer, depth, parent, row.fetched_at.toISOString()],
    )
    if ((result.rowCount ?? 0) > 0) stats.paaQuestions++
  }
}

async function backfillAutocompleteForRow(row: KeywordRow, stats: BackfillStats): Promise<void> {
  const suggestions = asArray(row.autocomplete_suggestions) ?? []
  if (suggestions.length === 0) return

  for (const s of suggestions) {
    const item = s as Record<string, unknown>
    const text = typeof item.text === 'string' ? item.text : null
    const position = typeof item.position === 'number' ? item.position : null
    if (!text || position === null) continue

    const result = await query(
      `INSERT INTO keyword_autocomplete
         (keyword, lang, country, position, text, source, fetched_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (keyword, lang, country, position) DO NOTHING`,
      [row.keyword, row.lang, row.country, position, text, row.autocomplete_source, row.fetched_at.toISOString()],
    )
    if ((result.rowCount ?? 0) > 0) stats.autocomplete++
  }
}

export async function runBackfill(opts?: {
  /** Restreint le scan à ces keywords (utile en tests). Défaut : tous. */
  keywordFilter?: string[]
}): Promise<BackfillStats> {
  const stats: BackfillStats = {
    rowsScanned: 0,
    serpResults: 0,
    serpScrapes: 0,
    paaQuestions: 0,
    autocomplete: 0,
    warnings: 0,
  }

  const res = opts?.keywordFilter
    ? await query<KeywordRow>(
        `SELECT keyword, lang, country, serp_raw_json, paa_questions,
                autocomplete_suggestions, autocomplete_source, fetched_at
           FROM keyword_metrics
          WHERE keyword = ANY($1::text[])
          ORDER BY keyword, lang, country`,
        [opts.keywordFilter],
      )
    : await query<KeywordRow>(
        `SELECT keyword, lang, country, serp_raw_json, paa_questions,
                autocomplete_suggestions, autocomplete_source, fetched_at
           FROM keyword_metrics
          ORDER BY keyword, lang, country`,
      )
  stats.rowsScanned = res.rows.length

  for (const row of res.rows) {
    try {
      await backfillSerpForRow(row, stats)
      await backfillPaaJsonbFallback(row, stats)
      await backfillAutocompleteForRow(row, stats)
    } catch (err) {
      log.warn(
        `[backfill] keyword="${row.keyword}" (${row.lang}/${row.country}) : ` +
          `failure during backfill — skip. Cause: ${(err as Error).message}`,
      )
      stats.warnings++
    }
  }

  return stats
}

async function main(): Promise<void> {
  log.info('[backfill] start')
  const stats = await runBackfill()
  log.info(
    `[backfill] done : rows=${stats.rowsScanned}, serpResults=${stats.serpResults}, ` +
      `serpScrapes=${stats.serpScrapes}, paaQuestions=${stats.paaQuestions}, ` +
      `autocomplete=${stats.autocomplete}, warnings=${stats.warnings}`,
  )
  await pool.end()
}

const isDirectRun = process.argv[1]?.endsWith('backfill-keyword-serp.ts')
if (isDirectRun) {
  main().catch((err) => {
    log.error('[backfill] failed:', err)
    process.exit(1)
  })
}
