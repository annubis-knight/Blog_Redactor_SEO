// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Mocks (must be declared before imports) ---

vi.mock('../../../server/utils/json-storage', () => ({
  readJson: vi.fn(),
  writeJson: vi.fn(),
}))

const mockGetCached = vi.fn()
const mockSetCached = vi.fn()
vi.mock('../../../server/db/cache-helpers', () => ({
  getCached: (...args: unknown[]) => mockGetCached(...args),
  setCached: (...args: unknown[]) => mockSetCached(...args),
  slugify: (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
}))

vi.mock('../../../server/utils/logger', () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { readJson, writeJson } from '../../../server/utils/json-storage'
import {
  getAuthUrl,
  exchangeCode,
  isConnected,
  queryPerformance,
  analyzeKeywordGap,
} from '../../../server/services/external/gsc.service'

const mockReadJson = vi.mocked(readJson)
const mockWriteJson = vi.mocked(writeJson)

let mockFetch: ReturnType<typeof vi.fn>

const mockToken = {
  accessToken: 'test_access',
  refreshToken: 'test_refresh',
  expiresAt: Date.now() + 3600000,
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.stubEnv('GOOGLE_CLIENT_ID', 'test_client_id')
  vi.stubEnv('GOOGLE_CLIENT_SECRET', 'test_client_secret')

  mockFetch = vi.fn()
  vi.stubGlobal('fetch', mockFetch)

  mockWriteJson.mockResolvedValue(undefined)
  mockGetCached.mockReset()
  mockSetCached.mockResolvedValue(undefined)
})

// --- OAuth ---

describe('gsc.service — getAuthUrl', () => {
  it('returns OAuth URL with correct params', () => {
    const url = getAuthUrl()

    expect(url).toContain('https://accounts.google.com/o/oauth2/v2/auth')
    expect(url).toContain('client_id=test_client_id')
    expect(url).toContain('response_type=code')
    expect(url).toContain('scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fwebmasters.readonly')
    expect(url).toContain('access_type=offline')
    expect(url).toContain('prompt=consent')
  })

  it('throws when GOOGLE_CLIENT_ID not set', () => {
    vi.stubEnv('GOOGLE_CLIENT_ID', '')

    expect(() => getAuthUrl()).toThrow('GOOGLE_CLIENT_ID must be set')
  })
})

describe('gsc.service — exchangeCode', () => {
  it('exchanges code for token and saves it', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          access_token: 'new_access',
          refresh_token: 'new_refresh',
          expires_in: 3600,
        }),
    })

    const token = await exchangeCode('auth_code_123')

    // Verify fetch was called to Google OAuth
    expect(mockFetch).toHaveBeenCalledWith(
      'https://oauth2.googleapis.com/token',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }),
    )
    // Verify the body contains the correct params
    const body = mockFetch.mock.calls[0][1].body as URLSearchParams
    expect(body.get('code')).toBe('auth_code_123')
    expect(body.get('grant_type')).toBe('authorization_code')
    expect(body.get('client_id')).toBe('test_client_id')
    expect(body.get('client_secret')).toBe('test_client_secret')

    // Verify returned token
    expect(token.accessToken).toBe('new_access')
    expect(token.refreshToken).toBe('new_refresh')
    expect(token.expiresAt).toBeGreaterThan(Date.now())

    // Verify token was saved
    expect(mockWriteJson).toHaveBeenCalledTimes(1)
    expect(mockWriteJson.mock.calls[0][1]).toMatchObject({
      accessToken: 'new_access',
      refreshToken: 'new_refresh',
    })
  })
})

// --- isConnected ---

describe('gsc.service — isConnected', () => {
  it('returns true when token exists', async () => {
    mockReadJson.mockResolvedValueOnce(mockToken)
    expect(await isConnected()).toBe(true)
  })

  it('returns false when no token', async () => {
    mockReadJson.mockRejectedValueOnce(new Error('no file'))
    expect(await isConnected()).toBe(false)
  })
})

// --- queryPerformance ---

