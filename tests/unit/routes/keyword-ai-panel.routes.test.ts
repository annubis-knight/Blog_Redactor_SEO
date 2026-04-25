// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Mocks ---
const mockStreamGenerator = vi.fn()
vi.mock('../../../server/services/external/claude.service', () => ({
  streamChatCompletion: (...args: unknown[]) => mockStreamGenerator(...args),
  USAGE_SENTINEL: '__USAGE__',
}))

vi.mock('../../../server/utils/prompt-loader', () => ({
  loadPrompt: vi.fn().mockResolvedValue('System prompt for AI panel'),
}))

vi.mock('../../../server/utils/logger', () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const mockGetCocoonExistingLieutenants = vi.fn().mockResolvedValue([])
vi.mock('../../../server/services/infra/data.service', () => ({
  getCocoonExistingLieutenants: (...args: unknown[]) => mockGetCocoonExistingLieutenants(...args),
}))

import { loadPrompt } from '../../../server/utils/prompt-loader'
import router from '../../../server/routes/keyword-ai-panel.routes'

const mockLoadPrompt = vi.mocked(loadPrompt)

// --- Minimal Express helpers ---
function makeReq(keyword: string, body: Record<string, unknown> = {}) {
  return {
    params: { keyword: encodeURIComponent(keyword) },
    body,
  } as any
}

function makeRes() {
  const res: any = {
    statusCode: 200,
    headersSent: false,
    written: [] as string[],
    headers: {} as Record<string, string>,
  }
  res.json = vi.fn().mockReturnValue(res)
  res.status = vi.fn((code: number) => {
    res.statusCode = code
    return res
  })
  res.writeHead = vi.fn((code: number, headers: Record<string, string>) => {
    res.statusCode = code
    res.headersSent = true
    res.headers = headers
  })
  res.write = vi.fn((data: string) => {
    res.written.push(data)
  })
  res.end = vi.fn()
  return res
}

function getHandler() {
  const layer = (router as any).stack.find(
    (l: any) => l.route?.path === '/keywords/:keyword/ai-panel' && l.route?.methods?.post,
  )
  return layer?.route?.stack?.[0]?.handle
}

function createMockStream(chunks: string[], usage?: object) {
  return async function* () {
    for (const chunk of chunks) {
      yield chunk
    }
    if (usage) {
      yield `__USAGE__${JSON.stringify(usage)}`
    }
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockLoadPrompt.mockResolvedValue('System prompt for AI panel')
})

describe('POST /api/keywords/:keyword/ai-panel', () => {
  it('route handler exists', () => {
    expect(getHandler()).toBeDefined()
  })

  it('returns 400 if level is missing', async () => {
    const handler = getHandler()
    const req = makeReq('seo', {})
    const res = makeRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ code: 'VALIDATION_ERROR', message: expect.stringContaining('required') }),
    }))
  })

  it('sets SSE headers', async () => {
    mockStreamGenerator.mockReturnValue(createMockStream(['Hello'])())
    const handler = getHandler()
    const req = makeReq('seo', { level: 'pilier', kpis: [], verdict: { level: 'GO', greenCount: 6, totalKpis: 6 } })
    const res = makeRes()
    await handler(req, res)
    expect(res.writeHead).toHaveBeenCalledWith(200, expect.objectContaining({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
    }))
  })

  it('loads prompt with keyword and level variables', async () => {
    mockStreamGenerator.mockReturnValue(createMockStream(['Avis'])())
    const handler = getHandler()
    const req = makeReq('seo local', {
      level: 'pilier',
      kpis: [{ name: 'volume', color: 'green', label: '1500' }],
      verdict: { level: 'GO', greenCount: 6, totalKpis: 6 },
    })
    const res = makeRes()
    await handler(req, res)
    expect(mockLoadPrompt).toHaveBeenCalledWith('capitaine-ai-panel', expect.objectContaining({
      keyword: 'seo local',
      level: 'pilier',
    }), undefined)
  })

  it('streams chunk events', async () => {
    mockStreamGenerator.mockReturnValue(createMockStream(['Chunk1', 'Chunk2'])())
    const handler = getHandler()
    const req = makeReq('seo', { level: 'pilier', kpis: [], verdict: { level: 'GO', greenCount: 6, totalKpis: 6 } })
    const res = makeRes()
    await handler(req, res)
    const allWritten = res.written.join('')
    expect(allWritten).toContain('event: chunk')
    expect(allWritten).toContain('"content":"Chunk1"')
    expect(allWritten).toContain('"content":"Chunk2"')
  })

  it('sends done event with metadata and usage', async () => {
    const usage = { inputTokens: 100, outputTokens: 200, model: 'claude-sonnet-4-6', estimatedCost: 0.003 }
    mockStreamGenerator.mockReturnValue(createMockStream(['Text'], usage)())
    const handler = getHandler()
    const req = makeReq('seo', { level: 'pilier', kpis: [], verdict: { level: 'GO', greenCount: 6, totalKpis: 6 } })
    const res = makeRes()
    await handler(req, res)
    const allWritten = res.written.join('')
    expect(allWritten).toContain('event: done')
    expect(allWritten).toContain('"keyword":"seo"')
    expect(allWritten).toContain('"level":"pilier"')
    expect(res.end).toHaveBeenCalled()
  })

  it('builds KPI summary for prompt', async () => {
    mockStreamGenerator.mockReturnValue(createMockStream(['OK'])())
    const handler = getHandler()
    const req = makeReq('test', {
      level: 'intermediaire',
      kpis: [
        { name: 'volume', color: 'green', label: '1 500' },
        { name: 'kd', color: 'orange', label: 'KD 45' },
      ],
      verdict: { level: 'ORANGE', greenCount: 3, totalKpis: 6 },
    })
    const res = makeRes()
    await handler(req, res)
    expect(mockLoadPrompt).toHaveBeenCalledWith('capitaine-ai-panel', expect.objectContaining({
      kpis_summary: expect.stringContaining('volume: 1 500 (green)'),
      verdict: 'ORANGE (3/6 verts)',
    }), undefined)
  })

  it('handles streaming error after headers sent', async () => {
    mockStreamGenerator.mockReturnValue((async function* () {
      yield 'Start'
      throw new Error('Claude API error')
    })())
    const handler = getHandler()
    const req = makeReq('seo', { level: 'pilier', kpis: [], verdict: { level: 'GO', greenCount: 6, totalKpis: 6 } })
    const res = makeRes()
    await handler(req, res)
    const allWritten = res.written.join('')
    expect(allWritten).toContain('event: error')
    expect(allWritten).toContain('Claude API error')
    expect(res.end).toHaveBeenCalled()
  })
})

