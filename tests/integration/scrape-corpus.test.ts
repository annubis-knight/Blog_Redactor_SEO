// @vitest-environment node
/**
 * Story A2 — tests d'intégration scrape-corpus.service.ts (DB locale + mocks externes).
 *
 * Couvre :
 *   - AC.SCRAPE.2 : cache mémoire 1h → 2ème call = 0 fetch HTTP.
 *   - AC.SCRAPE.3 : keyword vierge → 10 fetchs en parallèle + 10 rows persistées.
 *   - AC.SCRAPE.4 : 1 URL 404 sur 10 → row créée avec headings=[] / text_content=null.
 *   - AC.SCRAPE.5 : getHeadings et getTextContent sont 2 fonctions distinctes.
 */
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { pool, query } from '../../server/db/client.js'

const FIXTURE_KEYWORD = '__test_a2_scrape_corpus__'

vi.mock('../../server/services/external/dataforseo.service.js', () => ({
  fetchSerp: vi.fn(async () =>
    Array.from({ length: 10 }, (_, i) => ({
      position: i + 1,
      title: `Title ${i + 1}`,
      url: `https://a2-test.example/${i + 1}`,
      domain: 'a2-test.example',
      description: '',
    })),
  ),
  fetchPaa: vi.fn(async () => [
    { question: 'Why?', answer: 'Because.' },
  ]),
}))

const HTML_OK = '<html><body><h1>T</h1><h2>S</h2><p>scrape body content</p></body></html>'

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
  // Reset le cache mémoire entre runs (G5 sprint-plan).
  const { __resetMemoryCacheForTests } = await import('../../server/services/external/scrape-corpus.service.js')
  __resetMemoryCacheForTests()
})

afterAll(async () => {
  globalThis.fetch = originalFetch
  await clean()
  await pool.end()
})

// --- AC.SCRAPE.3 -----------------------------------------------------------

describe('AC.SCRAPE.3 — kw vierge → 10 fetchs + 10 rows persistées', () => {
  it('10 fetchPageHtml en parallèle, persistance dans keyword_serp_scrapes', async () => {
    const { fetchAndPersist } = await import('../../server/services/external/scrape-corpus.service.js')
    const result = await fetchAndPersist(FIXTURE_KEYWORD, 'pilier')

    expect(result.fromCache).toBeNull()
    expect(result.serpResults).toHaveLength(10)
    expect(result.scrapes).toHaveLength(10)

    expect(globalThis.fetch as unknown as { mock: { calls: unknown[] } }).toBeDefined()
    expect((globalThis.fetch as unknown as { mock: { calls: unknown[] } }).mock.calls).toHaveLength(10)

    const dbResults = await query<{ url: string }>(
      `SELECT url FROM keyword_serp_results WHERE keyword = $1 ORDER BY position`,
      [FIXTURE_KEYWORD],
    )
    expect(dbResults.rows).toHaveLength(10)

    const dbScrapes = await query<{ position: number; text_content: string | null }>(
      `SELECT position, text_content FROM keyword_serp_scrapes WHERE keyword = $1 ORDER BY position`,
      [FIXTURE_KEYWORD],
    )
    expect(dbScrapes.rows).toHaveLength(10)
    expect(dbScrapes.rows.every(r => r.text_content && r.text_content.length > 0)).toBe(true)
  })
})

// --- AC.SCRAPE.2 -----------------------------------------------------------

describe('AC.SCRAPE.2 — cache mémoire 1h → 2ème call = 0 fetch HTTP', () => {
  it('1er call fetch externe, 2ème call hit mémoire (0 fetch)', async () => {
    const { fetchAndPersist } = await import('../../server/services/external/scrape-corpus.service.js')

    const r1 = await fetchAndPersist(FIXTURE_KEYWORD, 'pilier')
    expect(r1.fromCache).toBeNull()
    expect((globalThis.fetch as unknown as { mock: { calls: unknown[] } }).mock.calls).toHaveLength(10)

    const fetchMock = globalThis.fetch as unknown as { mock: { calls: unknown[]; mockClear: () => void } }
    fetchMock.mockClear()

    const r2 = await fetchAndPersist(FIXTURE_KEYWORD, 'pilier')
    expect(r2.fromCache).toBe('memory')
    expect(fetchMock.mock.calls).toHaveLength(0)
  })
})

// --- AC.SCRAPE.4 -----------------------------------------------------------

describe('AC.SCRAPE.4 — 1 URL 404 sur 10 → row créée avec headings=[] / text_content=null', () => {
  it('mock 404 sur position 5, 9 autres OK', async () => {
    let call = 0
    globalThis.fetch = vi.fn(async (url: unknown) => {
      call++
      // Le 5ème appel échoue
      if (typeof url === 'string' && url.endsWith('/5')) {
        return { ok: false, status: 404, text: async () => '' } as unknown as Response
      }
      return { ok: true, status: 200, text: async () => HTML_OK } as unknown as Response
    }) as unknown as typeof fetch

    const { fetchAndPersist, __resetMemoryCacheForTests } = await import('../../server/services/external/scrape-corpus.service.js')
    __resetMemoryCacheForTests()
    const result = await fetchAndPersist(FIXTURE_KEYWORD, 'pilier')

    expect(result.scrapes).toHaveLength(10)
    const failedScrape = result.scrapes.find(s => s.position === 5)
    expect(failedScrape).toBeDefined()
    expect(failedScrape!.headings).toEqual([])
    expect(failedScrape!.textContent === '' || failedScrape!.textContent === null).toBe(true)

    const dbScrapes = await query<{ position: number; text_content: string | null; headings: unknown }>(
      `SELECT position, text_content, headings FROM keyword_serp_scrapes WHERE keyword = $1 ORDER BY position`,
      [FIXTURE_KEYWORD],
    )
    expect(dbScrapes.rows).toHaveLength(10)
    const failedRow = dbScrapes.rows.find(r => r.position === 5)
    expect(failedRow).toBeDefined()
    expect(failedRow!.text_content).toBeNull()
    expect(failedRow!.headings).toEqual([])

    expect(call).toBe(10)
  })
})

// --- AC.SCRAPE.5 -----------------------------------------------------------

describe('AC.SCRAPE.5 — getHeadings et getTextContent sont 2 fonctions distinctes', () => {
  it('signatures et identités séparées (pas un blob monolithique)', async () => {
    const mod = await import('../../server/services/external/scrape-corpus.service.js')
    expect(typeof mod.getHeadings).toBe('function')
    expect(typeof mod.getTextContent).toBe('function')
    expect(mod.getHeadings).not.toBe(mod.getTextContent)
  })
})
