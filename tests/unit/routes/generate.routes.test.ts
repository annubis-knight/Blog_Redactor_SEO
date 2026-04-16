// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Request, Response } from 'express'

const { mockStreamChatCompletion, mockLoadPrompt, mockGetStrategy, mockGetArticleKeywords, mockLoadArticleMicroContext, mockValidateHtmlStructurePreserved } = vi.hoisted(() => ({
  mockStreamChatCompletion: vi.fn(),
  mockLoadPrompt: vi.fn(),
  mockGetStrategy: vi.fn(),
  mockGetArticleKeywords: vi.fn(),
  mockLoadArticleMicroContext: vi.fn(),
  mockValidateHtmlStructurePreserved: vi.fn(),
}))

vi.mock('../../../server/services/claude.service', () => ({
  streamChatCompletion: mockStreamChatCompletion,
  USAGE_SENTINEL: '__USAGE__',
  WEB_SEARCH_TOOL: { type: 'web_search_20250305', name: 'web_search', max_uses: 3 },
}))

vi.mock('../../../server/utils/prompt-loader', () => ({
  loadPrompt: mockLoadPrompt,
}))

vi.mock('../../../server/services/strategy.service', () => ({
  getStrategy: mockGetStrategy,
}))

vi.mock('../../../server/services/data.service', () => ({
  getArticleKeywords: mockGetArticleKeywords,
  loadArticleMicroContext: mockLoadArticleMicroContext,
}))

vi.mock('../../../shared/html-utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../shared/html-utils')>()
  return {
    ...actual,
    validateHtmlStructurePreserved: mockValidateHtmlStructurePreserved,
  }
})

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

const fakeUsage = { inputTokens: 100, outputTokens: 200, model: 'claude-sonnet-4-6', estimatedCost: 0.0033 }

async function* fakeStream(chunks: string[]) {
  for (const chunk of chunks) {
    yield chunk
  }
  yield `__USAGE__${JSON.stringify(fakeUsage)}`
}

const validArticleBody = {
  articleId: 1,
  outline: JSON.stringify({
    sections: [
      { id: 'h1', level: 1, title: 'Test Article Title', annotation: null, status: 'accepted' },
      { id: 'h2-1', level: 2, title: 'First Section', annotation: null, status: 'accepted' },
      { id: 'h3-1', level: 3, title: 'Subsection', annotation: null, status: 'accepted' },
    ],
  }),
  keyword: 'test keyword',
  keywords: ['test keyword', 'secondary'],
  paa: [{ question: 'What?', answer: 'Something' }],
  articleType: 'Pilier' as const,
  articleTitle: 'Test Article Title',
  cocoonName: 'Test Cocoon',
  topic: 'Test Theme',
}

beforeEach(() => {
  vi.resetAllMocks()
  mockLoadPrompt.mockResolvedValue('mock prompt')
  mockGetStrategy.mockResolvedValue(null)
  mockGetArticleKeywords.mockResolvedValue(null)
  mockLoadArticleMicroContext.mockResolvedValue(null)
})

const validOutlineBody = {
  articleId: 1,
  keyword: 'test keyword',
  keywords: ['test keyword', 'secondary'],
  paa: [{ question: 'What?', answer: 'Something' }],
  articleType: 'Pilier' as const,
  articleTitle: 'Test Article Title',
  cocoonName: 'Test Cocoon',
  topic: 'Test Theme',
}

const fakeStrategy = {
  id: 1,
  cible: { input: '', suggestion: null, validated: 'PME toulousaines 5-50 salariés' },
  douleur: { input: '', suggestion: null, validated: 'Site web vieillissant' },
  aiguillage: { suggestedType: null, suggestedParent: null, suggestedChildren: [], validated: false },
  angle: { input: '', suggestion: null, validated: 'Approche sur mesure' },
  promesse: { input: '', suggestion: null, validated: 'Un site qui convertit' },
  cta: { type: 'service', target: '/creation-site', suggestion: null },
  completedSteps: 6,
  updatedAt: '2026-03-13T00:00:00.000Z',
}

