// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Request, Response } from 'express'

const { mockGetArticleBySlug, mockSaveArticleContent, mockGetArticleContent, mockRemoveArticleFromCocoon, mockRemoveArticleChecks } = vi.hoisted(() => ({
  mockGetArticleBySlug: vi.fn(),
  mockSaveArticleContent: vi.fn(),
  mockGetArticleContent: vi.fn(),
  mockRemoveArticleFromCocoon: vi.fn(),
  mockRemoveArticleChecks: vi.fn(),
}))

vi.mock('../../../server/services/infra/data.service', () => ({
  getArticleBySlug: mockGetArticleBySlug,
  removeArticleFromCocoon: mockRemoveArticleFromCocoon,
  removeArticleChecks: mockRemoveArticleChecks,
}))

vi.mock('../../../server/services/article/article-content.service', () => ({
  saveArticleContent: mockSaveArticleContent,
  getArticleContent: mockGetArticleContent,
}))

// Import the router and extract the handlers
const { default: router } = await import('../../../server/routes/articles.routes')

function createMockRes() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response & { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> }
  return res
}

// Extract handlers from the router stack
function findHandler(method: string, path: string) {
  const layer = (router as any).stack.find(
    (l: any) => l.route?.path === path && l.route?.methods[method],
  )
  return layer?.route?.stack[0]?.handle
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('PUT /articles/:id', () => {
  const handler = findHandler('put', '/articles/:id')

  it('saves outline and returns merged content', async () => {
    const saved = {
      outline: '{"sections":[]}',
      content: null,
      metaTitle: null,
      metaDescription: null,
      seoScore: null,
      geoScore: null,
      updatedAt: '2026-03-06T00:00:00.000Z',
    }
    mockSaveArticleContent.mockResolvedValueOnce(saved)

    const req = { params: { id: '1' }, body: { outline: '{"sections":[]}' } } as unknown as Request
    const res = createMockRes()

    await handler(req, res)

    expect(res.json).toHaveBeenCalledWith({ data: saved })
    expect(mockSaveArticleContent).toHaveBeenCalledWith(1, { outline: '{"sections":[]}' })
  })

  it('returns 400 on invalid body (seoScore must be number)', async () => {
    const req = { params: { id: '1' }, body: { seoScore: 'not-a-number' } } as unknown as Request
    const res = createMockRes()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'VALIDATION_ERROR' }),
      }),
    )
  })

  it('returns 500 on service error', async () => {
    mockSaveArticleContent.mockRejectedValueOnce(new Error('write error'))

    const req = { params: { id: '1' }, body: { outline: '{"sections":[]}' } } as unknown as Request
    const res = createMockRes()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'INTERNAL_ERROR' }),
      }),
    )
  })
})

describe('GET /articles/:id/content', () => {
  const handler = findHandler('get', '/articles/:id/content')

  it('returns article content', async () => {
    const content = {
      outline: null,
      content: null,
      metaTitle: null,
      metaDescription: null,
      seoScore: null,
      geoScore: null,
      updatedAt: null,
    }
    mockGetArticleContent.mockResolvedValueOnce(content)

    const req = { params: { id: '1' } } as unknown as Request
    const res = createMockRes()

    await handler(req, res)

    expect(res.json).toHaveBeenCalledWith({ data: content })
  })
})

describe('DELETE /articles/:id', () => {
  const handler = findHandler('delete', '/articles/:id')

  it('deletes article and returns success', async () => {
    mockRemoveArticleFromCocoon.mockResolvedValueOnce(true)

    const req = { params: { id: '1' } } as unknown as Request
    const res = createMockRes()

    await handler(req, res)

    expect(mockRemoveArticleFromCocoon).toHaveBeenCalledWith(1)
    expect(res.json).toHaveBeenCalledWith({ data: { id: 1, removed: true } })
  })

  it('returns 404 when article not found', async () => {
    mockRemoveArticleFromCocoon.mockResolvedValueOnce(false)

    const req = { params: { id: '99' } } as unknown as Request
    const res = createMockRes()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'NOT_FOUND' }),
      }),
    )
  })

  it('returns 500 on service error', async () => {
    mockRemoveArticleFromCocoon.mockRejectedValueOnce(new Error('disk error'))

    const req = { params: { id: '1' } } as unknown as Request
    const res = createMockRes()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'INTERNAL_ERROR' }),
      }),
    )
  })
})

// M19 : la structure est construite sur le capitaine et les lieutenants
// retenus. Retirer l'une de ces étapes laissait l'étape Structure validée sur
// des données qui avaient changé ; seule la publication le voyait.
describe('POST /articles/:id/progress/uncheck', () => {
  const handler = findHandler('post', '/articles/:id/progress/uncheck')

  it.each([
    ['moteur:capitaine_locked'],
    ['moteur:lieutenants_locked'],
  ])('retirer %s retire aussi l’étape Structure', async (check) => {
    mockRemoveArticleChecks.mockResolvedValueOnce({ phase: 'moteur', completedChecks: [], checkTimestamps: {} })
    const res = createMockRes()
    await handler({ params: { id: '4' }, body: { check } } as unknown as Request, res)
    expect(mockRemoveArticleChecks).toHaveBeenCalledWith(4, [check, 'moteur:hn_locked'])
    expect(res.json).toHaveBeenCalledWith({ data: expect.objectContaining({ completedChecks: [] }) })
  })

  it('retirer l’étape Lexique ne touche à rien d’autre', async () => {
    mockRemoveArticleChecks.mockResolvedValueOnce({ phase: 'moteur', completedChecks: [], checkTimestamps: {} })
    await handler({ params: { id: '4' }, body: { check: 'moteur:lexique_validated' } } as unknown as Request, createMockRes())
    expect(mockRemoveArticleChecks).toHaveBeenCalledWith(4, ['moteur:lexique_validated'])
  })
})
