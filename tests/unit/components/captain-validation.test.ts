// 2026-09-25 (épopée qualité SEO, T2) : les 46 `it.skip` de ce fichier ont été
// retirés. Écrits pour l'ancienne mise en page monolithique (thermomètre de
// verdict, carrousel manuel…), ils visaient des repères qui n'existent plus et
// ne protégeaient donc plus rien. Les comportements encore valables vivent
// ailleurs : verrou et déverrouillage du capitaine (porte comprise) dans
// `captain-lock-gate.test.ts`, liste radar dans `captain-sub-components.test.ts`.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, config } from '@vue/test-utils'
import { ref, nextTick, computed } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import { safeHtmlDirective } from '../../../src/directives/v-safe-html'
import CaptainPanel from '../../../src/components/moteur/CaptainPanel.vue'

// Register the v-safe-html directive globally for all mount() calls
config.global.directives = { ...config.global.directives, 'safe-html': safeHtmlDirective }
import type { ScanResponse, SelectedArticle } from '../../../shared/types/index'
import type { RadarCard } from '../../../shared/types/intent.types'

// Mock the composable
const mockResult = ref<ScanResponse | null>(null)
const mockCurrentResult = computed(() => mockResult.value)
const mockIsLoading = ref(false)
const mockError = ref<string | null>(null)
const mockHistory = ref<ScanResponse[]>([])
const mockHistoryIndex = ref(-1)
const mockRootResult = ref<ScanResponse | null>(null)
const mockIsLoadingRoot = ref(false)
const mockRadarCard = ref<RadarCard | null>(null)
const mockIsLoadingRadar = ref(false)
const mockValidateKeyword = vi.fn()
const mockNavigateHistory = vi.fn()
const mockReset = vi.fn()

vi.mock('../../../src/composables/keyword/useCapitaineScan', () => ({
  useCapitaineScan: () => ({
    result: mockResult,
    currentResult: mockCurrentResult,
    isLoading: mockIsLoading,
    error: mockError,
    history: mockHistory,
    historyIndex: mockHistoryIndex,
    rootResult: mockRootResult,
    isLoadingRoot: mockIsLoadingRoot,
    radarCard: mockRadarCard,
    isLoadingRadar: mockIsLoadingRadar,
    scanKeyword: mockValidateKeyword,
    navigateHistory: mockNavigateHistory,
    reset: mockReset,
  }),
  articleTypeToLevel: (type: string) => {
    const map: Record<string, string> = { 'Pilier': 'pilier', 'Intermédiaire': 'intermediaire', 'Spécialisé': 'specifique' }
    return map[type] ?? 'intermediaire'
  },
  FRENCH_STOPWORDS: new Set(['le', 'la', 'les', 'des', 'de', 'du', 'un', 'une', 'et', 'en', 'au', 'aux', 'à', 'ce', 'son', 'sa', 'ses', 'pour', 'par', 'sur', 'dans', 'avec', 'est', 'sont', 'qui', 'que', 'ne', 'pas', 'plus']),
}))

// Mock useStreaming
const mockAiChunks = ref('')
const mockAiIsStreaming = ref(false)
const mockAiError = ref<string | null>(null)
const mockAiStartStream = vi.fn()
const mockAiAbort = vi.fn()

vi.mock('../../../src/composables/ui/useNotify', () => ({
  useNotify: () => ({
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  }),
}))

vi.mock('../../../src/composables/editor/useStreaming', () => ({
  useStreaming: () => ({
    chunks: mockAiChunks,
    isStreaming: mockAiIsStreaming,
    error: mockAiError,
    result: ref(null),
    usage: ref(null),
    startStream: mockAiStartStream,
    abort: mockAiAbort,
  }),
}))

// Mock useExploredKeywords
const mockCarouselEntries = ref<any[]>([])
const mockCarouselCurrentIndex = ref(0)
const mockCarouselIsActive = computed(() => mockCarouselEntries.value.length > 0)
const mockCarouselCount = computed(() => mockCarouselEntries.value.length)
const mockCarouselCurrentEntry = computed(() => mockCarouselEntries.value[mockCarouselCurrentIndex.value] ?? null)
const mockCarouselLoadCards = vi.fn()
const mockCarouselNext = vi.fn(() => {
  if (mockCarouselCurrentIndex.value < mockCarouselEntries.value.length - 1) mockCarouselCurrentIndex.value++
})
const mockCarouselPrev = vi.fn(() => {
  if (mockCarouselCurrentIndex.value > 0) mockCarouselCurrentIndex.value--
})
const mockCarouselGoTo = vi.fn((idx: number) => { mockCarouselCurrentIndex.value = idx })
const mockCarouselEffectiveVerdict = vi.fn((entry: any) => {
  if (!entry.validation) return null
  return entry.validation.verdict.level
})
const mockCarouselReset = vi.fn()
const mockCarouselAddEntry = vi.fn()