// --- AI Hn Structure route tests ---
function getHnHandler() {
  const layer = (router as any).stack.find(
    (l: any) => l.route?.path === '/keywords/:keyword/ai-hn-structure' && l.route?.methods?.post,
  )
  return layer?.route?.stack?.[0]?.handle
}

describe('POST /api/keywords/:keyword/ai-hn-structure', () => {
  it('route handler exists', () => {
    expect(getHnHandler()).toBeDefined()
  })

  it('returns 400 if lieutenants is missing', async () => {
    const handler = getHnHandler()
    const req = makeReq('seo', { level: 'pilier' })
    const res = makeRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ code: 'VALIDATION_ERROR' }),
    }))
  })

  it('returns 400 if lieutenants is empty array', async () => {
    const handler = getHnHandler()
    const req = makeReq('seo', { level: 'pilier', lieutenants: [] })
    const res = makeRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('sets SSE headers', async () => {
    mockStreamGenerator.mockReturnValue(createMockStream(['Hello'])())
    const handler = getHnHandler()
    const req = makeReq('seo', {
      level: 'pilier',
      lieutenants: ['causes', 'solutions'],
      hnStructure: [{ level: 2, text: 'Causes', count: 3 }],
    })
    const res = makeRes()
    await handler(req, res)
    expect(res.writeHead).toHaveBeenCalledWith(200, expect.objectContaining({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
    }))
  })

  it('loads prompt with keyword, level, and lieutenants', async () => {
    mockStreamGenerator.mockReturnValue(createMockStream(['Structure'])())
    const handler = getHnHandler()
    const req = makeReq('seo local', {
      level: 'intermediaire',
      lieutenants: ['causes', 'solutions'],
      hnStructure: [],
    })
    const res = makeRes()
    await handler(req, res)
    expect(mockLoadPrompt).toHaveBeenCalledWith('lieutenants-hn-structure', expect.objectContaining({
      keyword: 'seo local',
      level: 'intermediaire',
      lieutenants: 'causes, solutions',
    }), undefined)
  })

  it('streams chunk events', async () => {
    mockStreamGenerator.mockReturnValue(createMockStream(['H2 Causes', 'H3 Detail'])())
    const handler = getHnHandler()
    const req = makeReq('seo', {
      level: 'pilier',
      lieutenants: ['causes'],
      hnStructure: [],
    })
    const res = makeRes()
    await handler(req, res)
    const allWritten = res.written.join('')
    expect(allWritten).toContain('event: chunk')
    expect(allWritten).toContain('"content":"H2 Causes"')
    expect(allWritten).toContain('"content":"H3 Detail"')
  })

  it('sends done event with metadata', async () => {
    const usage = { inputTokens: 50, outputTokens: 100, model: 'claude-sonnet-4-6', estimatedCost: 0.001 }
    mockStreamGenerator.mockReturnValue(createMockStream(['Text'], usage)())
    const handler = getHnHandler()
    const req = makeReq('seo', {
      level: 'pilier',
      lieutenants: ['causes'],
      hnStructure: [],
    })
    const res = makeRes()
    await handler(req, res)
    const allWritten = res.written.join('')
    expect(allWritten).toContain('event: done')
    expect(allWritten).toContain('"keyword":"seo"')
    expect(allWritten).toContain('"level":"pilier"')
    expect(res.end).toHaveBeenCalled()
  })

  it('formats hnStructure in prompt variables', async () => {
    mockStreamGenerator.mockReturnValue(createMockStream(['OK'])())
    const handler = getHnHandler()
    const req = makeReq('seo', {
      level: 'pilier',
      lieutenants: ['test'],
      hnStructure: [
        { level: 2, text: 'Causes', count: 3 },
        { level: 3, text: 'Detail', count: 2 },
      ],
    })
    const res = makeRes()
    await handler(req, res)
    expect(mockLoadPrompt).toHaveBeenCalledWith('lieutenants-hn-structure', expect.objectContaining({
      hn_structure: expect.stringContaining('H2: Causes (3x)'),
    }), undefined)
    expect(mockLoadPrompt).toHaveBeenCalledWith('lieutenants-hn-structure', expect.objectContaining({
      hn_structure: expect.stringContaining('H3: Detail (2x)'),
    }), undefined)
  })

  it('handles streaming error after headers sent', async () => {
    mockStreamGenerator.mockReturnValue((async function* () {
      yield 'Start'
      throw new Error('Claude API error')
    })())
    const handler = getHnHandler()
    const req = makeReq('seo', {
      level: 'pilier',
      lieutenants: ['causes'],
      hnStructure: [],
    })
    const res = makeRes()
    await handler(req, res)
    const allWritten = res.written.join('')
    expect(allWritten).toContain('event: error')
    expect(allWritten).toContain('Claude API error')
    expect(res.end).toHaveBeenCalled()
  })
})

