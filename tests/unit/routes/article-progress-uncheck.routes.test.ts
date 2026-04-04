// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../../server/services/article-progress.service', () => ({
  getProgress: vi.fn(),
  saveProgress: vi.fn(),
  addCheck: vi.fn(),
  removeCheck: vi.fn(),
}))

vi.mock('../../../server/services/semantic-field.service', () => ({
  getField: vi.fn(),
  saveField: vi.fn(),
  addTerms: vi.fn(),
}))

vi.mock('../../../server/utils/logger', () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { removeCheck } from '../../../server/services/article-progress.service'
import router from '../../../server/routes/article-progress.routes'

const mockRemoveCheck = vi.mocked(removeCheck)

function getHandler(path: string, method: string) {
  const layer = (router as any).stack.find(
    (l: any) => l.route?.path === path && l.route?.methods?.[method],
  )
  return layer?.route?.stack?.[0]?.handle
}

function makeReq(slug: string, body: Record<string, unknown> = {}) {
  return { params: { slug }, body } as any
}

function makeRes() {
  const res: any = { statusCode: 200 }
  res.json = vi.fn().mockReturnValue(res)
  res.status = vi.fn((code: number) => { res.statusCode = code; return res })
  return res
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /articles/:slug/progress/uncheck', () => {
  it('route handler exists', () => {
    expect(getHandler('/articles/:slug/progress/uncheck', 'post')).toBeDefined()
  })

  it('returns 400 if check is missing', async () => {
    const handler = getHandler('/articles/:slug/progress/uncheck', 'post')
    const req = makeReq('test-article', {})
    const res = makeRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('calls removeCheck and returns progress', async () => {
    const progress = { phase: 'moteur', completedChecks: [] }
    mockRemoveCheck.mockResolvedValue(progress as any)

    const handler = getHandler('/articles/:slug/progress/uncheck', 'post')
    const req = makeReq('test-article', { check: 'capitaine_locked' })
    const res = makeRes()
    await handler(req, res)

    expect(mockRemoveCheck).toHaveBeenCalledWith('test-article', 'capitaine_locked')
    expect(res.json).toHaveBeenCalledWith({ data: progress })
  })

  it('returns 500 on service error', async () => {
    mockRemoveCheck.mockRejectedValue(new Error('disk error'))

    const handler = getHandler('/articles/:slug/progress/uncheck', 'post')
    const req = makeReq('test-article', { check: 'capitaine_locked' })
    const res = makeRes()
    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
  })
})
