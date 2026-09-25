// @vitest-environment node
/**
 * POST /api/cocoons/:cocoonId/articles — création d'UN article
 * (FR-CER-COCOON-PROGRESSIVE). La route valide l'entrée, délègue au service et
 * traduit ses refus en codes HTTP lisibles par l'écran (alarme sur 409
 * `GATE_BLOCKED`, qui porte l'évaluation du parent).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Request, Response } from 'express'

const { mockCreate, mockTree } = vi.hoisted(() => ({ mockCreate: vi.fn(), mockTree: vi.fn() }))

vi.mock('../../../server/services/article/cocoon-article.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../server/services/article/cocoon-article.service')>()
  return { ...actual, createCocoonArticle: mockCreate, getCocoonTree: mockTree }
})
vi.mock('../../../server/services/infra/data.service', () => ({
  getCocoons: vi.fn(), getArticlesByCocoon: vi.fn(), getArticleKeywordsByCocoon: vi.fn(),
}))
vi.mock('../../../server/services/strategy/cocoon-strategy.service', () => ({ getCocoonStrategy: vi.fn() }))

const { default: router } = await import('../../../server/routes/cocoons.routes')
const { CocoonArticleError } = await import('../../../server/services/article/cocoon-article.service')

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