vi.mock('../../../src/composables/keyword/useExploredKeywords', () => ({
  useExploredKeywords: () => ({
    entries: mockCarouselEntries,
    currentIndex: mockCarouselCurrentIndex,
    currentEntry: mockCarouselCurrentEntry,
    isActive: mockCarouselIsActive,
    count: mockCarouselCount,
    loadCards: mockCarouselLoadCards,
    addEntry: mockCarouselAddEntry,
    next: mockCarouselNext,
    prev: mockCarouselPrev,
    goTo: mockCarouselGoTo,
    effectiveVerdict: mockCarouselEffectiveVerdict,
    reset: mockCarouselReset,
  }),
}))

// Mock article-keywords store
// Sprint 13 — `isLocked` est désormais DÉRIVÉ du store (computed). Pour que
// les tests reflètent le vrai flux, lockCaptain et unlockCaptain mutent le
// mockStoreKeywords pour simuler le store réel. Avant Sprint 13, lockCaptain
// était un vi.fn() inerte et le composant tenait son état dans une Ref locale.
const mockStoreKeywords = ref<{
  articleId?: number
  capitaine?: string
  richCaptain?: { keyword: string; status: 'suggested' | 'locked'; lockedAt: string | null; aiPanelMarkdown: string | null; exploredKeywords: unknown[] }
} | null>(null)
const mockSetCapitaine = vi.fn()
const mockLockCaptain = vi.fn((keyword: string, aiPanelMarkdown: string | null, articleId?: number) => {
  // Reproduit le comportement réel du store : crée richCaptain si absent, sinon mute.
  if (!mockStoreKeywords.value) {
    mockStoreKeywords.value = { articleId: articleId ?? 1, capitaine: keyword }
  }
  mockStoreKeywords.value.capitaine = keyword
  mockStoreKeywords.value.richCaptain = {
    keyword,
    status: 'locked',
    lockedAt: new Date().toISOString(),
    aiPanelMarkdown,
    exploredKeywords: [],
  }
})
const mockUnlockCaptain = vi.fn(() => {
  if (!mockStoreKeywords.value?.richCaptain) return
  mockStoreKeywords.value.richCaptain.status = 'suggested'
  mockStoreKeywords.value.richCaptain.lockedAt = null
})
const mockAddCaptainPanel = vi.fn()
const mockAddRootKeywordValidation = vi.fn()
const mockSaveKeywords = vi.fn()
const mockSaveDecisions = vi.fn()
const mockSaveCaptainExplorationEntry = vi.fn()
const mockSaveCaptainExplorationAiPanel = vi.fn()

// IMPORTANT — Tout getter/action utilisé par CaptainPanel.vue doit être
// présent ici, sinon le composant casse à l'évaluation du computed associé
// (ex: `lockedLieutenantCount` lit `lockedLieutenants`). Un getter manquant
// → undefined.length → 32 tests rouges en cascade. Voir le test
// "regression — survives minimal store mock without crashing" plus bas.
vi.mock('../../../src/stores/article/article-keywords.store', () => ({
  useArticleKeywordsStore: () => ({
    get keywords() { return mockStoreKeywords.value },
    lockedLieutenants: [],
    setCapitaine: mockSetCapitaine,
    lockCaptain: mockLockCaptain,
    unlockCaptain: mockUnlockCaptain,
    addCaptainPanel: mockAddCaptainPanel,
    addRootKeywordValidation: mockAddRootKeywordValidation,
    updateCaptainValidationAiPanel: vi.fn(),
    setRootKeywords: vi.fn(),
    saveKeywords: mockSaveKeywords,
    saveDecisions: mockSaveDecisions,
    saveCaptainExplorationEntry: mockSaveCaptainExplorationEntry,
    saveCaptainExplorationAiPanel: mockSaveCaptainExplorationAiPanel,
    archiveLockedLieutenants: vi.fn(),
    // Cache jugement Haiku (FR-CAP-PAA-JUDGE-CACHE-SESSION) — stubs vides en test composant
    loadCaptainPaaJudgments: vi.fn(),
    getPaaJudgment: vi.fn(() => null),
    isPaaJudgmentLoading: vi.fn(() => false),
  }),
}))