// --- AI Lexique route tests ---
function getLexiqueHandler() {
  const layer = (router as any).stack.find(
    (l: any) => l.route?.path === '/keywords/:keyword/ai-lexique' && l.route?.methods?.post,
  )
  return layer?.route?.stack?.[0]?.handle
}

describe('POST /api/keywords/:keyword/ai-lexique', () => {
  const validBody = {
    level: 'pilier',
    lexiqueTerms: {
      obligatoire: ['référencement', 'optimisation'],
      differenciateur: ['stratégie'],
      optionnel: [],
    },
  }

  it('route handler exists', () => {
    expect(getLexiqueHandler()).toBeDefined()
  })

  it('returns 400 if level is missing', async () => {
    const handler = getLexiqueHandler()
    const req = makeReq('seo', { lexiqueTerms: validBody.lexiqueTerms })
    const res = makeRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ code: 'VALIDATION_ERROR', message: expect.stringContaining('required') }),
    }))
  })

  it('returns 400 if lexiqueTerms has no terms', async () => {
    const handler = getLexiqueHandler()
    const req = makeReq('seo', {
      level: 'pilier',
      lexiqueTerms: { obligatoire: [], differenciateur: [], optionnel: [] },
    })
    const res = makeRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ code: 'VALIDATION_ERROR', message: expect.stringContaining('at least one term') }),
    }))
  })

  it('returns 400 if lexiqueTerms is missing', async () => {
    const handler = getLexiqueHandler()
    const req = makeReq('seo', { level: 'pilier' })
    const res = makeRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('sets SSE headers', async () => {
    mockStreamGenerator.mockReturnValue(createMockStream(['Hello'])())
    const handler = getLexiqueHandler()
    const req = makeReq('seo', validBody)
    const res = makeRes()
    await handler(req, res)
    expect(res.writeHead).toHaveBeenCalledWith(200, expect.objectContaining({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
    }))
  })

  it('loads prompt with keyword, level, and term lists', async () => {
    mockStreamGenerator.mockReturnValue(createMockStream(['Analyse'])())
    const handler = getLexiqueHandler()
    const req = makeReq('seo local', validBody)
    const res = makeRes()
    await handler(req, res)
    expect(mockLoadPrompt).toHaveBeenCalledWith('lexique-ai-panel', expect.objectContaining({
      keyword: 'seo local',
      level: 'pilier',
      obligatoire_terms: 'référencement, optimisation',
      differenciateur_terms: 'stratégie',
      optionnel_terms: 'aucun',
    }), undefined)
  })

  it('passes cocoonSlug to loadPrompt options', async () => {
    mockStreamGenerator.mockReturnValue(createMockStream(['OK'])())
    const handler = getLexiqueHandler()
    const req = makeReq('seo', { ...validBody, cocoonSlug: 'mon-cocon' })
    const res = makeRes()
    await handler(req, res)
    expect(mockLoadPrompt).toHaveBeenCalledWith(
      'lexique-ai-panel',
      expect.any(Object),
      { cocoonSlug: 'mon-cocon' },
    )
  })

  it('streams chunk events', async () => {
    mockStreamGenerator.mockReturnValue(createMockStream(['Chunk1', 'Chunk2'])())
    const handler = getLexiqueHandler()
    const req = makeReq('seo', validBody)
    const res = makeRes()
    await handler(req, res)
    const allWritten = res.written.join('')
    expect(allWritten).toContain('event: chunk')
    expect(allWritten).toContain('"content":"Chunk1"')
    expect(allWritten).toContain('"content":"Chunk2"')
  })

  it('sends done event with metadata', async () => {
    const usage = { inputTokens: 80, outputTokens: 150, model: 'claude-sonnet-4-6', estimatedCost: 0.002 }
    mockStreamGenerator.mockReturnValue(createMockStream(['Text'], usage)())
    const handler = getLexiqueHandler()
    const req = makeReq('seo', validBody)
    const res = makeRes()
    await handler(req, res)
    const allWritten = res.written.join('')
    expect(allWritten).toContain('event: done')
    expect(allWritten).toContain('"keyword":"seo"')
    expect(allWritten).toContain('"level":"pilier"')
    expect(res.end).toHaveBeenCalled()
  })

  it('handles streaming error after headers sent', async () => {
    mockStreamGenerator.mockReturnValue((async function* () {
      yield 'Start'
      throw new Error('Claude API error')
    })())
    const handler = getLexiqueHandler()
    const req = makeReq('seo', validBody)
    const res = makeRes()
    await handler(req, res)
    const allWritten = res.written.join('')
    expect(allWritten).toContain('event: error')
    expect(allWritten).toContain('Claude API error')
    expect(res.end).toHaveBeenCalled()
  })
})

