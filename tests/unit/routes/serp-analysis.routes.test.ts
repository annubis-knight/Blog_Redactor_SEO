// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Mocks ---
vi.mock('../../../server/utils/logger', () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

// Story C1 (chantier 2) — la route appelle scrape-corpus.fetchAndPersist
// au lieu de analyzeSerpCompetitors. On mocke fetchAndPersist + on garde le
// mock de keyword-serp pour le cache check DB.
const mockFetchAndPersist = vi.fn()
vi.mock('../../../server/services/external/scrape-corpus.service', () => ({
  fetchAndPersist: (...args: unknown[]) => mockFetchAndPersist(...args),
}))

const mockGetSerpResultsFresh = vi.fn()
const mockReconstructSerp = vi.fn()
const mockGetSerpScrapes = vi.fn()

vi.mock('../../../server/services/keyword/keyword-serp.service', () => ({
  getSerpResultsFresh: (...args: unknown[]) => mockGetSerpResultsFresh(...args),
  reconstructSerpAnalysisResult: (...args: unknown[]) => mockReconstructSerp(...args),
  getSerpScrapes: (...args: unknown[]) => mockGetSerpScrapes(...args),
}))

import router from '../../../server/routes/serp-analysis.routes'

// --- Minimal Express helpers ---
function makeReq(body: Record<string, unknown> = {}) {
  return { body } as any
}

function makeRes() {
  const res: any = {
    statusCode: 200,
    jsonData: null,
  }
  res.json = vi.fn((data: unknown) => { res.jsonData = data; return res })
  res.status = vi.fn((code: number) => { res.statusCode = code; return res })
  return res
}

function getHandler() {
  const layer = (router as any).stack.find(
    (l: any) => l.route?.path === '/serp/analyze' && l.route?.methods?.post,
  )
  return layer?.route?.stack?.[0]?.handle
}

const MOCK_SCRAPE_RESULT = {
  keyword: 'seo',
  lang: 'fr',
  country: 'fr',
  fromCache: null as 'memory' | 'db' | null,
  scrapedAt: '2026-03-31T00:00:00.000Z',
  serpResults: [
    {
      keyword: 'seo', lang: 'fr', country: 'fr',
      position: 1, title: 'Page 1',
      url: 'https://example.com/1', domain: 'example.com',
      fetchedAt: '2026-03-31T00:00:00.000Z',
    },
  ],
  scrapes: [
    {
      keyword: 'seo', lang: 'fr', country: 'fr',
      position: 1, url: 'https://example.com/1',
      headings: [], textContent: 'text', isBlog: null,
      scrapedAt: '2026-03-31T00:00:00.000Z',
    },
  ],
  paaQuestions: [
    {
      id: 1, keyword: 'seo', lang: 'fr', country: 'fr',
      question: 'What is SEO?', answer: 'SEO is...', depth: 1, parentQuestion: null,
      fetchedAt: '2026-03-31T00:00:00.000Z',
    },
  ],
}

beforeEach(() => {
  vi.clearAllMocks()
  mockFetchAndPersist.mockResolvedValue(MOCK_SCRAPE_RESULT)
  // Default cache miss → fallthrough to scrape-corpus.fetchAndPersist.
  mockGetSerpResultsFresh.mockResolvedValue(null)
  mockReconstructSerp.mockResolvedValue(null)
  mockGetSerpScrapes.mockResolvedValue([])
})

describe('POST /api/serp/analyze', () => {
  it('route handler exists', () => {
    expect(getHandler()).toBeDefined()
  })

  it('returns 400 if keyword is missing', async () => {
    const handler = getHandler()
    const req = makeReq({ topN: 10 })
    const res = makeRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.jsonData).toEqual(expect.objectContaining({
      error: expect.objectContaining({ code: 'VALIDATION_ERROR' }),
    }))
  })

  it('returns 400 if keyword is empty string', async () => {
    const handler = getHandler()
    const req = makeReq({ keyword: '' })
    const res = makeRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('calls scrape-corpus with validated body (Story C1)', async () => {
    const handler = getHandler()
    const req = makeReq({ keyword: 'seo local', topN: 5, articleLevel: 'pilier' })
    const res = makeRes()
    await handler(req, res)
    expect(mockFetchAndPersist).toHaveBeenCalledWith('seo local', 'pilier')
  })

  it('uses default articleLevel when not provided', async () => {
    const handler = getHandler()
    const req = makeReq({ keyword: 'seo' })
    const res = makeRes()
    await handler(req, res)
    expect(mockFetchAndPersist).toHaveBeenCalledWith('seo', 'intermediaire')
  })

  it('returns { data: SerpAnalysisResult } reconstructed from scrape-corpus result', async () => {
    const handler = getHandler()
    const req = makeReq({ keyword: 'seo' })
    const res = makeRes()
    await handler(req, res)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          keyword: 'seo',
          articleLevel: 'intermediaire',
          competitors: expect.arrayContaining([
            expect.objectContaining({
              position: 1,
              url: 'https://example.com/1',
              domain: 'example.com',
              textContent: 'text',
              headings: [],
            }),
          ]),
          paaQuestions: [{ question: 'What is SEO?', answer: 'SEO is...' }],
          maxScraped: 1,
          fromCache: false,
        }),
      }),
    )
  })

  it('AC.C1.x — fromCache=true quand scrape-corpus retourne fromCache="memory"|"db"', async () => {
    mockFetchAndPersist.mockResolvedValue({ ...MOCK_SCRAPE_RESULT, fromCache: 'memory' })
    const handler = getHandler()
    const req = makeReq({ keyword: 'seo' })
    const res = makeRes()
    await handler(req, res)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ fromCache: true }),
      }),
    )
  })

  it('returns 500 on scrape-corpus error', async () => {
    mockFetchAndPersist.mockRejectedValue(new Error('DataForSEO failed'))
    const handler = getHandler()
    const req = makeReq({ keyword: 'seo' })
    const res = makeRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.jsonData).toEqual(expect.objectContaining({
      error: expect.objectContaining({ code: 'INTERNAL_ERROR' }),
    }))
  })

  it('validates topN range (rejects < 3)', async () => {
    const handler = getHandler()
    const req = makeReq({ keyword: 'seo', topN: 1 })
    const res = makeRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('validates topN range (rejects > 10)', async () => {
    const handler = getHandler()
    const req = makeReq({ keyword: 'seo', topN: 15 })
    const res = makeRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('validates articleLevel enum', async () => {
    const handler = getHandler()
    const req = makeReq({ keyword: 'seo', articleLevel: 'invalid' })
    const res = makeRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('AC.C2.1 cache hit (fresh keyword_serp_results) → fromCache:true, no scrape-corpus fetch', async () => {
    mockGetSerpResultsFresh.mockResolvedValue([{ position: 1, url: 'https://example.com/1' }])
    mockReconstructSerp.mockResolvedValue({
      keyword: 'seo',
      competitors: [
        { position: 1, title: 'P1', url: 'https://example.com/1', domain: 'example.com', headings: [], textContent: '', isBlog: null },
      ],
      paaQuestions: [],
      maxScraped: 1,
      cachedAt: '2026-05-08T00:00:00.000Z',
      fromCache: true,
    })
    const handler = getHandler()
    const req = makeReq({ keyword: 'seo' })
    const res = makeRes()
    await handler(req, res)
    expect(mockFetchAndPersist).not.toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ fromCache: true }) }),
    )
  })

  it('AC.C1.2 cache miss (stale or empty) → scrape-corpus.fetchAndPersist called once (NFR-INT-SERP-ONCE)', async () => {
    mockGetSerpResultsFresh.mockResolvedValue(null)
    const handler = getHandler()
    const req = makeReq({ keyword: 'seo' })
    const res = makeRes()
    await handler(req, res)
    expect(mockFetchAndPersist).toHaveBeenCalledTimes(1)
  })
})
