import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import GeoPanel from '@/components/panels/GeoPanel.vue'
import { useGeoStore } from '@/stores/geo.store'
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
      { heading: 'Section A', hasAnswerCapsule: true },
      { heading: 'Section B', hasAnswerCapsule: false },
    ],
    sourcedStats: { count: 2, inTarget: false },
    paragraphAlerts: [],
    jargonDetections: [],
    ...overrides,
  }
}

function mountGeo(score: GeoScore | null = null) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const wrapper = mount(GeoPanel, { global: { plugins: [pinia] } })
  const store = useGeoStore()
  if (score) store.score = score
  return { wrapper, store }
}

describe('GeoPanel', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  // --- Header ---
  it('renders GEO title', () => {
    const { wrapper } = mountGeo()
    expect(wrapper.find('.panel-title').text()).toBe('GEO')
  })

  it('renders ScoreGauge with 0 when no score', () => {
    const { wrapper } = mountGeo()
    expect(wrapper.findComponent({ name: 'ScoreGauge' }).props('score')).toBe(0)
  })

  it('renders ScoreGauge with global score', async () => {
    const { wrapper, store } = mountGeo()
    store.score = makeGeoScore({ global: 85 })
    await wrapper.vm.$nextTick()
    expect(wrapper.findComponent({ name: 'ScoreGauge' }).props('score')).toBe(85)
  })

  // --- Factors ---
  it('shows "-" for all factors when no score', () => {
    const { wrapper } = mountGeo()
    const factorScores = wrapper.findAll('.factor-score')
    expect(factorScores.length).toBe(4)
    for (const fs of factorScores) {
      expect(fs.text()).toBe('-')
    }
  })

  it('displays factor scores when score is present', async () => {
    const { wrapper, store } = mountGeo()
    store.score = makeGeoScore()
    await wrapper.vm.$nextTick()
    const factorScores = wrapper.findAll('.factor-score')
    expect(factorScores[0].text()).toBe('70') // extractibilityScore
    expect(factorScores[1].text()).toBe('65') // questionHeadingsScore
    expect(factorScores[2].text()).toBe('80') // answerCapsulesScore
    expect(factorScores[3].text()).toBe('60') // sourcedStatsScore
  })

  // --- Tabs ---
  it('renders 2 tabs with correct labels', () => {
    const { wrapper } = mountGeo()
    const tabs = wrapper.findAll('[role="tab"]')
    expect(tabs.length).toBe(2)
    expect(tabs[0].text()).toBe('Extractibilité')
    expect(tabs[1].text()).toBe('Lisibilité')
  })

  it('has Extractibilité tab selected by default', () => {
    const { wrapper } = mountGeo()
    const tabs = wrapper.findAll('[role="tab"]')
    expect(tabs[0].attributes('aria-selected')).toBe('true')
    expect(tabs[1].attributes('aria-selected')).toBe('false')
  })

  it('switches to Lisibilité tab on click', async () => {
    const { wrapper } = mountGeo()
    const tabs = wrapper.findAll('[role="tab"]')
    await tabs[1].trigger('click')
    expect(tabs[0].attributes('aria-selected')).toBe('false')
    expect(tabs[1].attributes('aria-selected')).toBe('true')
  })

  it('has aria-controls on each tab', () => {
    const { wrapper } = mountGeo()
    const tabs = wrapper.findAll('[role="tab"]')
    expect(tabs[0].attributes('aria-controls')).toBe('geo-tabpanel-extractibilite')
    expect(tabs[1].attributes('aria-controls')).toBe('geo-tabpanel-lisibilite')
  })

  it('renders tabpanel for active tab', () => {
    const { wrapper } = mountGeo()
    expect(wrapper.find('#geo-tabpanel-extractibilite').exists()).toBe(true)
  })

  it('lazy-mounts Lisibilité tab only after first click', async () => {
    const { wrapper } = mountGeo()
    // Not yet visited
    expect(wrapper.find('#geo-tabpanel-lisibilite').exists()).toBe(false)
    // Click tab
    await wrapper.findAll('[role="tab"]')[1].trigger('click')
    expect(wrapper.find('#geo-tabpanel-lisibilite').exists()).toBe(true)
  })

  // --- Tab content ---
  it('renders ExtractibilityTab in the first tab panel', () => {
    const { wrapper } = mountGeo()
    expect(wrapper.findComponent({ name: 'ExtractibilityTab' }).exists()).toBe(true)
  })

  it('renders ReadabilityTab after switching to Lisibilité', async () => {
    const { wrapper } = mountGeo()
    await wrapper.findAll('[role="tab"]')[1].trigger('click')
    expect(wrapper.findComponent({ name: 'ReadabilityTab' }).exists()).toBe(true)
  })
})