describe('POST /generate/outline', () => {
  const handler = findHandler('post', '/generate/outline')

  it('streams outline and sends done event', async () => {
    const outlineJson = '{"sections":[{"id":"h1","level":1,"title":"Test","annotation":null}]}'
    mockStreamChatCompletion.mockReturnValueOnce(fakeStream([outlineJson]))

    const req = { body: validOutlineBody } as unknown as Request
    const res = createMockRes()

    await handler(req, res)

    expect(mockGetStrategy).toHaveBeenCalledWith(1)
    expect(mockLoadPrompt).toHaveBeenCalledWith('generate-outline', expect.objectContaining({
      articleTitle: 'Test Article Title',
      keyword: 'test keyword',
      strategyContext: '',
    }))
    expect(res.writeHead).toHaveBeenCalledWith(200, expect.objectContaining({
      'Content-Type': 'text/event-stream',
    }))
    expect(res.write).toHaveBeenCalledWith(expect.stringContaining('event: done'))
    expect(res.end).toHaveBeenCalled()
  })

  it('includes strategy context in outline prompt when strategy exists', async () => {
    mockGetStrategy.mockResolvedValueOnce(fakeStrategy)
    const outlineJson = '{"sections":[{"id":"h1","level":1,"title":"Test","annotation":null}]}'
    mockStreamChatCompletion.mockReturnValueOnce(fakeStream([outlineJson]))

    const req = { body: validOutlineBody } as unknown as Request
    const res = createMockRes()

    await handler(req, res)

    expect(mockLoadPrompt).toHaveBeenCalledWith('generate-outline', expect.objectContaining({
      strategyContext: expect.stringContaining('PME toulousaines'),
    }))
    expect(mockLoadPrompt).toHaveBeenCalledWith('generate-outline', expect.objectContaining({
      strategyContext: expect.stringContaining('Approche sur mesure'),
    }))
    expect(mockLoadPrompt).toHaveBeenCalledWith('generate-outline', expect.objectContaining({
      strategyContext: expect.stringContaining('/creation-site'),
    }))
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

  it('includes keyword context in outline prompt when article keywords exist', async () => {
    const articleKw = {
      articleSlug: 'test-article',
      capitaine: 'création site web',
      lieutenants: ['refonte site internet', 'web design'],
      lexique: ['responsive', 'UX'],
    }
    mockGetArticleKeywords.mockResolvedValueOnce(articleKw)
    const outlineJson = '{"sections":[{"id":"h1","level":1,"title":"Test","annotation":null}]}'
    mockStreamChatCompletion.mockReturnValueOnce(fakeStream([outlineJson]))

    const req = { body: validOutlineBody } as unknown as Request
    const res = createMockRes()

    await handler(req, res)

    expect(mockGetArticleKeywords).toHaveBeenCalledWith(1)
    expect(mockLoadPrompt).toHaveBeenCalledWith('generate-outline', expect.objectContaining({
      keywordContext: expect.stringContaining('création site web'),
    }))
    expect(mockLoadPrompt).toHaveBeenCalledWith('generate-outline', expect.objectContaining({
      keywordContext: expect.stringContaining('refonte site internet'),
    }))
  })

  it('passes empty keywordContext when no article keywords', async () => {
    const outlineJson = '{"sections":[{"id":"h1","level":1,"title":"Test","annotation":null}]}'
    mockStreamChatCompletion.mockReturnValueOnce(fakeStream([outlineJson]))

    const req = { body: validOutlineBody } as unknown as Request
    const res = createMockRes()

    await handler(req, res)

    expect(mockLoadPrompt).toHaveBeenCalledWith('generate-outline', expect.objectContaining({
      keywordContext: '',
    }))
  })
})

describe('POST /generate/article (section-by-section)', () => {
  const handler = findHandler('post', '/generate/article')

  function createArticleReq(body: unknown) {
    return { body, socket: { setTimeout: vi.fn(), destroyed: false } } as unknown as Request
  }

  it('streams article section-by-section and sends done event', async () => {
    mockStreamChatCompletion.mockReturnValueOnce(fakeStream(['<h2>Hello</h2>', '<p>World</p>']))

    const req = createArticleReq(validArticleBody)
    const res = createMockRes()

    await handler(req, res)

    expect(mockLoadPrompt).toHaveBeenCalledWith('system-propulsite')
    expect(mockLoadPrompt).toHaveBeenCalledWith('generate-article-section', expect.objectContaining({
      articleTitle: 'Test Article Title',
      keyword: 'test keyword',
      sectionOutline: expect.stringContaining('First Section'),
      sectionPosition: 'intro',
    }))
    // maxTokens is now dynamic (computeSectionBudget), not hardcoded 4096 (F12)
    // 4th arg is [WEB_SEARCH_TOOL] tools array
    expect(mockStreamChatCompletion).toHaveBeenCalledWith('mock prompt', 'mock prompt', expect.any(Number), expect.any(Array))
    expect(res.writeHead).toHaveBeenCalledWith(200, expect.objectContaining({
      'Content-Type': 'text/event-stream',
    }))
    expect(res.write).toHaveBeenCalledWith(expect.stringContaining('event: section-start'))
    expect(res.write).toHaveBeenCalledWith(expect.stringContaining('event: chunk'))
    expect(res.write).toHaveBeenCalledWith(expect.stringContaining('event: section-done'))
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

  it('sends SSE error event when Claude API fails after retry', async () => {
    // Section-by-section retries once per section — both attempts must fail
    mockStreamChatCompletion
      .mockReturnValueOnce((async function* () { throw new Error('Claude API error') })())
      .mockReturnValueOnce((async function* () { throw new Error('Claude API error') })())

    const req = createArticleReq(validArticleBody)
    const res = createMockRes()
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

    const req = createArticleReq(validArticleBody)
    const res = createMockRes()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'CLAUDE_API_ERROR', message: 'Prompt not found' }),
      }),
    )
  })

  it('includes strategy context in section prompt when strategy exists', async () => {
    mockGetStrategy.mockResolvedValueOnce(fakeStrategy)
    mockStreamChatCompletion.mockReturnValueOnce(fakeStream(['<h2>Hello</h2>']))

    const req = createArticleReq(validArticleBody)
    const res = createMockRes()

    await handler(req, res)

    expect(mockGetStrategy).toHaveBeenCalledWith(1)
    expect(mockLoadPrompt).toHaveBeenCalledWith('generate-article-section', expect.objectContaining({
      strategyContext: expect.stringContaining('PME toulousaines'),
    }))
    expect(mockLoadPrompt).toHaveBeenCalledWith('generate-article-section', expect.objectContaining({
      strategyContext: expect.stringContaining('Approche sur mesure'),
    }))
    expect(mockLoadPrompt).toHaveBeenCalledWith('generate-article-section', expect.objectContaining({
      strategyContext: expect.stringContaining('/creation-site'),
    }))
  })

  it('passes empty strategyContext when getStrategy returns null', async () => {
    mockStreamChatCompletion.mockReturnValueOnce(fakeStream(['<h2>Hello</h2>']))

    const req = createArticleReq(validArticleBody)
    const res = createMockRes()

    await handler(req, res)

    expect(mockGetStrategy).toHaveBeenCalledWith(1)
    expect(mockLoadPrompt).toHaveBeenCalledWith('generate-article-section', expect.objectContaining({
      strategyContext: '',
    }))
  })

  it('includes keyword context in section prompt when article keywords exist', async () => {
    const articleKw = {
      articleSlug: 'test-article',
      capitaine: 'création site web',
      lieutenants: ['refonte site internet'],
      lexique: ['responsive', 'UX'],
    }
    mockGetArticleKeywords.mockResolvedValueOnce(articleKw)
    mockStreamChatCompletion.mockReturnValueOnce(fakeStream(['<h2>Hello</h2>']))

    const req = createArticleReq(validArticleBody)
    const res = createMockRes()

    await handler(req, res)

    expect(mockGetArticleKeywords).toHaveBeenCalledWith(1)
    expect(mockLoadPrompt).toHaveBeenCalledWith('generate-article-section', expect.objectContaining({
      keywordContext: expect.stringContaining('création site web'),
    }))
    expect(mockLoadPrompt).toHaveBeenCalledWith('generate-article-section', expect.objectContaining({
      keywordContext: expect.stringContaining('Lieutenants'),
    }))
  })

  it('passes empty keywordContext for article when no article keywords', async () => {
    mockStreamChatCompletion.mockReturnValueOnce(fakeStream(['<h2>Hello</h2>']))

    const req = createArticleReq(validArticleBody)
    const res = createMockRes()

    await handler(req, res)

    expect(mockLoadPrompt).toHaveBeenCalledWith('generate-article-section', expect.objectContaining({
      keywordContext: '',
    }))
  })
})

