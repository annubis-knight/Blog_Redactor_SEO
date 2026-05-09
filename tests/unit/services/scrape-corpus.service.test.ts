// @vitest-environment node
/**
 * Story A1 — TDD scrape-corpus.service.ts
 *
 * Couvre AC.A1.1 → AC.A1.8 du tech-spec decouplage-lieutenants-lexique.
 * Discipline : tests rouges écrits AVANT l'implémentation.
 */
import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest'

// --- Mocks ---
vi.mock('../../../server/utils/logger', () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const mockFetchSerp = vi.fn()
const mockFetchPaa = vi.fn()
vi.mock('../../../server/services/external/dataforseo.service', () => ({
  fetchSerp: (...args: unknown[]) => mockFetchSerp(...args),
  fetchPaa: (...args: unknown[]) => mockFetchPaa(...args),
}))

const mockGetSerpResultsFresh = vi.fn()
const mockReconstructSerpAnalysisResult = vi.fn()
const mockUpsertSerpResults = vi.fn()
const mockUpsertSerpScrapes = vi.fn()
const mockUpsertPaaQuestions = vi.fn()
const mockGetPaaQuestions = vi.fn()
const mockWithSerpTransaction = vi.fn(async (fn: (client: unknown) => Promise<unknown>) => {
  const fakeClient = { query: vi.fn(async () => ({ rowCount: 1 })) }
  return fn(fakeClient)
})

vi.mock('../../../server/services/keyword/keyword-serp.service', () => ({
  getSerpResultsFresh: (...args: unknown[]) => mockGetSerpResultsFresh(...args),
  reconstructSerpAnalysisResult: (...args: unknown[]) => mockReconstructSerpAnalysisResult(...args),
  upsertSerpResults: (...args: unknown[]) => mockUpsertSerpResults(...args),
  upsertSerpScrapes: (...args: unknown[]) => mockUpsertSerpScrapes(...args),
  upsertPaaQuestions: (...args: unknown[]) => mockUpsertPaaQuestions(...args),
  getPaaQuestions: (...args: unknown[]) => mockGetPaaQuestions(...args),
  withSerpTransaction: (fn: (client: unknown) => Promise<unknown>) => mockWithSerpTransaction(fn),
}))

const mockQuery = vi.fn()
vi.mock('../../../server/db/client', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
  pool: {},
}))

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

import {
  fetchAndPersist,
  getHeadings,
  getTextContent,
  getPaaQuestions,
  __resetMemoryCacheForTests,
  __getMemoryCacheSizeForTests,
  MEMORY_CACHE_TTL_MS,
  MEMORY_CACHE_MAX_ENTRIES,
} from '../../../server/services/external/scrape-corpus.service.js'

const TEN_SERP = Array.from({ length: 10 }, (_, i) => ({
  position: i + 1,
  title: `Title ${i + 1}`,
  url: `https://example.com/${i + 1}`,
  description: '',
  domain: 'example.com',
}))

const HTML_FIXTURE = '<html><body><h1>T</h1><h2>S</h2><p>Body content</p></body></html>'

beforeEach(() => {
  __resetMemoryCacheForTests()
  vi.clearAllMocks()

  mockFetchSerp.mockResolvedValue(TEN_SERP)
  mockFetchPaa.mockResolvedValue([{ question: 'Q1', answer: 'A1' }])
  mockGetSerpResultsFresh.mockResolvedValue(null)
  mockReconstructSerpAnalysisResult.mockResolvedValue(null)
  mockGetPaaQuestions.mockResolvedValue([])
  mockUpsertSerpResults.mockResolvedValue(undefined)
  mockUpsertSerpScrapes.mockResolvedValue(undefined)
  mockUpsertPaaQuestions.mockResolvedValue(undefined)
  mockQuery.mockResolvedValue({ rows: [] })
  mockFetch.mockResolvedValue({
    ok: true,
    text: async () => HTML_FIXTURE,
  })
})

afterAll(() => {
  __resetMemoryCacheForTests()
})

// --- AC.A1.1 ---------------------------------------------------------------

describe('fetchAndPersist — fresh fetch (AC.A1.1)', () => {
  it('kw vierge → 10 serpResults, 10 scrapes, fromCache=null, fetchPageHtml ×10', async () => {
    const result = await fetchAndPersist('seo', 'pilier')

    expect(result.serpResults).toHaveLength(10)
    expect(result.scrapes).toHaveLength(10)
    expect(result.fromCache).toBeNull()
    expect(mockFetch).toHaveBeenCalledTimes(10)
    expect(mockFetchSerp).toHaveBeenCalledWith('seo')
    expect(mockFetchPaa).toHaveBeenCalledWith('seo')
    expect(mockUpsertSerpResults).toHaveBeenCalledTimes(1)
    expect(mockUpsertSerpScrapes).toHaveBeenCalledTimes(1)
  })
})

