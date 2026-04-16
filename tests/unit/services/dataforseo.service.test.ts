import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock json-storage before importing the service
vi.mock('../../../server/utils/json-storage', () => ({
  readJson: vi.fn(),
  writeJson: vi.fn(),
}))

// Mock global fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Set env vars before importing service
vi.stubEnv('DATAFORSEO_LOGIN', 'test_login')
vi.stubEnv('DATAFORSEO_PASSWORD', 'test_password')

import { readJson, writeJson } from '../../../server/utils/json-storage'
import {
  getAuthHeader,
  getBaseUrl,
  slugify,
  readCache,
  fetchDataForSeo,
  fetchSerp,
  fetchPaa,
  fetchRelatedKeywords,
  fetchKeywordSuggestions,
  fetchKeywordOverview,
  fetchKeywordOverviewBatch,
  fetchSearchIntentBatch,
  getBrief,
  getMinRefreshHours,
  isCacheFresh,
  computeCompositeScore,
  generateAlerts,
  detectRedundancy,
  auditCocoonKeywords,
  getAuditCacheStatus,
} from '../../../server/services/external/dataforseo.service'

const mockReadJson = vi.mocked(readJson)
const mockWriteJson = vi.mocked(writeJson)

beforeEach(() => {
  mockFetch.mockReset()
  mockReadJson.mockReset()
  mockWriteJson.mockReset()
})

// --- Helper: create a DataForSEO-shaped response (single result) ---
function makeDfsResponse<T>(result: T) {
  return {
    ok: true,
    json: () =>
      Promise.resolve({
        status_code: 20000,
        tasks: [{ status_code: 20000, result: [result] }],
      }),
  }
}

// --- Helper: create a DataForSEO-shaped response (batch — items wrapped in result[0].items) ---
function makeBatchResponse<T>(items: T[]) {
  return {
    ok: true,
    json: () =>
      Promise.resolve({
        status_code: 20000,
        tasks: [{ status_code: 20000, result: [{ items }] }],
      }),
  }
}

describe('dataforseo.service — getAuthHeader', () => {
  it('returns Basic auth header with base64 credentials', () => {
    const header = getAuthHeader()
    const expected = `Basic ${Buffer.from('test_login:test_password').toString('base64')}`
    expect(header).toBe(expected)
  })

  it('throws when DATAFORSEO_LOGIN is missing', () => {
    const original = process.env.DATAFORSEO_LOGIN
    delete process.env.DATAFORSEO_LOGIN
    expect(() => getAuthHeader()).toThrow('DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD must be set')
    process.env.DATAFORSEO_LOGIN = original
  })

  it('throws when DATAFORSEO_PASSWORD is missing', () => {
    const original = process.env.DATAFORSEO_PASSWORD
    delete process.env.DATAFORSEO_PASSWORD
    expect(() => getAuthHeader()).toThrow('DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD must be set')
    process.env.DATAFORSEO_PASSWORD = original
  })
})

describe('dataforseo.service — slugify', () => {
  it('converts keyword to lowercase slug', () => {
    expect(slugify('Refonte site web PME')).toBe('refonte-site-web-pme')
  })

  it('removes accents', () => {
    expect(slugify('référencement naturel')).toBe('referencement-naturel')
  })

  it('removes special characters', () => {
    expect(slugify("l'agence & le SEO")).toBe('l-agence-le-seo')
  })

  it('trims leading/trailing hyphens', () => {
    expect(slugify('  hello world  ')).toBe('hello-world')
  })
})

describe('dataforseo.service — readCache', () => {
  it('returns cached data when file exists', async () => {
    const cached = { keyword: 'test', serp: [], paa: [], relatedKeywords: [], keywordData: {}, cachedAt: '2026-01-01T00:00:00Z' }
    mockReadJson.mockResolvedValue({ data: cached, cachedAt: cached.cachedAt })
    const result = await readCache('test')
    expect(result).toEqual(cached)
  })

  it('returns null when cache file does not exist', async () => {
    mockReadJson.mockRejectedValue(new Error('ENOENT'))
    const result = await readCache('nonexistent')
    expect(result).toBeNull()
  })
})

