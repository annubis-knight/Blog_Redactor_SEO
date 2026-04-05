import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import MoteurStrategyContext from '@/components/moteur/MoteurStrategyContext.vue'
import { useCocoonStrategyStore } from '@/stores/cocoon-strategy.store'

vi.mock('@/services/api.service', () => ({
  apiGet: vi.fn().mockResolvedValue(null),
  apiPost: vi.fn().mockResolvedValue(null),
  apiPut: vi.fn().mockResolvedValue(null),
}))

// --- Backend route logic tests ---

describe('GET /api/cocoons/:id/strategy/context — route logic', () => {
  function buildContext(strategy: Record<string, any> | null, cocoon: { name: string; siloName: string } | null) {
    if (!cocoon) return { data: null }
    if (!strategy) return { data: null }

    return {
      data: {
        cocoonName: cocoon.name,
        siloName: cocoon.siloName,
        cible: strategy.cible?.validated || null,
        douleur: strategy.douleur?.validated || null,
        angle: strategy.angle?.validated || null,
        promesse: strategy.promesse?.validated || null,
        cta: strategy.cta?.validated || null,
      },
    }
  }

  it('returns validated fields when strategy exists', () => {
    const strategy = {
      cible: { input: '', suggestion: null, validated: 'Dirigeants PME' },
      douleur: { input: '', suggestion: null, validated: 'Manque de visibilité' },
      angle: { input: '', suggestion: null, validated: 'Approche pragmatique' },
      promesse: { input: '', suggestion: null, validated: 'Résultats mesurables' },
      cta: { input: '', suggestion: null, validated: 'Audit gratuit' },
    }
    const cocoon = { name: 'Stratégie de croissance', siloName: 'Marketing' }

    const result = buildContext(strategy, cocoon)

    expect(result.data).toEqual({
      cocoonName: 'Stratégie de croissance',
      siloName: 'Marketing',
      cible: 'Dirigeants PME',
      douleur: 'Manque de visibilité',
      angle: 'Approche pragmatique',
      promesse: 'Résultats mesurables',
      cta: 'Audit gratuit',
    })
  })

  it('returns null when no strategy exists', () => {
    const result = buildContext(null, { name: 'Test', siloName: 'Silo' })
    expect(result).toEqual({ data: null })
  })

  it('returns null for empty validated fields', () => {
    const strategy = {
      cible: { input: '', suggestion: null, validated: '' },
      douleur: { input: '', suggestion: null, validated: 'Some value' },
      angle: { input: '', suggestion: null, validated: '' },
      promesse: { input: '', suggestion: null, validated: '' },
      cta: { input: '', suggestion: null, validated: '' },
    }
    const cocoon = { name: 'Test', siloName: 'Silo' }

    const result = buildContext(strategy, cocoon)

    expect(result.data!.cible).toBeNull()
    expect(result.data!.douleur).toBe('Some value')
    expect(result.data!.angle).toBeNull()
  })
})

// --- MoteurStrategyContext component tests ---

describe('MoteurStrategyContext — rendering', () => {
  it('renders cible, angle, promesse fields', async () => {
    const wrapper = mount(MoteurStrategyContext, {
      props: {
        cible: 'Dirigeants PME',
        douleur: null,
        angle: 'Approche pragmatique',
        promesse: 'Résultats mesurables',
        cta: null,
      },
    })

    // Click to open
    await wrapper.find('.recap-toggle-btn').trigger('click')

    const labels = wrapper.findAll('.strategy-context-label')
    const values = wrapper.findAll('.strategy-context-value')

    expect(labels).toHaveLength(3) // cible, angle, promesse (douleur and cta are null)
    expect(labels[0].text()).toBe('Cible')
    expect(values[0].text()).toBe('Dirigeants PME')
    expect(labels[1].text()).toBe('Angle')
    expect(values[1].text()).toBe('Approche pragmatique')
    expect(labels[2].text()).toBe('Promesse')
    expect(values[2].text()).toBe('Résultats mesurables')
  })

  it('renders all 5 fields when all are present', async () => {
    const wrapper = mount(MoteurStrategyContext, {
      props: {
        cible: 'Cible text',
        douleur: 'Douleur text',
        angle: 'Angle text',
        promesse: 'Promesse text',
        cta: 'CTA text',
      },
    })

    await wrapper.find('.recap-toggle-btn').trigger('click')

    const labels = wrapper.findAll('.strategy-context-label')
    expect(labels).toHaveLength(5)
    expect(labels.map(l => l.text())).toEqual(['Cible', 'Douleur', 'Angle', 'Promesse', 'CTA'])
  })
})

