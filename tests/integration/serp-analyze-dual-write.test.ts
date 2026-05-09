// @vitest-environment node
/**
 * Story B2 — tests d'intégration du dual-write SERP en transaction.
 *
 * Vérifie AC.B2.1 à B2.4 : un keyword fraîchement scrapé peuple à la
 * fois `keyword_metrics.serp_raw_json` (legacy) ET les 4 tables filles
 * (keyword_serp_results, keyword_serp_scrapes, keyword_paa_questions),
 * avec rollback intégral si une seule des écritures échoue.
 *
 * On mocke `fetchSerp`, `fetchPaa`, et `fetchPageHtml` côté serp-analysis
 * pour ne pas dépendre du réseau. La persistance, elle, est validée
 * sur la vraie DB locale (intégration).
 */
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { pool, query } from '../../server/db/client.js'

const FIXTURE_KEYWORD = '__test_b2_dualwrite__'

vi.mock('../../server/services/external/dataforseo.service.js', () => ({
  fetchSerp: vi.fn(async () =>
    Array.from({ length: 5 }, (_, i) => ({
      position: i + 1,
      title: `Title ${i + 1}`,
      url: `https://b2-test.example/${i + 1}`,
      domain: 'b2-test.example',
      description: '',
    })),
  ),
  fetchPaa: vi.fn(async () => [
    { question: 'Why dual-write?', answer: 'For atomicity.' },
    { question: 'How long?', answer: 'Until C4.' },
  ]),
}))

// Mock global fetch pour fetchPageHtml du service
const originalFetch = globalThis.fetch
beforeEach(async () => {
  await query(`DELETE FROM keyword_metrics WHERE keyword = $1`, [FIXTURE_KEYWORD])

  globalThis.fetch = vi.fn(async () => ({
    ok: true,
    status: 200,
    text: async () =>
      '<html><h1>Title</h1><h2>Sub</h2><p>Body content for tfidf</p></html>',
  })) as unknown as typeof fetch
})

afterAll(async () => {
  globalThis.fetch = originalFetch
  await query(`DELETE FROM keyword_metrics WHERE keyword = $1`, [FIXTURE_KEYWORD])
  await pool.end()
})

describe('B2 — happy path persist (post-C4 : 4 tables filles uniquement)', () => {
  it('un keyword vierge → 4 tables filles peuplées (no legacy serp_raw_json write)', async () => {
    const { analyzeSerpCompetitors } = await import('../../server/services/external/serp-analysis.service.js')
    await analyzeSerpCompetitors(FIXTURE_KEYWORD, 'COCON_SECONDAIRE')

    const newUrls = await query<{ url: string }>(
      `SELECT url FROM keyword_serp_results WHERE keyword = $1 ORDER BY position`,
      [FIXTURE_KEYWORD],
    )
    expect(newUrls.rows).toHaveLength(5)

    const scrapes = await query(
      `SELECT COUNT(*)::int AS n FROM keyword_serp_scrapes WHERE keyword = $1`,
      [FIXTURE_KEYWORD],
    )
    expect(scrapes.rows[0].n).toBe(5)

    const paa = await query(
      `SELECT COUNT(*)::int AS n FROM keyword_paa_questions WHERE keyword = $1`,
      [FIXTURE_KEYWORD],
    )
    expect(paa.rows[0].n).toBe(2)

    // AC.C4.4 — la row keyword_metrics existe (stub fetched_at) mais
    // serp_raw_json reste null (plus de dual-write legacy).
    const km = await query<{ serp_raw_json: unknown }>(
      `SELECT serp_raw_json FROM keyword_metrics WHERE keyword = $1`,
      [FIXTURE_KEYWORD],
    )
    expect(km.rowCount).toBe(1)
    expect(km.rows[0].serp_raw_json).toBeNull()
  })
})

describe('B2 — rollback transactionnel', () => {
  it('AC.B2.2 : injection erreur sur upsertSerpScrapes → aucune écriture (rollback)', async () => {
    vi.resetModules()

    vi.doMock('../../server/services/keyword/keyword-serp.service.js', async (importOriginal) => {
      const actual = await importOriginal<
        typeof import('../../server/services/keyword/keyword-serp.service.js')
      >()
      return {
        ...actual,
        upsertSerpScrapes: vi.fn(async () => {
          throw new Error('forced fault')
        }),
      }
    })

    const { analyzeSerpCompetitors } = await import('../../server/services/external/serp-analysis.service.js')

    await expect(analyzeSerpCompetitors(FIXTURE_KEYWORD, 'COCON_SECONDAIRE')).rejects.toThrow(/forced fault/)

    const km = await query(
      `SELECT 1 FROM keyword_metrics WHERE keyword = $1`,
      [FIXTURE_KEYWORD],
    )
    expect(km.rowCount).toBe(0)

    const results = await query(
      `SELECT 1 FROM keyword_serp_results WHERE keyword = $1`,
      [FIXTURE_KEYWORD],
    )
    expect(results.rowCount).toBe(0)

    vi.doUnmock('../../server/services/keyword/keyword-serp.service.js')
    vi.resetModules()
  })

})
