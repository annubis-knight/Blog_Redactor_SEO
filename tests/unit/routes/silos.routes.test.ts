// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Request, Response } from 'express'

const { mockGetTheme, mockGetSilos, mockGetSiloByName } = vi.hoisted(() => ({
  mockGetTheme: vi.fn(),
  mockGetSilos: vi.fn(),
  mockGetSiloByName: vi.fn(),
}))

vi.mock('../../../server/services/infra/data.service', () => ({
  getTheme: mockGetTheme,
  getSilos: mockGetSilos,
  getSiloByName: mockGetSiloByName,
}))

// Import the router and extract the handlers
const { default: router } = await import('../../../server/routes/silos.routes')

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

describe('GET /theme', () => {
  const handler = findHandler('get', '/theme')

  it('returns the blog theme', async () => {
    const theme = { nom: 'Croissance digitale', description: 'Strat globale' }
    mockGetTheme.mockResolvedValueOnce(theme)

    const req = {} as unknown as Request
    const res = createMockRes()

    await handler(req, res)

    expect(mockGetTheme).toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith({ data: theme })
  })

  it('returns 500 on error', async () => {
    mockGetTheme.mockRejectedValueOnce(new Error('read error'))

    const req = {} as unknown as Request
    const res = createMockRes()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'INTERNAL_ERROR', message: 'Failed to load theme' }),
      }),
    )
  })
})

describe('GET /silos', () => {
  const handler = findHandler('get', '/silos')

  it('returns all silos with cocoons and stats', async () => {
    const silos = [
      {
        id: 0,
        nom: 'Stratégie & Visibilité',
        description: 'Stratégies de croissance digitale',
        cocons: [
          {
            id: 0,
            name: 'Croissance digitale Toulouse',
            siloName: 'Stratégie & Visibilité',
            articles: [{ title: 'Article 1', type: 'Pilier', slug: 'article-1', topic: null, status: 'à rédiger' }],
            stats: { totalArticles: 1, byType: { pilier: 1, intermediaire: 0, specialise: 0 }, byStatus: { aRediger: 1, brouillon: 0, publie: 0 }, completionPercent: 0 },
          },
        ],
        stats: { totalArticles: 1, byType: { pilier: 1, intermediaire: 0, specialise: 0 }, byStatus: { aRediger: 1, brouillon: 0, publie: 0 }, completionPercent: 0 },
      },
    ]
    mockGetSilos.mockResolvedValueOnce(silos)

    const req = {} as unknown as Request
    const res = createMockRes()

    await handler(req, res)

    expect(mockGetSilos).toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith({ data: silos })
  })

  it('returns 500 on error', async () => {
    mockGetSilos.mockRejectedValueOnce(new Error('read error'))

    const req = {} as unknown as Request
    const res = createMockRes()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'INTERNAL_ERROR', message: 'Failed to load silos' }),
      }),
    )
  })
})

describe('GET /silos/:name', () => {
  const handler = findHandler('get', '/silos/:name')

  it('returns a silo by name', async () => {
    const silo = {
      id: 0,
      nom: 'Stratégie & Visibilité',
      description: 'Stratégies de croissance digitale',
      cocons: [],
      stats: { totalArticles: 0, byType: { pilier: 0, intermediaire: 0, specialise: 0 }, byStatus: { aRediger: 0, brouillon: 0, publie: 0 }, completionPercent: 0 },
    }
    mockGetSiloByName.mockResolvedValueOnce(silo)

    const req = { params: { name: 'Strat%C3%A9gie%20%26%20Visibilit%C3%A9' } } as unknown as Request
    const res = createMockRes()

    await handler(req, res)

    expect(mockGetSiloByName).toHaveBeenCalledWith('Stratégie & Visibilité')
    expect(res.json).toHaveBeenCalledWith({ data: silo })
  })

  it('returns 404 when silo is not found', async () => {
    mockGetSiloByName.mockResolvedValueOnce(null)

    const req = { params: { name: 'Inexistant' } } as unknown as Request
    const res = createMockRes()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'NOT_FOUND', message: 'Silo not found' }),
      }),
    )
  })

  it('returns 500 on error', async () => {
    mockGetSiloByName.mockRejectedValueOnce(new Error('read error'))

    const req = { params: { name: 'Strat%C3%A9gie' } } as unknown as Request
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
