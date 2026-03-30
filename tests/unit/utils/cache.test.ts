import { describe, it, expect, afterEach, vi } from 'vitest'
import { rm, mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import {
  readCached,
  writeCached,
  isFresh,
  getOrFetch,
  slugify,
} from '../../../server/utils/cache.js'
import { writeJson } from '../../../server/utils/json-storage.js'

const TEST_DIR = join(process.cwd(), 'tests', '.tmp', 'cache')

afterEach(async () => {
  try {
    await rm(TEST_DIR, { recursive: true, force: true })
  } catch {
    // ignore
  }
})

describe('cache', () => {
  // --- slugify ---
  describe('slugify', () => {
    it('normalizes accented text to lowercase hyphens', () => {
      expect(slugify('Design Émotionnel')).toBe('design-emotionnel')
    })

    it('removes special characters', () => {
      expect(slugify('web design & UX')).toBe('web-design-ux')
    })

    it('trims leading/trailing hyphens', () => {
      expect(slugify('--hello--')).toBe('hello')
    })
  })

  // --- isFresh ---
  describe('isFresh', () => {
    it('returns true when timestamp is within TTL', () => {
      const cachedAt = new Date().toISOString()
      expect(isFresh(cachedAt, 60_000)).toBe(true)
    })

    it('returns false when TTL is exceeded', () => {
      const cachedAt = new Date(Date.now() - 120_000).toISOString()
      expect(isFresh(cachedAt, 60_000)).toBe(false)
    })

    it('returns false when TTL is zero or negative', () => {
      const cachedAt = new Date().toISOString()
      expect(isFresh(cachedAt, 0)).toBe(false)
      expect(isFresh(cachedAt, -1)).toBe(false)
    })
  })

  // --- readCached / writeCached ---
  describe('readCached / writeCached', () => {
    it('returns null when cache file does not exist', async () => {
      const result = await readCached(TEST_DIR, 'nonexistent')
      expect(result).toBeNull()
    })

    it('round-trips data through write then read', async () => {
      const data = { keyword: 'test', value: 42 }
      await writeCached(TEST_DIR, 'round-trip', data)

      const result = await readCached<typeof data>(TEST_DIR, 'round-trip')
      expect(result).not.toBeNull()
      expect(result!.data).toEqual(data)
      expect(typeof result!.cachedAt).toBe('string')
    })

    it('returns null for old-format files (no CacheEntry wrapper)', async () => {
      await mkdir(TEST_DIR, { recursive: true })
      await writeJson(join(TEST_DIR, 'old-format.json'), { keyword: 'test', value: 42 })

      const result = await readCached(TEST_DIR, 'old-format')
      expect(result).toBeNull()
    })
  })

  // --- getOrFetch ---
  describe('getOrFetch', () => {
    it('returns cached data when fresh (no fetcher call)', async () => {
      await writeCached(TEST_DIR, 'fresh', { answer: 42 })

      const fetcher = vi.fn().mockResolvedValue({ answer: 99 })
      const result = await getOrFetch(TEST_DIR, 'fresh', 60_000, fetcher)

      expect(result).toEqual({ answer: 42 })
      expect(fetcher).not.toHaveBeenCalled()
    })

    it('calls fetcher when cache is absent', async () => {
      const fetcher = vi.fn().mockResolvedValue({ answer: 42 })
      const result = await getOrFetch(TEST_DIR, 'missing', 60_000, fetcher)

      expect(result).toEqual({ answer: 42 })
      expect(fetcher).toHaveBeenCalledOnce()
    })

    it('calls fetcher when cache is expired (TTL exceeded)', async () => {
      // Write a stale cache entry
      await mkdir(TEST_DIR, { recursive: true })
      await writeJson(join(TEST_DIR, 'stale.json'), {
        data: { answer: 42 },
        cachedAt: new Date(Date.now() - 120_000).toISOString(),
      })

      const fetcher = vi.fn().mockResolvedValue({ answer: 99 })
      const result = await getOrFetch(TEST_DIR, 'stale', 60_000, fetcher)

      expect(result).toEqual({ answer: 99 })
      expect(fetcher).toHaveBeenCalledOnce()
    })

    it('writes result to disk after a fetch', async () => {
      const fetcher = vi.fn().mockResolvedValue({ answer: 42 })
      await getOrFetch(TEST_DIR, 'persisted', 60_000, fetcher)

      const cached = await readCached<{ answer: number }>(TEST_DIR, 'persisted')
      expect(cached).not.toBeNull()
      expect(cached!.data).toEqual({ answer: 42 })
    })

    it('handles corrupt cache files gracefully (fetcher called)', async () => {
      await mkdir(TEST_DIR, { recursive: true })
      await writeFile(join(TEST_DIR, 'corrupt.json'), 'NOT-JSON!!!', 'utf-8')

      const fetcher = vi.fn().mockResolvedValue({ answer: 42 })
      const result = await getOrFetch(TEST_DIR, 'corrupt', 60_000, fetcher)

      expect(result).toEqual({ answer: 42 })
      expect(fetcher).toHaveBeenCalledOnce()
    })

    it('works with Infinity TTL (cache forever)', async () => {
      await writeCached(TEST_DIR, 'forever', { answer: 42 })

      const fetcher = vi.fn().mockResolvedValue({ answer: 99 })
      const result = await getOrFetch(TEST_DIR, 'forever', Infinity, fetcher)

      expect(result).toEqual({ answer: 42 })
      expect(fetcher).not.toHaveBeenCalled()
    })
  })
})
