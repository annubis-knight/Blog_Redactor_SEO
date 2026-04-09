import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import IndicatorsTab from '@/components/panels/indicators/IndicatorsTab.vue'
import IndicatorCard from '@/components/panels/indicators/IndicatorCard.vue'
import { useSeoStore } from '@/stores/seo.store'
import type { SeoScore, CannibalizationWarning } from '@shared/types/seo.types.js'

function makeSeoScore(overrides: Partial<SeoScore> = {}): SeoScore {
  return {
    global: 72,
    wordCount: 1500,
    readingTimeMinutes: 8,
    paragraphCount: 12,
    imageAnalysis: { total: 3, withAlt: 2, withKeywordInAlt: 1 },
    slugHasKeyword: true,
    hasArticleKeywords: true,
    keywordDensities: [
      { keyword: 'seo', type: 'Pilier', occurrences: 15, density: 2.0, target: { min: 1.5, max: 2.5 }, inTarget: true, matchMethod: 'exact' },
      { keyword: 'référencement', type: 'Moyenne traine', occurrences: 8, density: 1.1, target: { min: 0.8, max: 1.5 }, inTarget: true, matchMethod: 'semantic' },
    ],
    headingValidation: { isValid: true, h1Count: 1, h2Count: 3, h3Count: 2, errors: [] },
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
      { keyword: 'seo', location: 'slug', label: 'URL / Slug', isPresent: true, matchMethod: 'exact', matchScore: 1 },
      { keyword: 'seo', location: 'imageAlt', label: 'Alt images', isPresent: false, matchMethod: 'none', matchScore: 0 },
    ],
    nlpTerms: [],
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

// Card order: Meta(0), Structure(1), Density(2), Alerts(3)

describe('IndicatorsTab', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders 4 indicator cards', () => {
    const seoStore = useSeoStore()
    seoStore.score = makeSeoScore()

    const wrapper = mount(IndicatorsTab, {
      props: { cannibalizationWarnings: [], contentLengthTarget: 1500 },
    })

    expect(wrapper.findAllComponents(IndicatorCard)).toHaveLength(4)
  })

  it('renders N/A in open card when no score', () => {
    const wrapper = mount(IndicatorsTab, {
      props: { cannibalizationWarnings: [], contentLengthTarget: 1500 },
    })

    // Meta card is open by default, shows N/A when no score
    expect(wrapper.find('.ind-na').exists()).toBe(true)
  })

  it('accordion mode — meta card is open by default', () => {
    const seoStore = useSeoStore()
    seoStore.score = makeSeoScore()

    const wrapper = mount(IndicatorsTab, {
      props: { cannibalizationWarnings: [], contentLengthTarget: 1500 },
    })

    const headers = wrapper.findAll('.card-header')
    expect(headers.length).toBe(4)
    // Meta(0) open, others closed
    expect(headers[0].attributes('aria-expanded')).toBe('true')
    expect(headers[1].attributes('aria-expanded')).toBe('false')
    expect(headers[2].attributes('aria-expanded')).toBe('false')
    expect(headers[3].attributes('aria-expanded')).toBe('false')
  })

  it('accordion mode — opening one card closes the other', async () => {
    const seoStore = useSeoStore()
    seoStore.score = makeSeoScore()

    const wrapper = mount(IndicatorsTab, {
      props: { cannibalizationWarnings: [], contentLengthTarget: 1500 },
    })

    const headers = wrapper.findAll('.card-header')

    // Click Structure card(1) → opens it, closes Meta(0)
    await headers[1].trigger('click')
    expect(headers[1].attributes('aria-expanded')).toBe('true')
    expect(headers[0].attributes('aria-expanded')).toBe('false')

    // Click same card again → closes it (all closed)
    await headers[1].trigger('click')
    expect(headers[1].attributes('aria-expanded')).toBe('false')
  })

  it('accordion mode — re-clicking opens a closed card', async () => {
    const seoStore = useSeoStore()
    seoStore.score = makeSeoScore()

    const wrapper = mount(IndicatorsTab, {
      props: { cannibalizationWarnings: [], contentLengthTarget: 1500 },
    })

    const headers = wrapper.findAll('.card-header')

    // Close Meta(0)
    await headers[0].trigger('click')
    expect(headers[0].attributes('aria-expanded')).toBe('false')

    // Re-open Meta
    await headers[0].trigger('click')
    expect(headers[0].attributes('aria-expanded')).toBe('true')
  })

  it('displays cannibalization warnings in alerts card', async () => {
    const seoStore = useSeoStore()
    seoStore.score = makeSeoScore()

    const warnings: CannibalizationWarning[] = [
      { keyword: 'seo', conflictingSlug: 'other-article', conflictingTitle: 'Other Article' },
    ]

    const wrapper = mount(IndicatorsTab, {
      props: { cannibalizationWarnings: warnings, contentLengthTarget: 1500 },
    })

    // Open alerts card (index 3)
    await wrapper.findAll('.card-header')[3].trigger('click')

    expect(wrapper.text()).toContain('Cannibalisation')
    expect(wrapper.text()).toContain('Other Article')
  })

  it('shows image alert when images lack alt', async () => {
    const seoStore = useSeoStore()
    seoStore.score = makeSeoScore({
      imageAnalysis: { total: 5, withAlt: 2, withKeywordInAlt: 0 },
    })

    const wrapper = mount(IndicatorsTab, {
      props: { cannibalizationWarnings: [], contentLengthTarget: 1500 },
    })

    // Open alerts card (index 3)
    await wrapper.findAll('.card-header')[3].trigger('click')

    expect(wrapper.text()).toContain('3 images sans attribut alt')
  })

  it('shows density over-optimization warning', async () => {
    const seoStore = useSeoStore()
    seoStore.score = makeSeoScore({
      keywordDensities: [
        { keyword: 'seo', type: 'Pilier', occurrences: 30, density: 4.0, target: { min: 1.5, max: 2.5 }, inTarget: false, matchMethod: 'exact' },
      ],
    })

    const wrapper = mount(IndicatorsTab, {
      props: { cannibalizationWarnings: [], contentLengthTarget: 1500 },
    })

    // Open alerts card (index 3)
    await wrapper.findAll('.card-header')[3].trigger('click')

    expect(wrapper.text()).toContain('Sur-optimisation')
  })

  it('structure card shows word count progress', async () => {
    const seoStore = useSeoStore()
    seoStore.score = makeSeoScore({ wordCount: 1000 })

    const wrapper = mount(IndicatorsTab, {
      props: { cannibalizationWarnings: [], contentLengthTarget: 2000 },
    })

    // Open structure card (index 1)
    await wrapper.findAll('.card-header')[1].trigger('click')

    expect(wrapper.text()).toContain('1000 / 2000')
  })

  it('structure card shows H2/H3 counts', async () => {
    const seoStore = useSeoStore()
    seoStore.score = makeSeoScore({
      headingValidation: { isValid: true, h1Count: 1, h2Count: 4, h3Count: 2, errors: [] },
    })

    const wrapper = mount(IndicatorsTab, {
      props: { cannibalizationWarnings: [], contentLengthTarget: 1500 },
    })

    // Open structure card (index 1)
    await wrapper.findAll('.card-header')[1].trigger('click')

    expect(wrapper.text()).toContain('4 H2')
    expect(wrapper.text()).toContain('2 H3')
  })

  it('meta card shows title and description lengths', () => {
    const seoStore = useSeoStore()
    seoStore.score = makeSeoScore()

    const wrapper = mount(IndicatorsTab, {
      props: { cannibalizationWarnings: [], contentLengthTarget: 1500 },
    })

    // Meta card is open by default (index 0)
    expect(wrapper.text()).toContain('55 / 60')
    expect(wrapper.text()).toContain('155 / 160')
  })
})
