/**
 * FR-CER-CREATION-HONNETE — un article annoncé créé doit exister en base.
 *
 * `POST /articles/batch-create` insère en `ON CONFLICT (slug) DO NOTHING` :
 * quand l'adresse est déjà prise, la requête réussit (HTTP 200) mais ne
 * renvoie aucune ligne. Le composable marquait quand même `createdInDb`, et
 * l'écran affichait une coche verte sur un article qui n'existait nulle part.
 *
 * Le cas n'est pas théorique : `articles.cocoon_id` est en ON DELETE SET NULL,
 * donc supprimer un cocon laisse des articles fantômes — invisibles dans
 * l'application, mais dont le slug reste réservé.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

const apiPost = vi.fn()
const notifyError = vi.fn()

vi.mock('../../../src/services/api.service', () => ({
  apiPost: (...args: unknown[]) => apiPost(...args),
  apiDelete: vi.fn(),
  apiPatch: vi.fn(),
  apiGet: vi.fn(),
}))

vi.mock('../../../src/composables/ui/useNotify', () => ({
  useNotify: () => ({ error: notifyError, info: vi.fn(), success: vi.fn(), warning: vi.fn() }),
}))

vi.mock('../../../src/stores/strategy/cocoons.store', () => ({
  useCocoonsStore: () => ({ fetchCocoons: vi.fn(), cocoons: [] }),
}))

import { useArticleProposals } from '../../../src/composables/editor/useArticleProposals'
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
  })

  it('marque l’article créé quand la base renvoie une ligne', async () => {
    apiPost.mockResolvedValue([{ id: 4242, slug: 'creation-site-internet-toulouse' }])
    const article = proposition()
    const api = monter([article])

    await api.toggleAccept(0)

    const resultat = useCocoonStrategyStore().strategy!.proposedArticles[0]
    expect(resultat.createdInDb, 'la création est confirmée').toBe(true)
    expect(resultat.dbId).toBe(4242)
    expect(notifyError, 'aucune alerte inutile').not.toHaveBeenCalled()
  })

  it('refuse de marquer créé quand le slug est déjà pris', async () => {
    apiPost.mockResolvedValue([])
    const article = proposition()
    const api = monter([article])

    await api.toggleAccept(0)

    const resultat = useCocoonStrategyStore().strategy!.proposedArticles[0]
    expect(resultat.createdInDb, 'rien n’a été créé, rien n’est annoncé').toBe(false)
    expect(resultat.dbId, 'aucun identifiant inventé').toBe(0)
  })

  it('explique à l’utilisateur pourquoi la création a échoué', async () => {
    apiPost.mockResolvedValue([])
    const api = monter([proposition()])

    await api.toggleAccept(0)

    expect(notifyError).toHaveBeenCalledTimes(1)
    const message = String(notifyError.mock.calls[0][0])
    expect(message, 'le titre concerné est nommé').toContain('Création de site internet à Toulouse')
    expect(message, 'la cause est donnée').toContain('creation-site-internet-toulouse')
    expect(message, 'et la marche à suivre aussi').toMatch(/slug/i)
  })

  it('n’enregistre pas le mot-clé d’un article qui n’a pas été créé', async () => {
    apiPost.mockResolvedValue([])
    const api = monter([proposition({ suggestedKeyword: 'creation site internet toulouse' })])

    await api.toggleAccept(0)

    const appels = apiPost.mock.calls.map(c => String(c[0]))
    expect(appels.filter(u => u === '/keywords'), 'pas de mot-clé orphelin').toHaveLength(0)
  })
})