// --- AI Propose Lieutenants route tests ---
function getProposeLieutenantsHandler() {
  const layer = (router as any).stack.find(
    (l: any) => l.route?.path === '/keywords/:keyword/propose-lieutenants' && l.route?.methods?.post,
  )
  return layer?.route?.stack?.[0]?.handle
}

/** Valid JSON that parseAiJson can extract */
function makeLieutenantJson(count = 3) {
  const lieutenants = Array.from({ length: count }, (_, i) => ({
    keyword: `lieutenant-${i + 1}`,
    reasoning: `Raison ${i + 1}`,
    sources: ['paa'],
    suggestedHnLevel: 2,
    score: 90 - i * 10,
  }))
  return JSON.stringify({
    lieutenants,
    hnStructure: [{ level: 2, text: 'Structure H2' }],
    contentGapInsights: 'Gap insight',
  })
}

const proposeLtBaseBody = {
  level: 'pilier',
  articleId: 1,
  serpHeadings: [{ level: 2, text: 'Causes', count: 3 }],
  paaQuestions: [{ question: 'Question 1?', answer: 'Answer 1' }],
  wordGroups: ['group1'],
  rootKeywords: ['root1'],
  serpCompetitors: [{ domain: 'example.com', title: 'Example', position: 1 }],
}

