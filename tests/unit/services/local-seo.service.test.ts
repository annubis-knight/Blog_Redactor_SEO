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
import { analyzeMaps } from '../../../server/services/local-seo.service'

const mockReadJson = vi.mocked(readJson)
const mockWriteJson = vi.mocked(writeJson)

beforeEach(() => {
  mockFetch.mockReset()
  mockReadJson.mockReset()
  mockWriteJson.mockReset()
  delete process.env.MY_GBP_REVIEWS
})

// --- Helper: build a DataForSEO Maps API response ---
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
    mockReadJson.mockResolvedValue({ data: cached, cachedAt: cached.cachedAt })

    const result = await analyzeMaps('plombier toulouse')

    expect(result).toEqual(cached)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('calls Maps SERP endpoint on cache miss', async () => {
    mockReadJson.mockRejectedValue(new Error('ENOENT'))
    mockWriteJson.mockResolvedValue(undefined)
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
    mockReadJson.mockRejectedValue(new Error('ENOENT'))
    mockWriteJson.mockResolvedValue(undefined)

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
    mockReadJson.mockRejectedValue(new Error('ENOENT'))
    mockWriteJson.mockResolvedValue(undefined)
    process.env.MY_GBP_REVIEWS = '50'

    // 5 listings with votes_count: 100, 200, 150, 80, 120 → avg = 130
    const items = [
      makeListing({ votes_count: 100 }, 0),
      makeListing({ votes_count: 200 }, 1),
      makeListing({ votes_count: 150 }, 2),
      makeListing({ votes_count: 80 }, 3),
      makeListing({ votes_count: 120 }, 4),
    ]
    mockFetch.mockResolvedValue(makeMapsResponse(items))

    const result = await analyzeMaps('plombier toulouse')

    expect(result.reviewGap.averageCompetitorReviews).toBe(130) // (100+200+150+80+120)/5
    expect(result.reviewGap.myReviews).toBe(50)
    expect(result.reviewGap.gap).toBe(80) // 130 - 50
    expect(result.reviewGap.objective).toContain('80')
  })

  it('sets hasLocalPack based on listings presence', async () => {
    mockReadJson.mockRejectedValue(new Error('ENOENT'))
    mockWriteJson.mockResolvedValue(undefined)

    // Empty items → hasLocalPack = false
    mockFetch.mockResolvedValue(makeMapsResponse([]))

    const result = await analyzeMaps('mot clef obscur')

    expect(result.hasLocalPack).toBe(false)
    expect(result.listings).toHaveLength(0)
  })

  it('writes result to cache', async () => {
    mockReadJson.mockRejectedValue(new Error('ENOENT'))
    mockWriteJson.mockResolvedValue(undefined)
    mockFetch.mockResolvedValue(makeMapsResponse([makeListing()]))

    const result = await analyzeMaps('plombier toulouse')

    expect(mockWriteJson).toHaveBeenCalledTimes(1)
    const [cachePath, wrappedData] = mockWriteJson.mock.calls[0]
    expect(cachePath).toContain('maps-plombier-toulouse.json')
    expect(wrappedData.data).toEqual(result)
  })

  it('handles API errors', async () => {
    mockReadJson.mockRejectedValue(new Error('ENOENT'))
    mockFetch.mockResolvedValue({ ok: false, status: 500, statusText: 'Internal Server Error' })

    await expect(analyzeMaps('plombier toulouse')).rejects.toThrow('DataForSEO Maps error: 500')
  })

  it('limits listings to 20', async () => {
    mockReadJson.mockRejectedValue(new Error('ENOENT'))
    mockWriteJson.mockResolvedValue(undefined)

    // Generate 25 raw items
    const items = Array.from({ length: 25 }, (_, i) => makeListing({ title: `Biz ${i + 1}` }, i))
    mockFetch.mockResolvedValue(makeMapsResponse(items))

    const result = await analyzeMaps('plombier toulouse')

    expect(result.listings).toHaveLength(20)
    expect(result.listings[0].title).toBe('Biz 1')
    expect(result.listings[19].title).toBe('Biz 20')
  })
})
