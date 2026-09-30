/**
 * Chargement des mots-clés d'un article (recette du 2026-09-30, CAP-7 et F4).
 *
 * - FR-MOT-EXPLORATIONS-HYDRATATION : un article jamais étudié (réponse vide du
 *   serveur) a quand même ses mots-clés en mémoire, vides et à son nom. Le store
 *   restait `null` toute la session : l'écran le prenait pour « pas encore chargé ».
 * - FR-CAP-PERSIST : une réponse arrivée pour un article qu'on a quitté ne se
 *   mélange pas aux données de l'article choisi ; les données d'un autre article
 *   encore en mémoire sont remplacées, jamais fusionnées.
 * - FR-MOT-CHECK-RECONCILIATION : `loadedArticleId` dit de quel article les
 *   données relues en base sont arrivées ; il repart à `null` à chaque remise à zéro.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useArticleKeywordsStore } from '../../../src/stores/article/article-keywords.store'
import type { ArticleKeywords, RichLieutenant } from '../../../shared/types/index.js'

vi.mock('../../../src/services/api.service', () => ({
  apiGet: vi.fn(),
  apiPut: vi.fn(),
  apiPost: vi.fn(),
  apiPatch: vi.fn(),
}))

vi.mock('../../../src/utils/logger', () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { apiGet } from '../../../src/services/api.service'
const mockApiGet = vi.mocked(apiGet)

beforeEach(() => {
  setActivePinia(createPinia())
  mockApiGet.mockReset()
})

function keywordsOf(articleId: number, capitaine: string, lieutenants: string[] = []): ArticleKeywords {
  return {
    articleId, capitaine, lieutenants, lexique: [], rootKeywords: [],
    richLieutenants: lieutenants.map(keyword => ({
      keyword, status: 'locked', reasoning: '', sources: [], suggestedHnLevel: 2, score: null, kpis: null,
    })) as RichLieutenant[],
  }
}

/** Une réponse du serveur qu'on libère quand on veut (course entre deux articles). */
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => { resolve = r })
  return { promise, resolve }
}

describe('article-keywords.store — chargement (CAP-7, F4)', () => {
  it('FR-MOT-EXPLORATIONS-HYDRATATION — article jamais étudié : mots-clés vides à son nom, pas null', async () => {
    mockApiGet.mockResolvedValueOnce(null)
    const store = useArticleKeywordsStore()

    await store.fetchKeywordsMerge(1342)

    expect(store.keywords).not.toBeNull()
    expect(store.keywords?.articleId).toBe(1342)
    expect(store.keywords?.capitaine).toBe('')
    expect(store.keywords?.lieutenants).toEqual([])
    expect(store.keywords?.lexique).toEqual([])
    expect(store.loadedArticleId).toBe(1342)
  })

  it('FR-CAP-PERSIST — la réponse d’un article quitté n’entre pas dans celui qu’on vient de choisir', async () => {
    const reponseA = deferred<ArticleKeywords | null>()
    const reponseB = deferred<ArticleKeywords | null>()
    mockApiGet.mockReturnValueOnce(reponseA.promise).mockReturnValueOnce(reponseB.promise)
    const store = useArticleKeywordsStore()

    const chargeA = store.fetchKeywordsMerge(1335)
    store.$reset() // l'utilisateur choisit un autre article
    const chargeB = store.fetchKeywordsMerge(1339)

    reponseB.resolve(keywordsOf(1339, 'étapes bien démarrer', ['prix étapes']))
    await chargeB
    reponseA.resolve(keywordsOf(1335, 'recette 2026-09-30', ['prix recette', 'recette avis', 'recette étapes']))
    await chargeA

    expect(store.keywords?.articleId).toBe(1339)
    expect(store.keywords?.capitaine).toBe('étapes bien démarrer')
    expect(store.keywords?.lieutenants).toEqual(['prix étapes'])
    expect(store.loadedArticleId).toBe(1339)
  })

  it('FR-CAP-PERSIST — la réponse d’un article quitté, arrivée pendant le trou, ne remplit pas le store', async () => {
    const reponseA = deferred<ArticleKeywords | null>()
    mockApiGet.mockReturnValueOnce(reponseA.promise)
    const store = useArticleKeywordsStore()

    const chargeA = store.fetchKeywordsMerge(1335)
    store.$reset()
    reponseA.resolve(keywordsOf(1335, 'recette 2026-09-30', ['prix recette']))
    await chargeA

    expect(store.keywords).toBeNull()
    expect(store.loadedArticleId).toBeNull()
  })

  it('FR-CAP-PERSIST — les données d’un autre article encore en mémoire sont remplacées, pas fusionnées', async () => {
    const store = useArticleKeywordsStore()
    store.keywords = keywordsOf(1335, 'recette 2026-09-30', ['prix recette'])
    mockApiGet.mockResolvedValueOnce(keywordsOf(1339, 'étapes bien démarrer', ['prix étapes']))

    await store.fetchKeywordsMerge(1339)

    expect(store.keywords?.articleId).toBe(1339)
    expect(store.keywords?.capitaine).toBe('étapes bien démarrer')
    expect(store.keywords?.lieutenants).toEqual(['prix étapes'])
  })

  it('FR-MOT-CHECK-RECONCILIATION — un échec de lecture ne marque pas l’article comme chargé', async () => {
    mockApiGet.mockRejectedValueOnce(new Error('réseau'))
    const store = useArticleKeywordsStore()

    await store.fetchKeywordsMerge(1339)

    expect(store.loadedArticleId).toBeNull()
    expect(store.error).toBe('réseau')
  })

  it('FR-MOT-CHECK-RECONCILIATION — la remise à zéro oublie l’article chargé', async () => {
    mockApiGet.mockResolvedValueOnce(keywordsOf(1339, 'étapes bien démarrer'))
    const store = useArticleKeywordsStore()
    await store.fetchKeywordsMerge(1339)
    expect(store.loadedArticleId).toBe(1339)

    store.$reset()
    expect(store.loadedArticleId).toBeNull()
    expect(store.keywords).toBeNull()
  })

  it('FR-CAP-PERSIST — la lecture complète (rédaction) ignore aussi une réponse arrivée trop tard', async () => {
    const reponseA = deferred<ArticleKeywords | null>()
    mockApiGet.mockReturnValueOnce(reponseA.promise).mockResolvedValueOnce(keywordsOf(1341, 'questions à se poser'))
    const store = useArticleKeywordsStore()

    const chargeA = store.fetchKeywords(1335)
    await store.fetchKeywords(1341)
    reponseA.resolve(keywordsOf(1335, 'recette 2026-09-30'))
    await chargeA

    expect(store.keywords?.articleId).toBe(1341)
    expect(store.loadedArticleId).toBe(1341)
  })
})
