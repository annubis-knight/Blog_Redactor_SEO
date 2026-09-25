/**
 * FR-CER-COCOON-PROGRESSIVE — le cocon se construit depuis son pilier, un article
 * à la fois, chacun né d'une section de son parent rédigé, avec un mot-clé choisi
 * parmi des candidats mesurés (FR-CER-KEYWORD-REAL-DATA). Tout refus du serveur
 * est dit ; aucun article n'est annoncé créé s'il ne l'est pas
 * (FR-CER-CREATION-HONNETE). L'article créé s'inscrit sur la carte du cocon
 * (`proposedArticles`) : c'est d'elle que le Moteur tire sa liste.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

const apiGet = vi.fn()
const apiPost = vi.fn()
const notifyError = vi.fn()
const notifyWarning = vi.fn()
const notifySuccess = vi.fn()
const fetchCocoons = vi.fn()

vi.mock('../../../src/services/api.service', async (importOriginal) => ({
  ApiRequestError: (await importOriginal<typeof import('../../../src/services/api.service')>()).ApiRequestError,
  apiGet: (...args: unknown[]) => apiGet(...args),
  apiPost: (...args: unknown[]) => apiPost(...args),
  apiPut: vi.fn(),
  apiPatch: vi.fn(),
  apiDelete: vi.fn(),
}))

const runThroughGate = vi.fn(async (_id: number, action: () => Promise<unknown>) => ({ ok: true, value: await action() }))
vi.mock('../../../src/stores/ui/gate-alarm.store', () => ({
  useGateAlarmStore: () => ({ runThroughGate }),
}))

vi.mock('../../../src/composables/ui/useNotify', () => ({
  useNotify: () => ({ error: notifyError, info: vi.fn(), success: notifySuccess, warning: notifyWarning }),
}))

vi.mock('../../../src/stores/strategy/cocoons.store', () => ({
  useCocoonsStore: () => ({ fetchCocoons, cocoons: [] }),
}))

import { useCocoonBuilder } from '../../../src/composables/strategy/useCocoonBuilder'
import { ApiRequestError } from '../../../src/services/api.service'
import { useCocoonStrategyStore } from '../../../src/stores/strategy/cocoon-strategy.store'
import type { ProposedArticle } from '../../../shared/types/index.js'
import type { ChildCandidate, CocoonTreeNode } from '../../../shared/types/cocoon-tree.types.js'

const COCOON_ID = 7

function node(overrides: Partial<CocoonTreeNode> & Pick<CocoonTreeNode, 'id' | 'title' | 'level'>): CocoonTreeNode {
  return { parentId: null, parentSection: null, keyword: null, drafted: false, sections: [], ...overrides }
}

const PILIER = node({
  id: 10,
  title: 'Création de site internet à Toulouse',
  level: 'pilier',
  drafted: true,
  sections: [
    { title: 'L’hébergement', childId: 12, childTitle: 'Choisir son hébergeur' },
    { title: 'La refonte', childId: null, childTitle: null },
    { title: 'Le référencement', childId: 11, childTitle: 'Référencer son site' },
  ],
})
const INTER_SEO = node({ id: 11, title: 'Référencer son site', level: 'intermediaire', parentId: 10, parentSection: 'Le référencement' })
const INTER_HEBERGEMENT = node({ id: 12, title: 'Choisir son hébergeur', level: 'intermediaire', parentId: 10, parentSection: 'L’hébergement' })
const SPE = node({ id: 13, title: 'Hébergeur à Toulouse', level: 'specifique', parentId: 12, parentSection: 'Les critères' })
const ANCIEN = node({ id: 20, title: 'Ancien article sans parent', level: 'intermediaire' })

function candidate(overrides: Partial<ChildCandidate> = {}): ChildCandidate {
  return {
    keyword: 'refonte site internet toulouse',
    title: 'Refonte de site internet à Toulouse',
    rationale: 'La section « La refonte » annonce ce sujet.',
    painPoint: 'Un site vieillissant qui ne rapporte plus de contacts',
    metrics: { searchVolume: 320, keywordDifficulty: 18, cpc: 2.1, intent: 'commercial' },
    serp: [{ position: 1, title: 'Refonte de site', domain: 'exemple.fr', url: 'https://exemple.fr/refonte' }],
    ...overrides,
  }
}

function proposition(overrides: Partial<ProposedArticle> = {}): ProposedArticle {
  return {
    id: 'p-1',
    title: 'Une proposition',
    suggestedTitles: [],
    type: 'intermediaire',
    parentTitle: null,
    rationale: 'Raison de la carte',
    painPoint: '',
    painIntentExpected: null,
    suggestedKeyword: '',
    suggestedKeywords: [],
    suggestedSlug: '',
    suggestedSlugs: [],
    validatedSearchQuery: null,
    keywordValidated: false,
    searchQueryValidated: false,
    titleValidated: false,
    accepted: false,
    createdInDb: false,
    dbId: 0,
    ...overrides,
  }
}

function setup(proposed: ProposedArticle[] = []) {
  const store = useCocoonStrategyStore()
  store.strategy = { cocoonSlug: 'cocon-test', proposedArticles: proposed, suggestedTopics: [] } as never
  store.saveStrategy = vi.fn(async () => {})
  const builder = useCocoonBuilder({ cocoonId: COCOON_ID, cocoonName: 'Cocon test', cocoonSlug: 'cocon-test' })
  return { store, builder }
}

/** Réponses du serveur, par adresse. */
function routeApi(tree: CocoonTreeNode[], opts: { candidates?: ChildCandidate[]; created?: { id: number; slug: string } } = {}) {
  apiGet.mockImplementation(async (url: string) => {
    if (url === `/cocoons/${COCOON_ID}/tree`) return tree
    throw new Error(`GET inattendu : ${url}`)
  })
  apiPost.mockImplementation(async (url: string) => {
    if (url === `/cocoons/${COCOON_ID}/child-candidates`) return { level: 'intermediaire', parentId: null, parentSection: null, candidates: opts.candidates ?? [candidate()], usage: null }
    if (url === `/cocoons/${COCOON_ID}/articles`) return opts.created ?? { id: 99, slug: 'refonte-de-site-internet-a-toulouse' }
    if (url === '/keywords') return { success: true }
    throw new Error(`POST inattendu : ${url}`)
  })
}