const validMetaBody = {
  articleId: 1,
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
      data: { metaTitle: 'Test Meta Title', metaDescription: 'Test meta description for the article.', usage: fakeUsage },
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
  articleId: 1,
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
      body: { actionType: 'simplify', selectedText: 'Complex text to simplify', articleId: 1 },
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
      body: { actionType: 'convert-list', selectedText: 'A paragraph with multiple ideas', articleId: 1, keyword: 'seo' },
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
      body: { actionType: 'pme-example', selectedText: 'Le storytelling est un levier marketing puissant.', articleId: 1 },
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
      body: { actionType: 'keyword-optimize', selectedText: 'Un paragraphe à optimiser.', articleId: 1, keyword: 'référencement naturel' },
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
      body: { actionType: 'add-statistic', selectedText: 'Le marketing digital est essentiel.', articleId: 1 },
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
      body: { actionType: 'answer-capsule', selectedText: 'Un long paragraphe sur le SEO local.', articleId: 1, keyword: 'SEO local' },
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

  it('loads question-heading prompt and streams SSE for actionType question-heading', async () => {
    mockStreamChatCompletion.mockReturnValueOnce(fakeStream(['Comment optimiser votre SEO local ?']))

    const req = {
      body: { actionType: 'question-heading', selectedText: 'Les avantages du SEO local', articleId: 1, keyword: 'SEO local' },
    } as unknown as Request
    const res = createMockRes()

    await handler(req, res)

    expect(mockLoadPrompt).toHaveBeenCalledWith('system-propulsite')
    expect(mockLoadPrompt).toHaveBeenCalledWith('actions/question-heading', expect.objectContaining({
      selectedText: 'Les avantages du SEO local',
      keywordInstruction: expect.stringContaining('SEO local'),
    }))
    expect(res.writeHead).toHaveBeenCalledWith(200, expect.objectContaining({
      'Content-Type': 'text/event-stream',
    }))
    expect(res.write).toHaveBeenCalledWith(expect.stringContaining('event: done'))
    expect(res.end).toHaveBeenCalled()
  })
})