describe('POST /api/keywords/:keyword/propose-lieutenants', () => {
  it('route handler exists', () => {
    expect(getProposeLieutenantsHandler()).toBeDefined()
  })

  it('returns 400 if level is missing', async () => {
    const handler = getProposeLieutenantsHandler()
    const req = makeReq('seo', { articleId: 1 })
    const res = makeRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ code: 'VALIDATION_ERROR', message: expect.stringContaining('required') }),
    }))
  })

  it('returns 400 if articleId is missing', async () => {
    const handler = getProposeLieutenantsHandler()
    const req = makeReq('seo', { level: 'pilier' })
    const res = makeRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('returns 400 if level is invalid', async () => {
    const handler = getProposeLieutenantsHandler()
    const req = makeReq('seo', { level: 'invalid', articleId: 1 })
    const res = makeRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ message: expect.stringContaining('pilier') }),
    }))
  })

  it('sets SSE headers', async () => {
    mockStreamGenerator.mockReturnValue(createMockStream([makeLieutenantJson()])())
    const handler = getProposeLieutenantsHandler()
    const req = makeReq('seo', proposeLtBaseBody)
    const res = makeRes()
    await handler(req, res)
    expect(res.writeHead).toHaveBeenCalledWith(200, expect.objectContaining({
      'Content-Type': 'text/event-stream',
    }))
  })

  it('calls getCocoonExistingLieutenants with articleId', async () => {
    mockStreamGenerator.mockReturnValue(createMockStream([makeLieutenantJson()])())
    const handler = getProposeLieutenantsHandler()
    const req = makeReq('seo', proposeLtBaseBody)
    const res = makeRes()
    await handler(req, res)
    expect(mockGetCocoonExistingLieutenants).toHaveBeenCalledWith(1)
  })

  it('loads propose-lieutenants prompt with variables', async () => {
    mockStreamGenerator.mockReturnValue(createMockStream([makeLieutenantJson()])())
    const handler = getProposeLieutenantsHandler()
    const req = makeReq('seo local', proposeLtBaseBody)
    const res = makeRes()
    await handler(req, res)
    expect(mockLoadPrompt).toHaveBeenCalledWith('propose-lieutenants', expect.objectContaining({
      keyword: 'seo local',
      level: 'pilier',
      paa_questions: expect.stringContaining('Question 1?'),
      hn_recurrence: expect.stringContaining('Causes'),
      serp_competitors: expect.stringContaining('example.com'),
    }), undefined)
  })

  it('passes cocoonSlug to loadPrompt when provided', async () => {
    mockStreamGenerator.mockReturnValue(createMockStream([makeLieutenantJson()])())
    const handler = getProposeLieutenantsHandler()
    const req = makeReq('seo', { ...proposeLtBaseBody, cocoonSlug: 'my-cocoon' })
    const res = makeRes()
    await handler(req, res)
    expect(mockLoadPrompt).toHaveBeenCalledWith(
      'propose-lieutenants',
      expect.any(Object),
      { cocoonSlug: 'my-cocoon' },
    )
  })

  it('filters and returns selected + eliminated lieutenants', async () => {
    // 8 lieutenants — pilier max is 5
    mockStreamGenerator.mockReturnValue(createMockStream([makeLieutenantJson(8)])())
    const handler = getProposeLieutenantsHandler()
    const req = makeReq('seo', proposeLtBaseBody)
    const res = makeRes()
    await handler(req, res)
    const allWritten = res.written.join('')
    expect(allWritten).toContain('event: done')

    const doneEvent = res.written.find((w: string) => w.includes('event: done'))
    const dataLine = doneEvent!.split('\n').find((l: string) => l.startsWith('data: '))!
    const data = JSON.parse(dataLine.slice(6))
    expect(data.outline.selectedLieutenants).toHaveLength(5) // MAX_SELECTED pilier = 5
    expect(data.outline.eliminatedLieutenants).toHaveLength(3)
    expect(data.outline.totalGenerated).toBe(8)
  })

  it('filters empty PAA questions before formatting', async () => {
    mockStreamGenerator.mockReturnValue(createMockStream([makeLieutenantJson()])())
    const handler = getProposeLieutenantsHandler()
    const req = makeReq('seo', {
      ...proposeLtBaseBody,
      paaQuestions: [
        { question: '', answer: null },
        { question: '  ', answer: null },
        { question: 'Real question?', answer: 'Real answer' },
      ],
    })
    const res = makeRes()
    await handler(req, res)
    // loadPrompt should receive only the non-empty PAA
    expect(mockLoadPrompt).toHaveBeenCalledWith('propose-lieutenants', expect.objectContaining({
      paa_questions: '- Real question? → Real answer',
    }), undefined)
  })

  it('formats fallback when all PAA are empty', async () => {
    mockStreamGenerator.mockReturnValue(createMockStream([makeLieutenantJson()])())
    const handler = getProposeLieutenantsHandler()
    const req = makeReq('seo', {
      ...proposeLtBaseBody,
      paaQuestions: [{ question: '', answer: null }],
    })
    const res = makeRes()
    await handler(req, res)
    expect(mockLoadPrompt).toHaveBeenCalledWith('propose-lieutenants', expect.objectContaining({
      paa_questions: 'Aucune PAA disponible pour cette requête.',
    }), undefined)
  })

  it('handles streaming error after headers sent', async () => {
    mockStreamGenerator.mockReturnValue((async function* () {
      yield 'Start'
      throw new Error('Claude API error')
    })())
    const handler = getProposeLieutenantsHandler()
    const req = makeReq('seo', proposeLtBaseBody)
    const res = makeRes()
    await handler(req, res)
    const allWritten = res.written.join('')
    expect(allWritten).toContain('event: error')
    expect(allWritten).toContain('Claude API error')
  })

  it('returns 500 error when AI returns non-JSON', async () => {
    mockStreamGenerator.mockReturnValue(createMockStream(['Not valid JSON at all'])())
    const handler = getProposeLieutenantsHandler()
    const req = makeReq('seo', proposeLtBaseBody)
    const res = makeRes()
    await handler(req, res)
    // Headers are sent before parsing, so error comes as SSE event
    const allWritten = res.written.join('')
    expect(allWritten).toContain('event: error')
  })
})