function postsTo(url: string) {
  return apiPost.mock.calls.filter(c => c[0] === url)
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
})

describe('useCocoonBuilder — l’arbre réel du cocon', () => {
  it('charge l’arbre du cocon et range chaque pilier suivi de ses intermédiaires, dans l’ordre de ses sections', async () => {
    routeApi([INTER_SEO, SPE, PILIER, INTER_HEBERGEMENT])
    const { builder } = setup()

    await builder.loadTree()

    expect(apiGet).toHaveBeenCalledWith(`/cocoons/${COCOON_ID}/tree`)
    expect(builder.tree.value).toHaveLength(4)
    expect(builder.hasPillar.value).toBe(true)
    expect(builder.blocks.value.map(b => [b.node.id, b.depth])).toEqual([[10, 0], [12, 1], [11, 1]])
    expect(builder.orphans.value, 'un spécialisé rattaché figure dans les sections de son parent').toEqual([])
  })

  it('met à part les articles sans parent, créés avant la construction progressive', async () => {
    routeApi([PILIER, INTER_SEO, ANCIEN])
    const { builder } = setup()

    await builder.loadTree()

    expect(builder.orphans.value.map(n => n.id)).toEqual([20])
    expect(builder.blocks.value.some(b => b.node.id === 20)).toBe(false)
  })

  it('dit pourquoi l’arbre n’a pas pu être chargé', async () => {
    apiGet.mockRejectedValue(new ApiRequestError('Cocoon 7 not found', 404, 'NOT_FOUND'))
    const { builder } = setup()

    await builder.loadTree()

    expect(builder.treeError.value).toContain('Cocoon 7 not found')
    expect(builder.tree.value).toEqual([])
    expect(builder.isLoadingTree.value).toBe(false)
  })
})

