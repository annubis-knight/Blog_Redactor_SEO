import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import TabCachePanel from '@/components/moteur/TabCachePanel.vue'
import type { TabCacheEntry } from '@/components/moteur/TabCachePanel.vue'

function createEntries(overrides: Partial<TabCacheEntry>[] = []): TabCacheEntry[] {
  const defaults: TabCacheEntry[] = [
    { tabId: 'discovery', tabLabel: 'Discovery', dbCount: 0, cacheCount: 0, isCurrentTab: false },
    { tabId: 'radar', tabLabel: 'Radar', dbCount: 0, cacheCount: 0, isCurrentTab: false },
    { tabId: 'validation', tabLabel: 'Validation', dbCount: 0, cacheCount: 0, isCurrentTab: false },
    { tabId: 'intention', tabLabel: 'Intention', dbCount: 0, cacheCount: 0, isCurrentTab: false },
    { tabId: 'audit', tabLabel: 'Audit', dbCount: 0, cacheCount: 0, isCurrentTab: false },
    { tabId: 'local', tabLabel: 'Local', dbCount: 0, cacheCount: 0, isCurrentTab: false },
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

    const chips = wrapper.findAll('.tcp__chip')
    expect(chips).toHaveLength(6)
  })

  it('marks chips with data with tcp__chip--filled', () => {
    const entries = createEntries([
      { tabId: 'discovery', dbCount: 5 },
      { tabId: 'audit', cacheCount: 3 },
    ])
    const wrapper = mount(TabCachePanel, {
      props: { entries, activeTab: 'radar' },
    })

    const chips = wrapper.findAll('.tcp__chip')
    expect(chips[0].classes()).toContain('tcp__chip--filled')
    expect(chips[1].classes()).toContain('tcp__chip--empty')
    expect(chips[4].classes()).toContain('tcp__chip--filled')
  })

  it('marks empty entries with tcp__chip--empty class', () => {
    const entries = createEntries()
    const wrapper = mount(TabCachePanel, {
      props: { entries, activeTab: 'discovery' },
    })

    const chips = wrapper.findAll('.tcp__chip')
    for (const chip of chips) {
      expect(chip.classes()).toContain('tcp__chip--empty')
    }
  })

  // Sprint 4 (2026-05-04) — la classe `tcp__chip--current` (border bleue)
  // a été retirée : la signalétique de l'onglet actif est portée par la
  // navbar. Test legacy supprimé.

  it('displays tab label in each chip', () => {
    const entries = createEntries()
    const wrapper = mount(TabCachePanel, {
      props: { entries, activeTab: 'discovery' },
    })

    const labels = wrapper.findAll('.tcp__chip-label')
    expect(labels[0].text()).toBe('Discovery')
    expect(labels[3].text()).toBe('Intention')
  })

  it('renders DB and cache counts in each chip', () => {
    const entries = createEntries([
      { tabId: 'discovery', dbCount: 12 },
      { tabId: 'radar', cacheCount: 5 },
    ])
    const wrapper = mount(TabCachePanel, {
      props: { entries, activeTab: 'validation' },
    })

    const chips = wrapper.findAll('.tcp__chip')
    expect(chips[0].text()).toContain('12') // dbCount discovery
    expect(chips[1].text()).toContain('5')  // cacheCount radar
  })

  it('marks zero counts with tcp__num--zero class', () => {
    const entries = createEntries([
      { tabId: 'discovery', dbCount: 7 },
    ])
    const wrapper = mount(TabCachePanel, {
      props: { entries, activeTab: 'discovery' },
    })

    const chips = wrapper.findAll('.tcp__chip')
    // discovery has dbCount=7, cacheCount=0 → cache num is zero
    const discoveryNums = chips[0].findAll('.tcp__num')
    expect(discoveryNums[0].classes()).not.toContain('tcp__num--zero')
    expect(discoveryNums[1].classes()).toContain('tcp__num--zero')
  })

  // Sprint 4 (2026-05-04) — l'event `navigate` a été supprimé : les chips
  // sont devenues read-only (cf. tab-cache-panel-readonly.test.ts pour les
  // nouveaux verrous). Les 2 tests legacy "emits navigate when clicking
  // a filled chip" ont été retirés car par essence obsolètes.

  it('renders clear-cache button when showClearCache and cache > 0', () => {
    const entries = createEntries([
      { tabId: 'discovery', cacheCount: 4 },
    ])
    const wrapper = mount(TabCachePanel, {
      props: { entries, activeTab: 'radar', showClearCache: true },
    })

    expect(wrapper.find('[data-testid="tcp-clear-cache"]').exists()).toBe(true)
  })
})
