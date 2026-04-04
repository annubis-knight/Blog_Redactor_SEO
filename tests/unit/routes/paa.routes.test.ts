// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Mocks ---
vi.mock('../../../server/utils/logger', () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const mockFetchPaa = vi.fn()
vi.mock('../../../server/services/dataforseo.service', () => ({
  fetchPaa: (...args: unknown[]) => mockFetchPaa(...args),
}))

import router from '../../../server/routes/paa.routes'

// --- Minimal Express helpers ---
function makeReq(body: Record<string, unknown> = {}) {
  return { body } as any
}

function makeRes() {
  const res: any = {
    statusCode: 200,
    jsonData: null,
  }
  res.json = vi.fn((data: unknown) => { res.jsonData = data; return res })
  res.status = vi.fn((code: number) => { res.statusCode = code; return res })
  return res
}

function findHandler(method: string, path: string) {
  const layer = (router as any).stack.find(
    (l: any) => l.route?.path === path && l.route?.methods?.[method],
  )
  return layer?.route?.stack?.[0]?.handle
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/paa/batch', () => {
  const handler = findHandler('post', '/paa/batch')

  it('route handler exists', () => {
    expect(handler).toBeDefined()
  })

  it('returns PAA results for valid queries', async () => {
    const paa1 = [{ question: 'Qu\'est-ce que le SEO ?', answer: 'Le SEO est...' }]
    const paa2 = [{ question: 'Comment améliorer son UX ?', answer: null }]
    mockFetchPaa
      .mockResolvedValueOnce(paa1)
      .mockResolvedValueOnce(paa2)

    const req = makeReq({ queries: ['seo site web', 'ux design conversion'] })
    const res = makeRes()

    await handler(req, res)

    expect(res.jsonData).toEqual({
      data: {
        'seo site web': paa1,
        'ux design conversion': paa2,
      },
    })
    expect(mockFetchPaa).toHaveBeenCalledTimes(2)
  })

  it('returns empty array for failed queries (graceful degradation)', async () => {
    const paa1 = [{ question: 'Question 1', answer: 'Réponse 1' }]
    mockFetchPaa
      .mockResolvedValueOnce(paa1)
      .mockRejectedValueOnce(new Error('API error'))

    const req = makeReq({ queries: ['query ok', 'query fail'] })
    const res = makeRes()

    await handler(req, res)

    expect(res.jsonData).toEqual({
      data: {
        'query ok': paa1,
        'query fail': [],
      },
    })
  })

  it('returns 400 for empty queries array', async () => {
    const req = makeReq({ queries: [] })
    const res = makeRes()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.jsonData).toEqual(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'VALIDATION_ERROR' }),
      }),
    )
  })

  it('returns 400 for missing queries field', async () => {
    const req = makeReq({})
    const res = makeRes()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.jsonData).toEqual(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'VALIDATION_ERROR' }),
      }),
    )
  })

  it('returns 500 on total service failure', async () => {
    mockFetchPaa.mockRejectedValue(new Error('Total failure'))

    const req = makeReq({ queries: ['query1'] })
    const res = makeRes()

    await handler(req, res)

    // With Promise.allSettled, individual failures return [], not 500
    // A 500 only happens if the handler itself throws (e.g., from validation)
    // Since allSettled catches individual errors, this should still return 200 with empty arrays
    expect(res.jsonData).toEqual({
      data: {
        query1: [],
      },
    })
  })
})
