import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'

// --- Mocks ---

vi.mock('../../../src/composables/useCapitaineValidation', () => ({
  useCapitaineValidation: () => ({
    result: { value: null },
    currentResult: { value: null },
    isLoading: { value: false },
    error: { value: null },
    history: { value: [] },
    historyIndex: { value: -1 },
    rootResult: { value: null },
    isLoadingRoot: { value: false },
    validateKeyword: vi.fn(),
    navigateHistory: vi.fn(),
    reset: vi.fn(),
  }),
  articleTypeToLevel: () => 'intermediaire',
}))

vi.mock('../../../src/composables/useStreaming', () => ({
  useStreaming: () => ({
    chunks: { value: '' },
    isStreaming: { value: false },
    error: { value: null },
    result: { value: null },
    usage: { value: null },
    startStream: vi.fn(),
    abort: vi.fn(),
  }),
}))

vi.mock('../../../src/composables/useKeywordDiscoveryTab', async () => {
  const { mockKeywordDiscoveryTab } = await import('../__mocks__/useKeywordDiscoveryTab.mock')
  return mockKeywordDiscoveryTab()
})

vi.mock('../../../src/utils/logger', () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

// --- Stubs ---

const routerLinkStub = {
  template: '<a :href="to"><slot /></a>',
  props: ['to'],
}

const componentStub = { template: '<div class="stub" />' }

const globalStubs = {
  RouterLink: routerLinkStub,
  Breadcrumb: { template: '<nav class="breadcrumb-stub" />' },
  KeywordDiscoveryTab: componentStub,
  PainTranslator: componentStub,
  CaptainValidation: componentStub,
}

// --- Router test ---

describe('Router — /labo route', () => {
  it('has a /labo route with lazy-loaded LaboView', async () => {
    const { default: router } = await import('../../../src/router/index')
    const route = router.getRoutes().find(r => r.path === '/labo')
    expect(route).toBeDefined()
    expect(route!.name).toBe('labo')
  })
})

// --- AppNavbar test ---

vi.mock('../../../src/stores/silos.store', () => ({
  useSilosStore: () => ({
    silos: [],
    theme: { nom: 'Test Theme' },
    fetchSilos: vi.fn(),
  }),
}))

describe('AppNavbar — Labo link', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders a Labo link pointing to /labo', async () => {
    const { default: AppNavbar } = await import('../../../src/components/shared/AppNavbar.vue')
    const wrapper = mount(AppNavbar, {
      global: { stubs: { RouterLink: routerLinkStub } },
    })

    const links = wrapper.findAll('.navbar-link')
    const laboLink = links.find(l => l.text() === 'Labo')
    expect(laboLink).toBeDefined()
    expect(laboLink!.attributes('href')).toBe('/labo')
  })
})

// --- LaboView tests ---