describe('useCocoonBuilder — les candidats d’un nouvel article', () => {
  it('demande les candidats du pilier d’un cocon vide (sans parent)', async () => {
    routeApi([])
    const { builder } = setup()

    await builder.proposeCandidates({ parentId: null, parentSection: null, level: 'pilier' })

    expect(apiPost).toHaveBeenCalledWith(`/cocoons/${COCOON_ID}/child-candidates`, { parentId: null, parentSection: null })
    expect(builder.target.value).toEqual({ parentId: null, parentSection: null, level: 'pilier' })
    expect(builder.isTarget(null, null)).toBe(true)
    expect(builder.candidates.value).toHaveLength(1)
    expect(builder.isProposing.value).toBe(false)
  })

  it('demande les candidats de la section visée, et d’elle seule', async () => {
    routeApi([PILIER])
    const { builder } = setup()

    await builder.proposeCandidates({ parentId: 10, parentSection: 'La refonte', level: 'intermediaire' })

    expect(apiPost).toHaveBeenCalledWith(`/cocoons/${COCOON_ID}/child-candidates`, { parentId: 10, parentSection: 'La refonte' })
    expect(builder.isTarget(10, 'La refonte')).toBe(true)
    expect(builder.isTarget(10, 'L’hébergement')).toBe(false)
  })

  it('dit le refus du serveur (parent pas rédigé) au lieu de montrer une liste vide', async () => {
    apiPost.mockRejectedValue(new ApiRequestError('« Création de site » n’est pas encore rédigé : validez d’abord son premier jet, puis créez ses articles enfants.', 409, 'PARENT_NOT_WRITTEN'))
    const { builder } = setup()

    await builder.proposeCandidates({ parentId: 10, parentSection: 'La refonte', level: 'intermediaire' })

    expect(builder.candidates.value).toEqual([])
    expect(builder.proposeError.value).toContain('n’est pas encore rédigé')
  })

  it('ignore une réponse arrivée après un changement de cible', async () => {
    let answerFirst: (v: unknown) => void = () => {}
    apiPost.mockImplementationOnce(() => new Promise((resolve) => { answerFirst = resolve }))
    apiPost.mockResolvedValueOnce({ candidates: [candidate({ keyword: 'second' })] })
    const { builder } = setup()

    const first = builder.proposeCandidates({ parentId: 10, parentSection: 'La refonte', level: 'intermediaire' })
    await builder.proposeCandidates({ parentId: null, parentSection: null, level: 'pilier' })
    answerFirst({ candidates: [candidate({ keyword: 'premier' })] })
    await first

    expect(builder.isTarget(null, null)).toBe(true)
    expect(builder.candidates.value.map(c => c.keyword)).toEqual(['second'])
  })
})

