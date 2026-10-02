// @vitest-environment node
/**
 * FR-CER-KEYWORD-REAL-DATA, FR-CER-CHILD-FROM-PILLAR-H2 — le mot-clé d'un nouvel
 * article se choisit parmi 3 à 5 candidats proposés par l'IA pour une section
 * libre d'un parent rédigé, chacun mesuré (volume, SERP).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { CocoonTreeNode } from '../../../shared/types/cocoon-tree.types'

const m = vi.hoisted(() => ({
  getCocoonTree: vi.fn(),
  cocoonContextForNewArticle: vi.fn(),
  loadPrompt: vi.fn(),
  collectStreamWithUsage: vi.fn(),
  measureKeywords: vi.fn(),
}))

vi.mock('../../../server/services/article/cocoon-article.service', () => ({ getCocoonTree: m.getCocoonTree }))
vi.mock('../../../server/services/strategy/cocoon-context.service', () => ({ cocoonContextForNewArticle: m.cocoonContextForNewArticle }))
vi.mock('../../../server/utils/prompt-loader', () => ({ loadPrompt: m.loadPrompt }))
vi.mock('../../../server/utils/stream-usage', () => ({ collectStreamWithUsage: m.collectStreamWithUsage }))
vi.mock('../../../server/services/keyword/keyword-measure.service', () => ({ measureKeywords: m.measureKeywords }))

import { proposeChildCandidates, measureOwnCandidate, ChildCandidatesError } from '../../../server/services/strategy/child-candidates.service'

const PILIER: CocoonTreeNode = {
  id: 10, title: 'Rénovation énergétique : le guide', level: 'pilier', parentId: null, parentSection: null, keyword: 'renovation energetique', drafted: true,
  sections: [
    { title: 'Isoler les combles', childId: 11, childTitle: 'Isoler ses combles' },
    { title: 'Changer les fenêtres', childId: null, childTitle: null },
  ],
}

const REPONSE = JSON.stringify({
  candidates: [
    { keyword: 'changer fenetres', title: 'Changer ses fenêtres : prix et étapes', rationale: 'Large', painPoint: 'Des fenêtres qui laissent passer le froid', painIntentExpected: 'informational' },
    { keyword: 'double vitrage prix', title: 'Double vitrage : le prix', rationale: 'Prix', painPoint: 'Un budget flou', painIntentExpected: 'bof' },
    { keyword: 'Changer Fenetres', title: 'Doublon', rationale: 'Doublon', painPoint: '' },
    { keyword: 'renovation energetique', title: 'Reprend le pilier', rationale: 'x', painPoint: '' },
    { keyword: 'fenetre pvc ou alu', title: 'PVC ou alu : que choisir ?', rationale: 'Comparaison', painPoint: 'Trop de choix' },
  ],
})

async function refus(p: Promise<unknown>): Promise<ChildCandidatesError> {
  return p.then(() => { throw new Error('refus attendu') }, (e: unknown) => e as ChildCandidatesError)
}

beforeEach(() => {
  vi.resetAllMocks()
  m.getCocoonTree.mockResolvedValue([PILIER, { ...PILIER, id: 11, title: 'Isoler ses combles', level: 'intermediaire', parentId: 10, parentSection: 'Isoler les combles', keyword: 'isolation combles', sections: [] }])
  m.cocoonContextForNewArticle.mockResolvedValue({ cocoonName: 'Rénovation', context: 'ETAT-DU-COCON' })
  m.loadPrompt.mockImplementation(async (name: string) => (name === 'system-propulsite' ? 'SYSTEME' : 'PROMPT'))
  m.collectStreamWithUsage.mockResolvedValue({ text: REPONSE, usage: { estimatedCost: 0.01 } })
  m.measureKeywords.mockImplementation(async (keywords: string[]) => new Map(keywords.map(k => [k, {
    metrics: { searchVolume: 100, keywordDifficulty: 10, cpc: 1, intent: 'informational' },
    serp: [{ position: 1, title: 'Guide', domain: 'guide.fr', url: 'https://guide.fr' }],
  }])))
})

describe('proposeChildCandidates', () => {
  it('un intermédiaire depuis une section libre du pilier : 3 à 5 candidats mesurés, sans doublon ni mot-clé déjà pris', async () => {
    const result = await proposeChildCandidates(3, { parentId: 10, parentSection: 'Changer les fenêtres' })
    expect(result.level).toBe('intermediaire')
    expect(m.cocoonContextForNewArticle).toHaveBeenCalledWith(3, 10, 'Changer les fenêtres')
    expect(m.loadPrompt).toHaveBeenCalledWith('cocoon-child-keywords', expect.objectContaining({
      cocoon_context: 'ETAT-DU-COCON', articleLevel: 'intermédiaire', parentSection: 'Changer les fenêtres',
      type_rules: expect.stringContaining('Intermédiaire'),
    }), { cocoonSlug: 'Rénovation' })
    expect(result.candidates.map(c => c.keyword)).toEqual(['changer fenetres', 'double vitrage prix', 'fenetre pvc ou alu'])
    expect(m.measureKeywords).toHaveBeenCalledWith(['changer fenetres', 'double vitrage prix', 'fenetre pvc ou alu'])
    expect(result.candidates[0]).toMatchObject({
      title: 'Changer ses fenêtres : prix et étapes',
      metrics: { searchVolume: 100 },
      serp: [{ domain: 'guide.fr' }],
    })
  })

  // K9 : l'intention éditoriale attendue accompagne chaque candidat — sans elle,
  // un enfant créé depuis le constructeur échappait au contrôle d'intention de
  // la porte capitaine et au 5e signal de pertinence.
  it('chaque candidat porte l’intention éditoriale proposée ; une valeur inconnue devient absente', async () => {
    const result = await proposeChildCandidates(3, { parentId: 10, parentSection: 'Changer les fenêtres' })
    expect(result.candidates.map(c => c.painIntentExpected)).toEqual(['informational', null, null])
  })

  it('le pilier d’un cocon vide : aucun parent, niveau pilier', async () => {
    m.getCocoonTree.mockResolvedValue([])
    const result = await proposeChildCandidates(3, { parentId: null, parentSection: null })
    expect(result.level).toBe('pilier')
    expect(m.loadPrompt).toHaveBeenCalledWith('cocoon-child-keywords', expect.objectContaining({ articleLevel: 'pilier', parentSection: '' }), { cocoonSlug: 'Rénovation' })
  })

  // Recette réelle du 2026-10-02 : cinq candidats sur cinq du pilier étaient des
  // phrases longues sans aucune donnée chez DataForSEO ; le pilier ne pouvait
  // pas être créé. Pour un pilier, la consigne exige des requêtes courtes et larges.
  it('le pilier reçoit la règle des requêtes courtes et larges ; un enfant non', async () => {
    m.getCocoonTree.mockResolvedValue([])
    await proposeChildCandidates(3, { parentId: null, parentSection: null })
    expect(m.loadPrompt).toHaveBeenCalledWith('cocoon-child-keywords', expect.objectContaining({ pillarRule: expect.stringMatching(/\S/) }), expect.anything())
    m.loadPrompt.mockClear()
    m.getCocoonTree.mockResolvedValue([PILIER])
    await proposeChildCandidates(3, { parentId: 10, parentSection: 'Changer les fenêtres' })
    expect(m.loadPrompt).toHaveBeenCalledWith('cocoon-child-keywords', expect.objectContaining({ pillarRule: '' }), expect.anything())
  })

  it.each([
    ['un second pilier', { parentId: null, parentSection: null }, 'HIERARCHY_VIOLATION'],
    ['une section déjà prise', { parentId: 10, parentSection: 'Isoler les combles' }, 'HIERARCHY_VIOLATION'],
    ['une section inconnue', { parentId: 10, parentSection: 'Le bois' }, 'HIERARCHY_VIOLATION'],
    ['un parent spécialisé (sans enfant possible)', { parentId: 12, parentSection: 'x' }, 'HIERARCHY_VIOLATION'],
  ] as const)('%s : 409 avant tout appel payant', async (_label, focus, code) => {
    if (focus.parentId === 12) {
      m.getCocoonTree.mockResolvedValue([PILIER, { ...PILIER, id: 12, level: 'specifique', parentId: 10, parentSection: 'Changer les fenêtres', sections: [] }])
    }
    const err = await refus(proposeChildCandidates(3, focus))
    expect(err.status).toBe(409)
    expect(err.code).toBe(code)
    expect(m.collectStreamWithUsage).not.toHaveBeenCalled()
    expect(m.measureKeywords).not.toHaveBeenCalled()
  })

  it('parent pas encore rédigé : 409, rien n’est payé', async () => {
    m.getCocoonTree.mockResolvedValue([{ ...PILIER, drafted: false }])
    const err = await refus(proposeChildCandidates(3, { parentId: 10, parentSection: 'Changer les fenêtres' }))
    expect(err.code).toBe('PARENT_NOT_WRITTEN')
    expect(err.message).toContain('Rénovation énergétique : le guide')
    expect(m.collectStreamWithUsage).not.toHaveBeenCalled()
  })

  it('cocon inconnu : 404', async () => {
    m.getCocoonTree.mockResolvedValue(null)
    const err = await refus(proposeChildCandidates(99, { parentId: null, parentSection: null }))
    expect(err.status).toBe(404)
  })

  it('réponse illisible ou sans candidat : 502', async () => {
    m.collectStreamWithUsage.mockResolvedValue({ text: 'Je ne peux pas.', usage: null })
    const err = await refus(proposeChildCandidates(3, { parentId: 10, parentSection: 'Changer les fenêtres' }))
    expect(err.status).toBe(502)
    expect(m.measureKeywords).not.toHaveBeenCalled()
  })
})

describe('FR-CER-KEYWORD-REAL-DATA — measureOwnCandidate : le mot-clé proposé par l’utilisateur', () => {
  const PILIER_SEUL = { parentId: null, parentSection: null }
  const DOULEUR = JSON.stringify({ painPoint: 'Un site qui ne rapporte aucun contact.', painIntentExpected: 'commercial' })

  beforeEach(() => {
    m.getCocoonTree.mockResolvedValue([])
    m.collectStreamWithUsage.mockResolvedValue({ text: DOULEUR, usage: { estimatedCost: 0.002 } })
  })

  it('est normalisé, mesuré aussitôt et rendu comme un candidat', async () => {
    const candidate = await measureOwnCandidate(3, '  Site Internet   Sur Mesure ', PILIER_SEUL)
    expect(m.measureKeywords).toHaveBeenCalledWith(['site internet sur mesure'])
    expect(candidate).toMatchObject({
      keyword: 'site internet sur mesure',
      title: 'Site internet sur mesure',
      metrics: { searchVolume: 100 },
      serp: [{ domain: 'guide.fr' }],
    })
    expect(candidate.rationale).toMatch(/proposé par vous/i)
  })

  // Recette réelle du 2026-10-02 : le pilier né d'un mot-clé proposé n'avait ni
  // douleur ni intention ; le Capitaine n'avait aucun Score Pertinence.
  it('reçoit sa douleur et son intention, écrites par l’IA avec la stratégie et l’état du cocon', async () => {
    const candidate = await measureOwnCandidate(3, 'site internet sur mesure', PILIER_SEUL)
    expect(candidate.painPoint).toBe('Un site qui ne rapporte aucun contact.')
    expect(candidate.painIntentExpected).toBe('commercial')
    expect(m.cocoonContextForNewArticle).toHaveBeenCalledWith(3, null, null)
    expect(m.loadPrompt).toHaveBeenCalledWith('cocoon-own-keyword', expect.objectContaining({
      keyword: 'site internet sur mesure', cocoon_context: 'ETAT-DU-COCON', articleLevel: 'pilier', parentSection: '',
    }), { cocoonSlug: 'Rénovation' })
    expect(m.collectStreamWithUsage).toHaveBeenCalledTimes(1)
  })

  it('pour un enfant : le niveau et la section du parent sont transmis à l’IA', async () => {
    m.getCocoonTree.mockResolvedValue([PILIER])
    await measureOwnCandidate(3, 'fenetre double vitrage', { parentId: 10, parentSection: 'Changer les fenêtres' })
    expect(m.cocoonContextForNewArticle).toHaveBeenCalledWith(3, 10, 'Changer les fenêtres')
    expect(m.loadPrompt).toHaveBeenCalledWith('cocoon-own-keyword', expect.objectContaining({
      articleLevel: 'intermédiaire', parentSection: 'Changer les fenêtres',
    }), expect.anything())
  })

  it('IA en panne ou illisible : le mot-clé reste mesuré, sans douleur ni intention', async () => {
    m.collectStreamWithUsage.mockRejectedValueOnce(new Error('Claude indisponible'))
    const enPanne = await measureOwnCandidate(3, 'site internet sur mesure', PILIER_SEUL)
    expect(enPanne).toMatchObject({ painPoint: null, painIntentExpected: null, metrics: { searchVolume: 100 } })

    m.collectStreamWithUsage.mockResolvedValueOnce({ text: 'pas du JSON', usage: null })
    const illisible = await measureOwnCandidate(3, 'site internet sur mesure', PILIER_SEUL)
    expect(illisible).toMatchObject({ painPoint: null, painIntentExpected: null })
  })

  it('une intention hors des quatre valeurs est laissée vide, la douleur gardée', async () => {
    m.collectStreamWithUsage.mockResolvedValue({ text: JSON.stringify({ painPoint: 'Un budget flou.', painIntentExpected: 'bof' }), usage: null })
    const candidate = await measureOwnCandidate(3, 'site internet sur mesure', PILIER_SEUL)
    expect(candidate).toMatchObject({ painPoint: 'Un budget flou.', painIntentExpected: null })
  })

  it('sans données chez DataForSEO : rendu sans mesures (non choisissable)', async () => {
    m.measureKeywords.mockResolvedValue(new Map())
    const candidate = await measureOwnCandidate(3, 'expression que personne ne cherche jamais', PILIER_SEUL)
    expect(candidate.metrics).toBeNull()
    expect(candidate.serp).toEqual([])
  })

  it('un mot-clé déjà pris dans le cocon est refusé avant tout appel payant', async () => {
    m.getCocoonTree.mockResolvedValue([PILIER, { ...PILIER, id: 11, title: 'Isoler ses combles', level: 'intermediaire', parentId: 10, parentSection: 'Isoler les combles', keyword: 'isolation combles', sections: [] }])
    const err = await refus(measureOwnCandidate(3, 'Isolation Combles', { parentId: 10, parentSection: 'Changer les fenêtres' }))
    expect(err).toBeInstanceOf(ChildCandidatesError)
    expect(err.status).toBe(409)
    expect(err.code).toBe('KEYWORD_TAKEN')
    expect(m.measureKeywords).not.toHaveBeenCalled()
    expect(m.collectStreamWithUsage).not.toHaveBeenCalled()
  })

  it('un parent non rédigé est refusé comme pour les candidats de l’IA, avant tout appel payant', async () => {
    m.getCocoonTree.mockResolvedValue([{ ...PILIER, drafted: false }])
    const err = await refus(measureOwnCandidate(3, 'fenetre double vitrage', { parentId: 10, parentSection: 'Changer les fenêtres' }))
    expect(err.code).toBe('PARENT_NOT_WRITTEN')
    expect(m.measureKeywords).not.toHaveBeenCalled()
    expect(m.collectStreamWithUsage).not.toHaveBeenCalled()
  })

  it('un cocon inconnu est refusé (404), sans appel payant', async () => {
    m.getCocoonTree.mockResolvedValue(null)
    const err = await refus(measureOwnCandidate(999, 'site sur mesure', PILIER_SEUL))
    expect(err.status).toBe(404)
    expect(err.code).toBe('COCOON_NOT_FOUND')
    expect(m.measureKeywords).not.toHaveBeenCalled()
    expect(m.collectStreamWithUsage).not.toHaveBeenCalled()
  })
})
