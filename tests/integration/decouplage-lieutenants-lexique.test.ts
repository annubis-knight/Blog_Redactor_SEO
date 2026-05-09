// @vitest-environment node
/**
 * Story D1 — tests d'intégration AC.DECOUPLAGE.* (NFR-MOT-LEXIQUE-DECOUPLAGE).
 *
 * Couvre :
 *   - AC.DECOUPLAGE.1 : Lexique sur kw vierge SANS Lieutenants → réussit.
 *   - AC.DECOUPLAGE.2 : Lieutenants sur kw vierge SANS Lexique → réussit.
 *   - AC.DECOUPLAGE.4 : cache mémoire partagé → 1 seul fetchPageHtml × 10
 *     pour 2 calls cross-service consécutifs (Lieutenants puis Lexique, ou
 *     Lexique puis Lieutenants).
 *   - AC.D1.5 : cache expiré (>1h) → re-fetch.
 *
 * AC.DECOUPLAGE.3 (no cross-import) est couvert par les tests architecturaux
 * permanents tests/unit/architecture/decouplage-lieutenants-lexique.test.ts.
 */
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { pool, query } from '../../server/db/client.js'

const FIXTURE_KEYWORD = '__test_d1_decouplage__'

vi.mock('../../server/services/external/dataforseo.service.js', () => ({
  fetchSerp: vi.fn(async () =>
    Array.from({ length: 10 }, (_, i) => ({
      position: i + 1,
      title: `Title ${i + 1}`,
      url: `https://d1-test.example/${i + 1}`,
      domain: 'd1-test.example',
      description: '',
    })),
  ),
  fetchPaa: vi.fn(async () => [
    { question: 'Why decouple?', answer: 'Because.' },
  ]),
}))

const HTML_OK = '<html><body><h1>T</h1><h2>S</h2><p>scrape body content for decouplage tests with enough words for tfidf to work properly</p></body></html>'

const originalFetch = globalThis.fetch

async function clean(): Promise<void> {
  await query(`DELETE FROM keyword_metrics WHERE keyword = $1`, [FIXTURE_KEYWORD])
}

beforeEach(async () => {
  await clean()
  globalThis.fetch = vi.fn(async () => ({
    ok: true,
    status: 200,
    text: async () => HTML_OK,
  })) as unknown as typeof fetch

  const { __resetMemoryCacheForTests } = await import(
    '../../server/services/external/scrape-corpus.service.js'
  )
  __resetMemoryCacheForTests()
})

afterAll(async () => {
  globalThis.fetch = originalFetch
  await clean()
  await pool.end()
})

// --- AC.DECOUPLAGE.1 -------------------------------------------------------

describe('AC.DECOUPLAGE.1 — Lexique sur kw vierge SANS Lieutenants', () => {
  it('analyzeLexique({triggerScrapeIfMissing: true}) réussit, sans appel à proposeLieutenants', async () => {
    const lieutenantsModule = await import(
      '../../server/services/keyword/lieutenants-analysis.service.js'
    )
    const proposeLieutenantsSpy = vi.spyOn(lieutenantsModule, 'proposeLieutenants')

    const { analyzeLexique } = await import(
      '../../server/services/keyword/lexique-analysis.service.js'
    )

    const result = await analyzeLexique(FIXTURE_KEYWORD, { triggerScrapeIfMissing: true })

    expect(result.tfidfResult).toBeDefined()
    expect(result.tfidfResult.totalCompetitors).toBe(10)
    expect(proposeLieutenantsSpy).not.toHaveBeenCalled()

    const dbScrapes = await query(
      `SELECT COUNT(*)::int AS n FROM keyword_serp_scrapes WHERE keyword = $1`,
      [FIXTURE_KEYWORD],
    )
    expect(dbScrapes.rows[0].n).toBe(10)

    proposeLieutenantsSpy.mockRestore()
  })
})

// --- AC.DECOUPLAGE.2 -------------------------------------------------------

