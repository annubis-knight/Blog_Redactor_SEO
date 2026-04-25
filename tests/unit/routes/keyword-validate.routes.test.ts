// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Mocks ---
vi.mock('../../../server/services/external/dataforseo.service', () => ({
  fetchKeywordOverview: vi.fn(),
  fetchPaa: vi.fn(),
  fetchSearchIntentBatch: vi.fn(),
  DataForSeoQuotaError: class DataForSeoQuotaError extends Error {
    constructor(message = 'DataForSEO quota exceeded') {
      super(message)
      this.name = 'DataForSeoQuotaError'
    }
  },
}))

vi.mock('../../../server/services/keyword/autocomplete.service', () => ({
  fetchAutocomplete: vi.fn(),
}))

vi.mock('../../../server/services/intent/intent-scan.service', () => ({
  fetchSerpAdvanced: vi.fn(),
  extractPaaFromSerp: vi.fn(),
  matchResonanceDetailed: vi.fn(),
  extractTopicWords: vi.fn(),
  bestMatch: vi.fn(),
  computePaaWeightedScore: vi.fn(),
}))

// Sprint 15.3 — api_cache replaced by keyword_metrics table.
vi.mock('../../../server/services/keyword/keyword-metrics.service', () => ({
  getKeywordMetrics: vi.fn(),
  upsertKeywordKpis: vi.fn(),
  upsertKeywordPaa: vi.fn(),
  isKeywordMetricsFresh: vi.fn(() => false),
}))

vi.mock('../../../server/services/infra/data.service', () => ({
  saveCaptainExploration: vi.fn(),
  getCaptainExplorations: vi.fn().mockResolvedValue([]),
}))

