// @vitest-environment node
/**
 * FR-RED-ENRICH-PASSES / FR-RED-SECTION-REWRITE — contrat des routes :
 * validation (400), proposition vérifiée en un seul événement `done`, erreur
 * explicite (Claude absent pour la passe sources) en événement `error`.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Request, Response } from 'express'

const { mockPropose, mockGetArticle, mockChildren } = vi.hoisted(() => ({ mockPropose: vi.fn(), mockGetArticle: vi.fn(), mockChildren: vi.fn() }))
vi.mock('../../../server/services/article/enrichment.service', () => ({ proposeChapter: mockPropose }))
vi.mock('../../../server/services/infra/data.service', () => ({ getArticleById: mockGetArticle, getArticleChildren: mockChildren }))
vi.mock('../../../server/services/strategy/strategy.service', () => ({ getStrategy: async () => null }))
vi.mock('../../../server/services/strategy/cocoon-strategy.service', () => ({
  getCocoonStrategy: async () => ({ cible: { validated: 'Artisans toulousains pressés' } }),
}))
vi.mock('../../../server/utils/prompt-loader', () => ({
  buildCocoonStrategyBlock: (s: { cible?: { validated?: string } }) => `## Stratégie du cocon\nCible : ${s.cible?.validated ?? ''}`,
}))

import router from '../../../server/routes/generate/enrich.routes'

type Handler = (req: Request, res: Response) => Promise<void>

function handlerOf(path: string): Handler {
  const layer = (router as unknown as { stack: Array<{ route?: { path: string; stack: Array<{ handle: Handler }> } }> }).stack
    .find(l => l.route?.path === path)
  return layer!.route!.stack[0]!.handle
}

function mockRes() {
  return { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis(), writeHead: vi.fn(), write: vi.fn(), end: vi.fn() }
}
type MockRes = ReturnType<typeof mockRes>

const req = (body: unknown, pass?: string) => ({ body, params: { pass }, socket: { setTimeout: vi.fn() } }) as unknown as Request

function events(res: MockRes): Array<{ event: string; data: Record<string, unknown> }> {
  return res.write.mock.calls
    .map(([raw]) => /^event: (\S+)\ndata: (.*)\n\n$/s.exec(raw as string))
    .filter((m): m is RegExpExecArray => m !== null)
    .map(m => ({ event: m[1]!, data: JSON.parse(m[2]!) as Record<string, unknown> }))
}

const body = { articleId: 7, chapterIndex: 0, chapterHtml: '<h2>A</h2><p>B</p>', articleHtml: '<h1>T</h1><h2>A</h2><p>B</p>', keyword: 'site vitrine', keywords: [] }
const enrich = handlerOf('/generate/enrich/:pass')
const rewrite = handlerOf('/generate/section-rewrite')

beforeEach(() => {
  mockPropose.mockReset()
  mockGetArticle.mockReset()
  mockGetArticle.mockResolvedValue({ article: { id: 7, type: 'pilier' }, cocoonName: 'Sites vitrines' })
  mockChildren.mockReset()
  mockChildren.mockResolvedValue([])
})

describe('POST /generate/enrich/:pass', () => {
  it('404 sur un article inconnu, sans appeler l’IA', async () => {
    mockGetArticle.mockResolvedValueOnce(null)
    const res = mockRes()
    await enrich(req(body, 'exemples'), res as unknown as Response)
    expect(res.status).toHaveBeenCalledWith(404)
    expect(mockPropose).not.toHaveBeenCalled()
  })

  // R18, R22 — la passe connaît le type de l'article et sa stratégie (celle du cocon à défaut).
  it('transmet le type de l’article et sa stratégie', async () => {
    mockPropose.mockResolvedValueOnce({ pass: 'exemples', html: '<h2>A</h2>', issues: [], webSources: [] })
    await enrich(req(body, 'exemples'), mockRes() as unknown as Response)
    expect(mockPropose).toHaveBeenCalledWith(expect.objectContaining({
      articleId: 7,
      articleType: 'pilier',
      strategyContext: expect.stringContaining('Artisans toulousains pressés'),
    }))
  })

  it('400 sur une passe inconnue', async () => {
    const res = mockRes()
    await enrich(req(body, 'inconnue'), res as unknown as Response)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(mockPropose).not.toHaveBeenCalled()
  })

  it('400 sur un chapitre vide, sauf pour la FAQ', async () => {
    const res = mockRes()
    await enrich(req({ ...body, chapterHtml: ' ' }, 'exemples'), res as unknown as Response)
    expect(res.status).toHaveBeenCalledWith(400)

    mockPropose.mockResolvedValueOnce({ pass: 'faq', html: '<h2>Questions fréquentes</h2>', issues: [], webSources: [] })
    const ok = mockRes()
    await enrich(req({ ...body, chapterHtml: '', chapterIndex: 1 }, 'faq'), ok as unknown as Response)
    expect(ok.status).not.toHaveBeenCalled()
    expect(mockPropose).toHaveBeenCalledWith(expect.objectContaining({ pass: 'faq', chapterIndex: 1 }))
  })

  it('la proposition vérifiée part en un seul événement done', async () => {
    const proposal = { pass: 'sources', chapterIndex: 0, before: body.chapterHtml, html: '<h2>A</h2><p>B sourcé</p>', issues: [], webSources: [], blocked: false, usage: null }
    mockPropose.mockResolvedValueOnce(proposal)
    const res = mockRes()
    await enrich(req(body, 'sources'), res as unknown as Response)
    expect(events(res)).toEqual([{ event: 'done', data: proposal }])
    expect(res.end).toHaveBeenCalled()
  })

  it('une erreur (recherche web sans Claude) part en événement error, avec son message', async () => {
    mockPropose.mockRejectedValueOnce(new Error('La recherche web exige Claude : aucun autre fournisseur ne sait chercher et citer ses sources.'))
    const res = mockRes()
    await enrich(req(body, 'sources'), res as unknown as Response)
    expect(events(res)).toEqual([{ event: 'error', data: { message: expect.stringMatching(/exige Claude/), chapterIndex: 0 } }])
    expect(res.end).toHaveBeenCalled()
  })
})

describe('POST /generate/section-rewrite', () => {
  it('400 sans consigne utile', async () => {
    const res = mockRes()
    await rewrite(req({ ...body, instruction: 'ok' }), res as unknown as Response)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('transmet la consigne à la réécriture', async () => {
    mockPropose.mockResolvedValueOnce({ pass: 'reecriture', html: '<h2>A</h2><p>C</p>', issues: [], webSources: [] })
    const res = mockRes()
    await rewrite(req({ ...body, instruction: 'Plus concret, avec un exemple de plombier' }), res as unknown as Response)
    expect(mockPropose).toHaveBeenCalledWith(expect.objectContaining({ pass: 'reecriture', instruction: 'Plus concret, avec un exemple de plombier' }))
    expect(events(res)[0]!.event).toBe('done')
  })
})

// C7 — passe Résumer : seul un chapitre dont est né un article enfant se résume,
// et la passe connaît cet enfant (titre, mot-clé).
describe('POST /generate/enrich/resumes', () => {
  it('le chapitre dont est né un enfant : la passe reçoit cet enfant', async () => {
    mockChildren.mockResolvedValueOnce([{ id: 11, title: 'Isoler ses combles', parentSection: 'isoler les combles', keyword: 'isolation combles' }])
    mockPropose.mockResolvedValueOnce({ pass: 'resumes', html: '<h2>Isoler les combles</h2><p>Résumé.</p>', issues: [], webSources: [] })
    const res = mockRes()
    await enrich(req({ ...body, chapterHtml: '<h2>Isoler les combles</h2><p>Long.</p>' }, 'resumes'), res as unknown as Response)
    expect(mockChildren).toHaveBeenCalledWith(7)
    expect(mockPropose).toHaveBeenCalledWith(expect.objectContaining({ pass: 'resumes', child: { title: 'Isoler ses combles', keyword: 'isolation combles' } }))
    expect(events(res).map(e => e.event)).toEqual(['done'])
  })

  it('un chapitre sans enfant : erreur explicite, l’IA n’est pas appelée', async () => {
    mockChildren.mockResolvedValueOnce([{ id: 11, title: 'Isoler ses combles', parentSection: 'Isoler les combles', keyword: null }])
    const res = mockRes()
    await enrich(req({ ...body, chapterHtml: '<h2>Changer les fenêtres</h2><p>Long.</p>' }, 'resumes'), res as unknown as Response)
    expect(mockPropose).not.toHaveBeenCalled()
    const [err] = events(res)
    expect(err?.event).toBe('error')
    expect(String(err?.data.message)).toMatch(/aucun article enfant/i)
  })
})

