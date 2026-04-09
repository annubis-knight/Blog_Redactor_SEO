import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SerpDataTab from '@/components/panels/SerpDataTab.vue'
import type { DataForSeoCacheEntry } from '@shared/types/dataforseo.types'

function makeSerpData(overrides: Partial<DataForSeoCacheEntry> = {}): DataForSeoCacheEntry {
  return {
    keyword: 'seo',
    keywordData: {
      searchVolume: 12000,
      difficulty: 65,
      cpc: 2.5,
      competition: 0.73,
      monthlySearches: [],
    },
    serp: [
      { position: 1, title: 'Guide SEO', url: 'https://example.com/seo', description: 'Desc', domain: 'example.com' },
      { position: 2, title: 'SEO Tips', url: 'https://other.com/tips', description: 'Desc', domain: 'other.com' },
    ],
    paa: [
      { question: 'Qu\'est-ce que le SEO ?', answer: 'Le SEO est...' },
      { question: 'Comment optimiser ?', answer: null },
    ],
    relatedKeywords: [
      { keyword: 'référencement naturel', searchVolume: 8000, competition: 0.6, cpc: 1.8 },
      { keyword: 'optimisation seo', searchVolume: 3000, competition: 0.4, cpc: 1.2 },
    ],
    cachedAt: '2026-04-01T12:00:00Z',
    ...overrides,
  }
}

describe('SerpDataTab', () => {
  it('shows no-data message when data is null', () => {
    const wrapper = mount(SerpDataTab, {
      props: { data: null, isRefreshing: false },
    })

    expect(wrapper.text()).toContain('Aucune donnée SERP disponible')
    expect(wrapper.find('.refresh-btn').exists()).toBe(true)
  })

  it('shows loading text when refreshing and no data', () => {
    const wrapper = mount(SerpDataTab, {
      props: { data: null, isRefreshing: true },
    })

    expect(wrapper.find('.refresh-btn').text()).toBe('Chargement...')
    expect(wrapper.find('.refresh-btn').attributes('disabled')).toBeDefined()
  })

  it('emits refresh when button clicked', async () => {
    const wrapper = mount(SerpDataTab, {
      props: { data: null, isRefreshing: false },
    })

    await wrapper.find('.refresh-btn').trigger('click')
    expect(wrapper.emitted('refresh')).toHaveLength(1)
  })

  it('renders overview cards with correct values', () => {
    const wrapper = mount(SerpDataTab, {
      props: { data: makeSerpData(), isRefreshing: false },
    })

    const text = wrapper.text()
    expect(text).toContain('Volume')
    expect(text).toContain('Difficulté')
    expect(text).toContain('65/100')
    expect(text).toContain('CPC')
    expect(text).toContain('2.50')
    expect(text).toContain('Concurrence')
    expect(text).toContain('73%')
  })

  it('renders SERP top results collapsible', () => {
    const wrapper = mount(SerpDataTab, {
      props: { data: makeSerpData(), isRefreshing: false },
    })

    expect(wrapper.text()).toContain('SERP Top 2')
  })

  it('expands SERP section on click', async () => {
    const wrapper = mount(SerpDataTab, {
      props: { data: makeSerpData(), isRefreshing: false },
    })

    const headers = wrapper.findAll('.collapsible-header')
    await headers[0].trigger('click')

    expect(wrapper.text()).toContain('Guide SEO')
    expect(wrapper.text()).toContain('example.com')
  })

  it('renders PAA section', () => {
    const wrapper = mount(SerpDataTab, {
      props: { data: makeSerpData(), isRefreshing: false },
    })

    expect(wrapper.text()).toContain('People Also Ask (2)')
  })

  it('expands PAA section and shows questions', async () => {
    const wrapper = mount(SerpDataTab, {
      props: { data: makeSerpData(), isRefreshing: false },
    })

    const headers = wrapper.findAll('.collapsible-header')
    const paaHeader = headers.find(h => h.text().includes('People Also Ask'))!
    await paaHeader.trigger('click')

    expect(wrapper.text()).toContain('Qu\'est-ce que le SEO ?')
    expect(wrapper.text()).toContain('Le SEO est...')
  })

  it('renders related keywords section', () => {
    const wrapper = mount(SerpDataTab, {
      props: { data: makeSerpData(), isRefreshing: false },
    })

    expect(wrapper.text()).toContain('Mots-clés associés (2)')
  })

  it('hides PAA section when no questions', () => {
    const wrapper = mount(SerpDataTab, {
      props: { data: makeSerpData({ paa: [] }), isRefreshing: false },
    })

    expect(wrapper.text()).not.toContain('People Also Ask')
  })

  it('hides related keywords section when empty', () => {
    const wrapper = mount(SerpDataTab, {
      props: { data: makeSerpData({ relatedKeywords: [] }), isRefreshing: false },
    })

    expect(wrapper.text()).not.toContain('Mots-clés associés')
  })

  it('only expands one section at a time', async () => {
    const wrapper = mount(SerpDataTab, {
      props: { data: makeSerpData(), isRefreshing: false },
    })

    const headers = wrapper.findAll('.collapsible-header')

    // Open SERP
    await headers[0].trigger('click')
    expect(wrapper.findAll('.collapsible.open')).toHaveLength(1)

    // Open PAA (should close SERP)
    await headers[1].trigger('click')
    expect(wrapper.findAll('.collapsible.open')).toHaveLength(1)
    expect(wrapper.text()).toContain('Qu\'est-ce que le SEO ?')
  })

  it('shows cache date and refresh button in footer', () => {
    const wrapper = mount(SerpDataTab, {
      props: { data: makeSerpData(), isRefreshing: false },
    })

    expect(wrapper.find('.cache-info').exists()).toBe(true)
    expect(wrapper.find('.refresh-btn-sm').exists()).toBe(true)
  })

  it('emits refresh from footer button', async () => {
    const wrapper = mount(SerpDataTab, {
      props: { data: makeSerpData(), isRefreshing: false },
    })

    await wrapper.find('.refresh-btn-sm').trigger('click')
    expect(wrapper.emitted('refresh')).toHaveLength(1)
  })
})
