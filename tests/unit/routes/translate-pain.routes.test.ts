// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Request, Response } from 'express'

const { mockStreamChatCompletion, mockLoadPrompt } = vi.hoisted(() => ({
  mockStreamChatCompletion: vi.fn(),
  mockLoadPrompt: vi.fn(),
}))

vi.mock('../../../server/services/external/claude.service', () => ({
  streamChatCompletion: mockStreamChatCompletion,
  USAGE_SENTINEL: '__USAGE__',
}))

vi.mock('../../../server/utils/prompt-loader', () => ({
  loadPrompt: mockLoadPrompt,
}))

// Mock all data.service exports used by keywords.routes
vi.mock('../../../server/services/infra/data.service', () => ({
  getKeywordsByCocoon: vi.fn(),
  addKeyword: vi.fn(),
  replaceKeyword: vi.fn(),
  deleteKeyword: vi.fn(),
  updateKeywordStatus: vi.fn(),
  loadKeywordsDb: vi.fn(),
  getArticleKeywords: vi.fn(),
  saveArticleKeywords: vi.fn(),
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

vi.mock('../../../server/services/keyword/keyword-assignment.service', () => ({
  previewMigration: vi.fn(),
  applyMigration: vi.fn(),
}))

const { default: router } = await import('../../../server/routes/keywords.routes')

function createMockRes() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response & {
    status: ReturnType<typeof vi.fn>
    json: ReturnType<typeof vi.fn>
  }
  return res
}

function findHandler(method: string, path: string) {
  const layer = (router as any).stack.find(
    (l: any) => l.route?.path === path && l.route?.methods[method],
  )
  return layer?.route?.stack[0]?.handle
}

async function* fakeStream(chunks: string[]) {
  for (const chunk of chunks) {
    yield chunk
  }
}

describe('POST /keywords/translate-pain', () => {
  const handler = findHandler('post', '/keywords/translate-pain')

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('route exists', () => {
    expect(handler).toBeDefined()
  })

  it('returns 400 if painText is missing', async () => {
    const req = { body: {} } as Request
    const res = createMockRes()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'MISSING_PARAM' }),
      }),
    )
  })

  it('returns 400 if painText is empty string', async () => {
    const req = { body: { painText: '   ' } } as Request
    const res = createMockRes()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('calls loadPrompt with pain-translate and streamChatCompletion', async () => {
    const keywords = [
      { keyword: 'refonte site web toulouse', reasoning: 'Requête locale transactionnelle' },
      { keyword: 'comment refaire son site', reasoning: 'Requête informationnelle' },
    ]

    mockLoadPrompt.mockResolvedValue('system prompt content')
    mockStreamChatCompletion.mockReturnValue(
      fakeStream([JSON.stringify({ keywords })]),
    )

    const req = { body: { painText: 'Mon site web est obsolète et ne génère plus de leads' } } as Request
    const res = createMockRes()

    await handler(req, res)

    expect(mockLoadPrompt).toHaveBeenCalledWith('pain-translate', {}, undefined)
    expect(mockStreamChatCompletion).toHaveBeenCalledWith(
      'system prompt content',
      expect.stringContaining('Mon site web est obsolète'),
      1024,
    )
    expect(res.json).toHaveBeenCalledWith({
      data: { keywords },
    })
  })

  it('handles JSON wrapped in code fences', async () => {
    const keywords = [{ keyword: 'test', reasoning: 'test reason' }]
    mockLoadPrompt.mockResolvedValue('prompt')
    mockStreamChatCompletion.mockReturnValue(
      fakeStream(['```json\n', JSON.stringify({ keywords }), '\n```']),
    )

    const req = { body: { painText: 'une douleur client' } } as Request
    const res = createMockRes()

    await handler(req, res)

    expect(res.json).toHaveBeenCalledWith({ data: { keywords } })
  })

  it('skips USAGE_SENTINEL chunks', async () => {
    const keywords = [{ keyword: 'seo toulouse', reasoning: 'local' }]
    mockLoadPrompt.mockResolvedValue('prompt')
    mockStreamChatCompletion.mockReturnValue(
      fakeStream([
        '__USAGE__{...}',
        JSON.stringify({ keywords }),
      ]),
    )

    const req = { body: { painText: 'besoin SEO' } } as Request
    const res = createMockRes()

    await handler(req, res)

    expect(res.json).toHaveBeenCalledWith({ data: { keywords } })
  })

  it('returns 500 on parsing error', async () => {
    mockLoadPrompt.mockResolvedValue('prompt')
    mockStreamChatCompletion.mockReturnValue(
      fakeStream(['not valid json at all']),
    )

    const req = { body: { painText: 'test' } } as Request
    const res = createMockRes()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'TRANSLATION_ERROR' }),
      }),
    )
  })
})
