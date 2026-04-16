import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ExtractibilityTab from '@/components/panels/geo/ExtractibilityTab.vue'
import IndicatorCard from '@/components/panels/indicators/IndicatorCard.vue'
import { useGeoStore } from '@/stores/article/geo.store'
import type { GeoScore } from '@shared/types/geo.types.js'

function makeGeoScore(overrides: Partial<GeoScore> = {}): GeoScore {
  return {
    global: 68,
    factors: {
      extractibilityScore: 70,
      questionHeadingsScore: 65,
      answerCapsulesScore: 80,
      sourcedStatsScore: 60,
    },
    questionHeadings: { totalH2H3: 5, questionCount: 3, percentage: 60 },
    answerCapsules: [
      { heading: 'Qu\'est-ce que le SEO?', hasAnswerCapsule: true },
      { heading: 'Les bonnes pratiques', hasAnswerCapsule: false },
    ],
    sourcedStats: { count: 2, inTarget: false },
    paragraphAlerts: [],
    jargonDetections: [],
    ...overrides,
  }
}

function mountTab(score: GeoScore | null = null) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const wrapper = mount(ExtractibilityTab, { global: { plugins: [pinia] } })
  const store = useGeoStore()
  if (score) store.score = score
  return { wrapper, store }
}

describe('ExtractibilityTab', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  // --- Accordion ---
  it('renders 3 IndicatorCards', () => {
    const { wrapper } = mountTab()
    const cards = wrapper.findAllComponents(IndicatorCard)
    expect(cards.length).toBe(3)
  })

  it('has Questions card open by default (index 0)', () => {
    const { wrapper } = mountTab()
    const cards = wrapper.findAllComponents(IndicatorCard)
    // Card order: Questions(0), Capsules(1), Stats(2)
    expect(cards[0].props('isOpen')).toBe(true)
    expect(cards[1].props('isOpen')).toBe(false)
    expect(cards[2].props('isOpen')).toBe(false)
  })

  it('opening one card closes the other', async () => {
    const { wrapper } = mountTab()
    const headers = wrapper.findAll('.card-header')
    // Click on Capsules (index 1)
    await headers[1].trigger('click')
    const cards = wrapper.findAllComponents(IndicatorCard)
    expect(cards[0].props('isOpen')).toBe(false)
    expect(cards[1].props('isOpen')).toBe(true)
    expect(cards[2].props('isOpen')).toBe(false)
  })

  it('re-clicking closes the current card', async () => {
    const { wrapper } = mountTab()
    const headers = wrapper.findAll('.card-header')
    // Click on Questions (already open) to close it
    await headers[0].trigger('click')
    const cards = wrapper.findAllComponents(IndicatorCard)
    expect(cards[0].props('isOpen')).toBe(false)
    expect(cards[1].props('isOpen')).toBe(false)
    expect(cards[2].props('isOpen')).toBe(false)
  })

  // --- N/A state ---
  it('shows N/A in each card when score is null', () => {
    const { wrapper } = mountTab()
    // Only the first card is open, so it shows N/A
    expect(wrapper.find('.ind-na').exists()).toBe(true)
    expect(wrapper.find('.ind-na').text()).toBe('N/A')
  })

  // --- Questions card ---
  it('shows question count and percentage', async () => {
    const { wrapper, store } = mountTab()
    store.score = makeGeoScore()
    await wrapper.vm.$nextTick()
    const text = wrapper.text()
    expect(text).toContain('3/5')
    expect(text).toContain('60%')
  })

  it('shows val-warn when percentage < 70%', async () => {
    const { wrapper, store } = mountTab()
    store.score = makeGeoScore({ questionHeadings: { totalH2H3: 5, questionCount: 3, percentage: 60 } })
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.val-warn').exists()).toBe(true)
  })

  it('shows val-ok when percentage >= 70%', async () => {
    const { wrapper, store } = mountTab()
    store.score = makeGeoScore({ questionHeadings: { totalH2H3: 5, questionCount: 4, percentage: 80 } })
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.val-ok').exists()).toBe(true)
  })

  // --- Capsules card ---
  it('shows capsule list with check marks', async () => {
    const { wrapper, store } = mountTab()
    store.score = makeGeoScore()
    await wrapper.vm.$nextTick()
    // Open capsules card
    const headers = wrapper.findAll('.card-header')
    await headers[1].trigger('click')
    const items = wrapper.findAll('.capsule-item')
    expect(items.length).toBe(2)
    expect(items[0].find('.capsule-icon').text()).toBe('✓')
    expect(items[1].find('.capsule-icon').text()).toBe('✗')
  })

  it('shows "Aucun H2 détecté" when no capsules', async () => {
    const { wrapper, store } = mountTab()
    store.score = makeGeoScore({ answerCapsules: [] })
    await wrapper.vm.$nextTick()
    const headers = wrapper.findAll('.card-header')
    await headers[1].trigger('click')
    expect(wrapper.text()).toContain('Aucun H2 détecté')
  })

  // --- Stats card ---
  it('shows sourced stats count', async () => {
    const { wrapper, store } = mountTab()
    store.score = makeGeoScore({ sourcedStats: { count: 4, inTarget: true } })
    await wrapper.vm.$nextTick()
    const headers = wrapper.findAll('.card-header')
    await headers[2].trigger('click')
    expect(wrapper.text()).toContain('4')
    expect(wrapper.find('.val-ok').exists()).toBe(true)
  })

  it('shows val-warn when stats not in target', async () => {
    const { wrapper, store } = mountTab()
    store.score = makeGeoScore({ sourcedStats: { count: 1, inTarget: false } })
    await wrapper.vm.$nextTick()
    const headers = wrapper.findAll('.card-header')
    await headers[2].trigger('click')
    expect(wrapper.find('.val-warn').exists()).toBe(true)
  })
})