vi.mock('../../../server/utils/logger', () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { fetchKeywordOverview, fetchPaa, fetchSearchIntentBatch } from '../../../server/services/external/dataforseo.service'
import { fetchAutocomplete } from '../../../server/services/keyword/autocomplete.service'
import { fetchSerpAdvanced, extractPaaFromSerp, matchResonanceDetailed, extractTopicWords, bestMatch, computePaaWeightedScore } from '../../../server/services/intent/intent-scan.service'
import { getKeywordMetrics, upsertKeywordKpis, upsertKeywordPaa, isKeywordMetricsFresh } from '../../../server/services/keyword/keyword-metrics.service'

const mockFetchOverview = vi.mocked(fetchKeywordOverview)
const mockFetchPaa = vi.mocked(fetchPaa)
const mockFetchIntentBatch = vi.mocked(fetchSearchIntentBatch)
const mockFetchSerpAdvanced = vi.mocked(fetchSerpAdvanced)
const mockExtractPaaFromSerp = vi.mocked(extractPaaFromSerp)
const mockMatchResonanceDetailed = vi.mocked(matchResonanceDetailed)
const mockExtractTopicWords = vi.mocked(extractTopicWords)
const mockBestMatch = vi.mocked(bestMatch)
const mockComputePaaWeightedScore = vi.mocked(computePaaWeightedScore)
const mockFetchAutocomplete = vi.mocked(fetchAutocomplete)
const mockGetKeywordMetrics = vi.mocked(getKeywordMetrics)
const mockUpsertKeywordKpis = vi.mocked(upsertKeywordKpis)
const mockUpsertKeywordPaa = vi.mocked(upsertKeywordPaa)
const mockIsKeywordMetricsFresh = vi.mocked(isKeywordMetricsFresh)

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
  mockGetKeywordMetrics.mockResolvedValue(null) // No DB row by default → external fetch path
  mockIsKeywordMetricsFresh.mockReturnValue(false)
  mockFetchOverview.mockResolvedValue(defaultOverview as any)
  mockFetchPaa.mockResolvedValue(defaultPaa as any)
  mockFetchAutocomplete.mockResolvedValue(defaultAutocomplete as any)
  mockFetchIntentBatch.mockResolvedValue(new Map([['seo', { intent: 'informational', intentProbability: 0.85 }]]) as any)
  mockFetchSerpAdvanced.mockResolvedValue({ items: [], paaItems: [] } as any)
  mockExtractPaaFromSerp.mockReturnValue([])
  mockMatchResonanceDetailed.mockReturnValue({ match: 'none', quality: 'stem' } as any)
  mockExtractTopicWords.mockReturnValue(['seo'])
  mockBestMatch.mockReturnValue('none' as any)
  mockComputePaaWeightedScore.mockReturnValue(0)
  mockUpsertKeywordKpis.mockResolvedValue(undefined)
  mockUpsertKeywordPaa.mockResolvedValue(undefined)
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
    it('calls all 4 sources in parallel', async () => {
      const handler = getHandler()
      const req = makeReq('seo', { level: 'pilier' })
      const res = makeRes()

      await handler(req, res)

      expect(mockFetchOverview).toHaveBeenCalledWith('seo')
      expect(mockFetchSerpAdvanced).toHaveBeenCalledWith('seo')
      expect(mockFetchAutocomplete).toHaveBeenCalledWith('seo')
      expect(mockFetchIntentBatch).toHaveBeenCalledWith(['seo'])
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

  // --- Sprint 15.3 — DB-first on keyword_metrics (replaces api_cache[validate]) ---
  describe('DB-first keyword_metrics', () => {
    it('returns DB-first result without calling external APIs when row is fresh', async () => {
      // Mock fresh DB row (Sprint 15.3)
      mockGetKeywordMetrics.mockResolvedValue({
        keyword: 'seo',
        lang: 'fr',
        country: 'fr',
        searchVolume: 1500,
        keywordDifficulty: 30,
        cpc: 2.5,
        competition: 0.5,
        intentRaw: 0.85,
        autocompleteSuggestions: [{ text: 'seo', position: 1 }, { text: 'seo tools', position: 2 }],
        autocompleteSource: 'google',
        paaQuestions: [{ question: 'What is SEO?', answer: 'Search engine optimization' }],
        fetchedAt: new Date().toISOString(),
      })
      mockIsKeywordMetricsFresh.mockReturnValue(true)

      const handler = getHandler()
      const req = makeReq('seo', { level: 'pilier' })
      const res = makeRes()

      await handler(req, res)

      expect(mockFetchOverview).not.toHaveBeenCalled()
      expect(mockFetchAutocomplete).not.toHaveBeenCalled()
      expect(mockFetchSerpAdvanced).not.toHaveBeenCalled()
      const { data } = res.json.mock.calls[0][0]
      expect(data.fromCache).toBe(true)
    })

    it('persists KPIs to keyword_metrics after fresh fetch', async () => {
      const handler = getHandler()
      const req = makeReq('seo', { level: 'pilier' })
      const res = makeRes()

      await handler(req, res)

      expect(mockUpsertKeywordKpis).toHaveBeenCalledTimes(1)
      const [keyword, kpis] = mockUpsertKeywordKpis.mock.calls[0]
      expect(keyword).toBe('seo')
      expect(kpis.searchVolume).toBe(1500)
      expect(kpis.keywordDifficulty).toBe(30)
      expect(kpis.cpc).toBe(2.5)
    })

    it('recomputes verdict per call (level-sensitive) — DB hit is keyword-scoped', async () => {
      // Same fresh DB row, called with 2 different levels
      mockGetKeywordMetrics.mockResolvedValue({
        keyword: 'seo',
        lang: 'fr',
        country: 'fr',
        searchVolume: 1500,
        keywordDifficulty: 30,
        cpc: 2.5,
        competition: 0.5,
        intentRaw: 0.85,
        autocompleteSuggestions: [],
        autocompleteSource: 'google',
        paaQuestions: [],
        fetchedAt: new Date().toISOString(),
      })
      mockIsKeywordMetricsFresh.mockReturnValue(true)

      const handler = getHandler()

      const res1 = makeRes()
      await handler(makeReq('seo', { level: 'pilier' }), res1)
      const data1 = res1.json.mock.calls[0][0].data

      const res2 = makeRes()
      await handler(makeReq('seo', { level: 'specifique' }), res2)
      const data2 = res2.json.mock.calls[0][0].data

      expect(data1.articleLevel).toBe('pilier')
      expect(data2.articleLevel).toBe('specifique')
      // Verdicts can differ (level-sensitive thresholds)
      expect(data1.fromCache).toBe(true)
      expect(data2.fromCache).toBe(true)
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
