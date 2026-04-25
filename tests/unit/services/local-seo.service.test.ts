// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Mocks ---
// Sprint 15.5 — local-seo now uses keyword_metrics.local_analysis (DB), not api_cache.
const mockGetKeywordMetrics = vi.fn()
const mockUpsertKeywordLocal = vi.fn()
const mockIsFresh = vi.fn()

vi.mock('../../../server/services/keyword/keyword-metrics.service', () => ({
  getKeywordMetrics: (...args: unknown[]) => mockGetKeywordMetrics(...args),
  upsertKeywordLocalAnalysis: (...args: unknown[]) => mockUpsertKeywordLocal(...args),
  isKeywordMetricsFresh: (...args: unknown[]) => mockIsFresh(...args),
}))

vi.mock('../../../server/services/external/dataforseo.service', () => ({
  getBaseUrl: () => 'https://sandbox.dataforseo.com/v3',
  getAuthHeader: () => 'Basic dGVzdDp0ZXN0',
  isSandbox: () => true,
}))

vi.mock('../../../server/utils/logger', () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

import { analyzeMaps } from '../../../server/services/strategy/local-seo.service'

beforeEach(() => {
  vi.clearAllMocks()
  mockGetKeywordMetrics.mockResolvedValue(null)
  mockUpsertKeywordLocal.mockResolvedValue(undefined)
  mockIsFresh.mockReturnValue(false)
  delete process.env.MY_GBP_REVIEWS
})

// --- Helpers ---

function makeMapsResponse(items: any[]) {
  return {
    ok: true,
    json: () =>
      Promise.resolve({
        status_code: 20000,
        tasks: [{ status_code: 20000, result: [{ items }] }],
      }),
  }
}

function makeListing(overrides: Record<string, any> = {}, idx = 0) {
  return {
    title: overrides.title ?? `Business ${idx + 1}`,
    category: overrides.category ?? 'Restaurant',
    is_claimed: overrides.is_claimed ?? true,
    rating: { value: overrides.rating ?? 4.5, votes_count: overrides.votes_count ?? 100 },
    address: overrides.address ?? '1 Rue du Test, Toulouse',
    snippet: overrides.snippet ?? null,
    url: overrides.url ?? `https://business${idx + 1}.com`,
    phone: overrides.phone ?? '+33 5 00 00 00 00',
  }
}

describe('local-seo.service — analyzeMaps', () => {
  it('returns cached data when available', async () => {
    const cached = {
      keyword: 'plombier toulouse',
      locationCode: 1006157,
      hasLocalPack: true,
      listings: [{ position: 1, title: 'Plombier Pro', category: 'Plumber', isClaimed: true, rating: 4.8, votesCount: 200, address: '1 Rue', snippet: null, url: 'https://a.com', phone: '+33' }],
      reviewGap: { averageCompetitorReviews: 200, myReviews: 0, gap: 200, objective: 'Obtenir 200 avis' },
      cachedAt: '2026-01-01T00:00:00Z',
    }
    // Sprint 15.5 — DB row with local_analysis populated + fresh
    mockGetKeywordMetrics.mockResolvedValue({ localAnalysis: cached, fetchedAt: new Date().toISOString() })
    mockIsFresh.mockReturnValue(true)

    const result = await analyzeMaps('plombier toulouse')

    expect(result).toEqual(cached)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('calls Maps SERP endpoint on cache miss', async () => {
    mockGetKeywordMetrics.mockResolvedValue(null)
    mockFetch.mockResolvedValue(makeMapsResponse([makeListing()]))

    await analyzeMaps('plombier toulouse', 1006157)

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, options] = mockFetch.mock.calls[0]
    expect(url).toContain('/serp/google/maps/live/advanced')
    expect(options.method).toBe('POST')
    const body = JSON.parse(options.body)
    expect(body[0].keyword).toBe('plombier toulouse')
    expect(body[0].location_code).toBe(1006157)
    expect(body[0].language_code).toBe('fr')
  })

  it('extracts listings correctly', async () => {
    mockGetKeywordMetrics.mockResolvedValue(null)

    const rawItem = {
      title: 'Chez Paul',
      category: 'Restaurant',
      is_claimed: true,
      rating: { value: 4.2, votes_count: 85 },
      address: '10 Place du Capitole, Toulouse',
      snippet: 'Best food',
      url: 'https://chezpaul.fr',
      phone: '+33 5 61 00 00 00',
    }
    mockFetch.mockResolvedValue(makeMapsResponse([rawItem]))

    const result = await analyzeMaps('restaurant toulouse')

    expect(result.listings).toHaveLength(1)
    const listing = result.listings[0]
    expect(listing.position).toBe(1)
    expect(listing.title).toBe('Chez Paul')
    expect(listing.category).toBe('Restaurant')
    expect(listing.isClaimed).toBe(true)
    expect(listing.rating).toBe(4.2)
    expect(listing.votesCount).toBe(85)
    expect(listing.address).toBe('10 Place du Capitole, Toulouse')
    expect(listing.phone).toBe('+33 5 61 00 00 00')
    expect(listing.url).toBe('https://chezpaul.fr')
  })

  it('calculates review gap (average top 5 reviews minus MY_GBP_REVIEWS)', async () => {
    mockGetKeywordMetrics.mockResolvedValue(null)
    process.env.MY_GBP_REVIEWS = '50'

    const items = [
      makeListing({ votes_count: 100 }, 0),
      makeListing({ votes_count: 200 }, 1),
      makeListing({ votes_count: 150 }, 2),
      makeListing({ votes_count: 80 }, 3),
      makeListing({ votes_count: 120 }, 4),
    ]
    mockFetch.mockResolvedValue(makeMapsResponse(items))

    const result = await analyzeMaps('plombier toulouse')

    expect(result.reviewGap.averageCompetitorReviews).toBe(130)
    expect(result.reviewGap.myReviews).toBe(50)
    expect(result.reviewGap.gap).toBe(80)
    expect(result.reviewGap.objective).toContain('80')
  })

  it('sets hasLocalPack based on listings presence', async () => {
    mockGetKeywordMetrics.mockResolvedValue(null)
    mockFetch.mockResolvedValue(makeMapsResponse([]))

    const result = await analyzeMaps('mot clef obscur')

    expect(result.hasLocalPack).toBe(false)
    expect(result.listings).toHaveLength(0)
  })

  it('persists result to keyword_metrics.local_analysis', async () => {
    mockFetch.mockResolvedValue(makeMapsResponse([makeListing()]))

    const result = await analyzeMaps('plombier toulouse')

    expect(mockUpsertKeywordLocal).toHaveBeenCalledTimes(1)
    const [keyword, analysis] = mockUpsertKeywordLocal.mock.calls[0]
    expect(keyword).toBe('plombier toulouse')
    expect(analysis).toEqual(result)
  })

  it('handles API errors', async () => {
    mockGetKeywordMetrics.mockResolvedValue(null)
    mockFetch.mockResolvedValue({ ok: false, status: 500, statusText: 'Internal Server Error' })

    await expect(analyzeMaps('plombier toulouse')).rejects.toThrow('DataForSEO Maps error: 500')
  })

  it('limits listings to 20', async () => {
    mockGetKeywordMetrics.mockResolvedValue(null)

    const items = Array.from({ length: 25 }, (_, i) => makeListing({ title: `Biz ${i + 1}` }, i))
    mockFetch.mockResolvedValue(makeMapsResponse(items))

    const result = await analyzeMaps('plombier toulouse')

    expect(result.listings).toHaveLength(20)
    expect(result.listings[0].title).toBe('Biz 1')
    expect(result.listings[19].title).toBe('Biz 20')
  })
})
