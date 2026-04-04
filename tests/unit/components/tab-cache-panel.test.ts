import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import TabCachePanel from '@/components/moteur/TabCachePanel.vue'
import type { TabCacheEntry } from '@/components/moteur/TabCachePanel.vue'

function createEntries(overrides: Partial<TabCacheEntry>[] = []): TabCacheEntry[] {
  const defaults: TabCacheEntry[] = [
    { tabId: 'discovery', tabLabel: 'Discovery', hasCachedData: false, isCurrentTab: false },
    { tabId: 'radar', tabLabel: 'Radar', hasCachedData: false, isCurrentTab: false },
    { tabId: 'validation', tabLabel: 'Validation', hasCachedData: false, isCurrentTab: false },
    { tabId: 'intention', tabLabel: 'Intention', hasCachedData: false, isCurrentTab: false },
    { tabId: 'audit', tabLabel: 'Audit', hasCachedData: false, isCurrentTab: false },
    { tabId: 'local', tabLabel: 'Local', hasCachedData: false, isCurrentTab: false },
  ]

  for (const o of overrides) {
    const idx = defaults.findIndex(e => e.tabId === o.tabId)
    if (idx >= 0) Object.assign(defaults[idx], o)
  }

  return defaults
}

describe('TabCachePanel', () => {
  it('renders a chip for each entry', () => {
    const entries = createEntries()
    const wrapper = mount(TabCachePanel, {
      props: { entries, activeTab: 'discovery' },
    })

    const chips = wrapper.findAll('.tcp-chip')
    expect(chips).toHaveLength(6)
  })

  it('marks cached entries with tcp-chip--cached class', () => {
    const entries = createEntries([
      { tabId: 'discovery', hasCachedData: true },
      { tabId: 'audit', hasCachedData: true },
    ])
    const wrapper = mount(TabCachePanel, {
      props: { entries, activeTab: 'radar' },
    })

    const chips = wrapper.findAll('.tcp-chip')
    expect(chips[0].classes()).toContain('tcp-chip--cached')
    expect(chips[1].classes()).toContain('tcp-chip--empty')
    expect(chips[4].classes()).toContain('tcp-chip--cached')
  })

  it('marks empty entries with tcp-chip--empty class', () => {
    const entries = createEntries()
    const wrapper = mount(TabCachePanel, {
      props: { entries, activeTab: 'discovery' },
    })

    const chips = wrapper.findAll('.tcp-chip')
    for (const chip of chips) {
      expect(chip.classes()).toContain('tcp-chip--empty')
    }
  })

  it('marks current tab with tcp-chip--current class', () => {
    const entries = createEntries([
      { tabId: 'radar', isCurrentTab: true },
    ])
    const wrapper = mount(TabCachePanel, {
      props: { entries, activeTab: 'radar' },
    })

    const chips = wrapper.findAll('.tcp-chip')
    expect(chips[1].classes()).toContain('tcp-chip--current')
    expect(chips[0].classes()).not.toContain('tcp-chip--current')
  })

  it('shows checkmark icon for cached entries', () => {
    const entries = createEntries([
      { tabId: 'discovery', hasCachedData: true },
    ])
    const wrapper = mount(TabCachePanel, {
      props: { entries, activeTab: 'radar' },
    })

    const chips = wrapper.findAll('.tcp-chip')
    expect(chips[0].find('.tcp-chip-icon').exists()).toBe(true)
    expect(chips[1].find('.tcp-chip-icon').exists()).toBe(false)
  })

  it('displays tab label in each chip', () => {
    const entries = createEntries()
    const wrapper = mount(TabCachePanel, {
      props: { entries, activeTab: 'discovery' },
    })

    const labels = wrapper.findAll('.tcp-chip-label')
    expect(labels[0].text()).toBe('Discovery')
    expect(labels[3].text()).toBe('Intention')
  })

  it('displays summary for cached entries that have one', () => {
    const entries = createEntries([
      { tabId: 'discovery', hasCachedData: true, summary: '45 mots-clés' },
      { tabId: 'radar', hasCachedData: true },
    ])
    const wrapper = mount(TabCachePanel, {
      props: { entries, activeTab: 'validation' },
    })

    const chips = wrapper.findAll('.tcp-chip')
    expect(chips[0].find('.tcp-chip-summary').exists()).toBe(true)
    expect(chips[0].find('.tcp-chip-summary').text()).toBe('45 mots-clés')
    // Radar has no summary
    expect(chips[1].find('.tcp-chip-summary').exists()).toBe(false)
  })

  it('does not display summary for empty entries', () => {
    const entries = createEntries([
      { tabId: 'discovery', hasCachedData: false, summary: 'should not appear' },
    ])
    const wrapper = mount(TabCachePanel, {
      props: { entries, activeTab: 'radar' },
    })

    const chips = wrapper.findAll('.tcp-chip')
    expect(chips[0].find('.tcp-chip-summary').exists()).toBe(false)
  })

  it('emits navigate when clicking a cached chip', async () => {
    const entries = createEntries([
      { tabId: 'audit', hasCachedData: true },
    ])
    const wrapper = mount(TabCachePanel, {
      props: { entries, activeTab: 'discovery' },
    })

    const chips = wrapper.findAll('.tcp-chip')
    await chips[4].trigger('click') // audit
    expect(wrapper.emitted('navigate')).toBeTruthy()
    expect(wrapper.emitted('navigate')![0]).toEqual(['audit'])
  })

  it('does NOT emit navigate when clicking an empty chip', async () => {
    const entries = createEntries()
    const wrapper = mount(TabCachePanel, {
      props: { entries, activeTab: 'discovery' },
    })

    const chips = wrapper.findAll('.tcp-chip')
    await chips[2].trigger('click') // validation, empty
    expect(wrapper.emitted('navigate')).toBeFalsy()
  })

  it('displays correct cached count in label', () => {
    const entries = createEntries([
      { tabId: 'discovery', hasCachedData: true },
      { tabId: 'audit', hasCachedData: true },
      { tabId: 'local', hasCachedData: true },
    ])
    const wrapper = mount(TabCachePanel, {
      props: { entries, activeTab: 'radar' },
    })

    expect(wrapper.find('.tcp-label').text()).toContain('3/6')
  })

  it('displays 0 cached count when nothing is cached', () => {
    const entries = createEntries()
    const wrapper = mount(TabCachePanel, {
      props: { entries, activeTab: 'discovery' },
    })

    expect(wrapper.find('.tcp-label').text()).toContain('0/6')
  })
})
