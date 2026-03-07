// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Request, Response } from 'express'

const { mockStreamChatCompletion, mockLoadPrompt } = vi.hoisted(() => ({
  mockStreamChatCompletion: vi.fn(),
  mockLoadPrompt: vi.fn(),
}))

vi.mock('../../../server/services/claude.service', () => ({
  streamChatCompletion: mockStreamChatCompletion,
}))

vi.mock('../../../server/utils/prompt-loader', () => ({
  loadPrompt: mockLoadPrompt,
}))

const { default: router } = await import('../../../server/routes/generate.routes')

function createMockRes() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    writeHead: vi.fn(),
    write: vi.fn(),
    end: vi.fn(),
    headersSent: false,
  } as unknown as Response & {
    status: ReturnType<typeof vi.fn>
    json: ReturnType<typeof vi.fn>
    writeHead: ReturnType<typeof vi.fn>
    write: ReturnType<typeof vi.fn>
    end: ReturnType<typeof vi.fn>
    headersSent: boolean
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

const validArticleBody = {
  slug: 'test-article',
  outline: '{"sections":[]}',
  keyword: 'test keyword',
  keywords: ['test keyword', 'secondary'],
  paa: [{ question: 'What?', answer: 'Something' }],
  articleType: 'Pilier' as const,
  articleTitle: 'Test Article Title',
  cocoonName: 'Test Cocoon',
  theme: 'Test Theme',
}

beforeEach(() => {
  vi.clearAllMocks()
  mockLoadPrompt.mockResolvedValue('mock prompt')
})

describe('POST /generate/article', () => {
  const handler = findHandler('post', '/generate/article')

  it('streams article content and sends done event', async () => {
    mockStreamChatCompletion.mockReturnValueOnce(fakeStream(['<h2>Hello</h2>', '<p>World</p>']))

    const req = { body: validArticleBody } as unknown as Request
    const res = createMockRes()

    await handler(req, res)

    expect(mockLoadPrompt).toHaveBeenCalledWith('system-propulsite')
    expect(mockLoadPrompt).toHaveBeenCalledWith('generate-article', expect.objectContaining({
      articleTitle: 'Test Article Title',
      keyword: 'test keyword',
      outline: '{"sections":[]}',
    }))
    expect(mockStreamChatCompletion).toHaveBeenCalledWith('mock prompt', 'mock prompt', 16384)
    expect(res.writeHead).toHaveBeenCalledWith(200, expect.objectContaining({
      'Content-Type': 'text/event-stream',
    }))
    expect(res.write).toHaveBeenCalledWith(expect.stringContaining('event: chunk'))
    expect(res.write).toHaveBeenCalledWith(expect.stringContaining('event: done'))
    expect(res.end).toHaveBeenCalled()
  })

  it('returns 400 on invalid body', async () => {
    const req = { body: { slug: 'test' } } as unknown as Request
    const res = createMockRes()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'VALIDATION_ERROR' }),
      }),
    )
  })

  it('sends SSE error event when Claude API fails after headers sent', async () => {
    mockStreamChatCompletion.mockImplementationOnce(async function* () {
      yield 'partial'
      throw new Error('Claude API error')
    })

    const req = { body: validArticleBody } as unknown as Request
    const res = createMockRes()
    // Simulate headersSent being true after writeHead
    res.writeHead = vi.fn().mockImplementation(() => {
      ;(res as any).headersSent = true
    })

    await handler(req, res)

    expect(res.write).toHaveBeenCalledWith(
      expect.stringContaining('event: error'),
    )
    expect(res.end).toHaveBeenCalled()
  })

  it('returns JSON error when prompt loading fails before headers sent', async () => {
    mockLoadPrompt.mockRejectedValueOnce(new Error('Prompt not found'))

    const req = { body: validArticleBody } as unknown as Request
    const res = createMockRes()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'CLAUDE_API_ERROR', message: 'Prompt not found' }),
      }),
    )
  })
})

const validMetaBody = {
  slug: 'test-article',
  keyword: 'test keyword',
  articleTitle: 'Test Article Title',
  articleContent: '<h2>Hello</h2><p>World</p>',
}

