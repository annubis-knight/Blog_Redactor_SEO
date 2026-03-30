import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import SiloCard from '../../../src/components/dashboard/SiloCard.vue'
import WorkflowChoice from '../../../src/components/dashboard/WorkflowChoice.vue'
import type { Silo, Cocoon } from '../../../shared/types/index.js'

const mockCocoon: Cocoon = {
  id: 0,
  name: 'Refonte de site web',
  siloName: 'Création de site',
  articles: [
    { title: 'Article 1', type: 'Pilier', slug: 'article-1', topic: null, status: 'à rédiger' },
    { title: 'Article 2', type: 'Intermédiaire', slug: 'article-2', topic: null, status: 'brouillon' },
  ],
  stats: {
    totalArticles: 2,
    byType: { pilier: 1, intermediaire: 1, specialise: 0 },
    byStatus: { aRediger: 1, brouillon: 1, publie: 0 },
    completionPercent: 50,
  },
}

const mockSilo: Silo = {
  id: 1,
  nom: 'Création de site',
  description: 'Tout sur la création de sites web',
  cocons: [mockCocoon],
  stats: {
    totalArticles: 2,
    byType: { pilier: 1, intermediaire: 1, specialise: 0 },
    byStatus: { aRediger: 1, brouillon: 1, publie: 0 },
    completionPercent: 50,
  },
}

const routerLinkStub = {
  template: '<a :href="to"><slot /></a>',
  props: ['to'],
}

// Stub ResizeObserver for jsdom (SiloCard uses it in onMounted)
vi.stubGlobal('ResizeObserver', class {
  observe() {}
  unobserve() {}
  disconnect() {}
})

describe('SiloCard — gear icon', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders the gear config icon', () => {
    const wrapper = mount(SiloCard, {
      props: { silo: mockSilo },
      global: {
        stubs: {
          RouterLink: routerLinkStub,
          CocoonCard: { template: '<div class="cocoon-card-stub" />' },
          ProgressBar: { template: '<div class="progress-stub" />' },
        },
      },
    })
    const configBtn = wrapper.find('.silo-config-btn')
    expect(configBtn.exists()).toBe(true)
  })

  it('gear icon links to /silo/:siloId', () => {
    const wrapper = mount(SiloCard, {
      props: { silo: mockSilo },
      global: {
        stubs: {
          RouterLink: routerLinkStub,
          CocoonCard: { template: '<div class="cocoon-card-stub" />' },
          ProgressBar: { template: '<div class="progress-stub" />' },
        },
      },
    })
    const configLink = wrapper.find('.silo-config-btn')
    expect(configLink.attributes('href')).toBe('/silo/1')
  })

  it('displays silo name and description', () => {
    const wrapper = mount(SiloCard, {
      props: { silo: mockSilo },
      global: {
        stubs: {
          RouterLink: routerLinkStub,
          CocoonCard: { template: '<div class="cocoon-card-stub" />' },
          ProgressBar: { template: '<div class="progress-stub" />' },
        },
      },
    })
    expect(wrapper.text()).toContain('Création de site')
    expect(wrapper.text()).toContain('Tout sur la création de sites web')
  })

  it('contains a gear SVG icon', () => {
    const wrapper = mount(SiloCard, {
      props: { silo: mockSilo },
      global: {
        stubs: {
          RouterLink: routerLinkStub,
          CocoonCard: { template: '<div class="cocoon-card-stub" />' },
          ProgressBar: { template: '<div class="progress-stub" />' },
        },
      },
    })
    const svg = wrapper.find('.silo-config-btn svg')
    expect(svg.exists()).toBe(true)
  })
})

describe('WorkflowChoice', () => {
  it('renders three phase cards', () => {
    const wrapper = mount(WorkflowChoice, {
      props: { cocoonId: 0, cocoon: mockCocoon },
      global: { stubs: { RouterLink: routerLinkStub } },
    })
    const cards = wrapper.findAll('.choice-card')
    expect(cards).toHaveLength(3)
  })

  it('displays Cerveau phase label', () => {
    const wrapper = mount(WorkflowChoice, {
      props: { cocoonId: 0, cocoon: mockCocoon },
      global: { stubs: { RouterLink: routerLinkStub } },
    })
    expect(wrapper.text()).toContain('Cerveau')
  })

  it('displays Moteur phase label', () => {
    const wrapper = mount(WorkflowChoice, {
      props: { cocoonId: 0, cocoon: mockCocoon },
      global: { stubs: { RouterLink: routerLinkStub } },
    })
    expect(wrapper.text()).toContain('Moteur')
  })

  it('displays Rédaction phase label', () => {
    const wrapper = mount(WorkflowChoice, {
      props: { cocoonId: 0, cocoon: mockCocoon },
      global: { stubs: { RouterLink: routerLinkStub } },
    })
    expect(wrapper.text()).toContain('daction')
  })

  it('links Cerveau card to /cocoon/:id/cerveau', () => {
    const wrapper = mount(WorkflowChoice, {
      props: { cocoonId: 0, cocoon: mockCocoon },
      global: { stubs: { RouterLink: routerLinkStub } },
    })
    const cards = wrapper.findAll('.choice-card')
    expect(cards[0].attributes('href')).toBe('/cocoon/0/cerveau')
  })

  it('links Moteur card to /cocoon/:id/moteur', () => {
    const wrapper = mount(WorkflowChoice, {
      props: { cocoonId: 0, cocoon: mockCocoon },
      global: { stubs: { RouterLink: routerLinkStub } },
    })
    const cards = wrapper.findAll('.choice-card')
    expect(cards[1].attributes('href')).toBe('/cocoon/0/moteur')
  })

  it('displays article count in Rédaction badge', () => {
    const wrapper = mount(WorkflowChoice, {
      props: { cocoonId: 0, cocoon: mockCocoon },
      global: { stubs: { RouterLink: routerLinkStub } },
    })
    expect(wrapper.text()).toContain('2 articles')
  })

  it('highlights Moteur card with primary class', () => {
    const wrapper = mount(WorkflowChoice, {
      props: { cocoonId: 0, cocoon: mockCocoon },
      global: { stubs: { RouterLink: routerLinkStub } },
    })
    const cards = wrapper.findAll('.choice-card')
    expect(cards[1].classes()).toContain('choice-card--primary')
    expect(cards[0].classes()).not.toContain('choice-card--primary')
  })
})

