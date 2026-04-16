// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Mocks ---
const mockReadJson = vi.fn()
const mockWriteJson = vi.fn()
const mockUnlink = vi.fn()

vi.mock('../../../server/utils/json-storage', () => ({
  readJson: (...args: unknown[]) => mockReadJson(...args),
  writeJson: (...args: unknown[]) => mockWriteJson(...args),
}))

vi.mock('fs/promises', () => ({
  unlink: (...args: unknown[]) => mockUnlink(...args),
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

const expiredEntry = {
  ...validEntry,
  expiresAt: new Date(Date.now() - 1000).toISOString(),
}

beforeEach(async () => {
  vi.resetAllMocks()
  // Clear memory cache between tests to avoid cross-pollution
  mockUnlink.mockResolvedValue(undefined)
  await clearRadarCache('refonte site web')
  await clearRadarCache('refonte-site-web')
  await clearRadarCache('unknown-keyword')
  await clearRadarCache('unknown')
  await clearRadarCache('test keyword')
  await clearRadarCache('mem-test')
  mockUnlink.mockReset()
})

describe('radar-cache.service', () => {
  describe('checkRadarCache', () => {
    it('returns cached: false when no file exists', async () => {
      mockReadJson.mockRejectedValue(new Error('ENOENT'))
      const status = await checkRadarCache('unknown-keyword')
      expect(status).toEqual({ cached: false })
    })

    it('returns cached: true with metadata when file exists and is valid', async () => {
      mockReadJson.mockResolvedValue(validEntry)
      const status = await checkRadarCache('refonte site web')
      expect(status.cached).toBe(true)
      expect(status.globalScore).toBe(72)
      expect(status.keywordCount).toBe(1)
      expect(status.heatLevel).toBe('chaude')
    })

    it('returns cached: false when entry is expired', async () => {
      mockReadJson.mockResolvedValue(expiredEntry)
      const status = await checkRadarCache('refonte site web')
      expect(status).toEqual({ cached: false })
    })
  })

  describe('loadRadarCache', () => {
    it('returns null when no file exists', async () => {
      mockReadJson.mockRejectedValue(new Error('ENOENT'))
      const data = await loadRadarCache('unknown')
      expect(data).toBeNull()
    })

    it('returns entry when file exists and is valid', async () => {
      mockReadJson.mockResolvedValue(validEntry)
      const data = await loadRadarCache('refonte site web')
      expect(data).toBeTruthy()
      expect(data!.scanResult.globalScore).toBe(72)
      expect(data!.generatedKeywords).toHaveLength(1)
    })

    it('returns null when entry is expired', async () => {
      mockReadJson.mockResolvedValue(expiredEntry)
      const data = await loadRadarCache('refonte site web')
      expect(data).toBeNull()
    })

    it('uses memory cache on second call', async () => {
      mockReadJson.mockResolvedValue(validEntry)
      await loadRadarCache('refonte site web')
      await loadRadarCache('refonte site web')
      // Only one disk read — second call hits memory
      expect(mockReadJson).toHaveBeenCalledTimes(1)
    })
  })

  describe('saveRadarCache', () => {
    it('writes to disk and returns full entry with timestamps', async () => {
      mockWriteJson.mockResolvedValue(undefined)
      const result = await saveRadarCache({
        seed: 'test keyword',
        context: { broadKeyword: 'test', specificTopic: 'test kw', painPoint: 'pain', depth: 1 },
        generatedKeywords: [{ keyword: 'kw1', reasoning: 'r' }],
        scanResult: validEntry.scanResult,
      })
      expect(result.cachedAt).toBeTruthy()
      expect(result.expiresAt).toBeTruthy()
      expect(mockWriteJson).toHaveBeenCalledTimes(1)
    })

    it('populates memory cache so subsequent load is instant', async () => {
      mockWriteJson.mockResolvedValue(undefined)
      await saveRadarCache({
        seed: 'mem-test',
        context: { broadKeyword: 'mem', specificTopic: 'test', painPoint: '', depth: 1 },
        generatedKeywords: [],
        scanResult: validEntry.scanResult,
      })

      // Now load — should hit memory, not disk
      const loaded = await loadRadarCache('mem-test')
      expect(loaded).toBeTruthy()
      expect(mockReadJson).not.toHaveBeenCalled()
    })
  })

  describe('clearRadarCache', () => {
    it('deletes file from disk', async () => {
      mockUnlink.mockResolvedValue(undefined)
      await clearRadarCache('refonte site web')
      expect(mockUnlink).toHaveBeenCalledTimes(1)
    })

    it('does not throw if file does not exist', async () => {
      mockUnlink.mockRejectedValue(new Error('ENOENT'))
      await expect(clearRadarCache('nonexistent')).resolves.not.toThrow()
    })
  })
})