// --- AI Lexique Upfront route tests ---
function getLexiqueUpfrontHandler() {
  const layer = (router as any).stack.find(
    (l: any) => l.route?.path === '/keywords/:keyword/ai-lexique-upfront' && l.route?.methods?.post,
  )
  return layer?.route?.stack?.[0]?.handle
}

function makeLexiqueUpfrontJson(count = 3) {
  const recommendations = Array.from({ length: count }, (_, i) => ({
    term: `term-${i + 1}`,
    aiRecommended: i < 2,
    aiReason: `Raison ${i + 1}`,
  }))
  return JSON.stringify({
    recommendations,
    missingTerms: ['missing-term'],
    summary: 'IA summary',
  })
}

const upfrontBaseBody = {
  level: 'intermediaire',
  allTerms: {
    obligatoire: ['term1', 'term2'],
    differenciateur: ['term3'],
    optionnel: ['term4'],
  },
}

describe('POST /api/keywords/:keyword/ai-lexique-upfront', () => {
  it('route handler exists', () => {
    expect(getLexiqueUpfrontHandler()).toBeDefined()
  })

  it('returns 400 if level is missing', async () => {
    const handler = getLexiqueUpfrontHandler()
    const req = makeReq('seo', { allTerms: upfrontBaseBody.allTerms })
    const res = makeRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('returns 400 if allTerms is empty', async () => {
    const handler = getLexiqueUpfrontHandler()
    const req = makeReq('seo', {
      level: 'pilier',
      allTerms: { obligatoire: [], differenciateur: [], optionnel: [] },
    })
    const res = makeRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ message: expect.stringContaining('at least one term') }),
    }))
  })

  it('sets SSE headers', async () => {
    mockStreamGenerator.mockReturnValue(createMockStream([makeLexiqueUpfrontJson()])())
    const handler = getLexiqueUpfrontHandler()
    const req = makeReq('seo', upfrontBaseBody)
    const res = makeRes()
    await handler(req, res)
    expect(res.writeHead).toHaveBeenCalledWith(200, expect.objectContaining({
      'Content-Type': 'text/event-stream',
    }))
  })

  it('loads prompt with term categories', async () => {
    mockStreamGenerator.mockReturnValue(createMockStream([makeLexiqueUpfrontJson()])())
    const handler = getLexiqueUpfrontHandler()
    const req = makeReq('seo local', upfrontBaseBody)
    const res = makeRes()
    await handler(req, res)
    expect(mockLoadPrompt).toHaveBeenCalledWith('lexique-analysis-upfront', expect.objectContaining({
      keyword: 'seo local',
      level: 'intermediaire',
      obligatoire_terms: 'term1, term2',
      differenciateur_terms: 'term3',
      optionnel_terms: 'term4',
    }), undefined)
  })

  it('passes cocoonSlug to loadPrompt when provided', async () => {
    mockStreamGenerator.mockReturnValue(createMockStream([makeLexiqueUpfrontJson()])())
    const handler = getLexiqueUpfrontHandler()
    const req = makeReq('seo', { ...upfrontBaseBody, cocoonSlug: 'my-cocoon' })
    const res = makeRes()
    await handler(req, res)
    expect(mockLoadPrompt).toHaveBeenCalledWith(
      'lexique-analysis-upfront',
      expect.any(Object),
      { cocoonSlug: 'my-cocoon' },
    )
  })

  it('scales maxTokens based on term count', async () => {
    // 4 terms total → Math.max(4096, Math.min(16384, 4 * 80 + 512)) = 4096 (minimum)
    mockStreamGenerator.mockReturnValue(createMockStream([makeLexiqueUpfrontJson()])())
    const handler = getLexiqueUpfrontHandler()
    const req = makeReq('seo', upfrontBaseBody)
    const res = makeRes()
    await handler(req, res)
    // streamChatCompletion called with (systemPrompt, userPrompt, maxTokens)
    const callArgs = mockStreamGenerator.mock.calls[0]
    expect(callArgs[2]).toBe(4096) // 4 terms × 80 + 512 = 832, clamped to min 4096
  })

  it('scales maxTokens higher for many terms', async () => {
    mockStreamGenerator.mockReturnValue(createMockStream([makeLexiqueUpfrontJson()])())
    const handler = getLexiqueUpfrontHandler()
    // 150 terms → Math.max(4096, Math.min(16384, 150 * 80 + 512)) = 12512
    const bigTerms = {
      obligatoire: Array.from({ length: 60 }, (_, i) => `obl-${i}`),
      differenciateur: Array.from({ length: 50 }, (_, i) => `diff-${i}`),
      optionnel: Array.from({ length: 40 }, (_, i) => `opt-${i}`),
    }
    const req = makeReq('seo', { level: 'pilier', allTerms: bigTerms })
    const res = makeRes()
    await handler(req, res)
    const callArgs = mockStreamGenerator.mock.calls[0]
    expect(callArgs[2]).toBe(12512) // 150 × 80 + 512
  })

  it('caps maxTokens at 16384', async () => {
    mockStreamGenerator.mockReturnValue(createMockStream([makeLexiqueUpfrontJson()])())
    const handler = getLexiqueUpfrontHandler()
    // 300 terms → 300 * 80 + 512 = 24512 → capped to 16384
    const hugeTerms = {
      obligatoire: Array.from({ length: 200 }, (_, i) => `obl-${i}`),
      differenciateur: Array.from({ length: 100 }, (_, i) => `diff-${i}`),
      optionnel: [],
    }
    const req = makeReq('seo', { level: 'pilier', allTerms: hugeTerms })
    const res = makeRes()
    await handler(req, res)
    const callArgs = mockStreamGenerator.mock.calls[0]
    expect(callArgs[2]).toBe(16384)
  })

  it('sends done event with parsed recommendations', async () => {
    mockStreamGenerator.mockReturnValue(createMockStream([makeLexiqueUpfrontJson(3)])())
    const handler = getLexiqueUpfrontHandler()
    const req = makeReq('seo', upfrontBaseBody)
    const res = makeRes()
    await handler(req, res)
    const allWritten = res.written.join('')
    expect(allWritten).toContain('event: done')
    expect(allWritten).toContain('"keyword":"seo"')
    expect(allWritten).toContain('"level":"intermediaire"')
    expect(res.end).toHaveBeenCalled()
  })

  it('handles streaming error after headers sent', async () => {
    mockStreamGenerator.mockReturnValue((async function* () {
      yield 'Start'
      throw new Error('Claude API error')
    })())
    const handler = getLexiqueUpfrontHandler()
    const req = makeReq('seo', upfrontBaseBody)
    const res = makeRes()
    await handler(req, res)
    const allWritten = res.written.join('')
    expect(allWritten).toContain('event: error')
    expect(allWritten).toContain('Claude API error')
  })
})
