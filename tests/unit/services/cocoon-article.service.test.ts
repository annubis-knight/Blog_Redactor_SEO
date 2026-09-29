// @vitest-environment node
/**
 * FR-CER-COCOON-PROGRESSIVE, FR-CER-PARENT-WRITTEN-GATE, FR-CER-KEYWORD-REAL-DATA —
 * un article se crée un à la fois : pilier d'abord, puis chaque enfant depuis
 * une section de son parent rédigé, avec un mot-clé mesuré.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const m = vi.hoisted(() => ({
  getArticlesByCocoon: vi.fn(),
  getArticleKeywords: vi.fn(),
  insertCocoonArticle: vi.fn(),
  addArticleCheck: vi.fn(),
  setArticleParent: vi.fn(),
  getArticleContent: vi.fn(),
  evaluateArticleGate: vi.fn(),
  getKeywordMetrics: vi.fn(),
}))

vi.mock('../../../server/services/infra/data.service', () => ({
  getArticlesByCocoon: m.getArticlesByCocoon,
  getArticleKeywords: m.getArticleKeywords,
  insertCocoonArticle: m.insertCocoonArticle,
  addArticleCheck: m.addArticleCheck,
  setArticleParent: m.setArticleParent,
}))
vi.mock('../../../server/services/article/article-content.service', () => ({ getArticleContent: m.getArticleContent }))
vi.mock('../../../server/services/gates/gate.service', () => ({ evaluateArticleGate: m.evaluateArticleGate }))
vi.mock('../../../server/services/keyword/keyword-metrics.service', () => ({ getKeywordMetrics: m.getKeywordMetrics }))

import { createCocoonArticle, attachCocoonArticle, CocoonArticleError, getCocoonTree } from '../../../server/services/article/cocoon-article.service'

const PILIER = {
  id: 10, title: 'Rénovation énergétique : le guide', type: 'pilier', slug: 'renovation', parentId: null, parentSection: null,
  completedChecks: ['redaction:draft_accepted'],
}
const PILIER_TEXTE = '<h1>Rénovation</h1><h2>Isoler les combles</h2><p>a</p><h2>Changer les fenêtres</h2><p>b</p><h2>Conclusion</h2>'

const created = (extra: Record<string, unknown> = {}) => ({ id: 42, title: 'Nouvel article', type: 'intermediaire', slug: 'nouvel-article', parentId: 10, parentSection: 'Changer les fenêtres', ...extra })

async function refus(p: Promise<unknown>): Promise<CocoonArticleError> {
  return p.then(() => { throw new Error('la création aurait dû être refusée') }, (e: unknown) => e as CocoonArticleError)
}

beforeEach(() => {
  vi.resetAllMocks()
  m.getArticlesByCocoon.mockResolvedValue([PILIER])
  m.getArticleContent.mockResolvedValue({ content: PILIER_TEXTE, outline: null })
  m.getArticleKeywords.mockResolvedValue({ data: { hnStructure: [] } })
  m.insertCocoonArticle.mockImplementation(async (_cocoonId: number, input: { parentId: number | null; parentSection: string | null; type: string }) =>
    created({ parentId: input.parentId, parentSection: input.parentSection, type: input.type }))
  m.getKeywordMetrics.mockResolvedValue({ searchVolume: 320, fetchedAt: '2026-09-25' })
})

describe('createCocoonArticle', () => {
  it('cocon inconnu : 404', async () => {
    m.getArticlesByCocoon.mockResolvedValue(null)
    const err = await refus(createCocoonArticle(99, { title: 'Guide', type: 'pilier' }))
    expect(err).toBeInstanceOf(CocoonArticleError)
    expect(err.status).toBe(404)
  })

  it('cocon vide : le pilier est créé sans parent', async () => {
    m.getArticlesByCocoon.mockResolvedValue([])
    const article = await createCocoonArticle(3, { title: 'Rénovation : le guide', type: 'pilier' })
    expect(article.id).toBe(42)
    expect(m.insertCocoonArticle).toHaveBeenCalledWith(3, expect.objectContaining({ type: 'pilier', parentId: null, parentSection: null }))
  })

  it('cocon vide : un intermédiaire est refusé (409, hiérarchie), rien n’est créé', async () => {
    m.getArticlesByCocoon.mockResolvedValue([])
    const err = await refus(createCocoonArticle(3, { title: 'Isoler', type: 'intermediaire' }))
    expect(err.status).toBe(409)
    expect(err.code).toBe('HIERARCHY_VIOLATION')
    expect((err.details as { issues: Array<{ rule: string }> }).issues.map(i => i.rule)).toEqual(['hierarchy-pillar-first'])
    expect(m.insertCocoonArticle).not.toHaveBeenCalled()
  })

  it('parent rédigé : l’enfant naît de sa section, sans rejouer la porte', async () => {
    const article = await createCocoonArticle(3, { title: 'Changer ses fenêtres', type: 'intermediaire', parentId: 10, parentSection: 'Changer les fenêtres' })
    expect(article.parentId).toBe(10)
    expect(m.evaluateArticleGate).not.toHaveBeenCalled()
    expect(m.insertCocoonArticle).toHaveBeenCalledWith(3, expect.objectContaining({ parentId: 10, parentSection: 'Changer les fenêtres' }))
  })

  it('section inconnue du parent : 409, les sections viennent de son texte', async () => {
    const err = await refus(createCocoonArticle(3, { title: 'Le bois', type: 'intermediaire', parentId: 10, parentSection: 'Le chauffage au bois' }))
    expect(err.code).toBe('HIERARCHY_VIOLATION')
    expect((err.details as { issues: Array<{ rule: string }> }).issues[0]!.rule).toBe('hierarchy-section-unknown')
  })

  describe('parent pas encore rédigé', () => {
    beforeEach(() => {
      m.getArticlesByCocoon.mockResolvedValue([{ ...PILIER, completedChecks: [] }])
    })

    it('sa porte du premier jet refuse : 409 GATE_BLOCKED avec l’évaluation du parent, rien n’est créé', async () => {
      const evaluation = { gateId: 'draft', passed: false, issues: [{ rule: 'content-empty', level: 'technique' }], blocking: [{ rule: 'content-empty', level: 'technique' }], waived: [], inputHash: 'h' }
      m.evaluateArticleGate.mockResolvedValue(evaluation)
      const err = await refus(createCocoonArticle(3, { title: 'Changer ses fenêtres', type: 'intermediaire', parentId: 10, parentSection: 'Changer les fenêtres' }))
      expect(m.evaluateArticleGate).toHaveBeenCalledWith(10, 'draft')
      expect(err.status).toBe(409)
      expect(err.code).toBe('GATE_BLOCKED')
      expect(err.details).toEqual(evaluation)
      expect(err.message).toMatch(/rédig/)
      expect(m.addArticleCheck).not.toHaveBeenCalled()
      expect(m.insertCocoonArticle).not.toHaveBeenCalled()
    })

    it('sa porte passe (ou ses alertes sont assumées) : l’étape est posée sur le parent, puis l’enfant créé', async () => {
      m.evaluateArticleGate.mockResolvedValue({ gateId: 'draft', passed: true, issues: [], blocking: [], waived: [], inputHash: 'h' })
      await createCocoonArticle(3, { title: 'Changer ses fenêtres', type: 'intermediaire', parentId: 10, parentSection: 'Changer les fenêtres' })
      expect(m.addArticleCheck).toHaveBeenCalledWith(10, 'redaction:draft_accepted')
      expect(m.addArticleCheck.mock.invocationCallOrder[0]!).toBeLessThan(m.insertCocoonArticle.mock.invocationCallOrder[0]!)
    })
  })

  describe('mot-clé', () => {
    it('jamais mesuré : 422, rien n’est créé ni accordé', async () => {
      m.getKeywordMetrics.mockResolvedValue(null)
      m.getArticlesByCocoon.mockResolvedValue([])
      const err = await refus(createCocoonArticle(3, { title: 'Rénovation : le guide', type: 'pilier', suggestedKeyword: 'renovation energetique' }))
      expect(err.status).toBe(422)
      expect(err.code).toBe('KEYWORD_NOT_MEASURED')
      expect(m.insertCocoonArticle).not.toHaveBeenCalled()
    })

    it('mesuré : l’article le garde', async () => {
      m.getArticlesByCocoon.mockResolvedValue([])
      await createCocoonArticle(3, { title: 'Rénovation : le guide', type: 'pilier', suggestedKeyword: 'renovation energetique' })
      expect(m.getKeywordMetrics).toHaveBeenCalledWith('renovation energetique')
      expect(m.insertCocoonArticle).toHaveBeenCalledWith(3, expect.objectContaining({ suggestedKeyword: 'renovation energetique' }))
    })
  })

  it('adresse déjà prise : 409 SLUG_TAKEN', async () => {
    m.getArticlesByCocoon.mockResolvedValue([])
    m.insertCocoonArticle.mockResolvedValue('slug-taken')
    const err = await refus(createCocoonArticle(3, { title: 'Rénovation : le guide', type: 'pilier', slug: 'renovation' }))
    expect(err.status).toBe(409)
    expect(err.code).toBe('SLUG_TAKEN')
    expect(err.message).toContain('/renovation')
  })
})

// K8 : un article d'avant l'arbre (ou mal placé) se rattache depuis l'outil, aux
// mêmes règles qu'une création — il ne restait « hors de l'arbre » qu'en SQL.
describe('attachCocoonArticle', () => {
  const ORPHELIN = { id: 21, title: 'Isoler ses combles', type: 'intermediaire', slug: 'isoler', parentId: null, parentSection: null, completedChecks: [] }

  beforeEach(() => {
    m.getArticlesByCocoon.mockResolvedValue([PILIER, ORPHELIN])
    m.setArticleParent.mockResolvedValue(undefined)
  })

  it('un orphelin rejoint une section libre d’un parent rédigé', async () => {
    const placed = await attachCocoonArticle(3, 21, { parentId: 10, parentSection: 'Isoler les combles' })
    expect(m.setArticleParent).toHaveBeenCalledWith(21, 10, 'Isoler les combles')
    expect(placed).toEqual({ id: 21, parentId: 10, parentSection: 'Isoler les combles' })
  })

  it('une section déjà prise par un autre article : 409, rien ne change', async () => {
    m.getArticlesByCocoon.mockResolvedValue([PILIER, ORPHELIN, { ...ORPHELIN, id: 22, title: 'Autre', parentId: 10, parentSection: 'Isoler les combles' }])
    const err = await refus(attachCocoonArticle(3, 21, { parentId: 10, parentSection: 'Isoler les combles' }))
    expect(err.code).toBe('HIERARCHY_VIOLATION')
    expect(m.setArticleParent).not.toHaveBeenCalled()
  })

  it('déplacer un article : sa propre section ne compte pas comme prise', async () => {
    m.getArticlesByCocoon.mockResolvedValue([PILIER, { ...ORPHELIN, parentId: 10, parentSection: 'Isoler les combles' }])
    await attachCocoonArticle(3, 21, { parentId: 10, parentSection: 'Isoler les combles' })
    expect(m.setArticleParent).toHaveBeenCalledWith(21, 10, 'Isoler les combles')
  })

  it('une section inconnue du parent : 409', async () => {
    const err = await refus(attachCocoonArticle(3, 21, { parentId: 10, parentSection: 'Les aides' }))
    expect(err.code).toBe('HIERARCHY_VIOLATION')
    expect(m.setArticleParent).not.toHaveBeenCalled()
  })

  it('un pilier n’a pas de parent : 409', async () => {
    m.getArticlesByCocoon.mockResolvedValue([PILIER, { ...PILIER, id: 11, title: 'Autre pilier' }])
    const err = await refus(attachCocoonArticle(3, 11, { parentId: 10, parentSection: 'Isoler les combles' }))
    expect(err.status).toBe(409)
    expect(m.setArticleParent).not.toHaveBeenCalled()
  })

  it('parent pas rédigé et sa porte refuse : 409 GATE_BLOCKED, rien ne change', async () => {
    m.getArticlesByCocoon.mockResolvedValue([{ ...PILIER, completedChecks: [] }, ORPHELIN])
    m.evaluateArticleGate.mockResolvedValue({ passed: false, issues: [], blocking: [] })
    const err = await refus(attachCocoonArticle(3, 21, { parentId: 10, parentSection: 'Isoler les combles' }))
    expect(err.code).toBe('GATE_BLOCKED')
    expect(m.setArticleParent).not.toHaveBeenCalled()
  })

  it('article absent du cocon : 404', async () => {
    const err = await refus(attachCocoonArticle(3, 99, { parentId: 10, parentSection: 'Isoler les combles' }))
    expect(err.status).toBe(404)
  })
})

describe('getCocoonTree — ce qu’on peut créer', () => {
  it('chaque article avec ses sections et l’enfant qui en est né ; rédigé ou non', async () => {
    m.getArticlesByCocoon.mockResolvedValue([
      { ...PILIER, captainKeywordLocked: 'renovation energetique', suggestedKeyword: null },
      { id: 11, title: 'Isoler ses combles', type: 'intermediaire', slug: 'combles', parentId: 10, parentSection: 'isoler les combles', completedChecks: [], captainKeywordLocked: null, suggestedKeyword: 'isolation combles' },
    ])
    m.getArticleContent.mockImplementation(async (id: number) => ({ content: id === 10 ? PILIER_TEXTE : '', outline: null }))
    m.getArticleKeywords.mockResolvedValue({ data: { hnStructure: [] } })

    const tree = await getCocoonTree(3)
    expect(tree).toEqual([
      {
        id: 10, title: PILIER.title, level: 'pilier', parentId: null, parentSection: null, keyword: 'renovation energetique', drafted: true,
        sections: [
          { title: 'Isoler les combles', childId: 11, childTitle: 'Isoler ses combles' },
          { title: 'Changer les fenêtres', childId: null, childTitle: null },
        ],
      },
      { id: 11, title: 'Isoler ses combles', level: 'intermediaire', parentId: 10, parentSection: 'isoler les combles', keyword: 'isolation combles', drafted: false, sections: [] },
    ])
  })

  it('un enfant dont la section a disparu du parent reste visible', async () => {
    m.getArticlesByCocoon.mockResolvedValue([
      PILIER,
      { id: 12, title: 'Le chauffage au bois', type: 'intermediaire', slug: 'bois', parentId: 10, parentSection: 'Le bois', completedChecks: [] },
    ])
    m.getArticleContent.mockImplementation(async (id: number) => ({ content: id === 10 ? PILIER_TEXTE : '', outline: null }))
    const tree = await getCocoonTree(3)
    expect(tree![0]!.sections.at(-1)).toEqual({ title: 'Le bois', childId: 12, childTitle: 'Le chauffage au bois' })
  })

  it('cocon inconnu : null', async () => {
    m.getArticlesByCocoon.mockResolvedValue(null)
    expect(await getCocoonTree(99)).toBeNull()
  })
})

