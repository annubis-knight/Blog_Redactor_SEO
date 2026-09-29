/**
 * FR-CER-COCOON-PROGRESSIVE — la proposition de plan est une carte indicative :
 * elle guide les articles à créer, elle n'en crée aucun.
 *
 * Historique : on « acceptait » une proposition (ou « Tout valider »), ce qui
 * créait l'article en base. Depuis C7, un article naît de l'arbre réel du cocon
 * — le pilier, puis chaque enfant depuis une section de son parent rédigé —
 * avec un mot-clé choisi parmi des candidats mesurés : c'est `useCocoonBuilder`
 * (tests/unit/composables/useCocoonBuilder.test.ts), qui reprend les garanties
 * de FR-CER-CREATION-HONNETE (refus dit, rien d'annoncé créé à tort, mot-clé du
 * pool). Ici, on verrouille que la carte ne crée plus rien, et qu'elle garde en
 * phase un article déjà créé qu'on y édite.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

const apiPost = vi.fn()
const apiPatch = vi.fn()
const apiDelete = vi.fn()

vi.mock('../../../src/services/api.service', async (importOriginal) => ({
  ApiRequestError: (await importOriginal<typeof import('../../../src/services/api.service')>()).ApiRequestError,
  apiPost: (...args: unknown[]) => apiPost(...args),
  apiPatch: (...args: unknown[]) => apiPatch(...args),
  apiDelete: (...args: unknown[]) => apiDelete(...args),
  apiGet: vi.fn(),
}))

vi.mock('../../../src/stores/strategy/cocoons.store', () => ({
  useCocoonsStore: () => ({ fetchCocoons: vi.fn(), cocoons: [{ id: 3, name: 'Cocon test', articles: [] }] }),
}))

import { useArticleProposals } from '../../../src/composables/editor/useArticleProposals'
import { useCocoonStrategyStore } from '../../../src/stores/strategy/cocoon-strategy.store'
import { useNotificationStore } from '../../../src/stores/ui/notification.store'
import { ApiRequestError } from '../../../src/services/api.service'
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
    suggestedKeyword: 'creation site internet toulouse',
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
  const api = useArticleProposals({
    cocoonSlug: { value: 'cocon-test' } as never,
    cocoonName: { value: 'Cocon test' } as never,
    getSuggestContext: () => ({}) as never,
  })
  return { store, api }
}

function creations() {
  return apiPost.mock.calls.filter(c => /^\/cocoons\/\d+\/articles$/.test(String(c[0])) || c[0] === '/keywords')
}

describe('Carte indicative — elle guide, elle ne crée aucun article', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    apiPost.mockReset()
    apiPatch.mockReset()
  })

  it('n’offre plus d’action qui crée un article (accepter, tout valider)', () => {
    const { api } = monter([proposition()])

    expect('toggleAccept' in api, 'plus de case « accepter »').toBe(false)
    expect('validateArticles' in api, 'plus de « Tout valider »').toBe(false)
  })

  it('éditer une proposition l’enregistre sur la carte, sans rien créer en base', async () => {
    const { store, api } = monter([proposition()])

    await api.editTitle(0, 'Création de sites vitrines à Toulouse')
    api.editKeyword(0, 'site vitrine toulouse')
    api.editSlug(0, 'site-vitrine-toulouse')
    api.changeParent(0, 'Autre parent')
    await api.updatePainIntent(0, 'informational')

    const carte = store.strategy!.proposedArticles[0]!
    expect(carte).toMatchObject({
      title: 'Création de sites vitrines à Toulouse',
      suggestedKeyword: 'site vitrine toulouse',
      suggestedSlug: 'site-vitrine-toulouse',
      parentTitle: 'Autre parent',
      painIntentExpected: 'informational',
      createdInDb: false,
      dbId: 0,
    })
    expect(store.saveStrategy).toHaveBeenCalledWith('cocon-test')
    expect(creations(), 'aucune création, aucun mot-clé ajouté au pool').toHaveLength(0)
    expect(apiPatch, 'rien à synchroniser : l’article n’existe pas').not.toHaveBeenCalled()
  })

  it('un article déjà créé garde sa marque, et son titre édité sur la carte suit en base', async () => {
    const { store, api } = monter([proposition({ createdInDb: true, dbId: 42, accepted: true })])

    await api.editTitle(0, 'Création de site internet à Toulouse : le guide')

    expect(apiPatch).toHaveBeenCalledWith('/articles/42', { title: 'Création de site internet à Toulouse : le guide' })
    expect(creations(), 'pas de seconde création').toHaveLength(0)
    expect(store.strategy!.proposedArticles[0]).toMatchObject({ createdInDb: true, dbId: 42 })
  })
})

// Retirer un article créé le détache du cocon. Avant, un refus du serveur était
// avalé (« peut-être déjà retiré ») et la proposition disparaissait quand même :
// l'article restait en base, mais n'apparaissait plus ni sur la carte ni au Moteur.
describe('Carte indicative — retirer un article créé', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    apiDelete.mockReset()
  })

  it('le serveur refuse (il a des enfants) : la carte le garde et dit pourquoi', async () => {
    const { store, api } = monter([proposition({ createdInDb: true, dbId: 42, accepted: true })])
    apiDelete.mockRejectedValueOnce(new ApiRequestError('Cet article a encore des articles nés de ses sections.', 409, 'HAS_CHILDREN'))

    await api.removeProposedArticle(0)

    expect(store.strategy!.proposedArticles, 'la proposition reste sur la carte').toHaveLength(1)
    expect(store.saveStrategy).not.toHaveBeenCalled()
    const messages = useNotificationStore().notifications.map(n => `${n.type}:${n.message}`)
    expect(messages.some(m => m.startsWith('error:') && m.includes('nés de ses sections'))).toBe(true)
  })

  it('déjà absent de la base (404) : la carte suit', async () => {
    const { store, api } = monter([proposition({ createdInDb: true, dbId: 42, accepted: true })])
    apiDelete.mockRejectedValueOnce(new ApiRequestError('Article 42 not found', 404, 'NOT_FOUND'))

    await api.removeProposedArticle(0)

    expect(store.strategy!.proposedArticles).toHaveLength(0)
    expect(store.saveStrategy).toHaveBeenCalledWith('cocon-test')
  })

  it('retiré par le serveur : la proposition quitte la carte', async () => {
    const { store, api } = monter([proposition({ createdInDb: true, dbId: 42, accepted: true })])
    apiDelete.mockResolvedValueOnce({ id: 42, removed: true })

    await api.removeProposedArticle(0)

    expect(apiDelete).toHaveBeenCalledWith('/articles/42')
    expect(store.strategy!.proposedArticles).toHaveLength(0)
  })
})
