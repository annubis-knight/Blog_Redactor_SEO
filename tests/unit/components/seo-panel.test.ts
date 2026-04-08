import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import SeoPanel from '@/components/panels/SeoPanel.vue'
import { useSeoStore } from '@/stores/seo.store'
import { useArticleKeywordsStore } from '@/stores/article-keywords.store'
import type { SeoScore } from '@shared/types/seo.types.js'

function makeSeoScore(overrides: Partial<SeoScore> = {}): SeoScore {
  return {
    global: 72,
    wordCount: 1500,
    hasArticleKeywords: true,
    keywordDensities: [],
    headingValidation: { isValid: true, errors: [] },
    metaAnalysis: {
      titleLength: 55,
      titleInRange: true,
      descriptionLength: 155,
      descriptionInRange: true,
      titleHasKeyword: true,
      descriptionHasKeyword: true,
    },
    checklistItems: [
      { keyword: 'seo', location: 'h1', label: 'H1 présent', isPresent: true, matchMethod: 'exact', matchScore: 1 },
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

  it('renders tab bar with 5 tabs when no score (empty state)', () => {
    const wrapper = mount(SeoPanel)

    expect(wrapper.find('.seo-tabs').exists()).toBe(true)
    expect(wrapper.findAll('.seo-tab')).toHaveLength(5)
    expect(wrapper.find('.na-text').exists()).toBe(true)
  })

  it('renders tab bar with 5 tabs when score exists', () => {
    const seoStore = useSeoStore()
    seoStore.score = makeSeoScore()

    const wrapper = mount(SeoPanel)

    const tabs = wrapper.findAll('.seo-tab')
    expect(tabs).toHaveLength(5)
    expect(tabs[0].text()).toBe('Mots-clefs')
    expect(tabs[1].text()).toBe('Hiérarchie')
    expect(tabs[2].text()).toBe('Balises')
    expect(tabs[3].text()).toBe('Checklist')
    expect(tabs[4].text()).toBe('Facteurs')
  })

  it('shows Mots-clefs tab active by default', () => {
    const seoStore = useSeoStore()
    seoStore.score = makeSeoScore()

    const wrapper = mount(SeoPanel)

    const tabs = wrapper.findAll('.seo-tab')
    expect(tabs[0].classes()).toContain('active')
    expect(tabs[1].classes()).not.toContain('active')
  })

  it('has ARIA attributes on tab bar', () => {
    const seoStore = useSeoStore()
    seoStore.score = makeSeoScore()

    const wrapper = mount(SeoPanel)

    expect(wrapper.find('.seo-tabs').attributes('role')).toBe('tablist')
    const tabs = wrapper.findAll('.seo-tab')
    expect(tabs[0].attributes('role')).toBe('tab')
    expect(tabs[0].attributes('aria-selected')).toBe('true')
    expect(tabs[1].attributes('aria-selected')).toBe('false')
    expect(tabs[0].attributes('aria-controls')).toBe('seo-tabpanel-mots-clefs')
  })

  it('has role=tabpanel on tab panels', () => {
    const seoStore = useSeoStore()
    seoStore.score = makeSeoScore()

    const wrapper = mount(SeoPanel)

    const panel = wrapper.find('#seo-tabpanel-mots-clefs')
    expect(panel.exists()).toBe(true)
    expect(panel.attributes('role')).toBe('tabpanel')
  })

  it('switches active tab on click', async () => {
    const seoStore = useSeoStore()
    seoStore.score = makeSeoScore()

    const wrapper = mount(SeoPanel)

    const tabs = wrapper.findAll('.seo-tab')
    await tabs[1].trigger('click') // Hiérarchie

    expect(tabs[1].classes()).toContain('active')
    expect(wrapper.find('.validation-ok').isVisible()).toBe(true)
  })

  it('shows keyword select dropdown in mots-clefs tab', () => {
    const seoStore = useSeoStore()
    seoStore.score = makeSeoScore()

    const wrapper = mount(SeoPanel)

    expect(wrapper.find('.keyword-select').exists()).toBe(true)
  })

  it('shows warning when no article keywords and category is not NLP', () => {
    const seoStore = useSeoStore()
    seoStore.score = makeSeoScore()

    const wrapper = mount(SeoPanel)

    const warnings = wrapper.findAll('.panel-warning')
    expect(warnings.length).toBeGreaterThanOrEqual(1)
  })

  it('shows NlpTerms when category is nlp', async () => {
    const seoStore = useSeoStore()
    seoStore.score = makeSeoScore()

    const wrapper = mount(SeoPanel)

    const select = wrapper.find('.keyword-select')
    await select.setValue('nlp')

    expect(wrapper.find('.nlp-terms').exists()).toBe(true)
  })

  it('shows KeywordListPanel when keywords exist and category is capitaine', () => {
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

    expect(wrapper.find('.keyword-list-panel').exists()).toBe(true)
    expect(wrapper.find('.keyword-tag').text()).toBe('seo-local')
  })

  it('shows heading validation in hierarchie tab', async () => {
    const seoStore = useSeoStore()
    seoStore.score = makeSeoScore({
      headingValidation: {
        isValid: false,
        errors: [{ message: 'H1 manquant', level: 1 }],
      },
    })

    const wrapper = mount(SeoPanel)

    await wrapper.findAll('.seo-tab')[1].trigger('click')

    expect(wrapper.find('.validation-error').text()).toBe('H1 manquant')
  })

  it('shows meta analysis in balises tab', async () => {
    const seoStore = useSeoStore()
    seoStore.score = makeSeoScore()

    const wrapper = mount(SeoPanel)

    await wrapper.findAll('.seo-tab')[2].trigger('click')

    const metaItems = wrapper.findAll('.meta-item')
    expect(metaItems.length).toBeGreaterThanOrEqual(2)
    expect(metaItems[0].find('.meta-label').text()).toBe('Title')
  })

  it('shows factors in facteurs tab', async () => {
    const seoStore = useSeoStore()
    seoStore.score = makeSeoScore()

    const wrapper = mount(SeoPanel)

    await wrapper.findAll('.seo-tab')[4].trigger('click')

    const factorItems = wrapper.findAll('.factor-item')
    expect(factorItems).toHaveLength(6)
  })

  it('does not crash when score is null and select is disabled (AC13)', () => {
    const wrapper = mount(SeoPanel)

    const select = wrapper.find('.keyword-select')
    expect(select.exists()).toBe(true)
    expect((select.element as HTMLSelectElement).disabled).toBe(true)
  })

  it('does not crash when keywords is null (AC12)', () => {
    const seoStore = useSeoStore()
    seoStore.score = makeSeoScore()

    const wrapper = mount(SeoPanel)

    expect(wrapper.find('.panel-warning').exists()).toBe(true)
  })

  it('shows score section with ScoreGauge', () => {
    const seoStore = useSeoStore()
    seoStore.score = makeSeoScore()

    const wrapper = mount(SeoPanel)

    expect(wrapper.find('.score-section').exists()).toBe(true)
    expect(wrapper.find('.word-count').text()).toContain('1500 mots')
  })

  it('empty state has tab bar and disabled select', () => {
    const wrapper = mount(SeoPanel)

    expect(wrapper.findAll('.seo-tab')).toHaveLength(5)
    expect(wrapper.find('.keyword-select').exists()).toBe(true)
    expect((wrapper.find('.keyword-select').element as HTMLSelectElement).disabled).toBe(true)
  })

  it('empty state facteurs tab shows dashes', async () => {
    const wrapper = mount(SeoPanel)

    await wrapper.findAll('.seo-tab')[4].trigger('click')

    const scores = wrapper.findAll('.factor-score')
    expect(scores).toHaveLength(6)
    for (const score of scores) {
      expect(score.text()).toBe('-')
    }
  })

  // F12: Empty state tab navigation
  it('empty state: navigates between all tabs without crash', async () => {
    const wrapper = mount(SeoPanel)

    const tabs = wrapper.findAll('.seo-tab')
    expect(tabs).toHaveLength(5)

    // Click through all tabs sequentially
    for (let i = 0; i < tabs.length; i++) {
      await tabs[i].trigger('click')
      expect(tabs[i].classes()).toContain('active')
    }

    // Verify each tabpanel was created (visitedTabs accumulated)
    expect(wrapper.find('#seo-tabpanel-mots-clefs').exists()).toBe(true)
    expect(wrapper.find('#seo-tabpanel-hierarchie').exists()).toBe(true)
    expect(wrapper.find('#seo-tabpanel-balises').exists()).toBe(true)
    expect(wrapper.find('#seo-tabpanel-checklist').exists()).toBe(true)
    expect(wrapper.find('#seo-tabpanel-facteurs').exists()).toBe(true)
  })

  it('empty state: hierarchie tab shows N/A', async () => {
    const wrapper = mount(SeoPanel)

    await wrapper.findAll('.seo-tab')[1].trigger('click')

    const panel = wrapper.find('#seo-tabpanel-hierarchie')
    expect(panel.isVisible()).toBe(true)
    expect(panel.find('.na-text').text()).toBe('N/A')
  })

  it('empty state: balises tab shows meta placeholders', async () => {
    const wrapper = mount(SeoPanel)

    await wrapper.findAll('.seo-tab')[2].trigger('click')

    const panel = wrapper.find('#seo-tabpanel-balises')
    expect(panel.isVisible()).toBe(true)
    const metaItems = panel.findAll('.meta-item')
    expect(metaItems).toHaveLength(2)
    expect(metaItems[0].find('.meta-label').text()).toBe('Title')
    expect(metaItems[0].find('.na-text').text()).toBe('-')
  })
})