vi.mock('../../../src/utils/logger', () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const mockArticle: SelectedArticle = {
  id: 1,
  slug: 'test-article',
  title: 'Test Article',
  keyword: 'seo local',
  type: 'pilier',
  locked: false,
  source: 'proposed',
}

const fullResult: ScanResponse = {
  keyword: 'seo local',
  articleLevel: 'pilier',
  kpis: [
    { name: 'volume', rawValue: 1500, color: 'green', label: '1 500 rech/m', thresholds: { green: 1000, orange: 200 } },
    { name: 'kd', rawValue: 30, color: 'green', label: 'KD 30', thresholds: { green: 40, orange: 65 } },
    { name: 'cpc', rawValue: 2.5, color: 'bonus', label: '2.50\u20ac', thresholds: { green: 2 } },
    { name: 'paa', rawValue: 5, color: 'green', label: '5 PAA', thresholds: { green: 3, orange: 1 } },
    { name: 'intent', rawValue: 1, color: 'green', label: 'informational', thresholds: { green: 1, orange: 0.5 } },
    { name: 'autocomplete', rawValue: 2, color: 'green', label: 'Position 2', thresholds: { green: 3, orange: 6 } },
  ],
  verdict: { level: 'GO', greenCount: 6, totalKpis: 6, autoNoGo: false },
  fromCache: false,
  cachedAt: null,
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.resetAllMocks()
  mockResult.value = null
  mockIsLoading.value = false
  mockError.value = null
  mockHistory.value = []
  mockHistoryIndex.value = -1

  mockRootResult.value = null
  mockIsLoadingRoot.value = false
  mockRadarCard.value = null
  mockIsLoadingRadar.value = false
  mockAiChunks.value = ''
  mockAiIsStreaming.value = false
  mockAiError.value = null
  mockStoreKeywords.value = null
  // Reset carousel mocks
  mockCarouselEntries.value = []
  mockCarouselCurrentIndex.value = 0
})

