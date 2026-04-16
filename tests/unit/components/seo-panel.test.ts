import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import SeoPanel from '@/components/panels/SeoPanel.vue'
import { useSeoStore } from '@/stores/seo.store'
import { useArticleKeywordsStore } from '@/stores/article-keywords.store'
import type { SeoScore } from '@shared/types/seo.types.js'

// Mock useCannibalization to avoid real API calls — must return a real ref
vi.mock('@/composables/seo/useCannibalization', () => ({
  useCannibalization: () => ({ warnings: ref([]), refresh: vi.fn() }),
}))

// Mock briefStore
vi.mock('@/stores/brief.store', () => ({
  useBriefStore: () => ({
    briefData: null,
    isRefreshing: false,
    refreshDataForSeo: vi.fn(),
  }),
}))

function makeSeoScore(overrides: Partial<SeoScore> = {}): SeoScore {
  return {
    global: 72,
    wordCount: 1500,
    readingTimeMinutes: 8,
    paragraphCount: 12,
    imageAnalysis: { total: 3, withAlt: 2, withKeywordInAlt: 1 },
    slugHasKeyword: true,
    hasArticleKeywords: true,
    keywordDensities: [],
    headingValidation: { isValid: true, h1Count: 1, h2Count: 0, h3Count: 0, errors: [] },
    lieutenantPresence: [],
    lexiqueCoverage: null,
    metaAnalysis: {
      titleLength: 55,
      titleInRange: true,
      descriptionLength: 155,
      descriptionInRange: true,
      titleHasKeyword: true,
      descriptionHasKeyword: true,
    },
    checklistItems: [
      { keyword: 'seo', location: 'h1', label: 'Titre H1', isPresent: true, matchMethod: 'exact', matchScore: 1 },
      { keyword: 'seo', location: 'metaTitle', label: 'Meta title', isPresent: true, matchMethod: 'exact', matchScore: 1 },
    ],
    nlpTerms: [
      { term: 'optimisation', isDetected: true, searchVolume: 1000 },
      { term: 'référencement', isDetected: false, searchVolume: 800 },
    ],
    factors: {
      keywordPilierScore: 90,
      keywordSecondaryScore: 75,
      headingScore: 100,
      metaTitleScore: 80,
      metaDescriptionScore: 85,
      contentLengthScore: 60,
    },
    ...overrides,
  }
}

