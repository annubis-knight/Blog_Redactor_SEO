/**
 * Vague 3 — Tests isolés useMoteurCrossTabState.
 *
 * Référence FR PRD : FR-MOT-NO-AUTO-ACTION (aucune action auto), FR-MOT-CHECKS
 * (émission via constantes).
 *
 * Tests sans monter MoteurView. Stores Pinia + callbacks injectés.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import { useMoteurCrossTabState } from '../../../../src/composables/moteur/useMoteurCrossTabState'
import { useArticleKeywordsStore } from '../../../../src/stores/article/article-keywords.store'
import type { SelectedArticle } from '../../../../shared/types/index'
import type { RadarCard } from '../../../../shared/types/intent.types'
import { MOTEUR_DISCOVERY_DONE, MOTEUR_RADAR_DONE } from '../../../../shared/constants/workflow-checks.constants.js'

function makeArticle(id = 1): SelectedArticle {
  return {
    id, slug: 'art', title: 'Article', keyword: 'seo', painPoint: 'p',
    type: 'Pilier', locked: false, source: 'proposed',
  } as never as SelectedArticle
}

function makeCard(keyword: string, withKpis = true): RadarCard {
  return {
    keyword,
    reasoning: '',
    cachedPaa: false,
    combinedScore: 50,
    scoreBreakdown: { paaMatchScore: 0, resonanceBonus: 0, opportunityScore: 0, intentValueScore: 0, cpcScore: 0, painAlignmentScore: 0, total: 0 },
    kpis: withKpis ? { searchVolume: 0, difficulty: 0, cpc: 0, competition: 0, paaTotal: 0, paaMatchCount: 0, paaWeightedScore: 0, intentTypes: [], intentProbability: null, autocompleteMatchCount: 0, avgSemanticScore: null } : null,
    paaItems: [],
  } as never as RadarCard
}

describe('useMoteurCrossTabState', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('AC.I.10 — handleCardsSelected dédup les keywords (card avec kpis prime)', () => {
    const setActiveTab = vi.fn()
    const emitCheckCompleted = vi.fn()
    const api = useMoteurCrossTabState({
      selectedArticle: ref(makeArticle()),
      articleKeywordsStore: useArticleKeywordsStore(),
      setActiveTab,
      emitCheckCompleted,
    })

    api.handleCardsSelected([
      makeCard('seo local', false),  // longue-traîne (kpis null)
      makeCard('seo local', true),   // racine (kpis non-null)
      makeCard('refonte', true),
    ])

    expect(api.radarCardsForCaptain.value).toHaveLength(2)
    expect(api.radarCardsForCaptain.value.find(c => c.keyword === 'seo local')!.kpis).not.toBeNull()
    expect(setActiveTab).toHaveBeenCalledWith('capitaine')
  })

  it('AC.I.11 — handleRadarScanned met à jour radarScanResult ET émet check radar_done', () => {
    const setActiveTab = vi.fn()
    const emitCheckCompleted = vi.fn()
    const api = useMoteurCrossTabState({
      selectedArticle: ref(makeArticle()),
      articleKeywordsStore: useArticleKeywordsStore(),
      setActiveTab,
      emitCheckCompleted,
    })

    api.handleRadarScanned({ globalScore: 72, heatLevel: 'chaude' })

    expect(api.radarScanResult.value).toEqual({ globalScore: 72, heatLevel: 'chaude' })
    expect(emitCheckCompleted).toHaveBeenCalledWith(MOTEUR_RADAR_DONE)
  })

  it('AC.I.12 — handleSendToRadar publie keywords + switch tab + émet check (DB-first)', () => {
    const setActiveTab = vi.fn()
    const emitCheckCompleted = vi.fn()

    const api = useMoteurCrossTabState({
      selectedArticle: ref(makeArticle()),
      articleKeywordsStore: useArticleKeywordsStore(),
      setActiveTab,
      emitCheckCompleted,
    })

    api.handleSendToRadar([
      { keyword: 'seo local', reasoning: 'r1' },
      { keyword: 'refonte', reasoning: 'r2' },
    ])

    expect(api.discoveryRadarKeywords.value).toHaveLength(2)
    expect(setActiveTab).toHaveBeenCalledWith('radar')
    expect(emitCheckCompleted).toHaveBeenCalledWith(MOTEUR_DISCOVERY_DONE)
    // L'écriture en DB se fait via useRadarExplorationStore.addKeywordsBatch
    // (testé séparément dans tests/unit/stores/radar-exploration.store.test.ts).
  })

  it('AC.I.13 — handleSendToLieutenants propage rootKeywords sans perte + switch tab', () => {
    const setActiveTab = vi.fn()
    const api = useMoteurCrossTabState({
      selectedArticle: ref(makeArticle()),
      articleKeywordsStore: useArticleKeywordsStore(),
      setActiveTab,
      emitCheckCompleted: vi.fn(),
    })

    api.handleSendToLieutenants({ keyword: 'cap', rootKeywords: ['root1', 'root2', 'root3'] })

    expect(api.captainRootKeywords.value).toEqual(['root1', 'root2', 'root3'])
    expect(setActiveTab).toHaveBeenCalledWith('lieutenants')
  })

  it('AC.I.14 — effectiveRootKeywords priorise captainRootKeywords sur store', () => {
    const articleKeywordsStore = useArticleKeywordsStore()
    articleKeywordsStore.keywords = { articleId: 1, capitaine: 'cap', lieutenants: [], lexique: [], rootKeywords: ['from-store'] } as never

    const api = useMoteurCrossTabState({
      selectedArticle: ref(makeArticle()),
      articleKeywordsStore,
      setActiveTab: vi.fn(),
      emitCheckCompleted: vi.fn(),
    })

    // Initial : captainRootKeywords vide → fallback store
    expect(api.effectiveRootKeywords.value).toEqual(['from-store'])

    // Après handleSendToLieutenants : captain prime
    api.handleSendToLieutenants({ keyword: 'cap', rootKeywords: ['from-captain'] })
    expect(api.effectiveRootKeywords.value).toEqual(['from-captain'])
  })

  it('AC.I.15 — selectedLieutenantsForLexique priorise selection locale sur store', () => {
    const articleKeywordsStore = useArticleKeywordsStore()
    articleKeywordsStore.keywords = { articleId: 1, capitaine: 'cap', lieutenants: ['stored-lt'], lexique: [], rootKeywords: [] } as never

    const api = useMoteurCrossTabState({
      selectedArticle: ref(makeArticle()),
      articleKeywordsStore,
      setActiveTab: vi.fn(),
      emitCheckCompleted: vi.fn(),
    })

    expect(api.selectedLieutenantsForLexique.value).toEqual(['stored-lt'])

    api.handleLieutenantsUpdated(['local-lt-1', 'local-lt-2'])
    expect(api.selectedLieutenantsForLexique.value).toEqual(['local-lt-1', 'local-lt-2'])
  })

  it('AC.I.16 — resetCrossTabState remet tous les refs à leur état initial', () => {
    const api = useMoteurCrossTabState({
      selectedArticle: ref(makeArticle()),
      articleKeywordsStore: useArticleKeywordsStore(),
      setActiveTab: vi.fn(),
      emitCheckCompleted: vi.fn(),
    })

    api.handleSendToRadar([{ keyword: 'kw', reasoning: '' }])
    api.handleRadarScanned({ globalScore: 50, heatLevel: 'tiede' })
    api.handleSendToLieutenants({ keyword: 'cap', rootKeywords: ['r1'] })
    api.handleLieutenantsUpdated(['lt1'])

    api.resetCrossTabState()

    expect(api.discoveryRadarKeywords.value).toEqual([])
    expect(api.radarScanResult.value).toBe(null)
    expect(api.radarCardsForCaptain.value).toEqual([])
    expect(api.captainRootKeywords.value).toEqual([])
    expect(api.selectedLieutenantsLocal.value).toEqual([])
  })

  it('AC.I.17 — handleKeywordsCleared remet à zero discoveryRadarKeywords + radarScanResult', () => {
    const api = useMoteurCrossTabState({
      selectedArticle: ref(makeArticle()),
      articleKeywordsStore: useArticleKeywordsStore(),
      setActiveTab: vi.fn(),
      emitCheckCompleted: vi.fn(),
    })

    api.handleSendToRadar([{ keyword: 'kw', reasoning: '' }])
    api.handleRadarScanned({ globalScore: 50, heatLevel: 'tiede' })

    api.handleKeywordsCleared()

    expect(api.discoveryRadarKeywords.value).toEqual([])
    expect(api.radarScanResult.value).toBe(null)
  })
})