describe('AC.DECOUPLAGE.2 — Lieutenants sur kw vierge SANS Lexique', () => {
  it('proposeLieutenants réussit, sans appel à analyzeLexique', async () => {
    const lexiqueModule = await import(
      '../../server/services/keyword/lexique-analysis.service.js'
    )
    const analyzeLexiqueSpy = vi.spyOn(lexiqueModule, 'analyzeLexique')

    const { proposeLieutenants } = await import(
      '../../server/services/keyword/lieutenants-analysis.service.js'
    )

    const result = await proposeLieutenants(FIXTURE_KEYWORD, 'pilier')

    expect(result.competitors).toHaveLength(10)
    expect(analyzeLexiqueSpy).not.toHaveBeenCalled()

    const dbScrapes = await query(
      `SELECT COUNT(*)::int AS n FROM keyword_serp_scrapes WHERE keyword = $1`,
      [FIXTURE_KEYWORD],
    )
    expect(dbScrapes.rows[0].n).toBe(10)

    analyzeLexiqueSpy.mockRestore()
  })
})

// --- AC.DECOUPLAGE.4 -------------------------------------------------------

describe('AC.DECOUPLAGE.4 — cache mémoire partagé Lieutenants ↔ Lexique', () => {
  it('Lieutenants puis Lexique → 1 seul scrape (10 fetchPageHtml total, pas 20)', async () => {
    const { proposeLieutenants } = await import(
      '../../server/services/keyword/lieutenants-analysis.service.js'
    )
    const { analyzeLexique } = await import(
      '../../server/services/keyword/lexique-analysis.service.js'
    )

    await proposeLieutenants(FIXTURE_KEYWORD, 'pilier')
    const fetchMock = globalThis.fetch as unknown as { mock: { calls: unknown[] } }
    expect(fetchMock.mock.calls).toHaveLength(10)

    const lexiqueResult = await analyzeLexique(FIXTURE_KEYWORD, { triggerScrapeIfMissing: true })

    expect(fetchMock.mock.calls).toHaveLength(10)
    expect(lexiqueResult.tfidfResult.totalCompetitors).toBe(10)
  })

  it('AC.D1.4 — inverse : Lexique puis Lieutenants → 10 total (cache mémoire dans les 2 sens)', async () => {
    const { analyzeLexique } = await import(
      '../../server/services/keyword/lexique-analysis.service.js'
    )
    const { proposeLieutenants } = await import(
      '../../server/services/keyword/lieutenants-analysis.service.js'
    )

    await analyzeLexique(FIXTURE_KEYWORD, { triggerScrapeIfMissing: true })
    const fetchMock = globalThis.fetch as unknown as { mock: { calls: unknown[] } }
    expect(fetchMock.mock.calls).toHaveLength(10)

    const lieutResult = await proposeLieutenants(FIXTURE_KEYWORD, 'pilier')

    expect(fetchMock.mock.calls).toHaveLength(10)
    expect(lieutResult.competitors).toHaveLength(10)
  })
})

// --- AC.D1.5 ---------------------------------------------------------------

describe('AC.D1.5 — cache expiré (>1h) → re-fetch', () => {
  it('avancement Date.now de 61min force le re-fetch', async () => {
    const { proposeLieutenants } = await import(
      '../../server/services/keyword/lieutenants-analysis.service.js'
    )
    const { analyzeLexique } = await import(
      '../../server/services/keyword/lexique-analysis.service.js'
    )

    await proposeLieutenants(FIXTURE_KEYWORD, 'pilier')
    const fetchMock = globalThis.fetch as unknown as { mock: { calls: unknown[] } }
    expect(fetchMock.mock.calls).toHaveLength(10)

    // Avance le temps de 61 min — cache mémoire expiré
    const now = Date.now()
    const dateSpy = vi.spyOn(Date, 'now').mockReturnValue(now + 61 * 60 * 1000)

    // Avance également la fetched_at de keyword_serp_results pour forcer la
    // reconstruction depuis le scrape externe (sinon, le cache DB 7j prend
    // le relais et le test ne reflète pas la réalité du cache mémoire seul).
    await query(
      `UPDATE keyword_serp_results SET fetched_at = fetched_at - INTERVAL '8 days'
        WHERE keyword = $1`,
      [FIXTURE_KEYWORD],
    )

    await analyzeLexique(FIXTURE_KEYWORD, { triggerScrapeIfMissing: true })

    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(20)

    dateSpy.mockRestore()
  })
})