describe('dataforseo.service — fetchDataForSeo', () => {
  it('sends POST with auth and body', async () => {
    mockFetch.mockResolvedValue(makeDfsResponse({ items: [] }))
    await fetchDataForSeo('/test/endpoint', [{ keyword: 'test' }])

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.dataforseo.com/v3/test/endpoint',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Authorization': expect.stringContaining('Basic '),
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify([{ keyword: 'test' }]),
      }),
    )
  })

  it('throws on non-retryable HTTP error', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 400, statusText: 'Bad Request' })
    await expect(fetchDataForSeo('/test', [{}])).rejects.toThrow('DataForSEO HTTP 400')
  })

  it('retries on HTTP 429 and eventually throws', async () => {
    vi.useFakeTimers()
    try {
      mockFetch.mockResolvedValue({ ok: false, status: 429, statusText: 'Too Many Requests' })

      const promise = fetchDataForSeo('/test', [{}])
      // Register rejection handler BEFORE advancing timers to avoid unhandled rejection
      const assertion = expect(promise).rejects.toThrow('DataForSEO HTTP 429')
      await vi.runAllTimersAsync()
      await assertion

      // 1 initial + 3 retries = 4 calls
      expect(mockFetch).toHaveBeenCalledTimes(4)
    } finally {
      vi.useRealTimers()
    }
  })

  it('throws when status_code is not 20000', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status_code: 40000, tasks: [] }),
    })
    await expect(fetchDataForSeo('/test', [{}])).rejects.toThrow('DataForSEO error: status 40000')
  })
})

describe('dataforseo.service — fetchSerp', () => {
  it('extracts top 10 organic results', async () => {
    mockFetch.mockResolvedValue(
      makeDfsResponse({
        items: [
          { type: 'organic', rank_group: 1, title: 'Result 1', url: 'https://a.com', description: 'Desc 1', domain: 'a.com' },
          { type: 'paid', rank_group: 0, title: 'Ad', url: 'https://ad.com', description: 'Ad', domain: 'ad.com' },
          { type: 'organic', rank_group: 2, title: 'Result 2', url: 'https://b.com', description: 'Desc 2', domain: 'b.com' },
        ],
      }),
    )

    const results = await fetchSerp('test keyword')
    expect(results).toHaveLength(2)
    expect(results[0]).toEqual({
      position: 1,
      title: 'Result 1',
      url: 'https://a.com',
      description: 'Desc 1',
      domain: 'a.com',
    })
  })
})

describe('dataforseo.service — fetchPaa', () => {
  it('extracts people_also_ask questions', async () => {
    mockFetch.mockResolvedValue(
      makeDfsResponse({
        items: [
          { type: 'organic', title: 'Organic result' },
          { type: 'people_also_ask', title: 'What is SEO?', expanded_element: [{ description: 'SEO is...' }] },
          { type: 'people_also_ask', title: 'How to do SEO?' },
        ],
      }),
    )

    const results = await fetchPaa('test')
    expect(results).toHaveLength(2)
    expect(results[0]).toEqual({ question: 'What is SEO?', answer: 'SEO is...' })
    expect(results[1]).toEqual({ question: 'How to do SEO?', answer: null })
  })
})

describe('dataforseo.service — fetchRelatedKeywords', () => {
  it('extracts related keywords with metrics', async () => {
    mockFetch.mockResolvedValue(
      makeDfsResponse({
        items: [
          {
            keyword_data: { keyword: 'seo', keyword_info: { search_volume: 5000, competition: 0.4, cpc: 2.0 } },
            related_keywords: [
              { keyword: 'seo tips', keyword_info: { search_volume: 1000, competition: 0.5, cpc: 1.2 } },
              { keyword: 'seo guide', keyword_info: { search_volume: 800, competition: 0.3, cpc: 0.8 } },
            ],
          },
        ],
      }),
    )

    const results = await fetchRelatedKeywords('seo')
    expect(results).toHaveLength(2)
    expect(results[0]).toEqual({ keyword: 'seo tips', searchVolume: 1000, competition: 0.5, cpc: 1.2 })
  })
})

describe('dataforseo.service — fetchKeywordOverview', () => {
  it('extracts keyword metrics from nested structure', async () => {
    mockFetch.mockResolvedValue(
      makeDfsResponse({
        items: [
          {
            keyword: 'refonte site web',
            keyword_info: {
              search_volume: 2400,
              cpc: 2.5,
              competition: 0.6,
              monthly_searches: [{ search_volume: 2000 }, { search_volume: 2400 }],
            },
            keyword_properties: {
              keyword_difficulty: 45,
            },
          },
        ],
      }),
    )

    const result = await fetchKeywordOverview('refonte site web')
    expect(result).toEqual({
      searchVolume: 2400,
      difficulty: 45,
      cpc: 2.5,
      competition: 0.6,
      monthlySearches: [2000, 2400],
    })
  })
})

