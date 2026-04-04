// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Mocks ---
vi.mock('../../../server/services/dataforseo.service', () => ({
  fetchKeywordOverview: vi.fn(),
  fetchPaa: vi.fn(),
}))

vi.mock('../../../server/services/autocomplete.service', () => ({
  fetchAutocomplete: vi.fn(),
}))

vi.mock('../../../server/utils/cache', () => ({
  readCached: vi.fn(),
  writeCached: vi.fn(),
  slugify: (s: string) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, ''),
  isFresh: vi.fn(),
}))

vi.mock('../../../server/utils/logger', () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { fetchKeywordOverview, fetchPaa } from '../../../server/services/dataforseo.service'
import { fetchAutocomplete } from '../../../server/services/autocomplete.service'
import { readCached, writeCached, isFresh } from '../../../server/utils/cache'

const mockFetchOverview = vi.mocked(fetchKeywordOverview)
const mockFetchPaa = vi.mocked(fetchPaa)
const mockFetchAutocomplete = vi.mocked(fetchAutocomplete)
const mockReadCached = vi.mocked(readCached)
const mockWriteCached = vi.mocked(writeCached)
const mockIsFresh = vi.mocked(isFresh)

// --- Minimal Express helpers ---
function makeReq(keyword: string, body: Record<string, unknown> = {}) {
  return {
    params: { keyword: encodeURIComponent(keyword) },
    body,
  } as any
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

// Import router and extract handler
import router from '../../../server/routes/keyword-validate.routes'

function getHandler() {
  const layer = (router as any).stack.find(
    (l: any) => l.route?.path === '/keywords/:keyword/validate' && l.route?.methods?.post,
  )
  return layer?.route?.stack?.[0]?.handle
}

// --- Default mock data ---
const defaultOverview = {
  searchVolume: 1500,
  difficulty: 30,
  cpc: 2.5,
  competition: 0.5,
  monthlySearches: [100, 120, 130],
}

const defaultPaa = [
  { question: 'What is SEO?', answer: 'Search engine optimization' },
  { question: 'How to do SEO?', answer: 'Follow best practices' },
  { question: 'Why SEO matters?', answer: 'Visibility' },
]

const defaultAutocomplete = {
  suggestionsCount: 5,
  suggestions: ['seo', 'seo tools', 'seo audit'],
  hasKeyword: true,
  position: 2,
}

beforeEach(() => {
  vi.resetAllMocks()
  mockReadCached.mockResolvedValue(null) // No cache by default
  mockFetchOverview.mockResolvedValue(defaultOverview as any)
  mockFetchPaa.mockResolvedValue(defaultPaa as any)
  mockFetchAutocomplete.mockResolvedValue(defaultAutocomplete as any)
  mockWriteCached.mockResolvedValue(undefined)
})

describe('POST /keywords/:keyword/validate', () => {
  // --- AC: Validation des paramètres ---
  describe('parameter validation', () => {
    it('returns 400 when level is missing', async () => {
      const handler = getHandler()
      const req = makeReq('seo', {})
      const res = makeRes()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ code: 'MISSING_PARAM' }),
        }),
      )
    })

    it('returns 400 when level is invalid', async () => {
      const handler = getHandler()
      const req = makeReq('seo', { level: 'expert' })
      const res = makeRes()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })
  })

  // --- AC #1: Parallel fetch + response structure ---
  describe('parallel fetch and response', () => {
    it('calls all 3 sources in parallel', async () => {
      const handler = getHandler()
      const req = makeReq('seo', { level: 'pilier' })
      const res = makeRes()

      await handler(req, res)

      expect(mockFetchOverview).toHaveBeenCalledWith('seo')
      expect(mockFetchPaa).toHaveBeenCalledWith('seo')
      expect(mockFetchAutocomplete).toHaveBeenCalledWith('seo')
    })

    it('returns { data: ValidateResponse } with 6 KPIs and verdict', async () => {
      const handler = getHandler()
      const req = makeReq('seo', { level: 'pilier' })
      const res = makeRes()

      await handler(req, res)

      expect(res.json).toHaveBeenCalledTimes(1)
      const { data } = res.json.mock.calls[0][0]
      expect(data.keyword).toBe('seo')
      expect(data.articleLevel).toBe('pilier')
      expect(data.kpis).toHaveLength(6)
      expect(data.verdict).toBeDefined()
      expect(data.verdict.level).toBeDefined()
      expect(data.verdict.totalKpis).toBe(6)
      expect(data.fromCache).toBe(false)
    })

    it('includes all 6 KPI names', async () => {
      const handler = getHandler()
      const req = makeReq('seo', { level: 'pilier' })
      const res = makeRes()

      await handler(req, res)

      const { data } = res.json.mock.calls[0][0]
      const kpiNames = data.kpis.map((k: any) => k.name)
      expect(kpiNames).toEqual(['volume', 'kd', 'cpc', 'paa', 'intent', 'autocomplete'])
    })
  })

  // --- AC #7: Cache ---
  describe('caching', () => {
    it('returns cached result without calling APIs', async () => {
      const cachedResponse = {
        keyword: 'seo',
        articleLevel: 'pilier',
        kpis: [],
        verdict: { level: 'GO', greenCount: 5, totalKpis: 6, autoNoGo: false },
        fromCache: false,
        cachedAt: null,
      }
      mockReadCached.mockResolvedValue({
        data: cachedResponse,
        cachedAt: '2026-03-30T00:00:00.000Z',
      } as any)
      mockIsFresh.mockReturnValue(true)

      const handler = getHandler()
      const req = makeReq('seo', { level: 'pilier' })
      const res = makeRes()

      await handler(req, res)

      expect(mockFetchOverview).not.toHaveBeenCalled()
      expect(mockFetchPaa).not.toHaveBeenCalled()
      expect(mockFetchAutocomplete).not.toHaveBeenCalled()
      const { data } = res.json.mock.calls[0][0]
      expect(data.fromCache).toBe(true)
    })

    it('writes result to cache after fresh fetch', async () => {
      const handler = getHandler()
      const req = makeReq('seo', { level: 'pilier' })
      const res = makeRes()

      await handler(req, res)

      expect(mockWriteCached).toHaveBeenCalledTimes(1)
      const [dir, key, data] = mockWriteCached.mock.calls[0]
      expect(key).toBe('seo-pilier')
      expect(data.keyword).toBe('seo')
    })

    it('uses different cache keys for different levels', async () => {
      const handler = getHandler()

      const res1 = makeRes()
      await handler(makeReq('seo', { level: 'pilier' }), res1)

      const res2 = makeRes()
      await handler(makeReq('seo', { level: 'specifique' }), res2)

      const key1 = mockWriteCached.mock.calls[0][1]
      const key2 = mockWriteCached.mock.calls[1][1]
      expect(key1).toBe('seo-pilier')
      expect(key2).toBe('seo-specifique')
    })
  })

  // --- Error handling ---
  describe('error handling', () => {
    it('returns 500 on unexpected error', async () => {
      mockFetchOverview.mockRejectedValue(new Error('API down'))
      const handler = getHandler()
      const req = makeReq('seo', { level: 'pilier' })
      const res = makeRes()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ code: 'INTERNAL_ERROR' }),
        }),
      )
    })
  })
})