describe('LaboView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  async function mountLabo() {
    const { default: LaboView } = await import('../../../src/views/LaboView.vue')
    return mount(LaboView, {
      global: { stubs: globalStubs },
    })
  }

  it('renders the search input and button', async () => {
    const wrapper = await mountLabo()
    expect(wrapper.find('.search-input').exists()).toBe(true)
    expect(wrapper.find('.search-btn').exists()).toBe(true)
  })

  it('shows gate message when no keyword is set', async () => {
    const wrapper = await mountLabo()
    expect(wrapper.find('.labo-gate').exists()).toBe(true)
    expect(wrapper.text()).toContain('Saisissez un mot-clé pour commencer')
  })

  it('hides tabs when no keyword is set', async () => {
    const wrapper = await mountLabo()
    expect(wrapper.find('.labo-tabs').exists()).toBe(false)
  })

  it('disables search button when input is too short', async () => {
    const wrapper = await mountLabo()
    const btn = wrapper.find('.search-btn')
    expect((btn.element as HTMLButtonElement).disabled).toBe(true)

    await wrapper.find('.search-input').setValue('a')
    expect((btn.element as HTMLButtonElement).disabled).toBe(true)
  })

  it('enables search button when input has 2+ characters', async () => {
    const wrapper = await mountLabo()
    await wrapper.find('.search-input').setValue('erp')
    const btn = wrapper.find('.search-btn')
    expect((btn.element as HTMLButtonElement).disabled).toBe(false)
  })

  it('activates keyword and shows tabs on Enter', async () => {
    const wrapper = await mountLabo()
    const input = wrapper.find('.search-input')
    await input.setValue('erp cloud pme')
    await input.trigger('keydown.enter')

    // Gate message should be gone
    expect(wrapper.find('.labo-gate').exists()).toBe(false)
    // Tabs should appear
    expect(wrapper.find('.labo-tabs').exists()).toBe(true)
    // Active keyword displayed
    expect(wrapper.text()).toContain('erp cloud pme')
  })

  it('activates keyword on button click', async () => {
    const wrapper = await mountLabo()
    await wrapper.find('.search-input').setValue('seo local')
    await wrapper.find('.search-btn').trigger('click')

    expect(wrapper.find('.labo-tabs').exists()).toBe(true)
    expect(wrapper.text()).toContain('seo local')
  })

  it('renders 3 tabs: Discovery, Douleur, Verdict', async () => {
    const wrapper = await mountLabo()
    await wrapper.find('.search-input').setValue('test kw')
    await wrapper.find('.search-btn').trigger('click')

    const tabs = wrapper.findAll('.labo-tab')
    expect(tabs).toHaveLength(3)
    expect(tabs[0].text()).toBe('Discovery')
    expect(tabs[1].text()).toBe('Douleur')
    expect(tabs[2].text()).toBe('Verdict')
  })

  it('Discovery tab is active by default', async () => {
    const wrapper = await mountLabo()
    await wrapper.find('.search-input').setValue('test')
    await wrapper.find('.search-btn').trigger('click')

    const tabs = wrapper.findAll('.labo-tab')
    expect(tabs[0].classes()).toContain('active')
    expect(tabs[1].classes()).not.toContain('active')
  })

  it('switches tabs on click', async () => {
    const wrapper = await mountLabo()
    await wrapper.find('.search-input').setValue('test')
    await wrapper.find('.search-btn').trigger('click')

    const tabs = wrapper.findAll('.labo-tab')
    await tabs[2].trigger('click') // Verdict

    expect(tabs[2].classes()).toContain('active')
    expect(tabs[0].classes()).not.toContain('active')
  })

  it('does not activate keyword when input is too short', async () => {
    const wrapper = await mountLabo()
    await wrapper.find('.search-input').setValue('a')
    await wrapper.find('.search-btn').trigger('click')

    expect(wrapper.find('.labo-gate').exists()).toBe(true)
    expect(wrapper.find('.labo-tabs').exists()).toBe(false)
  })

  it('shows type selector after keyword activation', async () => {
    const wrapper = await mountLabo()
    expect(wrapper.find('[data-testid="labo-type-select"]').exists()).toBe(false)

    await wrapper.find('.search-input').setValue('seo local')
    await wrapper.find('.search-btn').trigger('click')

    const select = wrapper.find('[data-testid="labo-type-select"]')
    expect(select.exists()).toBe(true)
    // Default is Intermédiaire
    expect((select.element as HTMLSelectElement).value).toBe('Intermédiaire')
  })

  it('type selector has 3 options', async () => {
    const wrapper = await mountLabo()
    await wrapper.find('.search-input').setValue('seo local')
    await wrapper.find('.search-btn').trigger('click')

    const options = wrapper.findAll('[data-testid="labo-type-select"] option')
    expect(options).toHaveLength(3)
    expect(options[0].text()).toBe('Pilier')
    expect(options[1].text()).toBe('Intermédiaire')
    expect(options[2].text()).toBe('Spécialisé')
  })
})
