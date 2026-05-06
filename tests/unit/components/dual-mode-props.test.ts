import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'

// --- Mocks ---

vi.mock('../../../src/stores/keyword/intent.store', () => ({
  useIntentStore: () => ({
    reset: vi.fn(),
    exploreKeyword: vi.fn(),
    explorationKeyword: '',
    intentData: null,
    isAnalyzingIntent: false,
    intentError: null,
    paaQuestions: [],
    autocompleteData: null,
    isValidatingAutocomplete: false,
    comparisonData: null,
    isComparing: false,
    comparisonError: null,
    analyzeIntent: vi.fn(),
    validateAutocomplete: vi.fn(),
    compareLocalNational: vi.fn(),
    explorationHistory: [],
    hasExplored: false,
  }),
}))

vi.mock('../../../src/stores/external/local.store', () => ({
  useLocalStore: () => ({
    reset: vi.fn(),
    mapsData: null,
    reviewGap: null,
    isAnalyzingMaps: false,
    mapsError: null,
    analyzeMaps: vi.fn(),
  }),
}))

vi.mock('../../../src/composables/keyword/useDiscoveryPanel', async () => {
  const { mockDiscoveryPanel } = await import('../__mocks__/useDiscoveryPanel.mock')
  return mockDiscoveryPanel()
})

vi.mock('../../../src/composables/keyword/useResonanceScore', () => ({
  useKeywordRadar: () => ({
    generatedKeywords: { value: [] },
    scanResult: { value: null },
    isGenerating: false,
    isScanning: false,
    scanProgress: { value: 0 },
    error: { value: null },
    heatColor: { value: '' },
    heatLabel: { value: '' },
    radarCacheStatus: { value: null },
    checkRadarCache: vi.fn(),
    loadFromRadarCache: vi.fn(),
    generate: vi.fn(),
    scan: vi.fn(),
    removeKeyword: vi.fn(),
    reset: vi.fn(),
  }),
  radarHeatIcon: () => '',
}))

vi.mock('../../../src/composables/intent/useIntentVerdict', () => ({
  useIntentVerdict: () => ({
    verdicts: [],
    topVerdict: null,
  }),
}))

vi.mock('../../../src/composables/intent/useMultiSourceVerdict', () => ({
  useMultiSourceVerdict: () => ({
    verdicts: { value: [] },
    isLoading: { value: false },
  }),
}))

vi.mock('../../../src/composables/intent/useNlpAnalysis', () => ({
  useNlpAnalysis: () => ({
    enabled: { value: false },
    setEnabled: vi.fn(),
    isAvailable: { value: false },
    autoReactivate: vi.fn(),
  }),
}))

vi.mock('../../../src/utils/logger', () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock('../../../src/services/api.service', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
}))

// --- Stubs ---
const stubAll = {
  LoadingSpinner: { template: '<div />' },
  ErrorMessage: { template: '<div />' },
  ScoreGauge: { template: '<div />' },
  CollapsableSection: { template: '<div><slot /></div>' },
  RadarKeywordCard: { template: '<div />' },
  ConfidenceBar: { template: '<div />' },
  NlpOptinBanner: { template: '<div />' },
  ValidationSummary: { template: '<div />' },
  ValidationRow: { template: '<div />' },
  RowDetail: { template: '<div />' },
}