describe('POST /generate/micro-context-suggest', () => {
  const handler = findHandler('post', '/generate/micro-context-suggest')

  it('streams micro-context suggestion and parses JSON result', async () => {
    const jsonResult = '```json\n{"angle":"Test angle","tone":"expert","directives":"Be precise"}\n```'
    mockStreamChatCompletion.mockReturnValueOnce(fakeStream([jsonResult]))

    const req = {
      body: {
        articleId: 1,
        articleTitle: 'Test Article',
        articleType: 'Pilier',
        keyword: 'test keyword',
        cocoonName: 'Test Cocoon',
        siloName: 'Test Silo',
      },
    } as unknown as Request
    const res = createMockRes()

    await handler(req, res)

    expect(mockLoadPrompt).toHaveBeenCalledWith('micro-context-suggest', expect.objectContaining({
      articleTitle: 'Test Article',
      keyword: 'test keyword',
    }), expect.any(Object))
    expect(res.writeHead).toHaveBeenCalledWith(200, expect.objectContaining({
      'Content-Type': 'text/event-stream',
    }))
    expect(res.write).toHaveBeenCalledWith(expect.stringContaining('event: done'))
    expect(res.write).toHaveBeenCalledWith(expect.stringContaining('"angle":"Test angle"'))
    expect(res.end).toHaveBeenCalled()
  })

  it('returns 400 when required fields are missing', async () => {
    const req = { body: { slug: 'test-article' } } as unknown as Request
    const res = createMockRes()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'MISSING_PARAM' }),
      }),
    )
  })

  it('sends SSE error event when Claude API fails after headers sent', async () => {
    mockStreamChatCompletion.mockImplementationOnce(async function* () {
      yield 'partial'
      throw new Error('Claude API error')
    })

    const req = {
      body: {
        articleId: 1,
        articleTitle: 'Test Article',
        articleType: 'Pilier',
        keyword: 'test keyword',
        cocoonName: 'Test Cocoon',
      },
    } as unknown as Request
    const res = createMockRes()
    res.writeHead = vi.fn().mockImplementation(() => {
      ;(res as any).headersSent = true
    })

    await handler(req, res)

    expect(res.write).toHaveBeenCalledWith(expect.stringContaining('event: error'))
    expect(res.end).toHaveBeenCalled()
  })
})

