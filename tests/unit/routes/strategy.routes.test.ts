// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Request, Response } from 'express'

const { mockGetStrategy, mockSaveStrategy, mockStreamChatCompletion, mockReadFile } = vi.hoisted(() => ({
  mockGetStrategy: vi.fn(),
  mockSaveStrategy: vi.fn(),
  mockStreamChatCompletion: vi.fn(),
  mockReadFile: vi.fn(),
}))

vi.mock('../../../server/services/strategy/strategy.service', () => ({
  getStrategy: mockGetStrategy,
  saveStrategy: mockSaveStrategy,
}))

vi.mock('../../../server/services/external/claude.service', () => ({
  streamChatCompletion: mockStreamChatCompletion,
  USAGE_SENTINEL: '__USAGE__',
}))

vi.mock('fs/promises', () => ({
  readFile: mockReadFile,
}))

const { default: router } = await import('../../../server/routes/strategy.routes')

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

const validStrategy = {
  id: 1,
  cible: { input: 'PME du BTP', suggestion: null, validated: '' },
  douleur: { input: '', suggestion: null, validated: '' },
  aiguillage: { suggestedType: null, suggestedParent: null, suggestedChildren: [], validated: false },
  angle: { input: '', suggestion: null, validated: '' },
  promesse: { input: '', suggestion: null, validated: '' },
  cta: { type: 'service', target: '', suggestion: null },
  completedSteps: 0,
  updatedAt: '2026-03-13T10:00:00.000Z',
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /strategy/:id', () => {
  const handler = findHandler('get', '/strategy/:id')

  it('returns strategy data', async () => {
    mockGetStrategy.mockResolvedValueOnce(validStrategy)

    const req = { params: { id: '1' } } as unknown as Request
    const res = createMockRes()

    await handler(req, res)

    expect(mockGetStrategy).toHaveBeenCalledWith(1)
    expect(res.json).toHaveBeenCalledWith({ data: validStrategy })
  })

  it('returns null data when strategy does not exist', async () => {
    mockGetStrategy.mockResolvedValueOnce(null)

    const req = { params: { id: '99' } } as unknown as Request
    const res = createMockRes()

    await handler(req, res)

    expect(res.json).toHaveBeenCalledWith({ data: null })
  })

  it('returns 500 on error', async () => {
    mockGetStrategy.mockRejectedValueOnce(new Error('read error'))

    const req = { params: { id: '1' } } as unknown as Request
    const res = createMockRes()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'INTERNAL_ERROR', message: 'Failed to load strategy' }),
      }),
    )
  })
})

describe('PUT /strategy/:id', () => {
  const handler = findHandler('put', '/strategy/:id')

  it('saves and returns strategy', async () => {
    mockSaveStrategy.mockResolvedValueOnce(validStrategy)

    const req = { params: { id: '1' }, body: { cible: { input: 'PME', suggestion: null, validated: '' } } } as unknown as Request
    const res = createMockRes()

    await handler(req, res)

    expect(mockSaveStrategy).toHaveBeenCalledWith(1, req.body)
    expect(res.json).toHaveBeenCalledWith({ data: validStrategy })
  })

  it('returns 500 on error', async () => {
    mockSaveStrategy.mockRejectedValueOnce(new Error('write error'))

    const req = { params: { id: '1' }, body: {} } as unknown as Request
    const res = createMockRes()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'INTERNAL_ERROR', message: 'Failed to save strategy' }),
      }),
    )
  })
})

describe('POST /strategy/:id/suggest', () => {
  const handler = findHandler('post', '/strategy/:id/suggest')

  const validBody = {
    step: 'cible',
    currentInput: 'PME du secteur BTP à Toulouse',
    context: {
      articleTitle: 'Comment trouver des clients BTP',
      cocoonName: 'BTP Digital',
      siloName: 'Stratégie & Visibilité',
    },
  }

  async function* fakeStream(chunks: string[]) {
    for (const chunk of chunks) {
      yield chunk
    }
    yield `__USAGE__${JSON.stringify({ inputTokens: 50, outputTokens: 100 })}`
  }

  it('returns suggestion from Claude', async () => {
    mockReadFile.mockResolvedValueOnce('Template {{articleTitle}} {{cocoonName}} {{siloName}} {{step}} {{stepDescription}} {{currentInput}} {{#existingArticles}}{{existingArticles}}{{/existingArticles}}')
    mockStreamChatCompletion.mockReturnValueOnce(fakeStream(['Ciblez les artisans ', 'du BTP en Occitanie.']))

    const req = { params: { id: '1' }, body: validBody } as unknown as Request
    const res = createMockRes()

    await handler(req, res)

    expect(mockStreamChatCompletion).toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith({
      data: { suggestion: 'Ciblez les artisans du BTP en Occitanie.' },
    })
  })

  it('replaces template variables correctly', async () => {
    mockReadFile.mockResolvedValueOnce('Article: {{articleTitle}}, Cocon: {{cocoonName}}, Silo: {{siloName}}, Step: {{step}}, Desc: {{stepDescription}}, Input: {{currentInput}}')
    mockStreamChatCompletion.mockReturnValueOnce(fakeStream(['suggestion']))

    const req = { params: { id: '1' }, body: validBody } as unknown as Request
    const res = createMockRes()

    await handler(req, res)

    const calledPrompt = mockStreamChatCompletion.mock.calls[0][0] as string
    expect(calledPrompt).toContain('Comment trouver des clients BTP')
    expect(calledPrompt).toContain('BTP Digital')
    expect(calledPrompt).toContain('Stratégie & Visibilité')
    expect(calledPrompt).toContain('cible')
  })

  it('handles existingArticles in template', async () => {
    mockReadFile.mockResolvedValueOnce('Before {{#existingArticles}}- **Articles existants dans ce cocon** : {{existingArticles}}{{/existingArticles}} After')
    mockStreamChatCompletion.mockReturnValueOnce(fakeStream(['suggestion']))

    const bodyWithArticles = {
      ...validBody,
      context: {
        ...validBody.context,
        existingArticles: ['article-1', 'article-2'],
      },
    }

    const req = { params: { id: '1' }, body: bodyWithArticles } as unknown as Request
    const res = createMockRes()

    await handler(req, res)

    const calledPrompt = mockStreamChatCompletion.mock.calls[0][0] as string
    expect(calledPrompt).toContain('article-1, article-2')
  })

  it('returns 500 when validation fails', async () => {
    const req = { params: { id: '1' }, body: { step: 'invalid_step' } } as unknown as Request
    const res = createMockRes()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'INTERNAL_ERROR', message: 'Failed to generate suggestion' }),
      }),
    )
  })

  it('returns 500 when Claude API fails', async () => {
    mockReadFile.mockResolvedValueOnce('{{articleTitle}} {{cocoonName}} {{siloName}} {{step}} {{stepDescription}} {{currentInput}} {{#existingArticles}}{{existingArticles}}{{/existingArticles}}')
    mockStreamChatCompletion.mockImplementationOnce(async function* () {
      throw new Error('Claude API error')
    })

    const req = { params: { id: '1' }, body: validBody } as unknown as Request
    const res = createMockRes()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'INTERNAL_ERROR', message: 'Failed to generate suggestion' }),
      }),
    )
  })
})
