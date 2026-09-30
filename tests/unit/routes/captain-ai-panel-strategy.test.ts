// @vitest-environment node
/**
 * FR-CAP-AI-PANEL — l'avis de l'IA sur un candidat tient compte de la
 * stratégie du cocon (cible, douleur, angle, promesse, CTA).
 *
 * Recette du 2026-09-30 : l'écran n'envoie jamais `cocoonSlug`, et la route
 * ne chargeait la stratégie que sur ce champ : `{{strategy_context}}` restait
 * vide. La route retrouve désormais le cocon d'après l'article.
 *
 * Le vrai chargeur de consignes lit le vrai `capitaine-ai-panel.md` ; seules
 * la base (article, stratégie) et l'IA sont simulées.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Request, Response } from 'express'

const streamCalls: string[] = []
vi.mock('../../../server/services/external/ai-provider.service', () => ({
  streamChatCompletion: (systemPrompt: string) => {
    streamCalls.push(systemPrompt)
    return (async function* () {
      yield '1. Potentiel éditorial — ok'
    })()
  },
  USAGE_SENTINEL: '__USAGE__',
}))

vi.mock('../../../server/utils/logger', () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock('../../../server/services/queries/article-pain-point.service', () => ({
  getArticlePainPoint: async () => 'Mon site ne m’apporte aucun client',
  PAIN_POINT_FALLBACK: '(non défini)',
}))

vi.mock('../../../server/services/strategy/cocoon-context.service', () => ({
  cocoonContextForArticle: async () => '',
}))

const mockGetArticleById = vi.fn()
vi.mock('../../../server/services/infra/data.service', () => ({
  getArticleById: (...args: unknown[]) => mockGetArticleById(...args),
  getCocoonExistingLieutenants: async () => [],
  saveLieutenantExplorations: async () => [],
}))

const mockGetCocoonStrategy = vi.fn()
vi.mock('../../../server/services/strategy/cocoon-strategy.service', () => ({
  getCocoonStrategy: (...args: unknown[]) => mockGetCocoonStrategy(...args),
}))

import router from '../../../server/routes/keyword-ai-panel.routes'

function step(validated: string) {
  return { input: '', suggestion: null, validated }
}

const STRATEGY = {
  cocoonSlug: 'creation-site-toulouse',
  cible: step('Artisans toulousains sans site'),
  douleur: step('Aucun client ne les trouve en ligne'),
  angle: step('Le site vitrine comme commercial muet'),
  promesse: step('Être appelé par des clients locaux'),
  cta: step('Demander un devis'),
  proposedArticles: [],
  suggestedTopics: [],
  topicsUserContext: '',
  completedSteps: 5,
  updatedAt: '2026-09-30T00:00:00.000Z',
}

type Handler = (req: Request, res: Response) => Promise<void>
interface RouteLayer { route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: Handler }> } }

function getHandler(): Handler {
  const layer = (router as unknown as { stack: RouteLayer[] }).stack.find(
    l => l.route?.path === '/keywords/:keyword/ai-panel' && l.route?.methods?.post,
  )
  return layer!.route!.stack[0]!.handle
}

function makeRes(): Response {
  const res = { statusCode: 200, headersSent: false, written: [] as string[] } as Record<string, unknown>
  res.json = vi.fn().mockReturnValue(res)
  res.status = vi.fn((code: number) => { res.statusCode = code; return res })
  res.writeHead = vi.fn(() => { res.headersSent = true })
  res.write = vi.fn((data: string) => { (res.written as string[]).push(data) })
  res.end = vi.fn()
  return res as unknown as Response
}

async function callAiPanel(body: Record<string, unknown>) {
  const req = { params: { keyword: encodeURIComponent('création site vitrine') }, body } as unknown as Request
  await getHandler()(req, makeRes())
  return streamCalls.at(-1) ?? ''
}

beforeEach(() => {
  streamCalls.length = 0
  mockGetArticleById.mockReset()
  mockGetCocoonStrategy.mockReset()
  mockGetCocoonStrategy.mockImplementation(async (slug: string) => (slug === 'Création site Toulouse' ? STRATEGY : null))
})

describe('FR-CAP-AI-PANEL — la stratégie du cocon arrive dans la consigne de l’avis', () => {
  it('l’écran n’envoie que l’article : la route retrouve son cocon et injecte sa stratégie', async () => {
    mockGetArticleById.mockResolvedValue({ article: { id: 1342 }, cocoonName: 'Création site Toulouse' })

    const prompt = await callAiPanel({ level: 'intermediaire', articleId: 1342 })

    expect(mockGetArticleById).toHaveBeenCalledWith(1342)
    expect(prompt).toContain('## Contexte stratégique du cocon')
    expect(prompt).toContain('Artisans toulousains sans site')
    expect(prompt).toContain('Aucun client ne les trouve en ligne')
    expect(prompt).toContain('Le site vitrine comme commercial muet')
    expect(prompt).toContain('Être appelé par des clients locaux')
    expect(prompt).toContain('Demander un devis')
    expect(prompt).not.toContain('{{')
  })

  it('sans article, pas de stratégie et pas de lecture en base', async () => {
    const prompt = await callAiPanel({ level: 'intermediaire' })

    expect(mockGetArticleById).not.toHaveBeenCalled()
    expect(prompt).not.toContain('Contexte stratégique du cocon')
    expect(prompt).toContain('création site vitrine')
  })

  it('un article illisible n’empêche pas l’avis : il part sans stratégie', async () => {
    mockGetArticleById.mockRejectedValue(new Error('connexion perdue'))

    const prompt = await callAiPanel({ level: 'intermediaire', articleId: 1342 })

    expect(prompt).toContain('création site vitrine')
    expect(prompt).not.toContain('Contexte stratégique du cocon')
  })
})