describe('useCocoonBuilder — créer l’article choisi', () => {
  it('crée le pilier directement, sans porte, puis l’inscrit sur la carte et recharge l’arbre', async () => {
    routeApi([], { created: { id: 42, slug: 'creation-de-site-internet-a-toulouse' } })
    const { store, builder } = setup()
    await builder.proposeCandidates({ parentId: null, parentSection: null, level: 'pilier' })
    const pilier = candidate({ keyword: 'creation site internet toulouse', title: 'Création de site internet à Toulouse', painPoint: null })

    const created = await builder.createFromCandidate(pilier, '  Création de site internet à Toulouse  ')

    expect(created?.id).toBe(42)
    expect(runThroughGate, 'un pilier n’a pas de parent : pas de porte').not.toHaveBeenCalled()
    expect(postsTo(`/cocoons/${COCOON_ID}/articles`)[0]![1]).toMatchObject({
      title: 'Création de site internet à Toulouse',
      type: 'pilier',
      parentId: null,
      parentSection: null,
      suggestedKeyword: 'creation site internet toulouse',
    })
    expect(postsTo('/keywords')[0]![1], 'le pool attend « Pilier », pas « pilier »').toMatchObject({ keyword: 'creation site internet toulouse', cocoonName: 'Cocon test', type: 'Pilier' })

    const carte = store.strategy!.proposedArticles
    expect(carte).toHaveLength(1)
    expect(carte[0]).toMatchObject({
      title: 'Création de site internet à Toulouse',
      type: 'pilier',
      parentTitle: null,
      suggestedKeyword: 'creation site internet toulouse',
      suggestedSlug: 'creation-de-site-internet-a-toulouse',
      accepted: true,
      createdInDb: true,
      dbId: 42,
    })
    expect(store.saveStrategy).toHaveBeenCalledWith('cocon-test')
    expect(apiGet, 'l’arbre est relu après la création').toHaveBeenCalledWith(`/cocoons/${COCOON_ID}/tree`)
    expect(fetchCocoons).toHaveBeenCalled()
    expect(notifySuccess).toHaveBeenCalledTimes(1)
    expect(builder.target.value, 'le panneau se referme').toBeNull()
  })

  it('crée un enfant derrière la porte du premier jet de son parent, né de la section visée', async () => {
    routeApi([PILIER, INTER_SEO])
    const { store, builder } = setup()
    await builder.loadTree()
    await builder.proposeCandidates({ parentId: 10, parentSection: 'La refonte', level: 'intermediaire' })

    await builder.createFromCandidate(candidate(), 'Refonte de site internet à Toulouse')

    expect(runThroughGate).toHaveBeenCalledWith(10, expect.any(Function))
    expect(postsTo(`/cocoons/${COCOON_ID}/articles`)[0]![1]).toMatchObject({
      type: 'intermediaire',
      parentId: 10,
      parentSection: 'La refonte',
      suggestedKeyword: 'refonte site internet toulouse',
      painPoint: 'Un site vieillissant qui ne rapporte plus de contacts',
    })
    expect(store.strategy!.proposedArticles[0]).toMatchObject({
      parentTitle: 'Création de site internet à Toulouse',
      parentSection: 'La refonte',
      painPoint: 'Un site vieillissant qui ne rapporte plus de contacts',
      createdInDb: true,
      dbId: 99,
    })
  })

  it('met à jour la proposition de même titre au lieu d’en ajouter une, et lui reprend son intention', async () => {
    routeApi([PILIER])
    const existante = proposition({ id: 'carte-7', title: 'refonte de site internet a toulouse', painIntentExpected: 'transactional', rationale: 'Pensée sur la carte' })
    const autre = proposition({ id: 'carte-8', title: 'Autre sujet' })
    const { store, builder } = setup([existante, autre])
    await builder.loadTree()
    await builder.proposeCandidates({ parentId: 10, parentSection: 'La refonte', level: 'intermediaire' })

    await builder.createFromCandidate(candidate(), 'Refonte de site internet à Toulouse')

    expect(postsTo(`/cocoons/${COCOON_ID}/articles`)[0]![1], 'base et carte disent la même intention').toMatchObject({ painIntentExpected: 'transactional' })
    const carte = store.strategy!.proposedArticles
    expect(carte, 'aucun doublon').toHaveLength(2)
    expect(carte[0]).toMatchObject({
      id: 'carte-7',
      title: 'Refonte de site internet à Toulouse',
      rationale: 'Pensée sur la carte',
      painIntentExpected: 'transactional',
      createdInDb: true,
      dbId: 99,
      accepted: true,
    })
    expect(carte[1]!.id).toBe('carte-8')
  })

  it('n’écrase jamais une proposition déjà liée à un autre article', async () => {
    routeApi([PILIER])
    const dejaCreee = proposition({ id: 'carte-5', title: 'Refonte de site internet à Toulouse', createdInDb: true, dbId: 5, painIntentExpected: 'navigational' })
    const { store, builder } = setup([dejaCreee])
    await builder.loadTree()
    await builder.proposeCandidates({ parentId: 10, parentSection: 'La refonte', level: 'intermediaire' })

    await builder.createFromCandidate(candidate(), 'Refonte de site internet à Toulouse')

    expect(postsTo(`/cocoons/${COCOON_ID}/articles`)[0]![1], 'l’intention d’un autre article ne déteint pas').toMatchObject({ painIntentExpected: null })
    const carte = store.strategy!.proposedArticles
    expect(carte).toHaveLength(2)
    expect(carte[0]).toMatchObject({ id: 'carte-5', dbId: 5 })
    expect(carte[1]).toMatchObject({ createdInDb: true, dbId: 99 })
  })

  it('n’envoie jamais le mot-clé d’un candidat non mesuré', async () => {
    routeApi([PILIER])
    const { store, builder } = setup()
    await builder.proposeCandidates({ parentId: 10, parentSection: 'La refonte', level: 'intermediaire' })
    const nonMesure = candidate({ keyword: 'mot cle jamais mesure', metrics: null })

    const created = await builder.createFromCandidate(nonMesure, 'Un titre valable')

    expect(created).toBeNull()
    expect(postsTo(`/cocoons/${COCOON_ID}/articles`), 'rien n’est créé').toHaveLength(0)
    const envoyes = apiPost.mock.calls.map(c => JSON.stringify(c[1]))
    expect(envoyes.some(body => body.includes('mot cle jamais mesure')), 'le mot-clé ne part nulle part').toBe(false)
    expect(builder.createError.value).toContain('n’a pas pu être mesuré')
    expect(store.strategy!.proposedArticles).toHaveLength(0)
  })

  it('refuse un titre de moins de 3 caractères sans rien envoyer', async () => {
    routeApi([])
    const { builder } = setup()
    await builder.proposeCandidates({ parentId: null, parentSection: null, level: 'pilier' })

    expect(await builder.createFromCandidate(candidate(), ' ab ')).toBeNull()
    expect(postsTo(`/cocoons/${COCOON_ID}/articles`)).toHaveLength(0)
    expect(builder.createError.value).toContain('3 caractères')
  })

  it.each([
    [409, 'SLUG_TAKEN', 'L’adresse /refonte-de-site-internet-a-toulouse est déjà prise par un autre article : changez le titre ou l’adresse.'],
    [422, 'KEYWORD_NOT_MEASURED', 'Le mot-clé « refonte site internet toulouse » n’a jamais été mesuré : choisissez-le parmi les candidats mesurés.'],
    [409, 'HIERARCHY_VIOLATION', 'La section « La refonte » a déjà donné l’article « Refonte ».'],
  ])('dit le refus %i %s et n’annonce aucun article créé', async (status, code, message) => {
    routeApi([PILIER])
    apiPost.mockImplementation(async (url: string) => {
      if (url === `/cocoons/${COCOON_ID}/child-candidates`) return { candidates: [candidate()] }
      if (url === `/cocoons/${COCOON_ID}/articles`) throw new ApiRequestError(message, status, code)
      throw new Error(`POST inattendu : ${url}`)
    })
    const { store, builder } = setup()
    await builder.proposeCandidates({ parentId: 10, parentSection: 'La refonte', level: 'intermediaire' })

    const created = await builder.createFromCandidate(candidate(), 'Refonte de site internet à Toulouse')

    expect(created).toBeNull()
    expect(builder.createError.value, 'le titre concerné est nommé').toContain('Refonte de site internet à Toulouse')
    expect(builder.createError.value, 'la cause du serveur est donnée').toContain(message)
    expect(store.strategy!.proposedArticles, 'rien n’est inscrit sur la carte').toHaveLength(0)
    expect(store.saveStrategy).not.toHaveBeenCalled()
    expect(postsTo('/keywords'), 'pas de mot-clé orphelin').toHaveLength(0)
    expect(notifySuccess).not.toHaveBeenCalled()
    expect(builder.target.value, 'le panneau reste ouvert pour corriger').not.toBeNull()
  })

  it('ne crée rien quand l’utilisateur revient corriger le parent depuis l’alarme', async () => {
    routeApi([PILIER])
    runThroughGate.mockResolvedValueOnce({ ok: false } as never)
    const { store, builder } = setup()
    await builder.loadTree()
    await builder.proposeCandidates({ parentId: 10, parentSection: 'La refonte', level: 'intermediaire' })

    const created = await builder.createFromCandidate(candidate(), 'Refonte de site internet à Toulouse')

    expect(created).toBeNull()
    expect(builder.createError.value).toContain('Création de site internet à Toulouse')
    expect(store.strategy!.proposedArticles).toHaveLength(0)
    expect(notifySuccess).not.toHaveBeenCalled()
  })

  it('garde l’article créé quand son mot-clé est refusé par le pool, et dit pourquoi', async () => {
    routeApi([])
    apiPost.mockImplementation(async (url: string) => {
      if (url === `/cocoons/${COCOON_ID}/child-candidates`) return { candidates: [candidate()] }
      if (url === `/cocoons/${COCOON_ID}/articles`) return { id: 1013, slug: 'strategie-digitale' }
      throw new ApiRequestError('Le mot-clé « refonte site internet toulouse » est déjà utilisé dans le cocon « Croissance digitale Toulouse ».', 409, 'DUPLICATE')
    })
    const { store, builder } = setup()
    await builder.proposeCandidates({ parentId: null, parentSection: null, level: 'pilier' })

    await builder.createFromCandidate(candidate(), 'Stratégie digitale')

    expect(store.strategy!.proposedArticles[0]).toMatchObject({ createdInDb: true, dbId: 1013 })
    expect(notifyWarning).toHaveBeenCalledTimes(1)
    expect(String(notifyWarning.mock.calls[0]![0])).toContain('Croissance digitale Toulouse')
  })
})
