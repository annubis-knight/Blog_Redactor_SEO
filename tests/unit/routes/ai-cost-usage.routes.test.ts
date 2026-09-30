// @vitest-environment node
/**
 * FR-INFRA-COST-LOG-STORE — le coût des longues traînes du Radar et du
 * jugement des questions PAA arrive à l'écran.
 *
 * Recette 2026-09-30 : ces deux appels IA n'ajoutaient aucune ligne à la pile
 * « Coûts API ». Le service des longues traînes ignorait l'`usage` rendu par
 * l'IA ; celui du jugement PAA ne l'écrivait que dans le journal du serveur.
 * Les deux routes le rendent désormais dans `data.usage`, que `apiPost`
 * inscrit une fois ; une réponse servie par le cache n'en porte pas.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Request, Response } from 'express'

const { mockGenerateLongTail, mockRunPaaJudgments } = vi.hoisted(() => ({
  mockGenerateLongTail: vi.fn(),
  mockRunPaaJudgments: vi.fn(),
}))

vi.mock('../../../server/services/keyword/long-tail-suggest.service.js', () => ({
  generateLongTailSuggestions: mockGenerateLongTail,
  persistLongTailSelection: vi.fn(),
  LongTailSuggestionsValidationError: class extends Error {},
}))
vi.mock('../../../server/services/keyword/captain-paa-judge.service.js', () => ({
  runPaaJudgmentsForArticle: mockRunPaaJudgments,
}))
vi.mock('../../../server/services/infra/data.service', () => ({}))
vi.mock('../../../server/services/external/dataforseo.service', () => ({}))
vi.mock('../../../server/services/keyword/keyword-discovery.service', () => ({}))
vi.mock('../../../server/utils/logger.js', () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const { default: longTailRouter } = await import('../../../server/routes/long-tail-suggest.routes')
const { default: keywordsRouter } = await import('../../../server/routes/keywords.routes')

type Handler = (req: Request, res: Response) => Promise<void>
function findHandler(router: unknown, method: string, path: string): Handler {
  const layer = (router as { stack: Array<{ route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: Handler }> } }> })
    .stack.find(l => l.route?.path === path && l.route?.methods[method])
  if (!layer?.route) throw new Error(`route ${method} ${path} introuvable`)
  return layer.route.stack[0]!.handle
}

function mockRes() {
  const json = vi.fn()
  const res = { status: vi.fn().mockReturnThis(), json } as unknown as Response
  return { res, json }
}

const USAGE = { model: 'claude-haiku-4-5-20251001', inputTokens: 900, outputTokens: 300, cacheReadTokens: 0, cacheCreationTokens: 0, estimatedCost: 0.0021 }
const SUGGESTION = { keyword: 'mesurer résultats site lyon', rationale: 'Combine la mesure et la ville visée.', preferenceScore: 8, derivedFromRoots: ['mesurer résultats', 'lyon'] }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('FR-INFRA-COST-LOG-STORE — POST /articles/:id/radar-exploration/long-tail rend son coût', () => {
  const handler = findHandler(longTailRouter, 'post', '/articles/:id/radar-exploration/long-tail')
  const body = { radarKeywords: [{ keyword: 'mesurer résultats' }, { keyword: 'lyon' }], articleTitle: 'T', articlePainPoint: 'P', strategyContext: '' }

  it('une génération par l’IA rend son usage à côté des suggestions', async () => {
    mockGenerateLongTail.mockResolvedValue({ suggestions: [SUGGESTION], fromCache: false, usage: USAGE })
    const { res, json } = mockRes()
    await handler({ params: { id: '42' }, body } as unknown as Request, res)
    expect(json).toHaveBeenCalledWith({
      data: expect.objectContaining({ suggestions: [expect.objectContaining({ keyword: SUGGESTION.keyword })], fromCache: false, usage: USAGE }),
    })
  })

  it('une réponse du cache ne porte pas de coût (rien n’a été payé)', async () => {
    mockGenerateLongTail.mockResolvedValue({ suggestions: [SUGGESTION], fromCache: true, usage: null })
    const { res, json } = mockRes()
    await handler({ params: { id: '42' }, body } as unknown as Request, res)
    const sent = json.mock.calls[0]![0] as { data: { usage?: unknown } }
    expect(sent.data.usage ?? null).toBeNull()
  })
})

describe('FR-INFRA-COST-LOG-STORE — POST /articles/:id/captain/judge-paa rend son coût', () => {
  const handler = findHandler(keywordsRouter, 'post', '/articles/:id/captain/judge-paa')

  it('le coût additionné des jugements accompagne les jugements', async () => {
    mockRunPaaJudgments.mockResolvedValue({ judgments: {}, relevanceScores: {}, usage: USAGE })
    const { res, json } = mockRes()
    await handler({ params: { id: '7' }, body: {} } as unknown as Request, res)
    expect(json).toHaveBeenCalledWith({
      data: expect.objectContaining({ judgments: {}, relevanceScores: {}, usage: USAGE }),
    })
  })

  it('sans appel à l’IA (pas de douleur, pas de PAA), pas de coût', async () => {
    mockRunPaaJudgments.mockResolvedValue({ judgments: {}, relevanceScores: {}, usage: null })
    const { res, json } = mockRes()
    await handler({ params: { id: '7' }, body: {} } as unknown as Request, res)
    const sent = json.mock.calls[0]![0] as { data: { usage?: unknown } }
    expect(sent.data.usage ?? null).toBeNull()
  })
})