describe('dataforseo.service — fetchKeywordSuggestions', () => {
  it('extracts keyword suggestions from items array', async () => {
    mockFetch.mockResolvedValue(
      makeDfsResponse({
        items: [
          { keyword: 'design web', keyword_info: { search_volume: 3000, competition: 0.3, cpc: 1.5 } },
          { keyword: 'web design pme', keyword_info: { search_volume: 500, competition: 0.2, cpc: 0.8 } },
        ],
      }),
    )

    const results = await fetchKeywordSuggestions('design web PME')
    expect(results).toHaveLength(2)
    expect(results[0]).toEqual({ keyword: 'design web', searchVolume: 3000, competition: 0.3, cpc: 1.5 })
    expect(results[1]).toEqual({ keyword: 'web design pme', searchVolume: 500, competition: 0.2, cpc: 0.8 })
  })

  it('returns empty array when items is null', async () => {
    mockFetch.mockResolvedValue(makeDfsResponse({ items: null }))

    const results = await fetchKeywordSuggestions('obscure keyword')
    expect(results).toEqual([])
  })
})

describe('dataforseo.service — getBrief', () => {
  const mockCached = {
    keyword: 'test keyword',
    serp: [{ position: 1, title: 'T', url: 'http://t.com', description: 'D', domain: 't.com' }],
    paa: [{ question: 'Q?', answer: 'A' }],
    relatedKeywords: [{ keyword: 'related', searchVolume: 100, competition: 0.1, cpc: 0.5 }],
    keywordData: { searchVolume: 500, difficulty: 30, cpc: 1.0, competition: 0.4, monthlySearches: [500] },
    cachedAt: '2026-01-01T00:00:00Z',
  }

  it('returns cached data without calling fetch', async () => {
    mockReadJson.mockResolvedValue({ data: mockCached, cachedAt: mockCached.cachedAt })

    const result = await getBrief('test keyword')

    expect(result).toEqual({ ...mockCached, fromCache: true })
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('calls all 4 endpoints on cache miss', async () => {
    mockReadJson.mockRejectedValue(new Error('ENOENT'))
    mockWriteJson.mockResolvedValue(undefined)

    // Mock 4 fetch calls (serp, paa, related, keyword)
    mockFetch
      .mockResolvedValueOnce(makeDfsResponse({ items: [{ type: 'organic', rank_group: 1, title: 'T', url: 'http://t.com', description: 'D', domain: 't.com' }] }))
      .mockResolvedValueOnce(makeDfsResponse({ items: [{ type: 'people_also_ask', title: 'Q?' }] }))
      .mockResolvedValueOnce(makeDfsResponse({ items: [{ keyword_data: { keyword: 'test', keyword_info: { search_volume: 100, competition: 0.1, cpc: 0.5 } }, related_keywords: [{ keyword: 'rel', keyword_info: { search_volume: 100, competition: 0.1, cpc: 0.5 } }] }] }))
      .mockResolvedValueOnce(makeDfsResponse({ items: [{ keyword: 'test', keyword_info: { search_volume: 500, cpc: 1.0, competition: 0.4, monthly_searches: [{ search_volume: 500 }] }, keyword_properties: { keyword_difficulty: 30 } }] }))

    const result = await getBrief('test keyword')

    expect(mockFetch).toHaveBeenCalledTimes(4)
    expect(result.keyword).toBe('test keyword')
    expect(result.serp).toHaveLength(1)
    expect(result.paa).toHaveLength(1)
    expect(result.relatedKeywords).toHaveLength(1)
    expect(result.keywordData.searchVolume).toBe(500)
    expect(result.cachedAt).toBeDefined()
    // Verify cache was written
    expect(mockWriteJson).toHaveBeenCalledTimes(1)
  })

  it('ignores cache when forceRefresh is true', async () => {
    mockReadJson.mockResolvedValue({ data: mockCached, cachedAt: mockCached.cachedAt })
    mockWriteJson.mockResolvedValue(undefined)

    // Mock 4 fetch calls
    mockFetch
      .mockResolvedValueOnce(makeDfsResponse({ items: [] }))
      .mockResolvedValueOnce(makeDfsResponse({ items: [] }))
      .mockResolvedValueOnce(makeDfsResponse({ items: [{ keyword_data: { keyword: 'test', keyword_info: {} }, related_keywords: [] }] }))
      .mockResolvedValueOnce(makeDfsResponse({ items: [{ keyword: 'test', keyword_info: { search_volume: 100, cpc: 0.5, competition: 0.2, monthly_searches: [] }, keyword_properties: { keyword_difficulty: 10 } }] }))

    const result = await getBrief('test keyword', true)

    expect(mockFetch).toHaveBeenCalledTimes(4)
    expect(result.keyword).toBe('test keyword')
  })
})

// ==========================================
// Story 8.1 — New tests for batch & sandbox
// ==========================================

describe('dataforseo.service — getBaseUrl', () => {
  it('returns production URL when NODE_ENV is test', () => {
    expect(getBaseUrl()).toBe('https://api.dataforseo.com/v3')
  })

  it('returns sandbox URL when DATAFORSEO_SANDBOX is true', () => {
    const original = process.env.DATAFORSEO_SANDBOX
    process.env.DATAFORSEO_SANDBOX = 'true'
    expect(getBaseUrl()).toBe('https://sandbox.dataforseo.com/v3')
    if (original !== undefined) process.env.DATAFORSEO_SANDBOX = original
    else delete process.env.DATAFORSEO_SANDBOX
  })

  it('returns sandbox URL in development mode by default', () => {
    const origEnv = process.env.NODE_ENV
    const origSandbox = process.env.DATAFORSEO_SANDBOX
    process.env.NODE_ENV = 'development'
    delete process.env.DATAFORSEO_SANDBOX
    expect(getBaseUrl()).toBe('https://sandbox.dataforseo.com/v3')
    process.env.NODE_ENV = origEnv
    if (origSandbox !== undefined) process.env.DATAFORSEO_SANDBOX = origSandbox
  })

  it('returns production URL in development when DATAFORSEO_SANDBOX is false', () => {
    const origEnv = process.env.NODE_ENV
    const origSandbox = process.env.DATAFORSEO_SANDBOX
    process.env.NODE_ENV = 'development'
    process.env.DATAFORSEO_SANDBOX = 'false'
    expect(getBaseUrl()).toBe('https://api.dataforseo.com/v3')
    process.env.NODE_ENV = origEnv
    if (origSandbox !== undefined) process.env.DATAFORSEO_SANDBOX = origSandbox
    else delete process.env.DATAFORSEO_SANDBOX
  })
})

describe('dataforseo.service — getMinRefreshHours / isCacheFresh', () => {
  it('returns 0 in development mode', () => {
    const origEnv = process.env.NODE_ENV
    const origHours = process.env.DATAFORSEO_MIN_REFRESH_HOURS
    process.env.NODE_ENV = 'development'
    delete process.env.DATAFORSEO_MIN_REFRESH_HOURS
    expect(getMinRefreshHours()).toBe(0)
    process.env.NODE_ENV = origEnv
    if (origHours !== undefined) process.env.DATAFORSEO_MIN_REFRESH_HOURS = origHours
  })

  it('reads DATAFORSEO_MIN_REFRESH_HOURS from env', () => {
    const orig = process.env.DATAFORSEO_MIN_REFRESH_HOURS
    process.env.DATAFORSEO_MIN_REFRESH_HOURS = '24'
    expect(getMinRefreshHours()).toBe(24)
    if (orig !== undefined) process.env.DATAFORSEO_MIN_REFRESH_HOURS = orig
    else delete process.env.DATAFORSEO_MIN_REFRESH_HOURS
  })

  it('isCacheFresh returns false when minHours is 0', () => {
    const origEnv = process.env.NODE_ENV
    const origHours = process.env.DATAFORSEO_MIN_REFRESH_HOURS
    process.env.NODE_ENV = 'development'
    delete process.env.DATAFORSEO_MIN_REFRESH_HOURS
    expect(isCacheFresh(new Date().toISOString())).toBe(false)
    process.env.NODE_ENV = origEnv
    if (origHours !== undefined) process.env.DATAFORSEO_MIN_REFRESH_HOURS = origHours
  })

  it('isCacheFresh returns true when cache is within refresh period', () => {
    const orig = process.env.DATAFORSEO_MIN_REFRESH_HOURS
    process.env.DATAFORSEO_MIN_REFRESH_HOURS = '24'
    const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
    expect(isCacheFresh(oneHourAgo)).toBe(true)
    if (orig !== undefined) process.env.DATAFORSEO_MIN_REFRESH_HOURS = orig
    else delete process.env.DATAFORSEO_MIN_REFRESH_HOURS
  })

  it('isCacheFresh returns false when cache is expired', () => {
    const orig = process.env.DATAFORSEO_MIN_REFRESH_HOURS
    process.env.DATAFORSEO_MIN_REFRESH_HOURS = '24'
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
    expect(isCacheFresh(twoDaysAgo)).toBe(false)
    if (orig !== undefined) process.env.DATAFORSEO_MIN_REFRESH_HOURS = orig
    else delete process.env.DATAFORSEO_MIN_REFRESH_HOURS
  })
})

describe('dataforseo.service — computeCompositeScore', () => {
  it('returns 0 for zero metrics', () => {
    const score = computeCompositeScore({ searchVolume: 0, difficulty: 0, cpc: 0, competition: 0, monthlySearches: [] })
    expect(score.volume).toBe(0)
    expect(score.cpc).toBe(0)
    expect(score.difficultyInverse).toBe(100) // 100 - 0
    expect(score.competitionInverse).toBe(100) // 100 - 0*100
    expect(score.total).toBeGreaterThan(0)
  })

  it('returns high score for ideal keyword (high volume, low difficulty, good CPC)', () => {
    const score = computeCompositeScore({ searchVolume: 5000, difficulty: 20, cpc: 3.0, competition: 0.2, monthlySearches: [] })
    expect(score.total).toBeGreaterThan(70)
    expect(score.volume).toBeGreaterThan(80) // log10(5000)/log10(10000)*100 ≈ 92
    expect(score.difficultyInverse).toBe(80) // 100-20
  })

  it('returns low score for terrible keyword (zero volume, max difficulty)', () => {
    const score = computeCompositeScore({ searchVolume: 0, difficulty: 100, cpc: 0, competition: 1, monthlySearches: [] })
    expect(score.total).toBe(0)
    expect(score.volume).toBe(0)
    expect(score.difficultyInverse).toBe(0)
    expect(score.competitionInverse).toBe(0)
  })

  it('caps total at 100', () => {
    const score = computeCompositeScore({ searchVolume: 100000, difficulty: 0, cpc: 50, competition: 0, monthlySearches: [] })
    expect(score.total).toBeLessThanOrEqual(100)
  })
})

describe('dataforseo.service — generateAlerts', () => {
  it('returns danger alert for zero volume', () => {
    const alerts = generateAlerts({ searchVolume: 0, difficulty: 30, cpc: 1, competition: 0.3, monthlySearches: [] })
    expect(alerts).toHaveLength(1)
    expect(alerts[0].type).toBe('zero_volume')
    expect(alerts[0].level).toBe('danger')
  })

  it('returns warning for low volume (< 50)', () => {
    const alerts = generateAlerts({ searchVolume: 30, difficulty: 30, cpc: 1, competition: 0.3, monthlySearches: [] })
    expect(alerts).toHaveLength(1)
    expect(alerts[0].type).toBe('low_volume')
    expect(alerts[0].level).toBe('warning')
  })

  it('returns warning for high difficulty (> 70)', () => {
    const alerts = generateAlerts({ searchVolume: 1000, difficulty: 85, cpc: 1, competition: 0.3, monthlySearches: [] })
    expect(alerts).toHaveLength(1)
    expect(alerts[0].type).toBe('high_difficulty')
  })

  it('returns multiple alerts when both low volume and high difficulty', () => {
    const alerts = generateAlerts({ searchVolume: 20, difficulty: 90, cpc: 1, competition: 0.3, monthlySearches: [] })
    expect(alerts).toHaveLength(2)
    expect(alerts.map(a => a.type)).toEqual(['low_volume', 'high_difficulty'])
  })

  it('returns empty array for healthy keyword', () => {
    const alerts = generateAlerts({ searchVolume: 1000, difficulty: 40, cpc: 2, competition: 0.3, monthlySearches: [] })
    expect(alerts).toHaveLength(0)
  })
})

describe('dataforseo.service — detectRedundancy', () => {
  it('detects redundant pair when overlap >= 60%', () => {
    const sharedKws = Array.from({ length: 7 }, (_, i) => ({ keyword: `shared-${i}`, searchVolume: 100, competition: 0.1, cpc: 0.5 }))
    const uniqueKws = Array.from({ length: 3 }, (_, i) => ({ keyword: `unique-${i}`, searchVolume: 50, competition: 0.2, cpc: 0.3 }))

    const results = [
      { keyword: 'kw1', type: 'Pilier' as const, cocoonName: 'test', searchVolume: 500, difficulty: 30, cpc: 1, competition: 0.3, compositeScore: { volume: 50, difficultyInverse: 70, cpc: 30, competitionInverse: 70, total: 55 }, relatedKeywords: [...sharedKws, ...uniqueKws], fromCache: false, cachedAt: null, alerts: [] },
      { keyword: 'kw2', type: 'Pilier' as const, cocoonName: 'test', searchVolume: 400, difficulty: 25, cpc: 0.8, competition: 0.2, compositeScore: { volume: 45, difficultyInverse: 75, cpc: 25, competitionInverse: 80, total: 56 }, relatedKeywords: [...sharedKws, { keyword: 'other-1', searchVolume: 80, competition: 0.15, cpc: 0.4 }], fromCache: false, cachedAt: null, alerts: [] },
    ]

    const pairs = detectRedundancy(results)
    expect(pairs).toHaveLength(1)
    expect(pairs[0].overlapPercent).toBeGreaterThanOrEqual(60)
    expect(pairs[0].keyword1).toBe('kw1')
    expect(pairs[0].keyword2).toBe('kw2')
  })

  it('returns empty when no overlap', () => {
    const results = [
      { keyword: 'kw1', type: 'Pilier' as const, cocoonName: 'test', searchVolume: 500, difficulty: 30, cpc: 1, competition: 0.3, compositeScore: { volume: 50, difficultyInverse: 70, cpc: 30, competitionInverse: 70, total: 55 }, relatedKeywords: [{ keyword: 'a', searchVolume: 100, competition: 0.1, cpc: 0.5 }], fromCache: false, cachedAt: null, alerts: [] },
      { keyword: 'kw2', type: 'Pilier' as const, cocoonName: 'test', searchVolume: 400, difficulty: 25, cpc: 0.8, competition: 0.2, compositeScore: { volume: 45, difficultyInverse: 75, cpc: 25, competitionInverse: 80, total: 56 }, relatedKeywords: [{ keyword: 'b', searchVolume: 80, competition: 0.15, cpc: 0.4 }], fromCache: false, cachedAt: null, alerts: [] },
    ]

    const pairs = detectRedundancy(results)
    expect(pairs).toHaveLength(0)
  })
})

describe('dataforseo.service — fetchKeywordOverviewBatch', () => {
  it('returns keyword metrics mapped by lowercase keyword', async () => {
    mockFetch.mockResolvedValueOnce(
      makeBatchResponse([
        {
          keyword: 'refonte site web',
          keyword_info: { search_volume: 2400, cpc: 2.5, competition: 0.6, monthly_searches: [{ search_volume: 2000 }] },
          keyword_properties: { keyword_difficulty: 45, words_count: 3, core_keyword: 'refonte' },
        },
        {
          keyword: 'seo local',
          keyword_info: { search_volume: 1200, cpc: 1.0, competition: 0.4, monthly_searches: null },
          keyword_properties: { keyword_difficulty: 30 },
        },
      ]),
    )

    const result = await fetchKeywordOverviewBatch(['refonte site web', 'seo local'])
    expect(result.size).toBe(2)
    expect(result.get('refonte site web')).toEqual({
      searchVolume: 2400,
      difficulty: 45,
      cpc: 2.5,
      competition: 0.6,
      monthlySearches: [2000],
      wordsCount: 3,
      coreKeyword: 'refonte',
    })
    expect(result.get('seo local')?.searchVolume).toBe(1200)
    expect(result.get('seo local')?.monthlySearches).toEqual([])
  })

  it('returns empty map for empty input', async () => {
    const result = await fetchKeywordOverviewBatch([])
    expect(result.size).toBe(0)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('handles API error gracefully (returns empty map)', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Internal Server Error' })
    const result = await fetchKeywordOverviewBatch(['test kw'])
    expect(result.size).toBe(0)
  })

  it('chunks into batches of 700', async () => {
    // Create 800 keywords to trigger 2 chunks (700 + 100)
    const keywords = Array.from({ length: 800 }, (_, i) => `kw-${i}`)

    mockFetch
      .mockResolvedValueOnce(makeBatchResponse(
        Array.from({ length: 700 }, (_, i) => ({
          keyword: `kw-${i}`,
          keyword_info: { search_volume: 100, cpc: 0.5, competition: 0.3, monthly_searches: null },
          keyword_properties: { keyword_difficulty: 20 },
        })),
      ))
      .mockResolvedValueOnce(makeBatchResponse(
        Array.from({ length: 100 }, (_, i) => ({
          keyword: `kw-${700 + i}`,
          keyword_info: { search_volume: 50, cpc: 0.2, competition: 0.1, monthly_searches: null },
          keyword_properties: { keyword_difficulty: 10 },
        })),
      ))

    const result = await fetchKeywordOverviewBatch(keywords)
    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(result.size).toBe(800)
  })
})

describe('dataforseo.service — fetchSearchIntentBatch', () => {
  it('returns intent data mapped by lowercase keyword', async () => {
    mockFetch.mockResolvedValueOnce(
      makeBatchResponse([
        { keyword: 'refonte site web', keyword_intent: { label: 'commercial', probability: 0.85 } },
        { keyword: 'seo local', keyword_intent: { label: 'informational', probability: 0.92 } },
      ]),
    )

    const result = await fetchSearchIntentBatch(['refonte site web', 'seo local'])
    expect(result.size).toBe(2)
    expect(result.get('refonte site web')).toEqual({ intent: 'commercial', intentProbability: 0.85 })
    expect(result.get('seo local')).toEqual({ intent: 'informational', intentProbability: 0.92 })
  })

  it('returns empty map for empty input', async () => {
    const result = await fetchSearchIntentBatch([])
    expect(result.size).toBe(0)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('skips items with null keyword_intent', async () => {
    mockFetch.mockResolvedValueOnce(
      makeBatchResponse([
        { keyword: 'test', keyword_intent: null },
        { keyword: 'seo', keyword_intent: { label: 'informational', probability: 0.9 } },
      ]),
    )

    const result = await fetchSearchIntentBatch(['test', 'seo'])
    expect(result.size).toBe(1)
    expect(result.has('test')).toBe(false)
    expect(result.get('seo')).toEqual({ intent: 'informational', intentProbability: 0.9 })
  })

  it('handles API error gracefully', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Internal Server Error' })
    const result = await fetchSearchIntentBatch(['test'])
    expect(result.size).toBe(0)
  })
})

describe('dataforseo.service — auditCocoonKeywords', () => {
  const makeKeyword = (keyword: string, type: 'Pilier' | 'Moyenne traine' | 'Longue traine' = 'Pilier') => ({
    keyword,
    type,
    cocoonName: 'test-cocoon',
  })

  it('returns cached results when cache is fresh', async () => {
    const origHours = process.env.DATAFORSEO_MIN_REFRESH_HOURS
    process.env.DATAFORSEO_MIN_REFRESH_HOURS = '24'

    const freshCache = {
      keyword: 'refonte site web',
      serp: [],
      paa: [],
      relatedKeywords: [{ keyword: 'related', searchVolume: 100, competition: 0.1, cpc: 0.5 }],
      keywordData: { searchVolume: 2400, difficulty: 45, cpc: 2.5, competition: 0.6, monthlySearches: [2400] },
      cachedAt: new Date().toISOString(),
    }
    mockReadJson.mockResolvedValue({ data: freshCache, cachedAt: freshCache.cachedAt })

    const results = await auditCocoonKeywords([makeKeyword('refonte site web')])
    expect(results).toHaveLength(1)
    expect(results[0].fromCache).toBe(true)
    expect(results[0].searchVolume).toBe(2400)
    expect(results[0].compositeScore.total).toBeGreaterThan(0)
    expect(mockFetch).not.toHaveBeenCalled()

    if (origHours !== undefined) process.env.DATAFORSEO_MIN_REFRESH_HOURS = origHours
    else delete process.env.DATAFORSEO_MIN_REFRESH_HOURS
  })

  it('fetches data for stale keywords using batch endpoints', async () => {
    const origHours = process.env.DATAFORSEO_MIN_REFRESH_HOURS
    process.env.DATAFORSEO_MIN_REFRESH_HOURS = '24'

    // Cache miss
    mockReadJson.mockRejectedValue(new Error('ENOENT'))
    mockWriteJson.mockResolvedValue(undefined)

    // Batch overview (call 1)
    mockFetch.mockResolvedValueOnce(
      makeBatchResponse([{
        keyword: 'refonte site web',
        keyword_info: { search_volume: 2400, cpc: 2.5, competition: 0.6, monthly_searches: [{ search_volume: 2400 }] },
        keyword_properties: { keyword_difficulty: 45, words_count: 3 },
      }]),
    )
    // Batch intent (call 2)
    mockFetch.mockResolvedValueOnce(
      makeBatchResponse([{
        keyword: 'refonte site web',
        keyword_intent: { label: 'commercial', probability: 0.85 },
      }]),
    )
    // Related keywords (call 3 — individual)
    mockFetch.mockResolvedValueOnce(
      makeDfsResponse({
        items: [{
          keyword_data: { keyword: 'refonte site web', keyword_info: { search_volume: 2400, competition: 0.6, cpc: 2.5 } },
          related_keywords: [
            { keyword: 'refonte web', keyword_info: { search_volume: 500, competition: 0.3, cpc: 1.0 } },
          ],
        }],
      }),
    )

    const results = await auditCocoonKeywords([makeKeyword('refonte site web')])

    expect(results).toHaveLength(1)
    expect(results[0].fromCache).toBe(false)
    expect(results[0].searchVolume).toBe(2400)
    expect(results[0].intent).toBe('commercial')
    expect(results[0].intentProbability).toBe(0.85)
    expect(results[0].wordsCount).toBe(3)
    expect(results[0].relatedKeywords).toHaveLength(1)
    expect(results[0].compositeScore.total).toBeGreaterThan(0)
    // 3 fetch calls: batchOverview + batchIntent + relatedKeywords
    expect(mockFetch).toHaveBeenCalledTimes(3)
    // Cache was written
    expect(mockWriteJson).toHaveBeenCalledTimes(1)

    if (origHours !== undefined) process.env.DATAFORSEO_MIN_REFRESH_HOURS = origHours
    else delete process.env.DATAFORSEO_MIN_REFRESH_HOURS
  })

  it('forces refresh even when cache is fresh', async () => {
    const origHours = process.env.DATAFORSEO_MIN_REFRESH_HOURS
    process.env.DATAFORSEO_MIN_REFRESH_HOURS = '24'

    const freshCache = {
      keyword: 'test kw',
      serp: [],
      paa: [],
      relatedKeywords: [],
      keywordData: { searchVolume: 100, difficulty: 10, cpc: 0.5, competition: 0.2, monthlySearches: [] },
      cachedAt: new Date().toISOString(),
    }
    // readCache returns fresh data
    mockReadJson.mockResolvedValue({ data: freshCache, cachedAt: freshCache.cachedAt })
    mockWriteJson.mockResolvedValue(undefined)

    // But with forceRefresh, it should still fetch
    mockFetch
      .mockResolvedValueOnce(makeBatchResponse([{ keyword: 'test kw', keyword_info: { search_volume: 200, cpc: 1.0, competition: 0.3, monthly_searches: null }, keyword_properties: { keyword_difficulty: 15 } }]))
      .mockResolvedValueOnce(makeBatchResponse([{ keyword: 'test kw', keyword_intent: { label: 'informational', probability: 0.9 } }]))
      // related_keywords returns empty → triggers fetchKeywordSuggestions fallback (4th call)
      .mockResolvedValueOnce(makeDfsResponse({ items: [{ keyword_data: { keyword: 'test kw', keyword_info: {} }, related_keywords: [] }] }))
      .mockResolvedValueOnce(makeDfsResponse({ items: [{ keyword: 'suggestion', keyword_info: { search_volume: 50, competition: 0.1, cpc: 0.3 } }] }))

    const results = await auditCocoonKeywords([makeKeyword('test kw')], true)

    expect(results).toHaveLength(1)
    expect(results[0].fromCache).toBe(false)
    expect(results[0].searchVolume).toBe(200)
    // 4 calls: batchOverview + batchIntent + relatedKeywords (empty) + keywordSuggestions (fallback)
    expect(mockFetch).toHaveBeenCalledTimes(4)

    if (origHours !== undefined) process.env.DATAFORSEO_MIN_REFRESH_HOURS = origHours
    else delete process.env.DATAFORSEO_MIN_REFRESH_HOURS
  })
})

describe('dataforseo.service — getAuditCacheStatus', () => {
  it('counts fresh cached keywords', async () => {
    const origHours = process.env.DATAFORSEO_MIN_REFRESH_HOURS
    process.env.DATAFORSEO_MIN_REFRESH_HOURS = '24'

    const freshCachedAt = new Date().toISOString()
    mockReadJson
      .mockResolvedValueOnce({ data: { keyword: 'kw1', serp: [], paa: [], relatedKeywords: [], keywordData: {}, cachedAt: freshCachedAt }, cachedAt: freshCachedAt })
      .mockRejectedValueOnce(new Error('ENOENT'))

    const status = await getAuditCacheStatus([
      { keyword: 'kw1', type: 'Pilier' as const, cocoonName: 'test' },
      { keyword: 'kw2', type: 'Pilier' as const, cocoonName: 'test' },
    ])

    expect(status.totalKeywords).toBe(2)
    expect(status.cachedKeywords).toBe(1)
    expect(status.cocoonName).toBe('test')
    expect(status.lastAuditDate).toBe(freshCachedAt)

    if (origHours !== undefined) process.env.DATAFORSEO_MIN_REFRESH_HOURS = origHours
    else delete process.env.DATAFORSEO_MIN_REFRESH_HOURS
  })
})