// SiloDetailView tests — need to mock vue-router and api service
const mockRoute = { params: { siloId: '1' } }
vi.mock('vue-router', () => ({
  useRoute: () => mockRoute,
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('../../../src/services/api.service', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
}))

import { apiGet } from '../../../src/services/api.service'
const mockApiGet = vi.mocked(apiGet)

describe('SiloDetailView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetAllMocks()
  })

  it('renders silo detail when store is loaded with matching siloId', async () => {
    mockApiGet.mockImplementation(async (url: string) => {
      if (url === '/theme') return { nom: 'Theme', description: '' }
      if (url === '/silos') return [mockSilo]
      return null
    })

    const { useSilosStore } = await import('../../../src/stores/silos.store')
    const store = useSilosStore()
    await store.fetchSilos()

    const { default: SiloDetailView } = await import('../../../src/views/SiloDetailView.vue')
    const wrapper = mount(SiloDetailView, {
      global: {
        stubs: {
          RouterLink: routerLinkStub,
          Breadcrumb: { template: '<nav class="breadcrumb-stub" />' },
          ProgressBar: { template: '<div class="progress-stub" />' },
          LoadingSpinner: { template: '<div class="loading-stub" />' },
          ErrorMessage: { template: '<div class="error-stub" />' },
        },
      },
    })

    expect(wrapper.text()).toContain('Création de site')
    expect(wrapper.text()).toContain('Tout sur la création de sites web')
  })

  it('renders not found when siloId does not match', async () => {
    mockRoute.params.siloId = '999'
    mockApiGet.mockImplementation(async (url: string) => {
      if (url === '/theme') return { nom: 'Theme', description: '' }
      if (url === '/silos') return [mockSilo]
      return null
    })

    const { useSilosStore } = await import('../../../src/stores/silos.store')
    const store = useSilosStore()
    await store.fetchSilos()

    const { default: SiloDetailView } = await import('../../../src/views/SiloDetailView.vue')
    const wrapper = mount(SiloDetailView, {
      global: {
        stubs: {
          RouterLink: routerLinkStub,
          Breadcrumb: { template: '<nav class="breadcrumb-stub" />' },
          ProgressBar: { template: '<div class="progress-stub" />' },
          LoadingSpinner: { template: '<div class="loading-stub" />' },
          ErrorMessage: { template: '<div class="error-stub" />' },
        },
      },
    })

    expect(wrapper.text()).toContain('Silo introuvable')
    mockRoute.params.siloId = '1' // restore
  })

  it('shows loading spinner when store is loading', async () => {
    mockApiGet.mockImplementation(() => new Promise(() => {})) // never resolves

    const { useSilosStore } = await import('../../../src/stores/silos.store')
    const store = useSilosStore()
    store.fetchSilos() // starts loading, never completes

    const { default: SiloDetailView } = await import('../../../src/views/SiloDetailView.vue')
    const wrapper = mount(SiloDetailView, {
      global: {
        stubs: {
          RouterLink: routerLinkStub,
          Breadcrumb: { template: '<nav class="breadcrumb-stub" />' },
          ProgressBar: { template: '<div class="progress-stub" />' },
          LoadingSpinner: { template: '<div class="loading-stub" />' },
          ErrorMessage: { template: '<div class="error-stub" />' },
        },
      },
    })

    expect(wrapper.find('.loading-stub').exists()).toBe(true)
  })

  it('lists cocoons with links', async () => {
    mockRoute.params.siloId = '1'
    mockApiGet.mockImplementation(async (url: string) => {
      if (url === '/theme') return { nom: 'Theme', description: '' }
      if (url === '/silos') return [mockSilo]
      return null
    })

    const { useSilosStore } = await import('../../../src/stores/silos.store')
    const store = useSilosStore()
    await store.fetchSilos()

    const { default: SiloDetailView } = await import('../../../src/views/SiloDetailView.vue')
    const wrapper = mount(SiloDetailView, {
      global: {
        stubs: {
          RouterLink: routerLinkStub,
          Breadcrumb: { template: '<nav class="breadcrumb-stub" />' },
          ProgressBar: { template: '<div class="progress-stub" />' },
          LoadingSpinner: { template: '<div class="loading-stub" />' },
          ErrorMessage: { template: '<div class="error-stub" />' },
        },
      },
    })

    expect(wrapper.text()).toContain('Refonte de site web')
    expect(wrapper.text()).toContain('2 articles')
    const cocoonLink = wrapper.find('.cocoon-row')
    expect(cocoonLink.attributes('href')).toBe('/cocoon/0')
  })
})