// --- AC.A1.2 ---------------------------------------------------------------

describe('fetchAndPersist — memory cache hit (AC.A1.2)', () => {
  it('cache mémoire <1h → fromCache="memory" et 0 fetch', async () => {
    // Premier appel : fetch externe → hydrate cache mémoire
    await fetchAndPersist('seo', 'pilier')
    expect(mockFetch).toHaveBeenCalledTimes(10)

    vi.clearAllMocks()
    mockFetchSerp.mockResolvedValue(TEN_SERP)
    mockFetchPaa.mockResolvedValue([])
    mockGetSerpResultsFresh.mockResolvedValue(null)

    // 2ème appel < 1h plus tard
    const result2 = await fetchAndPersist('seo', 'pilier')
    expect(result2.fromCache).toBe('memory')
    expect(mockFetch).not.toHaveBeenCalled()
    expect(mockFetchSerp).not.toHaveBeenCalled()
    expect(mockFetchPaa).not.toHaveBeenCalled()
  })
})

// --- AC.A1.3 ---------------------------------------------------------------

describe('fetchAndPersist — DB freshness hit (AC.A1.3)', () => {
  it('DB fraîche + cache mémoire vide → fromCache="db", 0 fetch externe, cache hydraté', async () => {
    const dbSerpResults = TEN_SERP.map((s) => ({
      keyword: 'seo',
      lang: 'fr',
      country: 'fr',
      position: s.position,
      url: s.url,
      title: s.title,
      domain: s.domain,
      fetchedAt: new Date().toISOString(),
    }))
    mockGetSerpResultsFresh.mockResolvedValue(dbSerpResults)
    mockReconstructSerpAnalysisResult.mockResolvedValue({
      keyword: 'seo',
      competitors: TEN_SERP.map((s) => ({
        position: s.position,
        title: s.title,
        url: s.url,
        domain: s.domain,
        headings: [{ level: 1, text: 'H1' }],
        textContent: 'body',
        isBlog: false,
      })),
      paaQuestions: [],
      maxScraped: 10,
      cachedAt: new Date().toISOString(),
      fromCache: true,
    })

    const result = await fetchAndPersist('seo', 'pilier')

    expect(result.fromCache).toBe('db')
    expect(mockFetch).not.toHaveBeenCalled()
    expect(mockFetchSerp).not.toHaveBeenCalled()
    expect(mockFetchPaa).not.toHaveBeenCalled()

    // 2ème appel doit hit le cache mémoire (hydraté par le DB hit)
    vi.clearAllMocks()
    mockGetSerpResultsFresh.mockResolvedValue(dbSerpResults)
    const result2 = await fetchAndPersist('seo', 'pilier')
    expect(result2.fromCache).toBe('memory')
    expect(mockGetSerpResultsFresh).not.toHaveBeenCalled()
  })
})

// --- AC.A1.4 ---------------------------------------------------------------

describe('fetchAndPersist — LRU eviction (AC.A1.4)', () => {
  it(`insertion de ${MEMORY_CACHE_MAX_ENTRIES + 1} entrées → la 1ère est éjectée`, async () => {
    expect(__getMemoryCacheSizeForTests()).toBe(0)

    for (let i = 0; i < MEMORY_CACHE_MAX_ENTRIES; i++) {
      await fetchAndPersist(`kw-${i}`, 'pilier')
    }
    expect(__getMemoryCacheSizeForTests()).toBe(MEMORY_CACHE_MAX_ENTRIES)

    // Insertion de la (MAX+1)ème entrée
    await fetchAndPersist(`kw-${MEMORY_CACHE_MAX_ENTRIES}`, 'pilier')
    expect(__getMemoryCacheSizeForTests()).toBe(MEMORY_CACHE_MAX_ENTRIES)

    // Le 2ème appel sur kw-0 doit re-fetch (éjecté)
    vi.clearAllMocks()
    mockFetchSerp.mockResolvedValue(TEN_SERP)
    mockFetchPaa.mockResolvedValue([])
    mockGetSerpResultsFresh.mockResolvedValue(null)
    const result = await fetchAndPersist('kw-0', 'pilier')
    expect(result.fromCache).toBeNull()
    expect(mockFetchSerp).toHaveBeenCalled()
  })

  it('TTL expiration : entrée > 1h évincée du cache', async () => {
    await fetchAndPersist('seo', 'pilier')

    // Avance le temps de 61 min
    const now = Date.now()
    vi.spyOn(Date, 'now').mockReturnValue(now + 61 * 60 * 1000)

    vi.clearAllMocks()
    mockFetchSerp.mockResolvedValue(TEN_SERP)
    mockFetchPaa.mockResolvedValue([])
    mockGetSerpResultsFresh.mockResolvedValue(null)

    const result = await fetchAndPersist('seo', 'pilier')
    expect(result.fromCache).toBeNull()
    expect(mockFetchSerp).toHaveBeenCalledTimes(1)

    vi.restoreAllMocks()
  })
})

