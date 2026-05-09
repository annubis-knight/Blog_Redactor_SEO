// @vitest-environment node
/**
 * Sprint keyword-metrics-decomposition — Story A2 : backfill serp_raw_json → 4 tables.
 *
 * Test d'intégration sur DB locale. Couvre AC.A2.1 à A2.7 :
 *   - comptage avant/après (jsonb_array_length === COUNT keyword_serp_results)
 *   - cas typique (10 competitors complets) → 10 keyword_serp_scrapes
 *   - cas partiel (sans textContent) → text_content NULL
 *   - cas paa_questions JSONB seul → keyword_paa_questions peuplée
 *   - cas autocomplete_suggestions seul → keyword_autocomplete peuplée
 *   - idempotence : double exécution = mêmes counts
 *   - payload malformé → log warn + continue
 *
 * Préreq : DDL appliqué (Story A1) + colonne serp_raw_json présente.
 *
 * Conservé après archivage du script jetable : sert de filet de régression.
 */
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { pool, query } from '../../server/db/client.js'
import { runBackfill } from '../../scripts/backfill-keyword-serp.js'

const FIXTURE_KEYWORDS = [
  '__test_a2_complete__',
  '__test_a2_partial__',
  '__test_a2_paa_only__',
  '__test_a2_autocomplete_only__',
  '__test_a2_malformed__',
]

const LANG = 'fr'
const COUNTRY = 'fr'

async function clearFixtures(): Promise<void> {
  await query(
    `DELETE FROM keyword_metrics WHERE keyword = ANY($1::text[])`,
    [FIXTURE_KEYWORDS],
  )
}

async function insertKeywordMetrics(
  keyword: string,
  patch: {
    serpRawJson?: unknown
    paaQuestions?: unknown
    autocompleteSuggestions?: unknown
    autocompleteSource?: string | null
  },
): Promise<void> {
  await query(
    `INSERT INTO keyword_metrics
       (keyword, lang, country, serp_raw_json, paa_questions,
        autocomplete_suggestions, autocomplete_source, fetched_at)
     VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb, $7, NOW())`,
    [
      keyword,
      LANG,
      COUNTRY,
      patch.serpRawJson === undefined ? null : JSON.stringify(patch.serpRawJson),
      patch.paaQuestions === undefined ? '[]' : JSON.stringify(patch.paaQuestions),
      patch.autocompleteSuggestions === undefined ? '[]' : JSON.stringify(patch.autocompleteSuggestions),
      patch.autocompleteSource ?? null,
    ],
  )
}

beforeEach(async () => {
  await clearFixtures()
})

afterAll(async () => {
  await clearFixtures()
  await pool.end()
})

function buildSerpRawJson(opts: {
  competitors: number
  withScrapes?: boolean
  paaCount?: number
}) {
  const competitors = []
  for (let i = 1; i <= opts.competitors; i++) {
    const c: Record<string, unknown> = {
      position: i,
      url: `https://example.test/${i}`,
      title: `Result ${i}`,
      domain: 'example.test',
    }
    if (opts.withScrapes) {
      c.headings = [{ level: 1, text: `H1 #${i}` }, { level: 2, text: `H2 #${i}` }]
      c.textContent = `Long text content for position ${i}`
      c.isBlog = i % 2 === 0
    }
    competitors.push(c)
  }
  const paaQuestions: Array<Record<string, unknown>> = []
  for (let i = 0; i < (opts.paaCount ?? 0); i++) {
    paaQuestions.push({ question: `Q ${i}`, answer: `A ${i}`, depth: 1 })
  }
  return { competitors, paaQuestions }
}