describe('POST /generate/brief-explain', () => {
  const handler = findHandler('post', '/generate/brief-explain')

  it('streams markdown brief analysis', async () => {
    mockStreamChatCompletion.mockReturnValueOnce(fakeStream(['## Analyse\n', 'Forces du positionnement...']))

    const req = {
      body: {
        articleId: 1,
        articleTitle: 'Test Article',
        keyword: 'test keyword',
        cocoonName: 'Test Cocoon',
        keywords: ['kw1', 'kw2'],
        hnStructure: [{ level: 2, text: 'Section' }],
        dataForSeoSummary: 'Volume: 10 SERP results',
      },
    } as unknown as Request
    const res = createMockRes()

    await handler(req, res)

    expect(mockLoadPrompt).toHaveBeenCalledWith('brief-ia-panel', expect.objectContaining({
      articleTitle: 'Test Article',
      keyword: 'test keyword',
      keywords: 'kw1, kw2',
    }), expect.any(Object))
    expect(res.writeHead).toHaveBeenCalledWith(200, expect.objectContaining({
      'Content-Type': 'text/event-stream',
    }))
    expect(res.write).toHaveBeenCalledWith(expect.stringContaining('event: chunk'))
    expect(res.write).toHaveBeenCalledWith(expect.stringContaining('event: done'))
    expect(res.end).toHaveBeenCalled()
  })

  it('loads micro-context from server when available', async () => {
    const microCtx = { articleId: 1, angle: 'Server angle', tone: 'expert', directives: 'Be precise', updatedAt: '2026-04-06T00:00:00.000Z' }
    mockLoadArticleMicroContext.mockResolvedValueOnce(microCtx)
    mockStreamChatCompletion.mockReturnValueOnce(fakeStream(['Analysis']))

    const req = {
      body: {
        articleId: 1,
        articleTitle: 'Test Article',
        keyword: 'test keyword',
        cocoonName: 'Test Cocoon',
      },
    } as unknown as Request
    const res = createMockRes()

    await handler(req, res)

    expect(mockLoadArticleMicroContext).toHaveBeenCalledWith(1)
    expect(mockLoadPrompt).toHaveBeenCalledWith('brief-ia-panel', expect.objectContaining({
      microContext: expect.stringContaining('Server angle'),
    }), expect.any(Object))
  })

  it('returns 400 when required fields are missing', async () => {
    const req = { body: { slug: 'test-article' } } as unknown as Request
    const res = createMockRes()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'MISSING_PARAM' }),
      }),
    )
  })
})

// ---------------------------------------------------------------------------
// POST /generate/reduce-section
// ---------------------------------------------------------------------------

const validReduceSectionBody = {
  articleId: 1,
  sectionHtml: '<h2>Section</h2><p>Un paragraphe très long qui dépasse le budget mots.</p>',
  sectionIndex: 1,
  sectionTitle: 'Section',
  targetWordCount: 200,
  currentWordCount: 400,
  keyword: 'test keyword',
  keywords: ['test keyword', 'secondary'],
}

