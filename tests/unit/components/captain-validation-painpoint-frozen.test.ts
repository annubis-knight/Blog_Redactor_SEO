/**
 * Sprint 10.5 — Tests de régression : painPoint figé après mount.
 *
 * Référence FR PRD :
 *   - FR-PAIN-IMMUTABLE-AFTER-CEREVEAU
 *   - FR-CAP-NO-PAINPOINT-WATCHER
 *   - FR-CAP-RELEVANCE-STORE-REMOVED
 *
 * Décision produit (2026-05-06) :
 *   Le painPoint d'un article est figé après la sortie du Cerveau. Aucun composant
 *   du Moteur ou de la Rédaction ne déclenche de mutation du painPoint. Le watcher
 *   Sprint 8 (commit 5b849df) qui détectait les changements de painPoint pour
 *   recalculer la Pertinence à la volée est devenu legacy et a été supprimé.
 *
 * Ce fichier verrouille l'absence de cette logique :
 *   - AC.10.5.1 : modifier props.selectedArticle.painPoint après mount ne déclenche
 *                 AUCUN appel à articleKeywordsStore.mergeCaptainExploredKeywords
 *   - AC.10.5.2 : aucun fetch /captain-explorations n'est lancé suite à un changement
 *                 de painPoint (le calcul live a déjà eu lieu au mount, point.)
 *   - AC.10.5.3 : pas d'import du store captain-relevance dans le composant
 *                 (vérifié indirectement : aucune méthode du store mockée n'est appelée)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref, nextTick } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import CaptainPanel from '../../../src/components/moteur/CaptainPanel.vue'
import type { SelectedArticle } from '../../../shared/types/index'

// --- Mocks composables ---
vi.mock('../../../src/composables/keyword/useCapitaineScan', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('../../../src/composables/keyword/useCapitaineScan')
  return {
    ...actual,
    useCapitaineScan: () => ({
      currentResult: ref(null),
      isLoading: ref(false),
      error: ref(null),
      history: ref([]),
      historyIndex: ref(-1),
      rootResult: ref(null),
      isLoadingRoot: ref(false),
      radarCard: ref(null),
      isLoadingRadar: ref(false),
      scanKeyword: vi.fn(),
      navigateHistory: vi.fn(),
      reset: vi.fn(),
    }),
  }
})

vi.mock('../../../src/composables/keyword/useExploredKeywords', () => ({
  useExploredKeywords: () => ({
    entries: ref([]),
    currentIndex: ref(0),
    isActive: ref(false),
    count: ref(0),
    currentEntry: ref(null),
    loadCards: vi.fn(),
    addEntry: vi.fn(),
    addRootVariantToEntry: vi.fn(),
    next: vi.fn(),
    prev: vi.fn(),
    goTo: vi.fn(),
    reset: vi.fn(),
    effectiveVerdict: vi.fn(),
    setActiveWordIndices: vi.fn(),
    refreshFromValidation: vi.fn(),
    setRecomputedCard: vi.fn(),
  }),
}))

// --- Mocks stores et services ---
// On espionne :
//   - mergeCaptainExploredKeywords : ne doit pas être appelée par un watcher live painPoint
//   - apiGet : pas de fetch /captain-explorations en réaction à un changement painPoint
const {
  mockMergeCaptainHistory,
  mockSaveKeywords,
  mockApiGet,
  mockApiPost,
  mockApiPut,
  mockApiStream,
} = vi.hoisted(() => ({
  mockMergeCaptainHistory: vi.fn(),
  mockSaveKeywords: vi.fn(),
  mockApiGet: vi.fn().mockResolvedValue([]),
  mockApiPost: vi.fn().mockResolvedValue({}),
  mockApiPut: vi.fn().mockResolvedValue({}),
  mockApiStream: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../../src/stores/article/article-keywords.store', () => ({
  useArticleKeywordsStore: () => ({
    keywords: null,
    lockedLieutenants: [],
    saveKeywords: mockSaveKeywords,
    mergeCaptainExploredKeywords: mockMergeCaptainHistory,
    initEmpty: vi.fn(),
  }),
}))

// --- Mock api.service pour intercepter d'éventuels appels HTTP ---
vi.mock('../../../src/services/api.service', () => ({
  apiGet: mockApiGet,
  apiPost: mockApiPost,
  apiPut: mockApiPut,
  apiDelete: vi.fn(),
  apiPatch: vi.fn(),
  apiStream: mockApiStream,
}))

vi.mock('../../../src/composables/ui/useNotify', () => ({
  useNotify: () => ({
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  }),
}))

vi.mock('../../../src/utils/logger', () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

// --- Stubs sous-composants (template minimal) ---
const stubs = {
  CaptainInput: {
    template: '<div data-testid="captain-input"></div>',
    props: ['modelValue', 'compositionWarnings', 'compositionAllPass', 'articleLevel', 'disabled'],
    emits: ['update:modelValue', 'submit'],
  },
  CaptainRadarList: {
    name: 'CaptainRadarList',
    template: '<div data-testid="captain-radar-list"></div>',
    props: ['entries', 'sortedEntries', 'selectedIndex', 'lockedIndex', 'lockedKeyword', 'articleLevel', 'articleId', 'articlePainPoint', 'sortOptions', 'sortState', 'rawIndexOf'],
    emits: ['select', 'lock', 'unlock', 'word-toggle', 'recompute-relevance', 'sort-change'],
  },
  CaptainSidePanel: {
    template: '<div data-testid="captain-side-panel"></div>',
    props: ['entry', 'parsedMarkdown', 'aiIsStreaming', 'aiError', 'verdictSummary', 'rootVariants', 'isLoadingRoots', 'failedRoots', 'activeVariantKeyword', 'showGotoLocked'],
    emits: ['switch-variant', 'ai-regenerate', 'goto-locked', 'close'],
  },
  AiPanel: { template: '<div></div>' },
  AiAdviceMarkdown: { template: '<div></div>' },
  CaptainLockPanel: { template: '<div></div>' },
  CaptainRootsSidebar: { template: '<div></div>' },
  CollapsableSection: { template: '<div><slot /></div>' },
  RadarKeywordCard: { template: '<div></div>' },
  SortToggleBar: { template: '<div></div>' },
  UnlockLieutenantsModal: { template: '<div></div>' },
}

const baseArticle: SelectedArticle = {
  id: 1,
  slug: 'art-test',
  title: 'Article de test',
  keyword: 'seo',
  painPoint: 'Premier painPoint suffisamment long',
  type: 'pilier',
  locked: false,
  source: 'proposed',
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
})

describe('CaptainPanel — painPoint figé après mount (Sprint 10.5)', () => {
  it('AC.10.5.1 — modifier painPoint après mount ne déclenche aucun mergeCaptainExploredKeywords', async () => {
    const wrapper = mount(CaptainPanel, {
      props: { selectedArticle: { ...baseArticle }, mode: 'workflow' },
      global: { stubs },
    })
    await nextTick()
    await flushPromises()

    mockMergeCaptainHistory.mockClear()

    // Simulation : le painPoint change après le mount initial. Avant Sprint 10.5,
    // le watcher détectait ce changement et déclenchait recompute() puis
    // mergeCaptainExploredKeywords(). Aujourd'hui, plus aucune réaction live au painPoint.
    await wrapper.setProps({
      selectedArticle: { ...baseArticle, painPoint: 'Nouveau painPoint complètement différent' },
    })
    await nextTick()
    await flushPromises()

    expect(mockMergeCaptainHistory).not.toHaveBeenCalled()
  })

  it('AC.10.5.2 — modifier painPoint après mount ne déclenche aucun fetch /captain-explorations', async () => {
    const wrapper = mount(CaptainPanel, {
      props: { selectedArticle: { ...baseArticle }, mode: 'workflow' },
      global: { stubs },
    })
    await nextTick()
    await flushPromises()

    mockApiGet.mockClear()

    await wrapper.setProps({
      selectedArticle: { ...baseArticle, painPoint: 'Autre painPoint' },
    })
    await nextTick()
    await flushPromises()

    const captainExplorationsCalls = mockApiGet.mock.calls.filter(
      (call) => typeof call[0] === 'string' && call[0].includes('/captain-explorations'),
    )
    expect(captainExplorationsCalls).toHaveLength(0)
  })

  it('AC.10.5.3 — passer painPoint de défini à null ne déclenche aucun recompute', async () => {
    const wrapper = mount(CaptainPanel, {
      props: { selectedArticle: { ...baseArticle }, mode: 'workflow' },
      global: { stubs },
    })
    await nextTick()
    await flushPromises()

    mockMergeCaptainHistory.mockClear()
    mockApiGet.mockClear()

    await wrapper.setProps({
      selectedArticle: { ...baseArticle, painPoint: null as never },
    })
    await nextTick()
    await flushPromises()

    expect(mockMergeCaptainHistory).not.toHaveBeenCalled()
    const captainExplorationsCalls = mockApiGet.mock.calls.filter(
      (call) => typeof call[0] === 'string' && call[0].includes('/captain-explorations'),
    )
    expect(captainExplorationsCalls).toHaveLength(0)
  })

  it('AC.10.5.4 — passer painPoint de null à défini ne déclenche aucun recompute', async () => {
    const articleSansPain: SelectedArticle = { ...baseArticle, painPoint: null as never }
    const wrapper = mount(CaptainPanel, {
      props: { selectedArticle: articleSansPain, mode: 'workflow' },
      global: { stubs },
    })
    await nextTick()
    await flushPromises()

    mockMergeCaptainHistory.mockClear()
    mockApiGet.mockClear()

    await wrapper.setProps({
      selectedArticle: { ...baseArticle, painPoint: 'PainPoint frais ajouté' },
    })
    await nextTick()
    await flushPromises()

    expect(mockMergeCaptainHistory).not.toHaveBeenCalled()
    const captainExplorationsCalls = mockApiGet.mock.calls.filter(
      (call) => typeof call[0] === 'string' && call[0].includes('/captain-explorations'),
    )
    expect(captainExplorationsCalls).toHaveLength(0)
  })

  it('AC.10.5.5 — aucun import du store captain-relevance ne subsiste dans CaptainPanel.vue', async () => {
    // Lecture brute du fichier source pour verrouiller l'absence d'import.
    // Ce test est volontairement basique mais constitue un canari : si quelqu'un
    // ré-introduit le store, ce test devient rouge immédiatement.
    const fs = await import('node:fs')
    const path = await import('node:path')
    const filePath = path.resolve(__dirname, '../../../src/components/moteur/CaptainPanel.vue')
    const source = fs.readFileSync(filePath, 'utf-8')
    expect(source).not.toMatch(/captain-relevance/)
    expect(source).not.toMatch(/useCaptainRelevanceStore/)
  })

  it('AC.10.5.6 — le store captain-relevance.store.ts n\'existe plus', async () => {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const filePath = path.resolve(__dirname, '../../../src/stores/article/captain-relevance.store.ts')
    expect(fs.existsSync(filePath)).toBe(false)
  })
})
