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
  slugify,
  readCache,
  fetchDataForSeo,
  fetchSerp,
  fetchPaa,
  fetchRelatedKeywords,
  fetchKeywordOverview,
  getBrief,
} from '../../../server/services/dataforseo.service'

const mockReadJson = vi.mocked(readJson)
const mockWriteJson = vi.mocked(writeJson)

beforeEach(() => {
  mockFetch.mockReset()
  mockReadJson.mockReset()
  mockWriteJson.mockReset()
})

// --- Helper: create a DataForSEO-shaped response ---
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
    mockReadJson.mockResolvedValue(cached)
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
          { keyword_data: { keyword: 'seo tips', search_volume: 1000, competition: 0.5, cpc: 1.2 } },
          { keyword_data: { keyword: 'seo guide', search_volume: 800, competition: 0.3, cpc: 0.8 } },
        ],
      }),
    )

    const results = await fetchRelatedKeywords('seo')
    expect(results).toHaveLength(2)
    expect(results[0]).toEqual({ keyword: 'seo tips', searchVolume: 1000, competition: 0.5, cpc: 1.2 })
  })
})

describe('dataforseo.service — fetchKeywordOverview', () => {
  it('extracts keyword metrics', async () => {
    mockFetch.mockResolvedValue(
      makeDfsResponse({
        items: [
          {
            keyword: 'refonte site web',
            search_volume: 2400,
            keyword_difficulty: 45,
            cpc: 2.5,
            competition: 0.6,
            monthly_searches: [{ search_volume: 2000 }, { search_volume: 2400 }],
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
    mockReadJson.mockResolvedValue(mockCached)

    const result = await getBrief('test keyword')

    expect(result).toEqual(mockCached)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('calls all 4 endpoints on cache miss', async () => {
    mockReadJson.mockRejectedValue(new Error('ENOENT'))
    mockWriteJson.mockResolvedValue(undefined)

    // Mock 4 fetch calls (serp, paa, related, keyword)
    mockFetch
      .mockResolvedValueOnce(makeDfsResponse({ items: [{ type: 'organic', rank_group: 1, title: 'T', url: 'http://t.com', description: 'D', domain: 't.com' }] }))
      .mockResolvedValueOnce(makeDfsResponse({ items: [{ type: 'people_also_ask', title: 'Q?' }] }))
      .mockResolvedValueOnce(makeDfsResponse({ items: [{ keyword_data: { keyword: 'rel', search_volume: 100, competition: 0.1, cpc: 0.5 } }] }))
      .mockResolvedValueOnce(makeDfsResponse({ items: [{ keyword: 'test', search_volume: 500, keyword_difficulty: 30, cpc: 1.0, competition: 0.4, monthly_searches: [{ search_volume: 500 }] }] }))

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
    mockReadJson.mockResolvedValue(mockCached)
    mockWriteJson.mockResolvedValue(undefined)

    // Mock 4 fetch calls
    mockFetch
      .mockResolvedValueOnce(makeDfsResponse({ items: [] }))
      .mockResolvedValueOnce(makeDfsResponse({ items: [] }))
      .mockResolvedValueOnce(makeDfsResponse({ items: [] }))
      .mockResolvedValueOnce(makeDfsResponse({ items: [{ keyword: 'test', search_volume: 100, keyword_difficulty: 10, cpc: 0.5, competition: 0.2, monthly_searches: [] }] }))

    const result = await getBrief('test keyword', true)

    expect(mockFetch).toHaveBeenCalledTimes(4)
    expect(result.keyword).toBe('test keyword')
  })
})