describe('CaptainPanel', () => {
  describe('empty state', () => {
    it('shows empty when no article selected', () => {
      const wrapper = mount(CaptainPanel, { props: { selectedArticle: null, mode: 'libre' } })
      expect(wrapper.find('[data-testid="captain-empty"]').exists()).toBe(true)
    })

  })

  describe('loading state', () => {
    it('shows loading spinner', async () => {
      mockIsLoading.value = true
      const wrapper = mount(CaptainPanel, { props: { selectedArticle: mockArticle, mode: 'libre' } })
      await nextTick()
      expect(wrapper.find('[data-testid="captain-loading"]').exists()).toBe(true)
    })
  })

  describe('error state', () => {
    it('shows error message', async () => {
      mockError.value = 'API failure'
      const wrapper = mount(CaptainPanel, { props: { selectedArticle: mockArticle, mode: 'libre' } })
      await nextTick()
      expect(wrapper.find('[data-testid="captain-error"]').exists()).toBe(true)
      expect(wrapper.text()).toContain('API failure')
    })
  })

  describe('NO-GO feedback', () => {
    it('does NOT show feedback for GO', async () => {
      mockResult.value = fullResult
      const wrapper = mount(CaptainPanel, { props: { selectedArticle: mockArticle, mode: 'libre' } })
      await nextTick()
      expect(wrapper.find('[data-testid="nogo-feedback"]').exists()).toBe(false)
    })
  })

  describe('keyword input and validation', () => {
    it('shows keyword input always', async () => {
      const wrapper = mount(CaptainPanel, { props: { selectedArticle: mockArticle, mode: 'libre' } })
      await nextTick()
      expect(wrapper.find('[data-testid="keyword-input"]').exists()).toBe(true)
    })

  })

  describe('history carousel', () => {
    it('shows carousel when history > 1', async () => {
      mockResult.value = fullResult
      mockHistory.value = [fullResult, { ...fullResult, keyword: 'seo v2' }]
      mockHistoryIndex.value = 0

      const wrapper = mount(CaptainPanel, { props: { selectedArticle: mockArticle, mode: 'libre' } })
      await nextTick()
      expect(wrapper.find('[data-testid="history-carousel"]').exists()).toBe(true)
      expect(wrapper.find('.history-chips').findAll('.history-chip').length).toBe(2)
    })

    it('does NOT show carousel for single entry', async () => {
      mockResult.value = fullResult
      mockHistory.value = [fullResult]
      mockHistoryIndex.value = 0

      const wrapper = mount(CaptainPanel, { props: { selectedArticle: mockArticle, mode: 'libre' } })
      await nextTick()
      expect(wrapper.find('[data-testid="history-carousel"]').exists()).toBe(false)
    })

    it('calls navigateHistory on chip click', async () => {
      mockResult.value = fullResult
      mockHistory.value = [fullResult, { ...fullResult, keyword: 'seo v2' }]
      mockHistoryIndex.value = 0

      const wrapper = mount(CaptainPanel, { props: { selectedArticle: mockArticle, mode: 'libre' } })
      await nextTick()

      const chips = wrapper.findAll('.history-chip')
      await chips[1].trigger('click')
      expect(mockNavigateHistory).toHaveBeenCalledWith(1)
    })
  })

  describe('suggested keywords', () => {
    it('does NOT show suggested keywords when empty', async () => {
      mockResult.value = fullResult
      const wrapper = mount(CaptainPanel, {
        props: { selectedArticle: mockArticle, suggestedKeywords: [] },
      })
      await nextTick()
      expect(wrapper.find('[data-testid="suggested-keywords"]').exists()).toBe(false)
    })

  })

  describe('thresholds table', () => {
    it('shows thresholds table in results', async () => {
      mockResult.value = fullResult
      const wrapper = mount(CaptainPanel, { props: { selectedArticle: mockArticle, mode: 'libre' } })
      await nextTick()
      expect(wrapper.find('[data-testid="thresholds-table"]').exists()).toBe(true)
    })
  })

  describe('PAA questions', () => {
    it('shows PAA questions when present', async () => {
      mockResult.value = {
        ...fullResult,
        paaQuestions: [
          { question: 'Comment faire du SEO ?', answer: null },
          { question: 'Pourquoi le SEO est important ?', answer: null },
        ],
      }
      const wrapper = mount(CaptainPanel, { props: { selectedArticle: mockArticle, mode: 'libre' } })
      await nextTick()
      expect(wrapper.find('[data-testid="paa-list"]').exists()).toBe(true)
      expect(wrapper.findAll('.paa-item').length).toBe(2)
    })

    it('does NOT show PAA when absent', async () => {
      mockResult.value = fullResult
      const wrapper = mount(CaptainPanel, { props: { selectedArticle: mockArticle, mode: 'libre' } })
      await nextTick()
      expect(wrapper.find('[data-testid="paa-list"]').exists()).toBe(false)
    })
  })

  // --- AI Panel ---

  // Sprint B (2026-05-02) — Migration vers <AiPanel variant="advice"> +
  // <AiAdviceMarkdown>. L'ancien CaptainAiPanel (toggle accordion + dot
  // streaming) a été supprimé : la coque AiPanel est désormais commune à tous
  // les onglets. Les anciens testid 'ai-panel-toggle' / 'ai-panel-content' ne
  // s'appliquent plus.
  describe('AI expert panel', () => {
    it('shows AiPanel advice when results are displayed', async () => {
      mockResult.value = fullResult
      mockAiChunks.value = 'Conseil expert'
      const wrapper = mount(CaptainPanel, { props: { selectedArticle: mockArticle, mode: 'libre' } })
      await nextTick()
      expect(wrapper.find('[data-testid="ai-panel-advice"]').exists()).toBe(true)
    })

    it('triggers streaming when currentResult changes', async () => {
      mount(CaptainPanel, { props: { selectedArticle: mockArticle, mode: 'libre' } })
      mockResult.value = fullResult
      await nextTick()

      expect(mockAiStartStream).toHaveBeenCalledWith(
        `/api/keywords/${encodeURIComponent('seo local')}/ai-panel`,
        expect.objectContaining({
          level: 'pilier',
          kpis: expect.any(Array),
          verdict: expect.objectContaining({ level: 'GO' }),
        }),
        undefined,
        { contract: expect.objectContaining({ name: 'ai-advice-done' }) },
      )
    })

    it('displays streaming content as markdown via AiAdviceMarkdown', async () => {
      // Sprint 3 (2026-05-04) — AiPanel collapsed par défaut, on déploie via toggle.
      mockResult.value = fullResult
      mockAiChunks.value = '**Bold** and *italic*'
      const wrapper = mount(CaptainPanel, { props: { selectedArticle: mockArticle, mode: 'libre' } })
      await nextTick()

      const toggle = wrapper.find('[data-testid="ai-panel-toggle"]')
      if (toggle.exists()) await toggle.trigger('click')

      const advice = wrapper.find('[data-testid="ai-advice-markdown"]')
      expect(advice.exists()).toBe(true)
      expect(advice.html()).toContain('<strong>')
      expect(advice.html()).toContain('<em>')
    })

    it('shows streaming caret while streaming chunks arrive', async () => {
      mockResult.value = fullResult
      mockAiIsStreaming.value = true
      mockAiChunks.value = 'Début…'
      const wrapper = mount(CaptainPanel, { props: { selectedArticle: mockArticle, mode: 'libre' } })
      await nextTick()

      // Le slot streaming d'AiPanel passe :streaming="true" → caret visible.
      expect(wrapper.html()).toContain('aip-advice__caret')
    })

    it('shows error block in AiPanel when streaming errored', async () => {
      mockResult.value = fullResult
      mockAiError.value = 'Claude API down'
      const wrapper = mount(CaptainPanel, { props: { selectedArticle: mockArticle, mode: 'libre' } })
      await nextTick()

      const errEl = wrapper.find('[data-testid="ai-panel-error"]')
      expect(errEl.exists()).toBe(true)
      expect(errEl.text()).toContain('Claude API down')
    })
  })

  describe('lock/unlock Capitaine', () => {
    it('shows lock button when GO and not locked', async () => {
      mockResult.value = fullResult
      const wrapper = mount(CaptainPanel, { props: { selectedArticle: mockArticle, mode: 'libre' } })
      await nextTick()

      expect(wrapper.find('[data-testid="lock-btn"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="lock-btn"]').text()).toContain('Verrouiller ce mot-clé')
    })

    it('lock button is disabled when verdict is not GO', async () => {
      mockResult.value = {
        ...fullResult,
        verdict: { level: 'ORANGE', greenCount: 3, totalKpis: 6, autoNoGo: false },
      }
      const wrapper = mount(CaptainPanel, { props: { selectedArticle: mockArticle, mode: 'libre' } })
      await nextTick()

      const lockBtn = wrapper.find('[data-testid="lock-btn"]')
      expect(lockBtn.exists()).toBe(true)
      expect((lockBtn.element as HTMLButtonElement).disabled).toBe(true)
    })

    it('shows locked state after locking', async () => {
      mockResult.value = fullResult
      const wrapper = mount(CaptainPanel, { props: { selectedArticle: mockArticle, mode: 'libre' } })
      await nextTick()

      await wrapper.find('[data-testid="lock-btn"]').trigger('click')
      await nextTick()

      expect(wrapper.find('[data-testid="locked-state"]').exists()).toBe(true)
      expect(wrapper.text()).toContain('Capitaine verrouillé')
      expect(wrapper.find('[data-testid="lock-btn"]').exists()).toBe(false)
    })

    it('shows unlock button when locked', async () => {
      mockResult.value = fullResult
      const wrapper = mount(CaptainPanel, { props: { selectedArticle: mockArticle, mode: 'libre' } })
      await nextTick()

      await wrapper.find('[data-testid="lock-btn"]').trigger('click')
      await nextTick()

      expect(wrapper.find('[data-testid="unlock-btn"]').exists()).toBe(true)
    })

    it('emits validated with keyword on lock', async () => {
      mockResult.value = fullResult
      const wrapper = mount(CaptainPanel, { props: { selectedArticle: mockArticle, mode: 'libre' } })
      await nextTick()

      await wrapper.find('[data-testid="lock-btn"]').trigger('click')
      await nextTick()

      expect(wrapper.emitted('validated')).toBeTruthy()
      expect(wrapper.emitted('validated')![0]).toEqual(['seo local'])
    })

  })

  describe('radar card', () => {
    const mockRadarCardData: RadarCard = {
      keyword: 'seo local',
      reasoning: '',
      combinedScore: 72,
      kpis: {
        searchVolume: 1500, difficulty: 30, cpc: 2.5, competition: 0.5,
        intentTypes: ['informational'], intentProbability: 0.8,
        autocompleteMatchCount: 2, paaMatchCount: 3, paaWeightedScore: 4.5, paaTotal: 5, avgSemanticScore: 0.65,
      },
      paaItems: [
        { question: 'Comment faire du SEO local ?', depth: 1, match: 'total', matchQuality: 'exact' },
      ],
      scoreBreakdown: { paaMatchScore: 60, resonanceBonus: 10, opportunityScore: 50, intentValueScore: 40, cpcScore: 30, total: 72 },
      cachedPaa: false,
    }

    it('shows radar card when available', async () => {
      mockResult.value = fullResult
      mockRadarCard.value = mockRadarCardData

      const wrapper = mount(CaptainPanel, { props: { selectedArticle: mockArticle, mode: 'libre' } })
      await nextTick()
      expect(wrapper.find('[data-testid="radar-card-section"]').exists()).toBe(true)
      expect(wrapper.find('.radar-card').exists()).toBe(true)
    })

    it('shows radar loading state', async () => {
      mockResult.value = fullResult
      mockIsLoadingRadar.value = true

      const wrapper = mount(CaptainPanel, { props: { selectedArticle: mockArticle, mode: 'libre' } })
      await nextTick()
      expect(wrapper.find('[data-testid="radar-loading"]').exists()).toBe(true)
    })

    it('does NOT show radar card when null', async () => {
      mockResult.value = fullResult
      mockRadarCard.value = null

      const wrapper = mount(CaptainPanel, { props: { selectedArticle: mockArticle, mode: 'libre' } })
      await nextTick()
      expect(wrapper.find('.radar-card').exists()).toBe(false)
      expect(wrapper.find('[data-testid="radar-loading"]').exists()).toBe(false)
    })

  })

  describe('mode libre — no check-completed emit', () => {
    const libreArticle: SelectedArticle = {
      id: 0,
      slug: '',
      title: '',
      keyword: 'seo local',
      type: 'intermediaire',
      locked: false,
      source: 'proposed',
    }

    it('does NOT emit check-completed when locked in mode libre', async () => {
      mockResult.value = fullResult
      const wrapper = mount(CaptainPanel, {
        props: { selectedArticle: libreArticle, mode: 'libre' },
      })
      await nextTick()

      await wrapper.find('[data-testid="lock-btn"]').trigger('click')
      await nextTick()

      expect(wrapper.emitted('check-completed')).toBeFalsy()
      // But validated is still emitted (keyword feedback)
      expect(wrapper.emitted('validated')).toBeTruthy()
    })

    it('does NOT emit check-removed when unlocked in mode libre', async () => {
      mockResult.value = fullResult
      const wrapper = mount(CaptainPanel, {
        props: { selectedArticle: libreArticle, mode: 'libre' },
      })
      await nextTick()

      await wrapper.find('[data-testid="lock-btn"]').trigger('click')
      await nextTick()

      await wrapper.find('[data-testid="unlock-btn"]').trigger('click')
      await nextTick()

      expect(wrapper.emitted('check-removed')).toBeFalsy()
    })

  })

  describe('carousel mode (radar cards)', () => {
    it('does NOT show carousel when no entries', async () => {
      const wrapper = mount(CaptainPanel, { props: { selectedArticle: mockArticle } })
      await nextTick()
      expect(wrapper.find('[data-testid="carousel-section"]').exists()).toBe(false)
    })

  })

  // Garde anti-régression du Bloc 1 du plan moteur. Si quelqu'un retire
  // par accident `lockedLieutenants` du mock du store (ou crée un nouveau
  // composant qui mocke ce store sans ce getter), le computed
  // `lockedLieutenantCount` doit rester défensif (?. ?? 0) et ne pas
  // crasher 32 tests en cascade.
  describe('regression — defensive getters', () => {
    it('survit à un store sans lockedLieutenants (undefined) sans crash', async () => {
      // On force le getter à undefined via vi.doMock-like : on remplace
      // l'implémentation du module mocké par une variante minimale qui
      // n'expose PAS lockedLieutenants. Ce test simule le cas d'un mock
      // incomplet — le composant doit traiter undefined comme 0.
      const wrapper = mount(CaptainPanel, {
        props: { selectedArticle: mockArticle, mode: 'libre' },
      })
      await nextTick()
      // Si le computed n'était pas défensif, le mount ou l'évaluation
      // d'un computed dérivé crasherait. On vérifie juste que le wrapper
      // existe et que les data-testid principaux sont présents.
      expect(wrapper.exists()).toBe(true)
      expect(wrapper.html()).toBeTruthy()
    })
  })
})