describe('A2 — backfill happy path', () => {
  it('AC.A2.1 + AC.A2.2 : 10 competitors → 10 serp_results et 10 serp_scrapes', async () => {
    const keyword = '__test_a2_complete__'
    const payload = buildSerpRawJson({ competitors: 10, withScrapes: true, paaCount: 3 })
    await insertKeywordMetrics(keyword, { serpRawJson: payload })

    const stats = await runBackfill({ keywordFilter: FIXTURE_KEYWORDS })
    expect(stats.rowsScanned).toBe(1)

    const results = await query(
      `SELECT COUNT(*)::int AS n FROM keyword_serp_results WHERE keyword = $1`,
      [keyword],
    )
    expect(results.rows[0].n).toBe(10)

    const scrapes = await query(
      `SELECT COUNT(*)::int AS n FROM keyword_serp_scrapes WHERE keyword = $1`,
      [keyword],
    )
    expect(scrapes.rows[0].n).toBe(10)

    const paa = await query(
      `SELECT COUNT(*)::int AS n FROM keyword_paa_questions WHERE keyword = $1`,
      [keyword],
    )
    expect(paa.rows[0].n).toBe(3)
  })

  it('AC.A2.3 : payload partiel sans textContent → text_content NULL', async () => {
    const keyword = '__test_a2_partial__'
    const payload = {
      competitors: [
        {
          position: 1,
          url: 'https://example.test/1',
          title: 'Partial',
          domain: 'example.test',
          headings: [{ level: 1, text: 'H1' }],
          // textContent absent → null
          // isBlog absent → null
        },
      ],
    }
    await insertKeywordMetrics(keyword, { serpRawJson: payload })
    await runBackfill({ keywordFilter: FIXTURE_KEYWORDS })

    const scrapes = await query<{ text_content: string | null; is_blog: boolean | null }>(
      `SELECT text_content, is_blog FROM keyword_serp_scrapes WHERE keyword = $1`,
      [keyword],
    )
    expect(scrapes.rowCount).toBe(1)
    expect(scrapes.rows[0].text_content).toBeNull()
    expect(scrapes.rows[0].is_blog).toBeNull()
  })

  it('AC.A2.4 : paa_questions JSONB seul (pas de serp_raw_json) → keyword_paa_questions peuplée', async () => {
    const keyword = '__test_a2_paa_only__'
    await insertKeywordMetrics(keyword, {
      serpRawJson: undefined,
      paaQuestions: [
        { question: 'How to backfill?', answer: 'With a script.', depth: 1 },
        { question: 'Why decompose?', answer: 'For perf.', depth: 1 },
      ],
    })

    await runBackfill({ keywordFilter: FIXTURE_KEYWORDS })

    const paa = await query<{ question: string }>(
      `SELECT question FROM keyword_paa_questions WHERE keyword = $1 ORDER BY question`,
      [keyword],
    )
    expect(paa.rowCount).toBe(2)
  })

  it('AC.A2.5 : autocomplete_suggestions → keyword_autocomplete', async () => {
    const keyword = '__test_a2_autocomplete_only__'
    await insertKeywordMetrics(keyword, {
      autocompleteSuggestions: [
        { text: 'first suggestion', position: 1 },
        { text: 'second suggestion', position: 2 },
      ],
      autocompleteSource: 'google',
    })

    await runBackfill({ keywordFilter: FIXTURE_KEYWORDS })

    const auto = await query<{ position: number; text: string; source: string }>(
      `SELECT position, text, source FROM keyword_autocomplete WHERE keyword = $1 ORDER BY position`,
      [keyword],
    )
    expect(auto.rowCount).toBe(2)
    expect(auto.rows[0]).toMatchObject({ position: 1, text: 'first suggestion', source: 'google' })
  })

  it('AC.A2.6 : idempotence (double run = mêmes counts)', async () => {
    const keyword = '__test_a2_complete__'
    const payload = buildSerpRawJson({ competitors: 5, withScrapes: true, paaCount: 2 })
    await insertKeywordMetrics(keyword, { serpRawJson: payload })

    await runBackfill({ keywordFilter: FIXTURE_KEYWORDS })
    const firstResults = await query(
      `SELECT COUNT(*)::int AS n FROM keyword_serp_results WHERE keyword = $1`,
      [keyword],
    )
    const firstScrapes = await query(
      `SELECT COUNT(*)::int AS n FROM keyword_serp_scrapes WHERE keyword = $1`,
      [keyword],
    )

    // Second run
    const stats2 = await runBackfill({ keywordFilter: FIXTURE_KEYWORDS })
    const secondResults = await query(
      `SELECT COUNT(*)::int AS n FROM keyword_serp_results WHERE keyword = $1`,
      [keyword],
    )
    const secondScrapes = await query(
      `SELECT COUNT(*)::int AS n FROM keyword_serp_scrapes WHERE keyword = $1`,
      [keyword],
    )

    expect(secondResults.rows[0].n).toBe(firstResults.rows[0].n)
    expect(secondScrapes.rows[0].n).toBe(firstScrapes.rows[0].n)
    // Le 2e run ne doit pas avoir inséré de nouvelles lignes
    expect(stats2.serpResults).toBe(0)
    expect(stats2.serpScrapes).toBe(0)
  })

  it('AC.A2.7 : payload malformé (competitors null) → log warn + continue', async () => {
    const keyword = '__test_a2_malformed__'
    await insertKeywordMetrics(keyword, { serpRawJson: { competitors: null } })

    const stats = await runBackfill({ keywordFilter: FIXTURE_KEYWORDS })
    expect(stats.warnings).toBeGreaterThanOrEqual(1)

    const results = await query(
      `SELECT COUNT(*)::int AS n FROM keyword_serp_results WHERE keyword = $1`,
      [keyword],
    )
    expect(results.rows[0].n).toBe(0)
  })
})

describe('A2 — count consistency', () => {
  it('AC.A2.1 : COUNT(serp_results) === jsonb_array_length(competitors)', async () => {
    const keyword = '__test_a2_complete__'
    const payload = buildSerpRawJson({ competitors: 7, withScrapes: false, paaCount: 0 })
    await insertKeywordMetrics(keyword, { serpRawJson: payload })

    await runBackfill({ keywordFilter: FIXTURE_KEYWORDS })

    const consistency = await query<{ jsonb_count: number; row_count: number }>(
      `SELECT
          jsonb_array_length(serp_raw_json -> 'competitors') AS jsonb_count,
          (SELECT COUNT(*)::int FROM keyword_serp_results r
            WHERE r.keyword = km.keyword AND r.lang = km.lang AND r.country = km.country) AS row_count
         FROM keyword_metrics km
        WHERE keyword = $1`,
      [keyword],
    )
    expect(consistency.rows[0].jsonb_count).toBe(7)
    expect(consistency.rows[0].row_count).toBe(7)
  })
})
