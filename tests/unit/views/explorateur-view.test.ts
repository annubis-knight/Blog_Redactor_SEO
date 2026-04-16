import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'

// ---- Mocks ----

const mockIntentReset = vi.fn()
const mockExploreKeyword = vi.fn()
const mockExplorationKeyword = { value: '' }

vi.mock('../../../src/stores/intent.store', () => ({
  useIntentStore: () => ({
    reset: mockIntentReset,
    exploreKeyword: mockExploreKeyword,
    explorationKeyword: mockExplorationKeyword.value,
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

const mockLocalReset = vi.fn()

vi.mock('../../../src/stores/local.store', () => ({
  useLocalStore: () => ({
    reset: mockLocalReset,
    mapsData: null,
    reviewGap: null,
    isAnalyzingMaps: false,
    mapsError: null,
    analyzeMaps: vi.fn(),
  }),
}))

const mockAuditReset = vi.fn()
const mockFetchAudit = vi.fn()

vi.mock('../../../src/stores/keyword-audit.store', () => ({
  useKeywordAuditStore: () => ({
    $reset: mockAuditReset,
    fetchAudit: mockFetchAudit,
    results: [],
    typeScores: [],
    redundancies: [],
    loading: false,
    error: null,
  }),
}))

vi.mock('../../../src/utils/logger', () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock('../../../src/composables/keyword/useKeywordScoring', () => ({
  useKeywordScoring: () => ({
    getScoreColor: vi.fn(() => '#000'),
    getScoreLabel: vi.fn(() => 'N/A'),
  }),
}))

vi.mock('../../../src/stores/silos.store', () => ({
  useSilosStore: () => ({
    silos: [],
    theme: null,
    fetchSilos: vi.fn(),
  }),
}))

// ---- Stubs ----

const stubAll = {
  Breadcrumb: { template: '<div class="stub-breadcrumb" />' },
  ExplorationInput: { template: '<div class="stub-exploration-input" />', props: ['mode', 'defaultKeyword'] },
  IntentStep: { template: '<div class="stub-intent-step" />', props: ['mode', 'keyword'] },
  AutocompleteValidation: { template: '<div class="stub-autocomplete" />', props: ['mode', 'keyword'] },
  ExplorationVerdict: { template: '<div class="stub-verdict" />', props: ['mode'] },
  KeywordAuditTable: { template: '<div class="stub-audit-table" />' },
  KeywordComparison: { template: '<div class="stub-comparison" />' },
  KeywordEditor: { template: '<div class="stub-editor" />' },
  DiscoveryPanel: { template: '<div class="stub-discovery" />' },
  LocalComparisonStep: { template: '<div class="stub-local-comparison" />', props: ['mode', 'keyword'] },
  MapsStep: { template: '<div class="stub-maps" />', props: ['mode', 'keyword'] },
  LoadingSpinner: { template: '<div class="stub-spinner" />' },
  ErrorMessage: { template: '<div class="stub-error" />' },
  ScoreGauge: { template: '<div class="stub-gauge" />' },
}

import ExplorateurView from '../../../src/views/ExplorateurView.vue'

// ---- Helpers ----

function mountView() {
  return mount(ExplorateurView, {
    global: { stubs: stubAll },
  })
}

async function mountWithKeyword(keyword = 'seo toulouse') {
  const wrapper = mountView()
  const input = wrapper.find('.search-input')
  await input.setValue(keyword)
  await wrapper.find('.search-btn').trigger('click')
  await wrapper.vm.$nextTick()
  return wrapper
}

// ===================================================================
// ExplorateurView — rendering & navigation tests
// ===================================================================

describe('ExplorateurView — initial rendering', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockIntentReset.mockReset()
    mockLocalReset.mockReset()
    mockAuditReset.mockReset()
    mockFetchAudit.mockReset()
    mockExplorationKeyword.value = ''
  })

  it('renders the search bar', () => {
    const wrapper = mountView()
    expect(wrapper.find('.search-input').exists()).toBe(true)
    expect(wrapper.find('.search-btn').exists()).toBe(true)
  })

  it('shows gate message when no keyword is set', () => {
    const wrapper = mountView()
    expect(wrapper.find('.explorateur-gate').exists()).toBe(true)
    expect(wrapper.find('.explorateur-gate-message').text()).toContain('Saisissez un mot-cle')
  })

  it('does not show tabs when no keyword is set', () => {
    const wrapper = mountView()
    expect(wrapper.find('.explorateur-tabs').exists()).toBe(false)
  })

  it('disables search button when input is too short', () => {
    const wrapper = mountView()
    const btn = wrapper.find('.search-btn')
    expect((btn.element as HTMLButtonElement).disabled).toBe(true)
  })

  it('renders breadcrumb', () => {
    const wrapper = mountView()
    expect(wrapper.find('.stub-breadcrumb').exists()).toBe(true)
  })
})

describe('ExplorateurView — search & keyword activation', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockIntentReset.mockReset()
    mockLocalReset.mockReset()
    mockExplorationKeyword.value = ''
  })

  it('activates keyword and shows tabs after search', async () => {
    const wrapper = await mountWithKeyword('seo local')
    expect(wrapper.find('.explorateur-tabs').exists()).toBe(true)
    expect(wrapper.find('.active-keyword').text()).toContain('seo local')
  })

  it('enables search button when input has 2+ chars', async () => {
    const wrapper = mountView()
    await wrapper.find('.search-input').setValue('ab')
    expect((wrapper.find('.search-btn').element as HTMLButtonElement).disabled).toBe(false)
  })

  it('does not activate with 1 char input', async () => {
    const wrapper = mountView()
    await wrapper.find('.search-input').setValue('a')
    await wrapper.find('.search-btn').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.explorateur-tabs').exists()).toBe(false)
  })

  it('resets stores when setting a new keyword', async () => {
    await mountWithKeyword('test keyword')
    expect(mockIntentReset).toHaveBeenCalled()
    expect(mockLocalReset).toHaveBeenCalled()
  })

  it('activates keyword on Enter key', async () => {
    const wrapper = mountView()
    const input = wrapper.find('.search-input')
    await input.setValue('seo local')
    await input.trigger('keydown.enter')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.explorateur-tabs').exists()).toBe(true)
  })

  it('hides gate message after keyword activation', async () => {
    const wrapper = await mountWithKeyword('seo local')
    expect(wrapper.find('.explorateur-gate').exists()).toBe(false)
  })
})