describe('POST /generate/reduce-section', () => {
  const handler = findHandler('post', '/generate/reduce-section')

  function createReduceReq(body: unknown) {
    return { body, socket: { setTimeout: vi.fn(), destroyed: false } } as unknown as Request
  }

  it('returns SSE done event with unified key html, usage, and sectionIndex (F9)', async () => {
    const reducedHtml = '<h2>Section</h2><p>Un paragraphe concis.</p>'
    mockStreamChatCompletion.mockReturnValueOnce(fakeStream([reducedHtml]))

    const req = createReduceReq(validReduceSectionBody)
    const res = createMockRes()

    await handler(req, res)

    expect(res.writeHead).toHaveBeenCalledWith(200, expect.objectContaining({
      'Content-Type': 'text/event-stream',
    }))
    // chunk event uses key `html` (NOT `content`)
    const chunkCall = (res.write as ReturnType<typeof vi.fn>).mock.calls.find(
      (c: unknown[]) => typeof c[0] === 'string' && c[0].includes('event: chunk'),
    )
    expect(chunkCall).toBeDefined()
    const chunkData = JSON.parse(chunkCall![0].split('data: ')[1])
    expect(chunkData).toHaveProperty('html')
    expect(chunkData).not.toHaveProperty('content')

    // done event also uses key `html` + has usage + sectionIndex
    const doneCall = (res.write as ReturnType<typeof vi.fn>).mock.calls.find(
      (c: unknown[]) => typeof c[0] === 'string' && c[0].includes('event: done'),
    )
    expect(doneCall).toBeDefined()
    const doneData = JSON.parse(doneCall![0].split('data: ')[1])
    expect(doneData).toHaveProperty('html', reducedHtml)
    expect(doneData).toHaveProperty('usage')
    expect(doneData).toHaveProperty('sectionIndex', 1)

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

  it('calls loadPrompt with escapeKeys: [sectionHtml] (G3)', async () => {
    mockStreamChatCompletion.mockReturnValueOnce(fakeStream(['<p>reduced</p>']))

    const req = createReduceReq(validReduceSectionBody)
    const res = createMockRes()

    await handler(req, res)

    expect(mockLoadPrompt).toHaveBeenCalledWith(
      'reduce-section',
      expect.objectContaining({
        sectionHtml: validReduceSectionBody.sectionHtml,
        sectionTitle: 'Section',
        targetWordCount: String(validReduceSectionBody.targetWordCount),
        currentWordCount: String(validReduceSectionBody.currentWordCount),
      }),
      { escapeKeys: ['sectionHtml'] },
    )
  })

  it('loads strategy context via getStrategy(slug)', async () => {
    mockStreamChatCompletion.mockReturnValueOnce(fakeStream(['<p>reduced</p>']))

    const req = createReduceReq(validReduceSectionBody)
    const res = createMockRes()

    await handler(req, res)

    expect(mockGetStrategy).toHaveBeenCalledWith(1)
  })

  it('uses correct maxTokens formula clamped between 512 and 8192', async () => {
    mockStreamChatCompletion.mockReturnValueOnce(fakeStream(['<p>reduced</p>']))

    const req = createReduceReq(validReduceSectionBody)
    const res = createMockRes()

    await handler(req, res)

    // Formula: Math.min(8192, Math.max(512, Math.ceil(targetWordCount * 1.5 * 1.3)))
    const expectedMaxTokens = Math.min(8192, Math.max(512, Math.ceil(200 * 1.5 * 1.3)))
    expect(mockStreamChatCompletion).toHaveBeenCalledWith(
      'mock prompt', // systemPrompt
      'mock prompt', // userPrompt
      expectedMaxTokens,
    )
  })
})

// ---------------------------------------------------------------------------
// POST /generate/humanize-section
// ---------------------------------------------------------------------------

const validHumanizeBody = {
  articleId: 1,
  sectionHtml: '<h2>Ma Section</h2><p>Un texte généré par IA.</p><ul><li>Point 1</li></ul>',
  sectionIndex: 0,
  sectionTitle: 'Ma Section',
  keyword: 'test keyword',
  keywords: ['test keyword', 'secondary'],
}

describe('POST /generate/humanize-section', () => {
  const handler = findHandler('post', '/generate/humanize-section')

  function createHumanizeReq(body: unknown) {
    return { body, socket: { setTimeout: vi.fn(), destroyed: false } } as unknown as Request
  }

  it('happy path — structure preserved on first attempt → done with structurePreserved: true', async () => {
    const humanizedHtml = '<h2>Ma Section</h2><p>Un texte naturel et fluide.</p><ul><li>Point 1</li></ul>'
    mockStreamChatCompletion.mockReturnValueOnce(fakeStream([humanizedHtml]))
    mockValidateHtmlStructurePreserved.mockReturnValueOnce({
      preserved: true,
      originalTags: [],
      modifiedTags: [],
    })

    const req = createHumanizeReq(validHumanizeBody)
    const res = createMockRes()

    await handler(req, res)

    expect(res.writeHead).toHaveBeenCalledWith(200, expect.objectContaining({
      'Content-Type': 'text/event-stream',
    }))

    // Should emit chunk then done
    const chunkCall = (res.write as ReturnType<typeof vi.fn>).mock.calls.find(
      (c: unknown[]) => typeof c[0] === 'string' && c[0].includes('event: chunk'),
    )
    expect(chunkCall).toBeDefined()

    const doneCall = (res.write as ReturnType<typeof vi.fn>).mock.calls.find(
      (c: unknown[]) => typeof c[0] === 'string' && c[0].includes('event: done'),
    )
    expect(doneCall).toBeDefined()
    const doneData = JSON.parse(doneCall![0].split('data: ')[1])
    expect(doneData.structurePreserved).toBe(true)
    expect(doneData.fallback).toBe(false)
    expect(doneData.html).toBe(humanizedHtml)
    expect(doneData.usage).toEqual(fakeUsage)
    expect(doneData.sectionIndex).toBe(0)

    // Only one call to streamChatCompletion (no retry)
    expect(mockStreamChatCompletion).toHaveBeenCalledTimes(1)
    expect(res.end).toHaveBeenCalled()
  })

  it('structure broken on first attempt → retries with reinforcement → preserved on second → done', async () => {
    const attempt1Html = '<h2>Ma Section</h2><p>Texte cassé.</p>'
    const attempt2Html = '<h2>Ma Section</h2><p>Texte corrigé.</p><ul><li>Point 1</li></ul>'

    mockStreamChatCompletion
      .mockReturnValueOnce(fakeStream([attempt1Html]))
      .mockReturnValueOnce(fakeStream([attempt2Html]))

    // First validation: broken
    mockValidateHtmlStructurePreserved.mockReturnValueOnce({
      preserved: false,
      originalTags: [],
      modifiedTags: [],
      diff: { index: 2, reason: 'missing', expected: 'ul' },
    })
    // Second validation: preserved
    mockValidateHtmlStructurePreserved.mockReturnValueOnce({
      preserved: true,
      originalTags: [],
      modifiedTags: [],
    })

    const req = createHumanizeReq(validHumanizeBody)
    const res = createMockRes()

    await handler(req, res)

    // Two calls to streamChatCompletion (retry)
    expect(mockStreamChatCompletion).toHaveBeenCalledTimes(2)

    // Second call to loadPrompt('humanize-section') should include reinforcement
    const humanizePromptCalls = mockLoadPrompt.mock.calls.filter(
      (c: unknown[]) => c[0] === 'humanize-section',
    )
    expect(humanizePromptCalls.length).toBe(2)
    // First call: no reinforcement
    expect(humanizePromptCalls[0][1].reinforcement).toBe('')
    // Second call: with reinforcement
    expect(humanizePromptCalls[1][1].reinforcement).toContain('Retry')

    const doneCall = (res.write as ReturnType<typeof vi.fn>).mock.calls.find(
      (c: unknown[]) => typeof c[0] === 'string' && c[0].includes('event: done'),
    )
    expect(doneCall).toBeDefined()
    const doneData = JSON.parse(doneCall![0].split('data: ')[1])
    expect(doneData.structurePreserved).toBe(true)
    expect(doneData.fallback).toBe(false)
    expect(doneData.html).toBe(attempt2Html)
    // Usage should be aggregated from both attempts
    expect(doneData.usage.inputTokens).toBe(fakeUsage.inputTokens * 2)
    expect(doneData.usage.outputTokens).toBe(fakeUsage.outputTokens * 2)
    expect(res.end).toHaveBeenCalled()
  })

  it('both attempts fail → falls back to original sectionHtml with fallback: true', async () => {
    const brokenHtml1 = '<h2>Broken</h2><div>wrong</div>'
    const brokenHtml2 = '<h2>Still Broken</h2><span>wrong</span>'

    mockStreamChatCompletion
      .mockReturnValueOnce(fakeStream([brokenHtml1]))
      .mockReturnValueOnce(fakeStream([brokenHtml2]))

    mockValidateHtmlStructurePreserved
      .mockReturnValueOnce({
        preserved: false,
        originalTags: [],
        modifiedTags: [],
        diff: { index: 1, reason: 'tag-name', expected: 'p', got: 'div' },
      })
      .mockReturnValueOnce({
        preserved: false,
        originalTags: [],
        modifiedTags: [],
        diff: { index: 1, reason: 'tag-name', expected: 'p', got: 'span' },
      })

    const req = createHumanizeReq(validHumanizeBody)
    const res = createMockRes()

    await handler(req, res)

    expect(mockStreamChatCompletion).toHaveBeenCalledTimes(2)

    const doneCall = (res.write as ReturnType<typeof vi.fn>).mock.calls.find(
      (c: unknown[]) => typeof c[0] === 'string' && c[0].includes('event: done'),
    )
    expect(doneCall).toBeDefined()
    const doneData = JSON.parse(doneCall![0].split('data: ')[1])
    expect(doneData.structurePreserved).toBe(false)
    expect(doneData.fallback).toBe(true)
    // Falls back to original sectionHtml
    expect(doneData.html).toBe(validHumanizeBody.sectionHtml)
    expect(doneData.sectionIndex).toBe(0)
    expect(doneData.diff).toBeDefined()
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

  it('API error → emits error event + done with fallback', async () => {
    mockStreamChatCompletion.mockImplementationOnce(async function* () {
      throw new Error('Claude API error')
    })

    const req = createHumanizeReq(validHumanizeBody)
    const res = createMockRes()

    await handler(req, res)

    // Should emit error event
    const errorCall = (res.write as ReturnType<typeof vi.fn>).mock.calls.find(
      (c: unknown[]) => typeof c[0] === 'string' && c[0].includes('event: error'),
    )
    expect(errorCall).toBeDefined()

    // Should emit done with fallback to original html
    const doneCall = (res.write as ReturnType<typeof vi.fn>).mock.calls.find(
      (c: unknown[]) => typeof c[0] === 'string' && c[0].includes('event: done'),
    )
    expect(doneCall).toBeDefined()
    const doneData = JSON.parse(doneCall![0].split('data: ')[1])
    expect(doneData.fallback).toBe(true)
    expect(doneData.html).toBe(validHumanizeBody.sectionHtml)
    expect(doneData.sectionIndex).toBe(0)
    expect(doneData.error).toBe('Claude API error')
    expect(res.end).toHaveBeenCalled()
  })

  it('uses escapeKeys: [sectionHtml] (G3)', async () => {
    const humanizedHtml = '<h2>Ma Section</h2><p>Texte humanisé.</p><ul><li>Point 1</li></ul>'
    mockStreamChatCompletion.mockReturnValueOnce(fakeStream([humanizedHtml]))
    mockValidateHtmlStructurePreserved.mockReturnValueOnce({
      preserved: true,
      originalTags: [],
      modifiedTags: [],
    })

    const req = createHumanizeReq(validHumanizeBody)
    const res = createMockRes()

    await handler(req, res)

    expect(mockLoadPrompt).toHaveBeenCalledWith(
      'humanize-section',
      expect.objectContaining({
        sectionHtml: validHumanizeBody.sectionHtml,
        sectionTitle: validHumanizeBody.sectionTitle,
        keyword: validHumanizeBody.keyword,
      }),
      { escapeKeys: ['sectionHtml'] },
    )
  })
})

// ---------------------------------------------------------------------------
// POST /generate/article — updated tests for dynamic maxTokens + targetWordCount
// ---------------------------------------------------------------------------

describe('POST /generate/article (dynamic maxTokens & targetWordCount)', () => {
  const handler = findHandler('post', '/generate/article')

  function createArticleReq(body: unknown) {
    return { body, socket: { setTimeout: vi.fn(), destroyed: false } } as unknown as Request
  }

  it('uses dynamic maxTokens (NOT hardcoded 4096) based on computeSectionBudget', async () => {
    mockStreamChatCompletion.mockReturnValueOnce(fakeStream(['<h2>Hello</h2><p>World</p>']))

    const req = createArticleReq(validArticleBody)
    const res = createMockRes()

    await handler(req, res)

    // The default target for Pilier is 2500. With 1 H2 group (intro position),
    // the budget is computed dynamically. The maxTokens argument should NOT be 4096.
    const callArgs = mockStreamChatCompletion.mock.calls[0]
    const maxTokensArg = callArgs[2]
    // Must be a number computed dynamically (NOT the old hardcoded 4096)
    expect(typeof maxTokensArg).toBe('number')
    expect(maxTokensArg).toBeGreaterThanOrEqual(2048)
    expect(maxTokensArg).toBeLessThanOrEqual(8192)
    // For Pilier (2500 words), single group: budget = 2500, maxTokens = min(8192, ceil(2500*4)) = 8192
    expect(maxTokensArg).toBe(Math.min(8192, Math.max(2048, Math.ceil(2500 * 4))))
  })

  it('passes targetWordCount from parsed.data when provided (F7)', async () => {
    const customTarget = 1200
    mockStreamChatCompletion.mockReturnValueOnce(fakeStream(['<h2>Hello</h2><p>World</p>']))

    const bodyWithTarget = { ...validArticleBody, targetWordCount: customTarget }
    const req = createArticleReq(bodyWithTarget)
    const res = createMockRes()

    await handler(req, res)

    // With targetWordCount = 1200 and 1 group: budget = 1200, maxTokens = ceil(1200*4) = 4800
    const callArgs = mockStreamChatCompletion.mock.calls[0]
    const maxTokensArg = callArgs[2]
    const expectedMaxTokens = Math.min(8192, Math.max(2048, Math.ceil(customTarget * 4)))
    expect(maxTokensArg).toBe(expectedMaxTokens)
  })
})