describe('gsc.service — queryPerformance', () => {
  it('returns cached data when today\'s cache exists', async () => {
    const cachedPerf = {
      siteUrl: 'https://propulsite.fr',
      startDate: '2026-01-01',
      endDate: '2026-03-01',
      rows: [{ keys: ['seo', 'https://propulsite.fr/seo'], clicks: 10, impressions: 100, ctr: 0.1, position: 5 }],
      cachedAt: new Date().toISOString(), // today
    }
    mockGetCached.mockResolvedValueOnce(cachedPerf)

    const result = await queryPerformance('https://propulsite.fr', '2026-01-01', '2026-03-01')

    expect(result).toEqual(cachedPerf)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('fetches from GSC API on cache miss', async () => {
    // getCached returns null: cache miss for performance
    mockGetCached.mockResolvedValueOnce(null)
    // readJson: load token (for getValidToken)
    mockReadJson.mockResolvedValueOnce(mockToken)

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          rows: [
            { keys: ['seo toulouse', 'https://propulsite.fr/seo'], clicks: 25, impressions: 500, ctr: 0.05, position: 8.3 },
          ],
        }),
    })

    const result = await queryPerformance('https://propulsite.fr', '2026-01-01', '2026-03-01')

    // Verify GSC API was called
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('googleapis.com/webmasters/v3/sites/'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test_access',
        }),
      }),
    )

    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].clicks).toBe(25)
    expect(result.rows[0].position).toBe(8.3)
    expect(result.siteUrl).toBe('https://propulsite.fr')

    // Verify result was cached via setCached
    expect(mockSetCached).toHaveBeenCalledTimes(1)
  })

  it('handles API error', async () => {
    mockGetCached.mockResolvedValueOnce(null)
    mockReadJson.mockResolvedValueOnce(mockToken)

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
    })

    await expect(
      queryPerformance('https://propulsite.fr', '2026-01-01', '2026-03-01'),
    ).rejects.toThrow('GSC API error: 403')
  })
})

// --- analyzeKeywordGap ---

describe('gsc.service — analyzeKeywordGap', () => {
  it('classifies targeted-matched, targeted-not-indexed, and discovered keywords', async () => {
    // getCached returns null: cache miss for performance
    mockGetCached.mockResolvedValueOnce(null)
    // readJson: load token (for getValidToken)
    mockReadJson.mockResolvedValueOnce(mockToken)

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          rows: [
            // 'seo toulouse' is in target keywords AND in GSC => matched
            { keys: ['seo toulouse', 'https://propulsite.fr/seo-toulouse'], clicks: 30, impressions: 600, ctr: 0.05, position: 4.2 },
            // 'référencement naturel' is NOT in target keywords => discovered
            { keys: ['référencement naturel', 'https://propulsite.fr/seo-toulouse'], clicks: 15, impressions: 300, ctr: 0.05, position: 12 },
          ],
        }),
    })

    const result = await analyzeKeywordGap(
      'https://propulsite.fr/seo-toulouse',
      ['seo toulouse', 'agence seo toulouse'],
      'https://propulsite.fr',
    )

    expect(result.articleUrl).toBe('https://propulsite.fr/seo-toulouse')

    // 'seo toulouse' was targeted and found in GSC
    expect(result.matched).toHaveLength(1)
    expect(result.matched[0].keyword).toBe('seo toulouse')
    expect(result.matched[0].targeted).toBe(true)
    expect(result.matched[0].inGsc).toBe(true)
    expect(result.matched[0].position).toBe(4.2)
    expect(result.matched[0].clicks).toBe(30)

    // 'agence seo toulouse' was targeted but NOT in GSC
    expect(result.targetedNotIndexed).toHaveLength(1)
    expect(result.targetedNotIndexed[0].keyword).toBe('agence seo toulouse')
    expect(result.targetedNotIndexed[0].targeted).toBe(true)
    expect(result.targetedNotIndexed[0].inGsc).toBe(false)
    expect(result.targetedNotIndexed[0].position).toBeNull()

    // 'référencement naturel' was NOT targeted but found in GSC
    expect(result.discoveredOpportunities).toHaveLength(1)
    expect(result.discoveredOpportunities[0].keyword).toBe('référencement naturel')
    expect(result.discoveredOpportunities[0].targeted).toBe(false)
    expect(result.discoveredOpportunities[0].inGsc).toBe(true)
    expect(result.discoveredOpportunities[0].impressions).toBe(300)
  })

  it('handles empty GSC data', async () => {
    mockGetCached.mockResolvedValueOnce(null)
    mockReadJson.mockResolvedValueOnce(mockToken)

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ rows: [] }),
    })

    const result = await analyzeKeywordGap(
      'https://propulsite.fr/new-article',
      ['keyword a', 'keyword b'],
      'https://propulsite.fr',
    )

    // All targeted keywords should be in targetedNotIndexed
    expect(result.matched).toHaveLength(0)
    expect(result.discoveredOpportunities).toHaveLength(0)
    expect(result.targetedNotIndexed).toHaveLength(2)
    expect(result.targetedNotIndexed[0].keyword).toBe('keyword a')
    expect(result.targetedNotIndexed[1].keyword).toBe('keyword b')
  })
})