describe('ExplorateurView — tab navigation', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockExplorationKeyword.value = ''
  })

  it('shows 3 tabs: Intention, Audit, Local', async () => {
    const wrapper = await mountWithKeyword()
    const tabs = wrapper.findAll('.explorateur-tab')
    expect(tabs).toHaveLength(3)
    expect(tabs[0].text()).toBe('Intention')
    expect(tabs[1].text()).toBe('Audit')
    expect(tabs[2].text()).toBe('Local')
  })

  it('Intention tab is active by default', async () => {
    const wrapper = await mountWithKeyword()
    const tabs = wrapper.findAll('.explorateur-tab')
    expect(tabs[0].classes()).toContain('active')
  })

  it('clicking Audit tab switches active tab', async () => {
    const wrapper = await mountWithKeyword()
    const tabs = wrapper.findAll('.explorateur-tab')
    await tabs[1].trigger('click')
    await wrapper.vm.$nextTick()
    expect(tabs[1].classes()).toContain('active')
  })

  it('clicking Local tab switches active tab', async () => {
    const wrapper = await mountWithKeyword()
    const tabs = wrapper.findAll('.explorateur-tab')
    await tabs[2].trigger('click')
    await wrapper.vm.$nextTick()
    expect(tabs[2].classes()).toContain('active')
  })
})

describe('ExplorateurView — Intention tab', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockExplorationKeyword.value = ''
  })

  it('renders ExplorationInput with mode=libre', async () => {
    const wrapper = await mountWithKeyword('seo local')
    const input = wrapper.find('.stub-exploration-input')
    expect(input.exists()).toBe(true)
  })

  it('renders IntentStep, AutocompleteValidation and ExplorationVerdict when explorationKeyword is set', async () => {
    mockExplorationKeyword.value = 'seo local'
    const wrapper = await mountWithKeyword('seo local')
    expect(wrapper.find('.stub-intent-step').exists()).toBe(true)
    expect(wrapper.find('.stub-autocomplete').exists()).toBe(true)
    expect(wrapper.find('.stub-verdict').exists()).toBe(true)
  })
})

describe('ExplorateurView — Audit tab', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockExplorationKeyword.value = ''
    mockFetchAudit.mockReset()
    mockAuditReset.mockReset()
  })

  it('shows cocoon name input in audit tab', async () => {
    const wrapper = await mountWithKeyword()
    // Switch to Audit tab
    const tabs = wrapper.findAll('.explorateur-tab')
    await tabs[1].trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.audit-cocoon-input').exists()).toBe(true)
  })

  it('shows audit gate message when no cocoon name entered', async () => {
    const wrapper = await mountWithKeyword()
    const tabs = wrapper.findAll('.explorateur-tab')
    await tabs[1].trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.audit-gate').exists()).toBe(true)
  })
})

describe('ExplorateurView — Local tab', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockExplorationKeyword.value = ''
  })

  it('renders LocalComparisonStep and MapsStep with mode=libre', async () => {
    const wrapper = await mountWithKeyword('seo local')
    // Switch to Local tab
    const tabs = wrapper.findAll('.explorateur-tab')
    await tabs[2].trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.stub-local-comparison').exists()).toBe(true)
    expect(wrapper.find('.stub-maps').exists()).toBe(true)
  })

  it('shows 2 local sections with titles', async () => {
    const wrapper = await mountWithKeyword('seo local')
    const tabs = wrapper.findAll('.explorateur-tab')
    await tabs[2].trigger('click')
    await wrapper.vm.$nextTick()

    const sections = wrapper.findAll('.local-section')
    expect(sections).toHaveLength(2)

    const titles = wrapper.findAll('.local-section-title')
    expect(titles[0].text()).toContain('Local')
    expect(titles[1].text()).toContain('Maps')
  })
})

describe('ExplorateurView — route configuration', () => {
  it('route /explorateur is configured in the router', async () => {
    const { default: router } = await import('../../../src/router/index')
    const route = router.getRoutes().find(r => r.path === '/explorateur')
    expect(route).toBeDefined()
    expect(route!.name).toBe('explorateur')
  })
})

describe('ExplorateurView — Navbar link', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('AppNavbar contains Explorateur link', async () => {
    const { default: AppNavbar } = await import('../../../src/components/shared/AppNavbar.vue')
    const wrapper = mount(AppNavbar, {
      global: {
        stubs: { RouterLink: { template: '<a :to="$attrs.to" class="router-link"><slot /></a>', inheritAttrs: true } },
      },
    })

    const links = wrapper.findAll('.router-link')
    const exploratorLink = links.find(l => l.text() === 'Explorateur')
    expect(exploratorLink).toBeDefined()
  })
})
