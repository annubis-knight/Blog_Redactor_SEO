/**
 * FR-CER-CREATION-HONNETE — un article annoncé créé doit exister en base.
 *
 * Historique : `POST /articles/batch-create` insérait en `ON CONFLICT (slug) DO
 * NOTHING` ; une adresse déjà prise répondait 200 sans ligne, et l'écran
 * affichait une coche verte sur un article inexistant. Depuis C7, la création
 * passe par `POST /cocoons/:cocoonId/articles`, un article à la fois : tout
 * refus (adresse prise, ordre du cocon, mot-clé jamais mesuré) est une erreur
 * HTTP, dite telle quelle ; un parent pas encore rédigé ouvre l'alarme de sa
 * porte du premier jet (FR-CER-PARENT-WRITTEN-GATE).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

const apiPost = vi.fn()
const notifyError = vi.fn()
const notifyWarning = vi.fn()

vi.mock('../../../src/services/api.service', async (importOriginal) => ({
  ApiRequestError: (await importOriginal<typeof import('../../../src/services/api.service')>()).ApiRequestError,
  apiPost: (...args: unknown[]) => apiPost(...args),
  apiDelete: vi.fn(),
  apiPatch: vi.fn(),
  apiGet: vi.fn(),
}))

const runThroughGate = vi.fn(async (_id: number, action: () => Promise<unknown>) => ({ ok: true, value: await action() }))
vi.mock('../../../src/stores/ui/gate-alarm.store', () => ({
  useGateAlarmStore: () => ({ runThroughGate }),
}))

vi.mock('../../../src/composables/ui/useNotify', () => ({
  useNotify: () => ({ error: notifyError, info: vi.fn(), success: vi.fn(), warning: notifyWarning }),
}))

vi.mock('../../../src/stores/strategy/cocoons.store', () => ({
  useCocoonsStore: () => ({ fetchCocoons: vi.fn(), cocoons: [{ id: 3, name: 'Cocon test', articles: [] }] }),
}))

import { useArticleProposals } from '../../../src/composables/editor/useArticleProposals'
import { ApiRequestError } from '../../../src/services/api.service'
import { useCocoonStrategyStore } from '../../../src/stores/strategy/cocoon-strategy.store'
import type { ProposedArticle } from '../../../shared/types/index.js'

function proposition(overrides: Partial<ProposedArticle> = {}): ProposedArticle {
  return {
    id: 'p-1',
    title: 'Création de site internet à Toulouse',
    suggestedTitles: [],
    type: 'pilier',
    parentTitle: null,
    rationale: '',
    painPoint: '',
    painIntentExpected: 'commercial',
    suggestedKeyword: '',
    suggestedKeywords: [],
    suggestedSlug: 'creation-site-internet-toulouse',
    suggestedSlugs: [],
    validatedSearchQuery: null,
    keywordValidated: false,
    searchQueryValidated: false,
    titleValidated: false,
    accepted: false,
    createdInDb: false,
    dbId: 0,
    ...overrides,
  } as ProposedArticle
}

function monter(articles: ProposedArticle[]) {
  const store = useCocoonStrategyStore()
  store.strategy = { proposedArticles: articles, suggestedTopics: [] } as never
  store.saveStrategy = vi.fn()
  return useArticleProposals({
    cocoonSlug: { value: 'cocon-test' } as never,
    cocoonName: { value: 'Cocon test' } as never,
    getSuggestContext: () => ({}) as never,
  })
}

describe('createArticleInDb — ne pas annoncer une création qui n’a pas eu lieu', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    apiPost.mockReset()
    notifyError.mockReset()
    notifyWarning.mockReset()
  })

  it('marque l’article créé quand la base renvoie une ligne', async () => {
    apiPost.mockResolvedValue({ id: 4242, slug: 'creation-site-internet-toulouse' })
    const article = proposition()
    const api = monter([article])

    await api.toggleAccept(0)

    expect(apiPost.mock.calls[0]![0]).toBe('/cocoons/3/articles')
    expect(apiPost.mock.calls[0]![1]).toMatchObject({ title: 'Création de site internet à Toulouse', type: 'pilier', parentId: null })
    const resultat = useCocoonStrategyStore().strategy!.proposedArticles[0]
    expect(resultat.createdInDb, 'la création est confirmée').toBe(true)
    expect(resultat.dbId).toBe(4242)
    expect(notifyError, 'aucune alerte inutile').not.toHaveBeenCalled()
  })

  it('un enfant part avec son parent (retrouvé sur la carte) et sa section, derrière la porte du parent', async () => {
    apiPost.mockResolvedValue({ id: 51, slug: 'refonte' })
    const pilier = proposition({ createdInDb: true, dbId: 50 })
    const enfant = proposition({ id: 'p-2', title: 'Refonte de site', type: 'intermediaire', parentTitle: 'création de site internet à toulouse', parentSection: 'La refonte', suggestedSlug: 'refonte' })
    const api = monter([pilier, enfant])

    await api.toggleAccept(1)

    expect(runThroughGate).toHaveBeenCalledWith(50, expect.any(Function))
    expect(apiPost.mock.calls[0]![1]).toMatchObject({ parentId: 50, parentSection: 'La refonte', type: 'intermediaire' })
  })

  it('refuse de marquer créé quand le slug est déjà pris', async () => {
    apiPost.mockRejectedValue(new ApiRequestError('L’adresse /creation-site-internet-toulouse est déjà prise par un autre article : changez le titre ou l’adresse.', 409, 'SLUG_TAKEN'))
    const article = proposition()
    const api = monter([article])

    await api.toggleAccept(0)

    const resultat = useCocoonStrategyStore().strategy!.proposedArticles[0]
    expect(resultat.createdInDb, 'rien n’a été créé, rien n’est annoncé').toBe(false)
    expect(resultat.dbId, 'aucun identifiant inventé').toBe(0)
  })

  it('explique à l’utilisateur pourquoi la création a échoué', async () => {
    apiPost.mockRejectedValue(new ApiRequestError('L’adresse /creation-site-internet-toulouse est déjà prise par un autre article : changez le titre ou l’adresse.', 409, 'SLUG_TAKEN'))
    const api = monter([proposition()])

    await api.toggleAccept(0)

    expect(notifyError).toHaveBeenCalledTimes(1)
    const message = String(notifyError.mock.calls[0][0])
    expect(message, 'le titre concerné est nommé').toContain('Création de site internet à Toulouse')
    expect(message, 'la cause est donnée').toContain('creation-site-internet-toulouse')
    expect(message, 'et la marche à suivre aussi').toMatch(/adresse/i)
  })

  it('n’enregistre pas le mot-clé d’un article qui n’a pas été créé', async () => {
    apiPost.mockRejectedValue(new ApiRequestError('Un cocon commence par son pilier : créez-le d’abord.', 409, 'HIERARCHY_VIOLATION'))
    const api = monter([proposition({ suggestedKeyword: 'creation site internet toulouse' })])

    await api.toggleAccept(0)

    const appels = apiPost.mock.calls.map(c => String(c[0]))
    expect(appels.filter(u => u === '/keywords'), 'pas de mot-clé orphelin').toHaveLength(0)
  })
})

describe('createArticleInDb — le mot-clé de l’article rejoint le pool du cocon', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    apiPost.mockReset()
    notifyError.mockReset()
    notifyWarning.mockReset()
  })

  it('envoie le type attendu par le pool (« Pilier »), pas le niveau en minuscules', async () => {
    apiPost.mockImplementation(async (url: string) => (url === '/cocoons/3/articles' ? { id: 7, slug: 's' } : { success: true }))
    const api = monter([proposition({ suggestedKeyword: 'creation site internet toulouse' })])

    await api.toggleAccept(0)

    const appel = apiPost.mock.calls.find(c => c[0] === '/keywords')
    expect(appel, 'le mot-clé est enregistré').toBeDefined()
    expect(appel![1]).toMatchObject({ type: 'Pilier' })
  })

  it('garde l’article créé quand son mot-clé est refusé, et dit pourquoi', async () => {
    // K1 : l'article existait en base, mais l'échec du mot-clé (409 : déjà
    // utilisé par un autre cocon) le laissait « non créé », sans message. Un
    // second clic tombait alors sur « adresse déjà prise ».
    apiPost.mockImplementation(async (url: string) => {
      if (url === '/cocoons/3/articles') return { id: 1013, slug: 'strategie-digitale-entreprises-toulouse' }
      throw new Error('Le mot-clé « stratégie digitale entreprises toulouse » est déjà utilisé dans le cocon « Croissance digitale Toulouse ».')
    })
    const api = monter([proposition({ suggestedKeyword: 'stratégie digitale entreprises toulouse' })])

    await api.toggleAccept(0)

    const resultat = useCocoonStrategyStore().strategy!.proposedArticles[0]
    expect(resultat.createdInDb, 'l’article existe en base : il est annoncé créé').toBe(true)
    expect(resultat.dbId).toBe(1013)
    expect(notifyWarning).toHaveBeenCalledTimes(1)
    const message = String(notifyWarning.mock.calls[0][0])
    expect(message, 'le titre concerné est nommé').toContain('Création de site internet à Toulouse')
    expect(message, 'le cocon concurrent est nommé').toContain('Croissance digitale Toulouse')
  })
})
