// @vitest-environment node
/**
 * FR-INFRA-LIEUTENANT-EXPLORATIONS — ce que l'écran fait des propositions de
 * lieutenants est enregistré, pour que l'écran, la Finalisation (statuts de
 * `lieutenant_explorations`) et la porte (liste plate `article_keywords`)
 * lisent la même chose après un rechargement (recette du 2026-09-30, INFRA-18).
 *
 * - « Tout réinitialiser » (déverrouillage du Capitaine) archive les
 *   lieutenants verrouillés EN BASE, pas seulement à l'écran : au rechargement,
 *   ils revenaient cochés alors que la liste enregistrée était vide.
 * - Un lieutenant ajouté depuis le panneau d'aide est enregistré dès l'ajout,
 *   comme proposition : il disparaissait au rechargement s'il n'était pas coché.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import type { ArticleKeywords, RichLieutenant, SelectedArticle } from '@shared/types/index.js'

vi.mock('@/services/api.service', () => ({
  apiGet: vi.fn(),
  apiPut: vi.fn().mockResolvedValue(null),
  apiPost: vi.fn().mockResolvedValue(null),
  apiPatch: vi.fn(),
}))

vi.mock('@/composables/editor/useStreaming', () => ({
  useStreaming: () => ({
    chunks: ref(''),
    isStreaming: ref(false),
    error: ref<string | null>(null),
    result: ref(null),
    usage: ref(null),
    startStream: vi.fn(),
    abort: vi.fn(),
  }),
}))

vi.mock('@/utils/logger', () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const { apiPost } = await import('@/services/api.service')
const mockApiPost = vi.mocked(apiPost)
const { useArticleKeywordsStore } = await import('@/stores/article/article-keywords.store')
const { useLieutenantsIa } = await import('@/composables/moteur/useLieutenantsIa')

const ARTICLE_ID = 1342
const CAPTAIN = 'prix site vitrine'

function lieutenant(keyword: string, status: RichLieutenant['status'], score: number | null = 70): RichLieutenant {
  return { keyword, status, reasoning: 'r', sources: ['serp'], suggestedHnLevel: 2, score, kpis: null }
}

function keywordsWith(richLieutenants: RichLieutenant[]): ArticleKeywords {
  return {
    articleId: ARTICLE_ID,
    capitaine: CAPTAIN,
    lieutenants: richLieutenants.filter(lt => lt.status === 'locked').map(lt => lt.keyword),
    lexique: [],
    rootKeywords: [],
    richLieutenants,
  }
}

function statuses(store: ReturnType<typeof useArticleKeywordsStore>): Record<string, string> {
  return Object.fromEntries((store.keywords?.richLieutenants ?? []).map(lt => [lt.keyword, lt.status]))
}

beforeEach(() => {
  setActivePinia(createPinia())
  mockApiPost.mockReset()
  mockApiPost.mockResolvedValue(null)
})

describe('FR-INFRA-LIEUTENANT-EXPLORATIONS — « Tout réinitialiser » archive en base', () => {
  it('les lieutenants verrouillés sont archivés à l’écran ET l’archivage enregistré est demandé pour eux seuls', async () => {
    const store = useArticleKeywordsStore()
    store.keywords = keywordsWith([
      lieutenant('prix erreurs à éviter', 'locked'),
      lieutenant('erreurs à éviter avis', 'locked'),
      lieutenant('délai de création', 'suggested'),
      lieutenant('site gratuit', 'eliminated'),
    ])

    const saved = await store.archiveLockedLieutenants()

    expect(statuses(store)).toEqual({
      'prix erreurs à éviter': 'archived',
      'erreurs à éviter avis': 'archived',
      'délai de création': 'suggested',
      'site gratuit': 'eliminated',
    })
    expect(store.keywords?.lieutenants).toEqual([])
    expect(store.lockedLieutenants).toHaveLength(0)
    expect(mockApiPost, 'l’archivage enregistré n’était jamais demandé').toHaveBeenCalledWith(
      `/articles/${ARTICLE_ID}/lieutenants/archive`,
      { keywords: ['prix erreurs à éviter', 'erreurs à éviter avis'] },
    )
    expect(saved).toBe(true)
  })

  it('sans lieutenant verrouillé, rien n’est demandé au serveur', async () => {
    const store = useArticleKeywordsStore()
    store.keywords = keywordsWith([lieutenant('délai de création', 'suggested')])

    await store.archiveLockedLieutenants()

    expect(mockApiPost).not.toHaveBeenCalled()
  })

  it('un archivage refusé par le serveur ne lève rien et le dit (false)', async () => {
    const store = useArticleKeywordsStore()
    store.keywords = keywordsWith([lieutenant('prix erreurs à éviter', 'locked')])
    mockApiPost.mockRejectedValueOnce(new Error('500'))

    await expect(store.archiveLockedLieutenants()).resolves.toBe(false)
    expect(statuses(store)).toEqual({ 'prix erreurs à éviter': 'archived' })
  })
})

describe('FR-INFRA-LIEUTENANT-EXPLORATIONS — un lieutenant ajouté est enregistré dès l’ajout', () => {
  function setupPanel() {
    const store = useArticleKeywordsStore()
    const article = { id: ARTICLE_ID, slug: 'prix', title: 'Prix', keyword: CAPTAIN, type: 'Intermédiaire', locked: false, source: 'proposed' } as unknown as SelectedArticle
    const ia = useLieutenantsIa({
      captainKeyword: ref<string | null>(CAPTAIN),
      articleLevel: ref('intermediaire' as const),
      selectedArticle: ref<SelectedArticle | null>(article),
      serpResult: ref(null),
      serpResultsByKeyword: ref(new Map()),
      resolvedRootKeywords: ref<string[]>([]),
      wordGroups: ref([]),
      cocoonSlug: ref(''),
      articleKeywordsStore: store,
      computeHnRecurrenceFrom: vi.fn(() => []),
      hnRecurrence: ref([]),
      onLieutenantsUpdated: vi.fn(),
    })
    return { store, ia }
  }

  function explorationSaves() {
    return mockApiPost.mock.calls.filter(c => String(c[0]) === `/articles/${ARTICLE_ID}/lieutenant-explorations`)
  }

  it('ajouté depuis le panneau d’aide : proposé (non coché), gardé en mémoire et enregistré aussitôt', () => {
    const { store, ia } = setupPanel()
    store.keywords = keywordsWith([lieutenant('délai de création', 'suggested')])

    ia.handleAssistAdd('budget site vitrine')

    expect(ia.selectedCards.value.has('budget site vitrine'), 'ajouter ne coche pas').toBe(false)
    expect(statuses(store)['budget site vitrine']).toBe('suggested')
    const saves = explorationSaves()
    expect(saves, 'la proposition n’était enregistrée qu’une fois cochée').toHaveLength(1)
    expect(saves[0]![1]).toEqual({
      captainKeyword: CAPTAIN,
      entries: [expect.objectContaining({ keyword: 'budget site vitrine', status: 'suggested', score: null })],
    })
    // Rien d'autre n'est réécrit : la décision (liste plate) n'a pas changé.
    expect(store.keywords?.lieutenants).toEqual([])
  })

  it('une proposition écartée, ajoutée de nouveau, redevient proposée en mémoire comme en base', () => {
    const { store, ia } = setupPanel()
    store.keywords = keywordsWith([lieutenant('site gratuit', 'eliminated')])
    ia.restoreLockedLieutenants()
    expect(ia.eliminatedCards.value.map(c => c.keyword)).toEqual(['site gratuit'])

    ia.handleAssistAdd('site gratuit')

    expect(statuses(store)['site gratuit']).toBe('suggested')
    expect(ia.lieutenantCards.value.map(c => c.keyword)).toEqual(['site gratuit'])
    expect(ia.eliminatedCards.value, 'elle quitte « Autres candidats », comme au rechargement').toEqual([])
    expect(explorationSaves()[0]![1]).toEqual({
      captainKeyword: CAPTAIN,
      entries: [expect.objectContaining({ keyword: 'site gratuit', status: 'suggested' })],
    })
  })

  it('un mot-clé déjà à l’écran n’est ni ajouté ni réenregistré', () => {
    const { store, ia } = setupPanel()
    store.keywords = keywordsWith([])
    ia.handleAssistAdd('budget site vitrine')
    mockApiPost.mockClear()

    ia.handleAssistAdd('Budget site vitrine')

    expect(ia.lieutenantCards.value).toHaveLength(1)
    expect(explorationSaves()).toHaveLength(0)
  })
})