// --- AC.A1.5 ---------------------------------------------------------------

describe('getHeadings — SQL scope (AC.A1.5)', () => {
  it('SELECT inclut headings/is_blog/domain mais PAS text_content', async () => {
    mockQuery.mockResolvedValue({ rows: [] })
    await getHeadings('seo')

    expect(mockQuery).toHaveBeenCalledTimes(1)
    const sql = mockQuery.mock.calls[0][0] as string
    expect(sql).toContain('keyword_serp_scrapes')
    expect(sql).toContain('headings')
    expect(sql).toContain('is_blog')
    expect(sql).not.toMatch(/text_content/)
  })

  it('passe keyword/lang/country en paramètres', async () => {
    mockQuery.mockResolvedValue({ rows: [] })
    await getHeadings('seo', 'fr', 'fr')
    const params = mockQuery.mock.calls[0][1]
    expect(params).toEqual(['seo', 'fr', 'fr'])
  })
})

// --- AC.A1.6 ---------------------------------------------------------------

describe('getTextContent — SQL scope (AC.A1.6)', () => {
  it('SELECT inclut text_content mais PAS headings/is_blog', async () => {
    mockQuery.mockResolvedValue({ rows: [] })
    await getTextContent('seo')

    const sql = mockQuery.mock.calls[0][0] as string
    expect(sql).toContain('keyword_serp_scrapes')
    expect(sql).toContain('text_content')
    expect(sql).not.toMatch(/\bheadings\b/)
    expect(sql).not.toMatch(/\bis_blog\b/)
  })

  it('retourne mapping {position, url, textContent}', async () => {
    mockQuery.mockResolvedValue({
      rows: [
        { position: 1, url: 'https://example.com/1', text_content: 'body 1' },
        { position: 2, url: 'https://example.com/2', text_content: null },
      ],
    })
    const out = await getTextContent('seo')
    expect(out).toEqual([
      { position: 1, url: 'https://example.com/1', textContent: 'body 1' },
      { position: 2, url: 'https://example.com/2', textContent: null },
    ])
  })
})

// --- AC.A1.7 ---------------------------------------------------------------

describe('empty DB → empty array (AC.A1.7)', () => {
  it('getHeadings retourne [] si DB vide', async () => {
    mockQuery.mockResolvedValue({ rows: [] })
    expect(await getHeadings('inconnu')).toEqual([])
  })

  it('getTextContent retourne [] si DB vide', async () => {
    mockQuery.mockResolvedValue({ rows: [] })
    expect(await getTextContent('inconnu')).toEqual([])
  })
})

// --- getPaaQuestions wrapper -----------------------------------------------

describe('getPaaQuestions — délégation à keyword-serp.service', () => {
  it('appelle keyword-serp.service.getPaaQuestions et retourne ses lignes', async () => {
    const fakePaa = [{
      id: 1, keyword: 'seo', lang: 'fr', country: 'fr',
      question: 'Q', answer: 'A', depth: 1, parentQuestion: null,
      fetchedAt: new Date().toISOString(),
    }]
    mockGetPaaQuestions.mockResolvedValue(fakePaa)
    const out = await getPaaQuestions('seo')
    expect(out).toEqual(fakePaa)
    expect(mockGetPaaQuestions).toHaveBeenCalledWith('seo', 'fr', 'fr')
  })
})

// --- AC.A1.8 ---------------------------------------------------------------

describe('header AUTHORITY (AC.A1.8)', () => {
  it('le fichier source contient un header AUTHORITY conforme', async () => {
    const { readFile } = await import('node:fs/promises')
    const { fileURLToPath } = await import('node:url')
    const path = fileURLToPath(new URL('../../../server/services/external/scrape-corpus.service.ts', import.meta.url))
    const src = await readFile(path, 'utf8')
    expect(src).toMatch(/AUTHORITY: PostgreSQL/)
    expect(src).toMatch(/keyword_serp_results/)
    expect(src).toMatch(/keyword_serp_scrapes/)
    expect(src).toMatch(/keyword_paa_questions/)
    expect(src).toMatch(/NEVER IMPORTS:.*tfidf.*lieutenants.*lexique/i)
    expect(src).toMatch(/MEMORY_CACHE_TTL_MS/)
  })
})

// --- Constantes exportées --------------------------------------------------

describe('constantes exportées', () => {
  it('MEMORY_CACHE_TTL_MS = 1h', () => {
    expect(MEMORY_CACHE_TTL_MS).toBe(60 * 60 * 1000)
  })
  it('MEMORY_CACHE_MAX_ENTRIES = 100', () => {
    expect(MEMORY_CACHE_MAX_ENTRIES).toBe(100)
  })
})