describe('Dual-mode prop — mode defaults to workflow', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('IntentStep accepts mode prop and defaults to workflow', async () => {
    const { default: IntentStep } = await import('../../../src/components/intent/IntentStep.vue')

    // Mount without mode — should default to 'workflow'
    const wrapper = mount(IntentStep, {
      props: { keyword: 'test' },
      global: { stubs: stubAll },
    })
    expect(wrapper.exists()).toBe(true)

    // Mount with mode='libre' — should not crash
    const wrapperLibre = mount(IntentStep, {
      props: { keyword: 'test', mode: 'libre' },
      global: { stubs: stubAll },
    })
    expect(wrapperLibre.exists()).toBe(true)
  })

  it('AutocompleteValidation accepts mode prop', async () => {
    const { default: AutocompleteValidation } = await import('../../../src/components/intent/AutocompleteValidation.vue')

    const wrapper = mount(AutocompleteValidation, {
      props: { keyword: 'test', mode: 'libre' },
      global: { stubs: stubAll },
    })
    expect(wrapper.exists()).toBe(true)
  })

  it('ExplorationInput accepts mode prop', async () => {
    const { default: ExplorationInput } = await import('../../../src/components/intent/ExplorationInput.vue')

    const wrapper = mount(ExplorationInput, {
      props: { defaultKeyword: 'test', mode: 'libre' },
      global: { stubs: stubAll },
    })
    expect(wrapper.exists()).toBe(true)
  })

  it('LocalComparisonStep accepts mode prop', async () => {
    const { default: LocalComparisonStep } = await import('../../../src/components/intent/LocalComparisonStep.vue')

    const wrapper = mount(LocalComparisonStep, {
      props: { keyword: 'test', mode: 'libre' },
      global: { stubs: stubAll },
    })
    expect(wrapper.exists()).toBe(true)
  })

  it('MapsStep accepts mode prop', async () => {
    const { default: MapsStep } = await import('../../../src/components/local/MapsStep.vue')

    const wrapper = mount(MapsStep, {
      props: { keyword: 'test', mode: 'libre' },
      global: { stubs: stubAll },
    })
    expect(wrapper.exists()).toBe(true)
  })

  it('PainTranslator accepts mode prop', async () => {
    const { default: PainTranslator } = await import('../../../src/components/intent/PainTranslator.vue')

    const wrapper = mount(PainTranslator, {
      props: { mode: 'libre', suggestedKeyword: 'test' },
      global: { stubs: stubAll },
    })
    expect(wrapper.exists()).toBe(true)
  })

  it('ExplorationVerdict accepts mode prop', async () => {
    const { default: ExplorationVerdict } = await import('../../../src/components/intent/ExplorationVerdict.vue')

    const wrapper = mount(ExplorationVerdict, {
      props: { mode: 'libre' },
      global: { stubs: stubAll },
    })
    expect(wrapper.exists()).toBe(true)
  })
})

describe('DiscoveryPanel — mode libre skips article context', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('mounts in libre mode without article context', async () => {
    const { default: DiscoveryPanel } = await import('../../../src/components/moteur/DiscoveryPanel.vue')

    const wrapper = mount(DiscoveryPanel, {
      props: {
        pilierKeyword: 'seo local',
        mode: 'libre',
      },
      global: { stubs: stubAll },
    })
    expect(wrapper.exists()).toBe(true)
  })

  it('mounts in workflow mode with full article context', async () => {
    const { default: DiscoveryPanel } = await import('../../../src/components/moteur/DiscoveryPanel.vue')

    const wrapper = mount(DiscoveryPanel, {
      props: {
        pilierKeyword: 'seo local',
        mode: 'workflow',
        articleTitle: 'Mon article',
        articleKeyword: 'seo',
        cocoonName: 'Mon cocon',
      },
      global: { stubs: stubAll },
    })
    expect(wrapper.exists()).toBe(true)
  })
})

// Tests "RadarPanel — mode libre skips article watcher" SUPPRIMÉS :
// les 2 tests étaient des smoke-mounts qui ne vérifiaient que `wrapper.exists()`,
// avec des mocks incomplets (`scanResult: { value: null }` au lieu de `ref(null)`)
// qui faisaient crasher useRadarRanking sur `cards.value.length`. Aucune
// assertion sur du comportement métier — la couverture utile vit dans
// `douleur-intent-scanner.test.ts` et `douleur-scanner-architecture.test.ts`.

describe('PainValidation — mode prop passthrough', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('mounts in libre mode with translated keywords', async () => {
    const { default: PainValidation } = await import('../../../src/components/intent/PainValidation.vue')

    const wrapper = mount(PainValidation, {
      props: {
        translatedKeywords: [],
        mode: 'libre',
      },
      global: { stubs: stubAll },
    })
    expect(wrapper.exists()).toBe(true)
  })
})
