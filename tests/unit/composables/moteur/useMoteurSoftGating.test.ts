/**
 * Vague 3 — Tests isolés useMoteurSoftGating.
 *
 * Référence FR PRD : FR-MOT-FREE-NAV (gating souple Phase ②/③), FR-MOT-CHECKS
 * (5 checks Moteur), FR-DIS-* (Discovery accessible si keywords pas validés).
 *
 * Tests les invariants du composable sans monter MoteurView. Toutes les
 * dépendances sont injectées (refs, stores) pour rendre le test indépendant.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { ref } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import { useMoteurSoftGating } from '../../../../src/composables/moteur/useMoteurSoftGating'
import { useArticleProgressStore } from '../../../../src/stores/article/article-progress.store'
import { useKeywordsStore } from '../../../../src/stores/keyword/keywords.store'
import type { SelectedArticle } from '../../../../shared/types/index'

function makeArticle(id = 1, keyword = 'seo local'): SelectedArticle {
  return {
    id,
    slug: 'art-' + id,
    title: 'Article ' + id,
    keyword,
    painPoint: 'pain',
    type: 'Pilier',
    locked: false,
    source: 'proposed',
  } as never as SelectedArticle
}

describe('useMoteurSoftGating', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('AC.I.4 — finalisationUnlocked = true ssi les 3 checks Phase ② sont posés', () => {
    const articleProgressStore = useArticleProgressStore()
    const keywordsStore = useKeywordsStore()
    const selectedArticle = ref<SelectedArticle | null>(makeArticle(1))

    // Aucun check → false
    articleProgressStore.progressMap['1'] = {
      articleId: 1,
      phase: 'moteur',
      completedChecks: [],
      lastCheckAt: null,
    } as never
    const api = useMoteurSoftGating({ selectedArticle, articleProgressStore, keywordsStore })

    expect(api.finalisationUnlocked.value).toBe(false)

    // 1/3 → false
    articleProgressStore.progressMap['1'].completedChecks = ['capitaine_locked']
    expect(api.finalisationUnlocked.value).toBe(false)

    // 2/3 → false
    articleProgressStore.progressMap['1'].completedChecks = ['capitaine_locked', 'lieutenants_locked']
    expect(api.finalisationUnlocked.value).toBe(false)

    // 3/3 → true
    articleProgressStore.progressMap['1'].completedChecks = [
      'capitaine_locked',
      'lieutenants_locked',
      'lexique_validated',
    ]
    expect(api.finalisationUnlocked.value).toBe(true)
  })

  it('AC.I.5 — isCaptaineLocked / isLieutenantsLocked / isLexiqueValidated reflètent les checks', () => {
    const articleProgressStore = useArticleProgressStore()
    const keywordsStore = useKeywordsStore()
    const selectedArticle = ref<SelectedArticle | null>(makeArticle(1))

    articleProgressStore.progressMap['1'] = {
      articleId: 1,
      phase: 'moteur',
      completedChecks: ['capitaine_locked', 'lexique_validated'],
      lastCheckAt: null,
    } as never

    const api = useMoteurSoftGating({ selectedArticle, articleProgressStore, keywordsStore })

    expect(api.isCaptaineLocked.value).toBe(true)
    expect(api.isLieutenantsLocked.value).toBe(false)
    expect(api.isLexiqueValidated.value).toBe(true)
  })

  it('AC.I.5.bis — sans article sélectionné, tous les flags sont false', () => {
    const articleProgressStore = useArticleProgressStore()
    const keywordsStore = useKeywordsStore()
    const selectedArticle = ref<SelectedArticle | null>(null)

    const api = useMoteurSoftGating({ selectedArticle, articleProgressStore, keywordsStore })

    expect(api.isCaptaineLocked.value).toBe(false)
    expect(api.isLieutenantsLocked.value).toBe(false)
    expect(api.isLexiqueValidated.value).toBe(false)
    expect(api.finalisationUnlocked.value).toBe(false)
  })

  it('AC.I.6 — finalisationButtonTitle énumère les checks manquants', () => {
    const articleProgressStore = useArticleProgressStore()
    const keywordsStore = useKeywordsStore()
    const selectedArticle = ref<SelectedArticle | null>(makeArticle(1))

    articleProgressStore.progressMap['1'] = {
      articleId: 1,
      phase: 'moteur',
      completedChecks: ['capitaine_locked'],
      lastCheckAt: null,
    } as never

    const api = useMoteurSoftGating({ selectedArticle, articleProgressStore, keywordsStore })

    const title = api.finalisationButtonTitle.value
    // Le titre doit mentionner les 2 checks manquants (lieutenants + lexique)
    expect(title.toLowerCase()).toMatch(/lieutenant|lexique/i)
  })

  it('AC.I.7 — isDiscoveryAllowed = true si pas d\'article ou article sans keyword', () => {
    const articleProgressStore = useArticleProgressStore()
    const keywordsStore = useKeywordsStore()
    const selectedArticle = ref<SelectedArticle | null>(null)

    const api = useMoteurSoftGating({ selectedArticle, articleProgressStore, keywordsStore })
    expect(api.isDiscoveryAllowed.value).toBe(true)

    // Article sans keyword
    selectedArticle.value = { ...makeArticle(1), keyword: '' } as never
    expect(api.isDiscoveryAllowed.value).toBe(true)
  })

  it('AC.I.7.bis — isDiscoveryAllowed = false si keyword article validé dans keywordsStore', () => {
    const articleProgressStore = useArticleProgressStore()
    const keywordsStore = useKeywordsStore()
    const selectedArticle = ref<SelectedArticle | null>(makeArticle(1, 'seo local'))

    keywordsStore.keywords = [
      { keyword: 'seo local', status: 'validated', type: 'Pilier' } as never,
    ]

    const api = useMoteurSoftGating({ selectedArticle, articleProgressStore, keywordsStore })
    expect(api.isDiscoveryAllowed.value).toBe(false)
  })

  it('AC.I.7.ter — isDiscoveryAllowed = true si keyword article a status "suggested"', () => {
    const articleProgressStore = useArticleProgressStore()
    const keywordsStore = useKeywordsStore()
    const selectedArticle = ref<SelectedArticle | null>(makeArticle(1, 'seo local'))

    keywordsStore.keywords = [
      { keyword: 'seo local', status: 'suggested', type: 'Pilier' } as never,
    ]

    const api = useMoteurSoftGating({ selectedArticle, articleProgressStore, keywordsStore })
    expect(api.isDiscoveryAllowed.value).toBe(true)
  })
})
