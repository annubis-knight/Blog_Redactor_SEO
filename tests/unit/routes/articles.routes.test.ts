// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Request, Response } from 'express'

const { mockGetArticleBySlug, mockSaveArticleContent, mockGetArticleContent, mockRemoveArticleFromCocoon } = vi.hoisted(() => ({
  mockGetArticleBySlug: vi.fn(),
  mockSaveArticleContent: vi.fn(),
  mockGetArticleContent: vi.fn(),
  mockRemoveArticleFromCocoon: vi.fn(),
}))

vi.mock('../../../server/services/data.service', () => ({
  getArticleBySlug: mockGetArticleBySlug,
  removeArticleFromCocoon: mockRemoveArticleFromCocoon,
}))

vi.mock('../../../server/services/article-content.service', () => ({
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

describe('PUT /articles/:slug', () => {
  const handler = findHandler('put', '/articles/:slug')

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

    const req = { params: { slug: 'test-slug' }, body: { outline: '{"sections":[]}' } } as unknown as Request
    const res = createMockRes()

    await handler(req, res)

    expect(res.json).toHaveBeenCalledWith({ data: saved })
    expect(mockSaveArticleContent).toHaveBeenCalledWith('test-slug', { outline: '{"sections":[]}' })
  })

  it('returns 400 on invalid body (seoScore must be number)', async () => {
    const req = { params: { slug: 'test-slug' }, body: { seoScore: 'not-a-number' } } as unknown as Request
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

    const req = { params: { slug: 'test-slug' }, body: { outline: '{"sections":[]}' } } as unknown as Request
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

describe('GET /articles/:slug/content', () => {
  const handler = findHandler('get', '/articles/:slug/content')

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

    const req = { params: { slug: 'test-slug' } } as unknown as Request
    const res = createMockRes()

    await handler(req, res)

    expect(res.json).toHaveBeenCalledWith({ data: content })
  })
})

describe('DELETE /articles/:slug', () => {
  const handler = findHandler('delete', '/articles/:slug')

  it('deletes article and returns success', async () => {
    mockRemoveArticleFromCocoon.mockResolvedValueOnce(true)

    const req = { params: { slug: 'test-slug' } } as unknown as Request
    const res = createMockRes()

    await handler(req, res)

    expect(mockRemoveArticleFromCocoon).toHaveBeenCalledWith('test-slug')
    expect(res.json).toHaveBeenCalledWith({ data: { slug: 'test-slug', removed: true } })
  })

  it('returns 404 when article not found', async () => {
    mockRemoveArticleFromCocoon.mockResolvedValueOnce(false)

    const req = { params: { slug: 'unknown-slug' } } as unknown as Request
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

    const req = { params: { slug: 'test-slug' } } as unknown as Request
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
