// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Mocks ---
vi.mock('../../../server/utils/logger', () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const mockAnalyze = vi.fn()
vi.mock('../../../server/services/external/serp-analysis.service', () => ({
  analyzeSerpCompetitors: (...args: unknown[]) => mockAnalyze(...args),
}))

// Sprint 15.5-bis — route reads keyword_metrics before falling back to DataForSEO
const mockGetKeywordMetrics = vi.fn()
const mockUpsertKeywordSerp = vi.fn()
const mockIsFresh = vi.fn()

vi.mock('../../../server/services/keyword/keyword-metrics.service', () => ({
  getKeywordMetrics: (...args: unknown[]) => mockGetKeywordMetrics(...args),
  upsertKeywordSerp: (...args: unknown[]) => mockUpsertKeywordSerp(...args),
  isKeywordMetricsFresh: (...args: unknown[]) => mockIsFresh(...args),
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

const MOCK_RESULT = {
  keyword: 'seo',
  articleLevel: 'intermediaire',
  competitors: [
    { position: 1, title: 'Page 1', url: 'https://example.com/1', domain: 'example.com', headings: [], textContent: 'text' },
  ],
  paaQuestions: [{ question: 'What is SEO?', answer: 'SEO is...' }],
  maxScraped: 1,
  cachedAt: '2026-03-31T00:00:00.000Z',
  fromCache: false,
}

beforeEach(() => {
  vi.clearAllMocks()
  mockAnalyze.mockResolvedValue(MOCK_RESULT)
  mockGetKeywordMetrics.mockResolvedValue(null)
  mockUpsertKeywordSerp.mockResolvedValue(undefined)
  mockIsFresh.mockReturnValue(false)
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

  it('calls service with validated body', async () => {
    const handler = getHandler()
    const req = makeReq({ keyword: 'seo local', topN: 5, articleLevel: 'pilier' })
    const res = makeRes()
    await handler(req, res)
    expect(mockAnalyze).toHaveBeenCalledWith('seo local', 'pilier')
  })

  it('uses default articleLevel when not provided', async () => {
    const handler = getHandler()
    const req = makeReq({ keyword: 'seo' })
    const res = makeRes()
    await handler(req, res)
    expect(mockAnalyze).toHaveBeenCalledWith('seo', 'intermediaire')
  })

  it('returns { data: SerpAnalysisResult }', async () => {
    const handler = getHandler()
    const req = makeReq({ keyword: 'seo' })
    const res = makeRes()
    await handler(req, res)
    expect(res.json).toHaveBeenCalledWith({ data: MOCK_RESULT })
  })

  it('returns 500 on service error', async () => {
    mockAnalyze.mockRejectedValue(new Error('DataForSEO failed'))
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
})
