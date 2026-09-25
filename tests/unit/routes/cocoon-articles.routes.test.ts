// @vitest-environment node
/**
 * POST /api/cocoons/:cocoonId/articles — création d'UN article
 * (FR-CER-COCOON-PROGRESSIVE). La route valide l'entrée, délègue au service et
 * traduit ses refus en codes HTTP lisibles par l'écran (alarme sur 409
 * `GATE_BLOCKED`, qui porte l'évaluation du parent).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Request, Response } from 'express'

const { mockCreate, mockTree, mockAttach } = vi.hoisted(() => ({ mockCreate: vi.fn(), mockTree: vi.fn(), mockAttach: vi.fn() }))

vi.mock('../../../server/services/article/cocoon-article.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../server/services/article/cocoon-article.service')>()
  return { ...actual, createCocoonArticle: mockCreate, getCocoonTree: mockTree, attachCocoonArticle: mockAttach }
})
vi.mock('../../../server/services/infra/data.service', () => ({
  getCocoons: vi.fn(), getArticlesByCocoon: vi.fn(), getArticleKeywordsByCocoon: vi.fn(),
}))
vi.mock('../../../server/services/strategy/cocoon-strategy.service', () => ({ getCocoonStrategy: vi.fn() }))
const { mockPropose } = vi.hoisted(() => ({ mockPropose: vi.fn() }))
vi.mock('../../../server/services/strategy/child-candidates.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../server/services/strategy/child-candidates.service')>()
  return { ...actual, proposeChildCandidates: mockPropose }
})

const { default: router } = await import('../../../server/routes/cocoons.routes')
const { CocoonArticleError } = await import('../../../server/services/article/cocoon-article.service')
const { ChildCandidatesError } = await import('../../../server/services/strategy/child-candidates.service')

function res() {
  const r = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() }
  return r as unknown as Response & { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> }
}
const handler = (router as any).stack.find((l: any) => l.route?.path === '/cocoons/:cocoonId/articles' && l.route?.methods.post)?.route?.stack[0]?.handle
const call = async (params: Record<string, string>, body: unknown) => {
  const r = res()
  await handler({ params, body } as unknown as Request, r)
  return r
}

beforeEach(() => vi.clearAllMocks())

describe('POST /cocoons/:cocoonId/articles', () => {
  it('crée l’article : 201 { data }', async () => {
    mockCreate.mockResolvedValue({ id: 42, title: 'Isoler ses combles', parentId: 10, parentSection: 'Isoler les combles' })
    const r = await call({ cocoonId: '3' }, { title: 'Isoler ses combles', type: 'intermediaire', parentId: 10, parentSection: 'Isoler les combles' })
    expect(mockCreate).toHaveBeenCalledWith(3, expect.objectContaining({ title: 'Isoler ses combles', type: 'intermediaire', parentId: 10, parentSection: 'Isoler les combles' }))
    expect(r.status).toHaveBeenCalledWith(201)
    expect(r.json).toHaveBeenCalledWith({ data: expect.objectContaining({ id: 42 }) })
  })

  it.each([
    ['identifiant de cocon invalide', { cocoonId: 'abc' }, { title: 'Guide', type: 'pilier' }],
    ['titre trop court', { cocoonId: '3' }, { title: 'x', type: 'pilier' }],
    ['type inconnu', { cocoonId: '3' }, { title: 'Guide complet', type: 'Pilier' }],
    ['parent non numérique', { cocoonId: '3' }, { title: 'Guide complet', type: 'intermediaire', parentId: 'dix' }],
  ])('400 : %s', async (_label, params, body) => {
    const r = await call(params, body)
    expect(r.status).toHaveBeenCalledWith(400)
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it.each([
    [404, 'COCOON_NOT_FOUND'],
    [409, 'HIERARCHY_VIOLATION'],
    [409, 'GATE_BLOCKED'],
    [422, 'KEYWORD_NOT_MEASURED'],
    [409, 'SLUG_TAKEN'],
  ] as const)('refus du service : %i %s, avec son message et ses détails', async (status, code) => {
    mockCreate.mockRejectedValue(new CocoonArticleError(status, code, `refus ${code}`, { gateId: 'draft' }))
    const r = await call({ cocoonId: '3' }, { title: 'Guide complet', type: 'pilier' })
    expect(r.status).toHaveBeenCalledWith(status)
    expect(r.json).toHaveBeenCalledWith({ error: { code, message: `refus ${code}`, details: { gateId: 'draft' } } })
  })

  it('erreur inattendue : 500', async () => {
    mockCreate.mockRejectedValue(new Error('base indisponible'))
    const r = await call({ cocoonId: '3' }, { title: 'Guide complet', type: 'pilier' })
    expect(r.status).toHaveBeenCalledWith(500)
  })
})

// K8 : rattacher un article existant (d'avant l'arbre, ou mal placé).
describe('PUT /cocoons/:cocoonId/articles/:articleId/parent', () => {
  const attach = (router as any).stack.find((l: any) => l.route?.path === '/cocoons/:cocoonId/articles/:articleId/parent' && l.route?.methods.put)?.route?.stack[0]?.handle
  const put = async (params: Record<string, string>, body: unknown) => {
    const r = res()
    await attach({ params, body } as unknown as Request, r)
    return r
  }

  it('rattache l’article : 200 { data }', async () => {
    mockAttach.mockResolvedValue({ id: 21, parentId: 10, parentSection: 'Isoler les combles' })
    const r = await put({ cocoonId: '3', articleId: '21' }, { parentId: 10, parentSection: 'Isoler les combles' })
    expect(mockAttach).toHaveBeenCalledWith(3, 21, { parentId: 10, parentSection: 'Isoler les combles' })
    expect(r.json).toHaveBeenCalledWith({ data: { id: 21, parentId: 10, parentSection: 'Isoler les combles' } })
  })

  it.each([
    ['identifiant d’article invalide', { cocoonId: '3', articleId: 'x' }, { parentId: 10, parentSection: 'A' }],
    ['sans parent', { cocoonId: '3', articleId: '21' }, { parentSection: 'A' }],
    ['section vide', { cocoonId: '3', articleId: '21' }, { parentId: 10, parentSection: '  ' }],
  ])('400 : %s', async (_label, params, body) => {
    const r = await put(params, body)
    expect(r.status).toHaveBeenCalledWith(400)
    expect(mockAttach).not.toHaveBeenCalled()
  })

  it('refus du service : son code et son message', async () => {
    mockAttach.mockRejectedValue(new CocoonArticleError(409, 'HIERARCHY_VIOLATION', 'section prise'))
    const r = await put({ cocoonId: '3', articleId: '21' }, { parentId: 10, parentSection: 'Isoler les combles' })
    expect(r.status).toHaveBeenCalledWith(409)
    expect(r.json).toHaveBeenCalledWith({ error: { code: 'HIERARCHY_VIOLATION', message: 'section prise', details: undefined } })
  })
})

describe('GET /cocoons/:cocoonId/tree', () => {
  const tree = (router as any).stack.find((l: any) => l.route?.path === '/cocoons/:cocoonId/tree' && l.route?.methods.get)?.route?.stack[0]?.handle

  it('renvoie l’arbre du cocon', async () => {
    mockTree.mockResolvedValue([{ id: 10, title: 'Pilier', level: 'pilier', drafted: true, sections: [] }])
    const r = res()
    await tree({ params: { cocoonId: '3' } } as unknown as Request, r)
    expect(mockTree).toHaveBeenCalledWith(3)
    expect(r.json).toHaveBeenCalledWith({ data: [expect.objectContaining({ id: 10 })] })
  })

  it('cocon inconnu : 404 ; identifiant invalide : 400', async () => {
    mockTree.mockResolvedValue(null)
    const r = res()
    await tree({ params: { cocoonId: '99' } } as unknown as Request, r)
    expect(r.status).toHaveBeenCalledWith(404)
    const r2 = res()
    await tree({ params: { cocoonId: 'x' } } as unknown as Request, r2)
    expect(r2.status).toHaveBeenCalledWith(400)
  })
})

describe('POST /cocoons/:cocoonId/child-candidates', () => {
  const propose = (router as any).stack.find((l: any) => l.route?.path === '/cocoons/:cocoonId/child-candidates' && l.route?.methods.post)?.route?.stack[0]?.handle
  const callPropose = async (params: Record<string, string>, body: unknown) => {
    const r = res()
    await propose({ params, body, socket: { setTimeout: vi.fn() } } as unknown as Request, r)
    return r
  }

  it('propose les candidats mesurés pour une section du parent', async () => {
    mockPropose.mockResolvedValue({ level: 'intermediaire', parentId: 10, parentSection: 'Changer les fenêtres', candidates: [{ keyword: 'double vitrage' }], usage: null })
    const r = await callPropose({ cocoonId: '3' }, { parentId: 10, parentSection: 'Changer les fenêtres' })
    expect(mockPropose).toHaveBeenCalledWith(3, { parentId: 10, parentSection: 'Changer les fenêtres' })
    expect(r.json).toHaveBeenCalledWith({ data: expect.objectContaining({ level: 'intermediaire' }) })
  })

  it('sans parent : les candidats du pilier', async () => {
    mockPropose.mockResolvedValue({ level: 'pilier', parentId: null, parentSection: null, candidates: [], usage: null })
    await callPropose({ cocoonId: '3' }, {})
    expect(mockPropose).toHaveBeenCalledWith(3, { parentId: null, parentSection: null })
  })

  it('400 sur une entrée invalide ; refus du service avec son code', async () => {
    expect((await callPropose({ cocoonId: '3' }, { parentId: 'dix' })).status).toHaveBeenCalledWith(400)
    mockPropose.mockRejectedValue(new ChildCandidatesError(409, 'PARENT_NOT_WRITTEN', 'pas rédigé'))
    const r = await callPropose({ cocoonId: '3' }, { parentId: 10, parentSection: 'x' })
    expect(r.status).toHaveBeenCalledWith(409)
    expect(r.json).toHaveBeenCalledWith({ error: { code: 'PARENT_NOT_WRITTEN', message: 'pas rédigé', details: undefined } })
  })
})

