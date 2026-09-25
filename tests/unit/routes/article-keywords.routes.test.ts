// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Request, Response } from 'express'

const { mockGetArticleKeywords, mockSaveArticleKeywords } = vi.hoisted(() => ({
  mockGetArticleKeywords: vi.fn(),
  mockSaveArticleKeywords: vi.fn(),
}))

vi.mock('../../../server/services/infra/data.service', () => ({
  getKeywordsByCocoon: vi.fn(),
  addKeyword: vi.fn(),
  replaceKeyword: vi.fn(),
  deleteKeyword: vi.fn(),
  loadKeywordsDb: vi.fn(),
  getArticleKeywords: mockGetArticleKeywords,
  saveArticleKeywords: mockSaveArticleKeywords,
}))

vi.mock('../../../server/services/external/dataforseo.service', () => ({
  auditCocoonKeywords: vi.fn(),
  getAuditCacheStatus: vi.fn(),
  detectRedundancy: vi.fn(),
}))

vi.mock('../../../server/services/keyword/keyword-discovery.service', () => ({
  discoverKeywords: vi.fn(),
  discoverFromDomain: vi.fn(),
}))

const { default: router } = await import('../../../server/routes/keywords.routes')

function createMockRes() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response & { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> }
  return res
}

function findHandler(method: string, path: string) {
  const layer = (router as any).stack.find(
    (l: any) => l.route?.path === path && l.route?.methods[method],
  )
  return layer?.route?.stack[0]?.handle
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /articles/:id/keywords', () => {
  const handler = findHandler('get', '/articles/:id/keywords')

  it('returns article keywords data', async () => {
    const keywords = {
      articleId: 1,
      capitaine: 'main keyword',
      lieutenants: ['lt1', 'lt2'],
      lexique: ['lsi1', 'lsi2'],
    }
    mockGetArticleKeywords.mockResolvedValueOnce({ data: keywords, dbOps: 1 })

    const req = { params: { id: '1' } } as unknown as Request
    const res = createMockRes()

    await handler(req, res)

    expect(mockGetArticleKeywords).toHaveBeenCalledWith(1)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: keywords }))
  })

  it('returns null when no keywords found', async () => {
    mockGetArticleKeywords.mockResolvedValueOnce({ data: null, dbOps: 1 })

    const req = { params: { id: '99' } } as unknown as Request
    const res = createMockRes()

    await handler(req, res)

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: null }))
  })

  it('returns 500 on error', async () => {
    mockGetArticleKeywords.mockRejectedValueOnce(new Error('read error'))

    const req = { params: { id: '1' } } as unknown as Request
    const res = createMockRes()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'INTERNAL_ERROR', message: 'Failed to load article keywords' }),
      }),
    )
  })
})

describe('PUT /articles/:id/keywords', () => {
  const handler = findHandler('put', '/articles/:id/keywords')

  it('saves and returns article keywords', async () => {
    const saved = {
      articleId: 1,
      capitaine: 'main keyword',
      lieutenants: ['lt1'],
      lexique: ['lsi1'],
    }
    mockSaveArticleKeywords.mockResolvedValueOnce(saved)

    const req = {
      params: { id: '1' },
      body: { capitaine: 'main keyword', lieutenants: ['lt1'], lexique: ['lsi1'] },
    } as unknown as Request
    const res = createMockRes()

    await handler(req, res)

    expect(mockSaveArticleKeywords).toHaveBeenCalledWith(1, {
      capitaine: 'main keyword',
      lieutenants: ['lt1'],
      lexique: ['lsi1'],
      rootKeywords: [],
      // FR-HN-TAB : `hnStructure` absent du corps = inchangé en base (transmis
      // `undefined`, plus de `?? []` qui effaçait la structure validée).
      hnStructure: undefined,
    })
    expect(res.json).toHaveBeenCalledWith({ data: saved })
  })

  it('FR-HN-TAB — hnStructure absent du corps : transmis undefined (structure en base inchangée), jamais []', async () => {
    mockSaveArticleKeywords.mockResolvedValueOnce({ articleId: 1 })
    const req = {
      params: { id: '1' },
      body: { capitaine: 'main keyword', lieutenants: ['lt1'], lexique: [] },
    } as unknown as Request
    await handler(req, createMockRes())

    const payload = mockSaveArticleKeywords.mock.calls.at(-1)![1] as Record<string, unknown>
    expect(payload.hnStructure).toBeUndefined()
  })

  it('FR-HN-TAB — hnStructure présent dans le corps (validation de la structure) : transmis tel quel', async () => {
    mockSaveArticleKeywords.mockResolvedValueOnce({ articleId: 1 })
    const hnStructure = [
      { level: 1, text: 'Agence SEO à Toulouse' },
      { level: 2, text: 'Choisir son agence', children: [{ level: 3, text: 'Les critères' }] },
    ]
    const req = {
      params: { id: '1' },
      body: { capitaine: 'main keyword', lieutenants: ['lt1'], lexique: [], hnStructure },
    } as unknown as Request
    await handler(req, createMockRes())

    expect(mockSaveArticleKeywords).toHaveBeenCalledWith(1, expect.objectContaining({ hnStructure }))
  })

  it('returns 400 when capitaine is missing', async () => {
    const req = {
      params: { id: '1' },
      body: { lieutenants: ['lt1'], lexique: ['lsi1'] },
    } as unknown as Request
    const res = createMockRes()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'MISSING_PARAM', message: 'capitaine is required' }),
      }),
    )
  })

  it('returns 500 on error', async () => {
    mockSaveArticleKeywords.mockRejectedValueOnce(new Error('write error'))

    const req = {
      params: { id: '1' },
      body: { capitaine: 'main keyword', lieutenants: [], lexique: [] },
    } as unknown as Request
    const res = createMockRes()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'INTERNAL_ERROR', message: 'Failed to save article keywords' }),
      }),
    )
  })
})
