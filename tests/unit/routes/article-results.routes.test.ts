// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Mocks ---
vi.mock('../../../server/services/data.service', () => ({
  getArticleKeywords: vi.fn(),
}))

vi.mock('../../../server/utils/cache', () => ({
  readCached: vi.fn(),
  slugify: (s: string) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, ''),
}))

vi.mock('../../../server/utils/logger', () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { getArticleKeywords } from '../../../server/services/data.service'
import { readCached } from '../../../server/utils/cache'

const mockGetArticleKeywords = vi.mocked(getArticleKeywords)
const mockReadCached = vi.mocked(readCached)

// --- Minimal Express helpers ---
function makeReq(slug: string) {
  return { params: { slug } } as any
}

function makeRes() {
  const res: any = { statusCode: 200 }
  res.json = vi.fn().mockReturnValue(res)
  res.status = vi.fn((code: number) => {
    res.statusCode = code
    return res
  })
  return res
}

// We import the router and extract the handler
import router from '../../../server/routes/article-results.routes'

// Express Router stores handlers in router.stack
function getHandler() {
  const layer = (router as any).stack.find(
    (l: any) => l.route?.path === '/articles/:slug/cached-results' && l.route?.methods?.get,
  )
  return layer?.route?.stack?.[0]?.handle
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('GET /articles/:slug/cached-results', () => {
  const handler = getHandler()

  it('has a registered GET handler', () => {
    expect(handler).toBeDefined()
    expect(typeof handler).toBe('function')
  })

  it('returns all-null when no capitaine keyword', async () => {
    mockGetArticleKeywords.mockResolvedValue(null)

    const req = makeReq('test-article')
    const res = makeRes()
    await handler(req, res)

    expect(res.json).toHaveBeenCalledWith({
      data: { intent: null, local: null, contentGap: null, autocomplete: null, comparison: null },
    })
    expect(mockReadCached).not.toHaveBeenCalled()
  })

  it('returns all-null when capitaine is empty', async () => {
    mockGetArticleKeywords.mockResolvedValue({
      articleSlug: 'test',
      capitaine: '',
      lieutenants: [],
      lexique: [],
    })

    const req = makeReq('test-article')
    const res = makeRes()
    await handler(req, res)

    expect(res.json).toHaveBeenCalledWith({
      data: { intent: null, local: null, contentGap: null, autocomplete: null, comparison: null },
    })
  })

  it('reads 5 cache files in parallel and returns data', async () => {
    mockGetArticleKeywords.mockResolvedValue({
      articleSlug: 'seo-local',
      capitaine: 'SEO local Toulouse',
      lieutenants: [],
      lexique: [],
    })

    const intentData = { keyword: 'seo local toulouse', intent: 'informational' }
    const mapsData = { results: [] }

    mockReadCached
      .mockResolvedValueOnce({ data: intentData, cachedAt: '2026-01-01' }) // intent
      .mockResolvedValueOnce({ data: mapsData, cachedAt: '2026-01-01' }) // maps/local
      .mockResolvedValueOnce(null) // content-gap
      .mockResolvedValueOnce(null) // autocomplete
      .mockResolvedValueOnce(null) // comparison

    const req = makeReq('seo-local')
    const res = makeRes()
    await handler(req, res)

    // Verify all 5 readCached calls
    expect(mockReadCached).toHaveBeenCalledTimes(5)

    const result = res.json.mock.calls[0][0].data
    expect(result.intent).toEqual(intentData)
    expect(result.local).toEqual(mapsData)
    expect(result.contentGap).toBeNull()
    expect(result.autocomplete).toBeNull()
    expect(result.comparison).toBeNull()
  })

  it('returns 500 on unexpected error', async () => {
    mockGetArticleKeywords.mockRejectedValue(new Error('DB failure'))

    const req = makeReq('broken')
    const res = makeRes()
    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to load cached results' },
    })
  })

  it('uses slugified keyword as cache key', async () => {
    mockGetArticleKeywords.mockResolvedValue({
      articleSlug: 'article-test',
      capitaine: 'Référencement local',
      lieutenants: [],
      lexique: [],
    })

    mockReadCached.mockResolvedValue(null)

    const req = makeReq('article-test')
    const res = makeRes()
    await handler(req, res)

    // slugify('Référencement local') → 'referencement-local'
    const calls = mockReadCached.mock.calls
    expect(calls[0][1]).toBe('intent-referencement-local')
    expect(calls[1][1]).toBe('maps-referencement-local')
    expect(calls[2][1]).toBe('content-gap-referencement-local')
    // autocomplete uses just the key (no prefix)
    expect(calls[3][1]).toBe('referencement-local')
    expect(calls[4][1]).toBe('local-national-referencement-local')
  })
})
