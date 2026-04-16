// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Request, Response } from 'express'

const {
  mockGetArticleById,
  mockGetArticleBySlug,
  mockLoadArticleMicroContext,
  mockSaveArticleMicroContext,
  mockSaveArticleContent,
  mockGetArticleContent,
  mockUpdateArticleStatus,
  mockAddArticlesToCocoon,
  mockRemoveArticleFromCocoon,
  mockUpdateArticleInCocoon,
} = vi.hoisted(() => ({
  mockGetArticleById: vi.fn(),
  mockGetArticleBySlug: vi.fn(),
  mockLoadArticleMicroContext: vi.fn(),
  mockSaveArticleMicroContext: vi.fn(),
  mockSaveArticleContent: vi.fn(),
  mockGetArticleContent: vi.fn(),
  mockUpdateArticleStatus: vi.fn(),
  mockAddArticlesToCocoon: vi.fn(),
  mockRemoveArticleFromCocoon: vi.fn(),
  mockUpdateArticleInCocoon: vi.fn(),
}))

vi.mock('../../../server/services/data.service', () => ({
  getArticleById: mockGetArticleById,
  getArticleBySlug: mockGetArticleBySlug,
  updateArticleStatus: mockUpdateArticleStatus,
  addArticlesToCocoon: mockAddArticlesToCocoon,
  removeArticleFromCocoon: mockRemoveArticleFromCocoon,
  updateArticleInCocoon: mockUpdateArticleInCocoon,
  loadArticleMicroContext: mockLoadArticleMicroContext,
  saveArticleMicroContext: mockSaveArticleMicroContext,
}))

vi.mock('../../../server/services/article-content.service', () => ({
  saveArticleContent: mockSaveArticleContent,
  getArticleContent: mockGetArticleContent,
}))

const { default: router } = await import('../../../server/routes/articles.routes')

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

describe('GET /articles/:id/micro-context', () => {
  const handler = findHandler('get', '/articles/:id/micro-context')

  it('returns micro-context when found', async () => {
    const microCtx = {
      articleId: 1,
      angle: 'Test angle',
      tone: 'expert',
      directives: 'Be precise',
      updatedAt: '2026-04-06T00:00:00.000Z',
    }
    mockLoadArticleMicroContext.mockResolvedValueOnce(microCtx)

    const req = { params: { id: '1' } } as unknown as Request
    const res = createMockRes()

    await handler(req, res)

    expect(mockLoadArticleMicroContext).toHaveBeenCalledWith(1)
    expect(res.json).toHaveBeenCalledWith({ data: microCtx })
  })

  it('returns data: null when no micro-context exists', async () => {
    mockLoadArticleMicroContext.mockResolvedValueOnce(null)

    const req = { params: { id: '2' } } as unknown as Request
    const res = createMockRes()

    await handler(req, res)

    expect(res.json).toHaveBeenCalledWith({ data: null })
  })

  it('returns 500 on service error', async () => {
    mockLoadArticleMicroContext.mockRejectedValueOnce(new Error('disk error'))

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

describe('PUT /articles/:id/micro-context', () => {
  const handler = findHandler('put', '/articles/:id/micro-context')

  it('saves valid micro-context and returns result', async () => {
    const saved = {
      articleId: 1,
      angle: 'Unique angle',
      tone: 'pedagogique',
      directives: 'Include examples',
      updatedAt: '2026-04-06T12:00:00.000Z',
    }
    mockGetArticleById.mockResolvedValueOnce({ article: { id: 1, slug: 'test-slug', title: 'Test' } })
    mockSaveArticleMicroContext.mockResolvedValueOnce(saved)

    const req = {
      params: { id: '1' },
      body: { angle: 'Unique angle', tone: 'pedagogique', directives: 'Include examples' },
    } as unknown as Request
    const res = createMockRes()

    await handler(req, res)

    expect(mockSaveArticleMicroContext).toHaveBeenCalledWith(1, expect.objectContaining({
      angle: 'Unique angle',
      tone: 'pedagogique',
      directives: 'Include examples',
    }))
    expect(res.json).toHaveBeenCalledWith({ data: saved })
  })

  it('saves with optional fields omitted (defaults to empty strings via schema)', async () => {
    const saved = {
      articleId: 1,
      angle: 'Some angle',
      tone: '',
      directives: '',
      updatedAt: '2026-04-06T12:00:00.000Z',
    }
    mockGetArticleById.mockResolvedValueOnce({ article: { id: 1, slug: 'test-slug', title: 'Test' } })
    mockSaveArticleMicroContext.mockResolvedValueOnce(saved)

    const req = {
      params: { id: '1' },
      body: { angle: 'Some angle' },
    } as unknown as Request
    const res = createMockRes()

    await handler(req, res)

    expect(mockSaveArticleMicroContext).toHaveBeenCalledWith(1, expect.objectContaining({
      angle: 'Some angle',
      tone: '',
      directives: '',
    }))
  })

  it('returns 400 on invalid body (angle must be string)', async () => {
    const req = {
      params: { id: '1' },
      body: { angle: 12345 },
    } as unknown as Request
    const res = createMockRes()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'VALIDATION_ERROR' }),
      }),
    )
    expect(mockSaveArticleMicroContext).not.toHaveBeenCalled()
  })

  it('returns 400 when angle exceeds max length', async () => {
    const req = {
      params: { id: '1' },
      body: { angle: 'x'.repeat(2001) },
    } as unknown as Request
    const res = createMockRes()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(mockSaveArticleMicroContext).not.toHaveBeenCalled()
  })

  it('returns 500 on service error', async () => {
    mockGetArticleById.mockResolvedValueOnce({ article: { id: 1, slug: 'test-slug', title: 'Test' } })
    mockSaveArticleMicroContext.mockRejectedValueOnce(new Error('write failed'))

    const req = {
      params: { id: '1' },
      body: { angle: 'Valid angle' },
    } as unknown as Request
    const res = createMockRes()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
  })
})
