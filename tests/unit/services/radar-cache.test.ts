// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Mocks ---
const mockGetCached = vi.fn()
const mockSetCached = vi.fn()
const mockDeleteCached = vi.fn()

vi.mock('../../../server/db/cache-helpers', () => ({
  getCached: (...args: unknown[]) => mockGetCached(...args),
  setCached: (...args: unknown[]) => mockSetCached(...args),
  deleteCached: (...args: unknown[]) => mockDeleteCached(...args),
  slugify: (s: string) => s.toLowerCase().replace(/\s+/g, '-'),
}))

vi.mock('../../../server/utils/logger', () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { checkRadarCache, loadRadarCache, saveRadarCache, clearRadarCache } from '../../../server/services/infra/radar-cache.service'

const validEntry = {
  seed: 'refonte site web',
  context: { broadKeyword: 'site web', specificTopic: 'refonte site', painPoint: 'baisse trafic', depth: 1 },
  generatedKeywords: [{ keyword: 'refondre site', reasoning: 'test' }],
  scanResult: {
    specificTopic: 'refonte site',
    broadKeyword: 'site web',
    autocomplete: { suggestions: [], totalCount: 0 },
    cards: [],
    globalScore: 72,
    heatLevel: 'chaude' as const,
    verdict: 'Bon potentiel',
    scannedAt: '2026-03-30T12:00:00.000Z',
  },
  cachedAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
}

beforeEach(() => {
  vi.clearAllMocks()
  mockSetCached.mockResolvedValue(undefined)
  mockDeleteCached.mockResolvedValue(undefined)
})

describe('radar-cache.service', () => {
  describe('checkRadarCache', () => {
    it('returns cached: false when no entry exists', async () => {
      mockGetCached.mockResolvedValue(null)
      const status = await checkRadarCache('unknown-keyword')
      expect(status).toEqual({ cached: false })
    })

    it('returns cached: true with metadata when file exists and is valid', async () => {
      mockGetCached.mockResolvedValue(validEntry)
      const status = await checkRadarCache('refonte site web')
      expect(status.cached).toBe(true)
      expect(status.globalScore).toBe(72)
      expect(status.keywordCount).toBe(1)
      expect(status.heatLevel).toBe('chaude')
    })
  })

  describe('loadRadarCache', () => {
    it('returns null when no entry exists', async () => {
      mockGetCached.mockResolvedValue(null)
      const data = await loadRadarCache('unknown')
      expect(data).toBeNull()
    })

    it('returns entry when file exists and is valid', async () => {
      mockGetCached.mockResolvedValue(validEntry)
      const data = await loadRadarCache('refonte site web')
      expect(data).toBeTruthy()
      expect(data!.scanResult.globalScore).toBe(72)
      expect(data!.generatedKeywords).toHaveLength(1)
    })

    it('uses memory cache on second call', async () => {
      mockGetCached.mockResolvedValue(validEntry)
      await loadRadarCache('refonte site web')
      await loadRadarCache('refonte site web')
      // getCached delegates to PG — service calls it each time (no in-memory layer anymore)
      expect(mockGetCached).toHaveBeenCalledTimes(2)
    })
  })

  describe('saveRadarCache', () => {
    it('writes to cache and returns full entry with timestamps', async () => {
      const result = await saveRadarCache({
        seed: 'test keyword',
        context: { broadKeyword: 'test', specificTopic: 'test kw', painPoint: 'pain', depth: 1 },
        generatedKeywords: [{ keyword: 'kw1', reasoning: 'r' }],
        scanResult: validEntry.scanResult,
      })
      expect(result.cachedAt).toBeTruthy()
      expect(result.expiresAt).toBeTruthy()
      expect(mockSetCached).toHaveBeenCalledTimes(1)
      expect(mockSetCached.mock.calls[0][0]).toBe('radar')
    })
  })

  describe('clearRadarCache', () => {
    it('deletes entry from cache', async () => {
      await clearRadarCache('refonte site web')
      expect(mockDeleteCached).toHaveBeenCalledTimes(1)
      expect(mockDeleteCached.mock.calls[0][0]).toBe('radar')
    })

    it('does not throw if entry does not exist', async () => {
      mockDeleteCached.mockResolvedValue(undefined)
      await expect(clearRadarCache('nonexistent')).resolves.not.toThrow()
    })
  })
})
