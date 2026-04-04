// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Mocks ---
const mockCheck = vi.fn()
const mockLoad = vi.fn()
const mockSave = vi.fn()
const mockClear = vi.fn()

vi.mock('../../../server/services/radar-cache.service', () => ({
  checkRadarCache: (...args: unknown[]) => mockCheck(...args),
  loadRadarCache: (...args: unknown[]) => mockLoad(...args),
  saveRadarCache: (...args: unknown[]) => mockSave(...args),
  clearRadarCache: (...args: unknown[]) => mockClear(...args),
}))

vi.mock('../../../server/utils/logger', () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import router from '../../../server/routes/radar-cache.routes'

// --- Helpers ---
function makeReq(opts: { query?: Record<string, string>; body?: unknown } = {}) {
  return { query: opts.query ?? {}, body: opts.body ?? {}, params: {} } as any
}

function makeRes() {
  const res: any = { statusCode: 200 }
  res.json = vi.fn().mockReturnValue(res)
  res.status = vi.fn((code: number) => { res.statusCode = code; return res })
  return res
}

function getHandler(method: string, path: string) {
  const layer = (router as any).stack.find(
    (l: any) => l.route?.path === path && l.route?.methods?.[method],
  )
  return layer?.route?.stack?.[0]?.handle
}

beforeEach(() => vi.resetAllMocks())

describe('Radar cache routes', () => {
  describe('GET /radar-cache/check', () => {
    const handler = getHandler('get', '/radar-cache/check')

    it('returns 400 if seed is missing', async () => {
      const res = makeRes()
      await handler(makeReq(), res)
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('returns cache status from service', async () => {
      mockCheck.mockResolvedValue({ cached: true, globalScore: 72, keywordCount: 5 })
      const res = makeRes()
      await handler(makeReq({ query: { seed: 'test keyword' } }), res)
      expect(res.json).toHaveBeenCalledWith({ data: { cached: true, globalScore: 72, keywordCount: 5 } })
      expect(mockCheck).toHaveBeenCalledWith('test keyword')
    })

    it('returns 500 on service error', async () => {
      mockCheck.mockRejectedValue(new Error('disk failure'))
      const res = makeRes()
      await handler(makeReq({ query: { seed: 'test' } }), res)
      expect(res.status).toHaveBeenCalledWith(500)
    })
  })

  describe('GET /radar-cache/load', () => {
    const handler = getHandler('get', '/radar-cache/load')

    it('returns 400 if seed is missing', async () => {
      const res = makeRes()
      await handler(makeReq(), res)
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('returns cached data from service', async () => {
      const entry = { seed: 'test', scanResult: { globalScore: 50 } }
      mockLoad.mockResolvedValue(entry)
      const res = makeRes()
      await handler(makeReq({ query: { seed: 'test' } }), res)
      expect(res.json).toHaveBeenCalledWith({ data: entry })
    })

    it('returns null when no cache', async () => {
      mockLoad.mockResolvedValue(null)
      const res = makeRes()
      await handler(makeReq({ query: { seed: 'miss' } }), res)
      expect(res.json).toHaveBeenCalledWith({ data: null })
    })
  })

  describe('POST /radar-cache/save', () => {
    const handler = getHandler('post', '/radar-cache/save')

    it('returns 400 if required fields are missing', async () => {
      const res = makeRes()
      await handler(makeReq({ body: { seed: 'test' } }), res)
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('saves and returns timestamps', async () => {
      mockSave.mockResolvedValue({ cachedAt: '2026-01-01', expiresAt: '2026-01-08' })
      const body = {
        seed: 'test',
        context: { broadKeyword: 'test', specificTopic: 'kw', painPoint: '', depth: 1 },
        generatedKeywords: [],
        scanResult: { globalScore: 60 },
      }
      const res = makeRes()
      await handler(makeReq({ body }), res)
      expect(res.json).toHaveBeenCalledWith({ data: { cachedAt: '2026-01-01', expiresAt: '2026-01-08' } })
    })
  })

  describe('DELETE /radar-cache', () => {
    const handler = getHandler('delete', '/radar-cache')

    it('returns 400 if seed is missing', async () => {
      const res = makeRes()
      await handler(makeReq(), res)
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('clears cache and returns confirmation', async () => {
      mockClear.mockResolvedValue(undefined)
      const res = makeRes()
      await handler(makeReq({ query: { seed: 'test' } }), res)
      expect(res.json).toHaveBeenCalledWith({ data: { cleared: true } })
      expect(mockClear).toHaveBeenCalledWith('test')
    })
  })
})
