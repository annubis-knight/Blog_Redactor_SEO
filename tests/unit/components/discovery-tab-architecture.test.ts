/**
 * Vague 1 — Tests architecturaux DiscoveryPanel.
 *
 * Référence FR PRD : FR-DIS-DECOUVRIR (l'utilisateur doit pouvoir explorer 6
 * sources de mots-clés en parallèle, regroupées par section, avec une sidebar
 * de groupes lexicaux séparée du contenu principal — voir prd.md).
 *
 * Ces tests verrouillent la POSITION DOM des sous-composants après l'extraction
 * Vague 1 : DiscoverySourcesList, DiscoveryAnalysisResults et
 * DiscoveryWordGroupsSidebar doivent rester chacun dans leur zone sémantique
 * (.discovery-main vs .discovery-sidebar) et ne pas se faire absorber par le
 * panel suggestion bas-de-page (DiscoveryAiPanel).
 *
 * Note pédagogique : un "container principal" (.discovery-main) = la zone DOM
 * où l'utilisateur voit ses propres mots-clés découverts. Un "panel IA" =
 * la zone DOM dédiée aux suggestions IA bas-de-page. La sidebar de groupes
 * lexicaux est encore un troisième espace, latéral, qui sert à filtrer.
 * Mélanger les trois rendrait l'UI illisible.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import DiscoveryPanel from '../../../src/components/moteur/DiscoveryPanel.vue'

// ===== Mock useDiscoveryPanel — état minimal =====
const mockHasResults = ref(true)
const mockWordGroups = ref([
  { word: 'design', normalized: 'design', count: 5 },
  { word: 'émotionnel', normalized: 'emotionnel', count: 3 },
])
const mockAnalysisResult = ref({
  keywords: [
    { keyword: 'design émotionnel', reasoning: 'r1', priority: 'high' as const },
  ],
  summary: 'Résumé IA',
})

vi.mock('../../../src/composables/keyword/useDiscoveryPanel', () => ({
  useDiscoveryPanel: () => ({
    suggestAlphabetKw: ref([{ keyword: 'design a', source: 'suggest-alphabet' as const }]),
    suggestQuestionsKw: ref([]),
    suggestIntentsKw: ref([]),
    suggestPrepositionsKw: ref([]),
    aiKeywords: ref([]),
    dataforseoKeywords: ref([]),
    suggestLoading: ref(false),
    aiLoading: ref(false),
    dataforseoLoading: ref(false),
    isAnyLoading: ref(false),
    wordGroups: mockWordGroups,
    wordGroupsLoading: ref(false),
    activeGroupFilter: ref(null),
    error: ref(null),
    selectedCount: ref(0),
    hasResults: mockHasResults,
    relevanceFilterEnabled: ref(false),
    semanticLoading: ref(false),
    irrelevantCount: ref(0),
    scoringProgress: ref({ scored: 0, total: 0, pass: 0 }),
    uniqueKeywordCount: ref(1),
    relevantCount: ref(1),
    toggleRelevanceFilter: vi.fn(),
    isRelevant: () => true,
    filteringSuspect: ref(false),
    getKeywordSources: () => [],
    isMultiSource: () => false,
    discover: vi.fn(),
    filteredList: (list: unknown[]) => list,
    toggleSelect: vi.fn(),
    isSelected: () => false,
    selectAllInSource: vi.fn(),
    deselectAllInSource: vi.fn(),
    isAllSourceSelected: () => false,
    setGroupFilter: vi.fn(),
    getRadarKeywords: () => [],
    analysisResult: mockAnalysisResult,
    analysisLoading: ref(false),
    analyzeResults: vi.fn(),
    selectAllAnalysis: vi.fn(),
    deselectAllAnalysis: vi.fn(),
    isAllAnalysisSelected: () => false,
    cacheStatus: ref(null),
    cacheLoading: ref(false),
    checkCacheForSeed: vi.fn(),
    loadFromCache: vi.fn(),
    saveToCache: vi.fn(),
    clearCacheForSeed: vi.fn(),
    reset: vi.fn(),
  }),
}))

vi.mock('../../../src/stores/ui/captain-trigger.store', () => ({
  useCaptainTriggerStore: () => ({ schedule: vi.fn(), cancel: vi.fn() }),
}))

vi.mock('../../../src/utils/logger', () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const baseProps = {
  pilierKeyword: 'design',
  articleId: 1,
  articleTitle: 'Test',
  articleKeyword: 'design émotionnel',
  articlePainPoint: 'pain',
  articleType: 'Pilier',
  cocoonName: 'Cocoon',
  mode: 'workflow' as const,
}

function mountTab() {
  return mount(DiscoveryPanel, {
    props: baseProps,
    global: {
      stubs: {
        DiscoveryAiPanel: {
          template: '<div data-testid="discovery-ai-panel" class="ai-panel-suggestion"></div>',
        },
        DiscoverySourcesList: {
          template: '<div data-testid="discovery-sources-list"></div>',
          props: ['sections', 'filteredList', 'visibleItems', 'isCollapsed', 'isSectionExpanded', 'isSelected', 'isMultiSource', 'isRelevant', 'isAllSourceSelected', 'sourceCountLabel', 'formatVolume', 'hasDiscovered', 'visibleThreshold'],
          emits: ['toggle-collapsed', 'toggle-source', 'keyword-click', 'toggle-section-expanded'],
        },
        DiscoveryAnalysisResults: {
          template: '<div data-testid="discovery-analysis-results"></div>',
          props: ['analysisResult', 'isAllAnalysisSelected', 'isSelected', 'isMultiSource', 'sourceCountLabel'],
          emits: ['toggle-select', 'toggle-select-all'],
        },
        DiscoveryWordGroupsSidebar: {
          template: '<aside data-testid="discovery-word-groups-sidebar" class="discovery-sidebar"></aside>',
          props: ['wordGroups', 'wordGroupsLoading', 'hasResults', 'activeGroupFilter'],
          emits: ['group-click'],
        },
      },
    },
  })
}

function isDescendantOf(wrapper: ReturnType<typeof mountTab>, ancestorSelector: string, descendantSelector: string): boolean {
  const ancestor = wrapper.find(ancestorSelector)
  if (!ancestor.exists()) return false
  return ancestor.find(descendantSelector).exists()
}

beforeEach(() => {
  setActivePinia(createPinia())
  mockHasResults.value = true
})

describe('DiscoveryPanel — architecture des sections (Vague 1)', () => {
  it('AC.A.1 — DiscoverySourcesList est descendant de .discovery-main', async () => {
    const wrapper = mountTab()
    await nextTick()
    expect(isDescendantOf(wrapper, '.discovery-main', '[data-testid="discovery-sources-list"]'))
      .toBe(true)
  })

  it('AC.A.1.bis — DiscoverySourcesList N\'EST PAS descendant de .discovery-sidebar', async () => {
    const wrapper = mountTab()
    await nextTick()
    expect(isDescendantOf(wrapper, '.discovery-sidebar', '[data-testid="discovery-sources-list"]'))
      .toBe(false)
  })

  it('AC.A.2 — DiscoveryWordGroupsSidebar est descendant de .discovery-layout, pas de .discovery-main', async () => {
    const wrapper = mountTab()
    await nextTick()
    expect(isDescendantOf(wrapper, '.discovery-layout', '[data-testid="discovery-word-groups-sidebar"]'))
      .toBe(true)
    expect(isDescendantOf(wrapper, '.discovery-main', '[data-testid="discovery-word-groups-sidebar"]'))
      .toBe(false)
  })

  it('AC.A.3 — DiscoveryAnalysisResults est descendant de .discovery-main, pas absorbé par DiscoveryAiPanel', async () => {
    const wrapper = mountTab()
    await nextTick()
    expect(isDescendantOf(wrapper, '.discovery-main', '[data-testid="discovery-analysis-results"]'))
      .toBe(true)
    expect(isDescendantOf(wrapper, '[data-testid="discovery-ai-panel"]', '[data-testid="discovery-analysis-results"]'))
      .toBe(false)
  })
})
