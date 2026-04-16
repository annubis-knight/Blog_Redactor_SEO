// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Mocks ---
vi.mock('../../../server/utils/logger', () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const mockReadCached = vi.fn()
vi.mock('../../../server/utils/cache', () => ({
  slugify: vi.fn((text: string) => text.toLowerCase().replace(/\s+/g, '-')),
  readCached: (...args: unknown[]) => mockReadCached(...args),
  isFresh: vi.fn().mockReturnValue(true),
  writeCached: vi.fn(),
}))

const mockExtractTfidf = vi.fn()
vi.mock('../../../server/services/keyword/tfidf.service', () => ({
  extractTfidf: (...args: unknown[]) => mockExtractTfidf(...args),
}))

const mockAnalyze = vi.fn()
vi.mock('../../../server/services/external/serp-analysis.service', () => ({
  analyzeSerpCompetitors: (...args: unknown[]) => mockAnalyze(...args),
  CACHE_DIR: '/mock/cache/serp',
}))

vi.mock('../../../shared/schemas/serp-analysis.schema', () => ({
  serpAnalyzeBodySchema: {
    safeParse: vi.fn().mockReturnValue({
      success: true,
      data: { keyword: 'seo', articleLevel: 'intermediaire' },
    }),
  },
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

function getTfidfHandler() {
  const layer = (router as any).stack.find(
    (l: any) => l.route?.path === '/serp/tfidf' && l.route?.methods?.post,
  )
  return layer?.route?.stack?.[0]?.handle
}

const MOCK_TFIDF_RESULT = {
  keyword: 'seo',
  totalCompetitors: 5,
  obligatoire: [{ term: 'seo', level: 'obligatoire', documentFrequency: 0.8, density: 4.2, competitorCount: 4, totalCompetitors: 5 }],
  differenciateur: [],
  optionnel: [],
}

const MOCK_CACHED_SERP = {
  data: {
    keyword: 'seo',
    articleLevel: 'intermediaire',
    competitors: [
      { position: 1, title: 'Page 1', url: 'https://example.com', domain: 'example.com', headings: [], textContent: 'seo content' },
    ],
    paaQuestions: [],
    maxScraped: 1,
    cachedAt: '2026-03-31T00:00:00.000Z',
    fromCache: false,
  },
  cachedAt: '2026-03-31T00:00:00.000Z',
}

beforeEach(() => {
  vi.clearAllMocks()
  mockReadCached.mockResolvedValue(MOCK_CACHED_SERP)
  mockExtractTfidf.mockReturnValue(MOCK_TFIDF_RESULT)
  mockAnalyze.mockResolvedValue(MOCK_CACHED_SERP.data)
})

describe('POST /api/serp/tfidf', () => {
  it('route handler exists', () => {
    expect(getTfidfHandler()).toBeDefined()
  })

  it('returns 400 if keyword is missing', async () => {
    const handler = getTfidfHandler()
    const req = makeReq({})
    const res = makeRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.jsonData).toEqual(expect.objectContaining({
      error: expect.objectContaining({ code: 'VALIDATION_ERROR' }),
    }))
  })

  it('returns 400 if keyword is empty string', async () => {
    const handler = getTfidfHandler()
    const req = makeReq({ keyword: '' })
    const res = makeRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('returns 400 if keyword is whitespace only', async () => {
    const handler = getTfidfHandler()
    const req = makeReq({ keyword: '   ' })
    const res = makeRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('returns 404 if cache is absent', async () => {
    mockReadCached.mockResolvedValue(null)
    const handler = getTfidfHandler()
    const req = makeReq({ keyword: 'seo' })
    const res = makeRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.jsonData).toEqual(expect.objectContaining({
      error: expect.objectContaining({ code: 'NOT_FOUND' }),
    }))
  })

  it('calls extractTfidf with cached competitors and keyword', async () => {
    const handler = getTfidfHandler()
    const req = makeReq({ keyword: 'seo' })
    const res = makeRes()
    await handler(req, res)
    expect(mockExtractTfidf).toHaveBeenCalledWith(
      MOCK_CACHED_SERP.data.competitors,
      'seo',
    )
  })

  it('returns { data: TfidfResult }', async () => {
    const handler = getTfidfHandler()
    const req = makeReq({ keyword: 'seo' })
    const res = makeRes()
    await handler(req, res)
    expect(res.json).toHaveBeenCalledWith({ data: MOCK_TFIDF_RESULT })
  })

  it('trims keyword before processing', async () => {
    const handler = getTfidfHandler()
    const req = makeReq({ keyword: '  seo local  ' })
    const res = makeRes()
    await handler(req, res)
    expect(mockExtractTfidf).toHaveBeenCalledWith(
      expect.any(Array),
      'seo local',
    )
  })

  it('returns 500 on unexpected error', async () => {
    mockReadCached.mockRejectedValue(new Error('Disk error'))
    const handler = getTfidfHandler()
    const req = makeReq({ keyword: 'seo' })
    const res = makeRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.jsonData).toEqual(expect.objectContaining({
      error: expect.objectContaining({ code: 'INTERNAL_ERROR' }),
    }))
  })
})