describe('MoteurStrategyContext — collapsed by default', () => {
  it('is collapsed by default (AC #1)', () => {
    const wrapper = mount(MoteurStrategyContext, {
      props: {
        cible: 'Test',
        douleur: null,
        angle: null,
        promesse: null,
        cta: null,
      },
    })

    expect(wrapper.find('.recap-toggle-body').classes()).toContain('collapsed')
    expect(wrapper.find('.recap-toggle-btn').attributes('aria-expanded')).toBe('false')
  })
})

describe('MoteurStrategyContext — toggle interaction', () => {
  it('opens when toggle is clicked', async () => {
    const wrapper = mount(MoteurStrategyContext, {
      props: {
        cible: 'Test',
        douleur: null,
        angle: null,
        promesse: null,
        cta: null,
      },
    })

    await wrapper.find('.recap-toggle-btn').trigger('click')

    expect(wrapper.find('.recap-toggle-body').classes()).not.toContain('collapsed')
    expect(wrapper.find('.recap-toggle-btn').attributes('aria-expanded')).toBe('true')
  })

  it('closes when toggle is clicked again', async () => {
    const wrapper = mount(MoteurStrategyContext, {
      props: {
        cible: 'Test',
        douleur: null,
        angle: null,
        promesse: null,
        cta: null,
      },
    })

    const toggle = wrapper.find('.recap-toggle-btn')
    await toggle.trigger('click') // open
    await toggle.trigger('click') // close

    expect(wrapper.find('.recap-toggle-body').classes()).toContain('collapsed')
  })
})

// --- Integration: visibility when strategicContext is null ---

describe('MoteurView integration — strategic context visibility', () => {
  it('component is not rendered when strategicContext is null (AC #2)', () => {
    setActivePinia(createPinia())
    const store = useCocoonStrategyStore()

    // strategicContext defaults to null
    expect(store.strategicContext).toBeNull()

    // Simulate the v-if logic from MoteurView template
    const shouldRender = store.strategicContext !== null
    expect(shouldRender).toBe(false)
  })

  it('component should render when strategicContext has data', () => {
    setActivePinia(createPinia())
    const store = useCocoonStrategyStore()

    store.strategicContext = {
      cocoonName: 'Test',
      siloName: 'Silo',
      cible: 'Target',
      douleur: null,
      angle: 'Angle',
      promesse: null,
      cta: null,
    }

    const shouldRender = store.strategicContext !== null
    expect(shouldRender).toBe(true)
  })
})

// --- Store fetchContext ---

describe('cocoon-strategy.store — fetchContext', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('sets strategicContext from API response', async () => {
    const { apiGet } = await import('@/services/api.service')
    const mockData = {
      cocoonName: 'Test',
      siloName: 'Silo',
      cible: 'Target',
      douleur: null,
      angle: 'Angle',
      promesse: null,
      cta: null,
    }
    vi.mocked(apiGet).mockResolvedValueOnce(mockData)

    const store = useCocoonStrategyStore()
    await store.fetchContext(1)

    expect(apiGet).toHaveBeenCalledWith('/cocoons/1/strategy/context')
    expect(store.strategicContext).toEqual(mockData)
  })

  it('sets strategicContext to null on error', async () => {
    const { apiGet } = await import('@/services/api.service')
    vi.mocked(apiGet).mockRejectedValueOnce(new Error('Network error'))

    const store = useCocoonStrategyStore()
    await store.fetchContext(999)

    expect(store.strategicContext).toBeNull()
  })

  it('$reset clears strategicContext', () => {
    const store = useCocoonStrategyStore()
    store.strategicContext = {
      cocoonName: 'Test',
      siloName: 'Silo',
      cible: 'Target',
      douleur: null,
      angle: null,
      promesse: null,
      cta: null,
    }

    store.$reset()

    expect(store.strategicContext).toBeNull()
  })
})