describe('SeoPanel', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders tab bar with 3 tabs when no score (empty state)', () => {
    const wrapper = mount(SeoPanel)

    expect(wrapper.find('.seo-tabs').exists()).toBe(true)
    expect(wrapper.findAll('.seo-tab')).toHaveLength(3)
  })

  it('renders tab bar with 3 tabs when score exists', () => {
    const seoStore = useSeoStore()
    seoStore.score = makeSeoScore()

    const wrapper = mount(SeoPanel)

    const tabs = wrapper.findAll('.seo-tab')
    expect(tabs).toHaveLength(3)
    expect(tabs[0].text()).toBe('Mots-clefs')
    expect(tabs[1].text()).toBe('Indicateurs')
    expect(tabs[2].text()).toBe('SERP Data')
  })

  it('shows Indicateurs tab active by default', () => {
    const seoStore = useSeoStore()
    seoStore.score = makeSeoScore()

    const wrapper = mount(SeoPanel)

    const tabs = wrapper.findAll('.seo-tab')
    expect(tabs[1].classes()).toContain('active')
    expect(tabs[0].classes()).not.toContain('active')
  })

  it('has ARIA attributes on tab bar', () => {
    const seoStore = useSeoStore()
    seoStore.score = makeSeoScore()

    const wrapper = mount(SeoPanel)

    expect(wrapper.find('.seo-tabs').attributes('role')).toBe('tablist')
    const tabs = wrapper.findAll('.seo-tab')
    expect(tabs[1].attributes('role')).toBe('tab')
    expect(tabs[1].attributes('aria-selected')).toBe('true')
    expect(tabs[0].attributes('aria-selected')).toBe('false')
    expect(tabs[1].attributes('aria-controls')).toBe('seo-tabpanel-indicateurs')
  })

  it('has role=tabpanel on tab panels', () => {
    const seoStore = useSeoStore()
    seoStore.score = makeSeoScore()

    const wrapper = mount(SeoPanel)

    const panel = wrapper.find('#seo-tabpanel-indicateurs')
    expect(panel.exists()).toBe(true)
    expect(panel.attributes('role')).toBe('tabpanel')
  })

  it('switches active tab on click', async () => {
    const seoStore = useSeoStore()
    seoStore.score = makeSeoScore()

    const wrapper = mount(SeoPanel)

    const tabs = wrapper.findAll('.seo-tab')
    await tabs[0].trigger('click') // Mots-clefs

    expect(tabs[0].classes()).toContain('active')
    expect(wrapper.find('#seo-tabpanel-mots-clefs').isVisible()).toBe(true)
  })

  it('shows score section with ScoreGauge and reading time', () => {
    const seoStore = useSeoStore()
    seoStore.score = makeSeoScore()

    const wrapper = mount(SeoPanel)

    expect(wrapper.find('.score-section').exists()).toBe(true)
    expect(wrapper.find('.word-count').text()).toContain('1500 mots')
    expect(wrapper.find('.reading-time').text()).toContain('~8 min')
  })

  it('shows warning when no article keywords defined', () => {
    const seoStore = useSeoStore()
    seoStore.score = makeSeoScore({ hasArticleKeywords: false })

    const wrapper = mount(SeoPanel)

    const warnings = wrapper.findAll('.panel-warning')
    expect(warnings.length).toBeGreaterThanOrEqual(1)
  })

  it('empty state: navigates between all tabs without crash', async () => {
    const wrapper = mount(SeoPanel)

    const tabs = wrapper.findAll('.seo-tab')
    expect(tabs).toHaveLength(3)

    for (let i = 0; i < tabs.length; i++) {
      await tabs[i].trigger('click')
      expect(tabs[i].classes()).toContain('active')
    }

    expect(wrapper.find('#seo-tabpanel-mots-clefs').exists()).toBe(true)
    expect(wrapper.find('#seo-tabpanel-indicateurs').exists()).toBe(true)
    expect(wrapper.find('#seo-tabpanel-serp-data').exists()).toBe(true)
  })

  it('renders indicator cards in indicateurs tab', () => {
    const seoStore = useSeoStore()
    seoStore.score = makeSeoScore()

    const wrapper = mount(SeoPanel)

    const cards = wrapper.findAll('.indicator-card')
    expect(cards.length).toBe(4)
  })

  it('shows keyword select in mots-clefs tab', async () => {
    const seoStore = useSeoStore()
    seoStore.score = makeSeoScore()

    const wrapper = mount(SeoPanel)

    await wrapper.findAll('.seo-tab')[0].trigger('click')

    expect(wrapper.find('.keyword-select').exists()).toBe(true)
  })

  it('shows NlpTerms when category is nlp', async () => {
    const seoStore = useSeoStore()
    seoStore.score = makeSeoScore()

    const wrapper = mount(SeoPanel)

    await wrapper.findAll('.seo-tab')[0].trigger('click')
    const select = wrapper.find('.keyword-select')
    await select.setValue('nlp')

    expect(wrapper.find('.nlp-terms').exists()).toBe(true)
  })

  it('shows SeoKeywordChip when keywords exist and category is capitaine', async () => {
    const seoStore = useSeoStore()
    seoStore.score = makeSeoScore()

    const articleKeywordsStore = useArticleKeywordsStore()
    articleKeywordsStore.keywords = {
      articleSlug: 'test',
      capitaine: 'seo-local',
      lieutenants: ['référencement', 'google'],
      lexique: ['optimisation', 'balise'],
      rootKeywords: [],
    }

    const wrapper = mount(SeoPanel)

    await wrapper.findAll('.seo-tab')[0].trigger('click')

    expect(wrapper.find('.seo-chip').exists()).toBe(true)
    expect(wrapper.find('.chip-keyword').text()).toBe('seo-local')
  })
})