describe('POST /generate/meta', () => {
  const handler = findHandler('post', '/generate/meta')

  it('returns meta title and description on success', async () => {
    const metaJson = '{"metaTitle":"Test Meta Title","metaDescription":"Test meta description for the article."}'
    mockStreamChatCompletion.mockReturnValueOnce(fakeStream([metaJson]))

    const req = { body: validMetaBody } as unknown as Request
    const res = createMockRes()

    await handler(req, res)

    expect(mockLoadPrompt).toHaveBeenCalledWith('system-propulsite')
    expect(mockLoadPrompt).toHaveBeenCalledWith('generate-meta', expect.objectContaining({
      articleTitle: 'Test Article Title',
      keyword: 'test keyword',
      articleContent: '<h2>Hello</h2><p>World</p>',
    }))
    expect(mockStreamChatCompletion).toHaveBeenCalledWith('mock prompt', 'mock prompt', 1024)
    expect(res.json).toHaveBeenCalledWith({
      data: { metaTitle: 'Test Meta Title', metaDescription: 'Test meta description for the article.' },
    })
  })

  it('returns 400 on invalid body', async () => {
    const req = { body: { slug: 'test' } } as unknown as Request
    const res = createMockRes()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'VALIDATION_ERROR' }),
      }),
    )
  })

  it('returns 500 when Claude API fails', async () => {
    mockStreamChatCompletion.mockImplementationOnce(async function* () {
      throw new Error('Claude API error')
    })

    const req = { body: validMetaBody } as unknown as Request
    const res = createMockRes()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'CLAUDE_API_ERROR', message: 'Claude API error' }),
      }),
    )
  })
})

const validActionBody = {
  actionType: 'reformulate' as const,
  selectedText: 'Some text to reformulate',
  articleSlug: 'test-article',
  keyword: 'seo',
}

describe('POST /generate/action', () => {
  const handler = findHandler('post', '/generate/action')

  it('returns 400 on invalid body', async () => {
    const req = { body: { actionType: 'invalid' } } as unknown as Request
    const res = createMockRes()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'VALIDATION_ERROR' }),
      }),
    )
  })

  it('streams SSE response correctly', async () => {
    mockStreamChatCompletion.mockReturnValueOnce(fakeStream(['Reformulated ', 'text']))

    const req = { body: validActionBody } as unknown as Request
    const res = createMockRes()

    await handler(req, res)

    expect(mockLoadPrompt).toHaveBeenCalledWith('system-propulsite')
    expect(mockLoadPrompt).toHaveBeenCalledWith('actions/reformulate', expect.objectContaining({
      selectedText: 'Some text to reformulate',
    }))
    expect(res.writeHead).toHaveBeenCalledWith(200, expect.objectContaining({
      'Content-Type': 'text/event-stream',
    }))
    expect(res.write).toHaveBeenCalledWith(expect.stringContaining('event: chunk'))
    expect(res.write).toHaveBeenCalledWith(expect.stringContaining('event: done'))
    expect(res.end).toHaveBeenCalled()
  })

  it('loads simplify prompt and streams SSE for actionType simplify', async () => {
    mockStreamChatCompletion.mockReturnValueOnce(fakeStream(['Simplified text']))

    const req = {
      body: { actionType: 'simplify', selectedText: 'Complex text to simplify', articleSlug: 'test-article' },
    } as unknown as Request
    const res = createMockRes()

    await handler(req, res)

    expect(mockLoadPrompt).toHaveBeenCalledWith('system-propulsite')
    expect(mockLoadPrompt).toHaveBeenCalledWith('actions/simplify', expect.objectContaining({
      selectedText: 'Complex text to simplify',
      keywordInstruction: '',
    }))
    expect(res.writeHead).toHaveBeenCalledWith(200, expect.objectContaining({
      'Content-Type': 'text/event-stream',
    }))
    expect(res.write).toHaveBeenCalledWith(expect.stringContaining('event: done'))
    expect(res.end).toHaveBeenCalled()
  })

  it('loads convert-list prompt and streams SSE for actionType convert-list', async () => {
    mockStreamChatCompletion.mockReturnValueOnce(fakeStream(['<ul><li>Point 1</li></ul>']))

    const req = {
      body: { actionType: 'convert-list', selectedText: 'A paragraph with multiple ideas', articleSlug: 'test-article', keyword: 'seo' },
    } as unknown as Request
    const res = createMockRes()

    await handler(req, res)

    expect(mockLoadPrompt).toHaveBeenCalledWith('system-propulsite')
    expect(mockLoadPrompt).toHaveBeenCalledWith('actions/convert-list', expect.objectContaining({
      selectedText: 'A paragraph with multiple ideas',
      keywordInstruction: expect.stringContaining('seo'),
    }))
    expect(res.writeHead).toHaveBeenCalledWith(200, expect.objectContaining({
      'Content-Type': 'text/event-stream',
    }))
    expect(res.write).toHaveBeenCalledWith(expect.stringContaining('event: done'))
    expect(res.end).toHaveBeenCalled()
  })

  it('loads pme-example prompt and streams SSE for actionType pme-example', async () => {
    mockStreamChatCompletion.mockReturnValueOnce(fakeStream(['Nike utilise le storytelling...']))

    const req = {
      body: { actionType: 'pme-example', selectedText: 'Le storytelling est un levier marketing puissant.', articleSlug: 'test-article' },
    } as unknown as Request
    const res = createMockRes()

    await handler(req, res)

    expect(mockLoadPrompt).toHaveBeenCalledWith('system-propulsite')
    expect(mockLoadPrompt).toHaveBeenCalledWith('actions/pme-example', expect.objectContaining({
      selectedText: 'Le storytelling est un levier marketing puissant.',
      keywordInstruction: '',
    }))
    expect(res.writeHead).toHaveBeenCalledWith(200, expect.objectContaining({
      'Content-Type': 'text/event-stream',
    }))
    expect(res.write).toHaveBeenCalledWith(expect.stringContaining('event: done'))
    expect(res.end).toHaveBeenCalled()
  })

  it('loads keyword-optimize prompt and streams SSE for actionType keyword-optimize', async () => {
    mockStreamChatCompletion.mockReturnValueOnce(fakeStream(['Texte optimisé avec mot-clé']))

    const req = {
      body: { actionType: 'keyword-optimize', selectedText: 'Un paragraphe à optimiser.', articleSlug: 'test-article', keyword: 'référencement naturel' },
    } as unknown as Request
    const res = createMockRes()

    await handler(req, res)

    expect(mockLoadPrompt).toHaveBeenCalledWith('system-propulsite')
    expect(mockLoadPrompt).toHaveBeenCalledWith('actions/keyword-optimize', expect.objectContaining({
      selectedText: 'Un paragraphe à optimiser.',
      keywordInstruction: expect.stringContaining('référencement naturel'),
    }))
    expect(res.writeHead).toHaveBeenCalledWith(200, expect.objectContaining({
      'Content-Type': 'text/event-stream',
    }))
    expect(res.write).toHaveBeenCalledWith(expect.stringContaining('event: done'))
    expect(res.end).toHaveBeenCalled()
  })

  it('loads add-statistic prompt and streams SSE for actionType add-statistic', async () => {
    mockStreamChatCompletion.mockReturnValueOnce(fakeStream(['Selon HubSpot, 2024, 73% des PME...']))

    const req = {
      body: { actionType: 'add-statistic', selectedText: 'Le marketing digital est essentiel.', articleSlug: 'test-article' },
    } as unknown as Request
    const res = createMockRes()

    await handler(req, res)

    expect(mockLoadPrompt).toHaveBeenCalledWith('system-propulsite')
    expect(mockLoadPrompt).toHaveBeenCalledWith('actions/add-statistic', expect.objectContaining({
      selectedText: 'Le marketing digital est essentiel.',
      keywordInstruction: '',
    }))
    expect(res.writeHead).toHaveBeenCalledWith(200, expect.objectContaining({
      'Content-Type': 'text/event-stream',
    }))
    expect(res.write).toHaveBeenCalledWith(expect.stringContaining('event: done'))
    expect(res.end).toHaveBeenCalled()
  })

  it('loads answer-capsule prompt and streams SSE for actionType answer-capsule', async () => {
    mockStreamChatCompletion.mockReturnValueOnce(fakeStream(['Le SEO local permet aux PME de se positionner efficacement.']))

    const req = {
      body: { actionType: 'answer-capsule', selectedText: 'Un long paragraphe sur le SEO local.', articleSlug: 'test-article', keyword: 'SEO local' },
    } as unknown as Request
    const res = createMockRes()

    await handler(req, res)

    expect(mockLoadPrompt).toHaveBeenCalledWith('system-propulsite')
    expect(mockLoadPrompt).toHaveBeenCalledWith('actions/answer-capsule', expect.objectContaining({
      selectedText: 'Un long paragraphe sur le SEO local.',
      keywordInstruction: expect.stringContaining('SEO local'),
    }))
    expect(res.writeHead).toHaveBeenCalledWith(200, expect.objectContaining({
      'Content-Type': 'text/event-stream',
    }))
    expect(res.write).toHaveBeenCalledWith(expect.stringContaining('event: done'))
    expect(res.end).toHaveBeenCalled()
  })
})
