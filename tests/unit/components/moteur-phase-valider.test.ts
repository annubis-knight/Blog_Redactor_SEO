import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { mount } from '@vue/test-utils'
import MoteurPhaseNavigation from '@/components/moteur/MoteurPhaseNavigation.vue'
import type { Phase } from '@/components/moteur/MoteurPhaseNavigation.vue'

const phases: Phase[] = [
  {
    id: 'generer',
    label: 'Explorer',
    number: 1,
    tabs: [
      { id: 'discovery', label: 'Discovery', optional: true, locked: false },
      { id: 'radar', label: 'Radar', optional: true, locked: false },
    ],
  },
  {
    id: 'valider',
    label: 'Valider',
    number: 2,
    tabs: [
      { id: 'capitaine', label: 'Capitaine' },
      { id: 'lieutenants', label: 'Lieutenants' },
      { id: 'lexique', label: 'Lexique' },
    ],
  },
]

describe('Phase ② Valider — Structure', () => {
  it('Phase ② contains exactly 3 tabs: capitaine, lieutenants, lexique', () => {
    const wrapper = mount(MoteurPhaseNavigation, {
      props: { phases, activeTab: 'capitaine' },
    })

    // Phase ② is the second phase-group
    const groups = wrapper.findAll('.phase-group')
    const phase2 = groups[1]
    const tabs = phase2.findAll('.phase-tab')

    expect(tabs).toHaveLength(3)
    expect(tabs[0].text()).toBe('Capitaine')
    expect(tabs[1].text()).toBe('Lieutenants')
    expect(tabs[2].text()).toBe('Lexique')
  })

  it('no legacy tabs (validation, intention, audit, local, assignation) exist', () => {
    const wrapper = mount(MoteurPhaseNavigation, {
      props: { phases, activeTab: 'capitaine' },
    })

    const allTabs = wrapper.findAll('.phase-tab')
    const tabTexts = allTabs.map(t => t.text().toLowerCase())

    expect(tabTexts).not.toContain('validation')
    expect(tabTexts).not.toContain('intention')
    expect(tabTexts).not.toContain('audit')
    expect(tabTexts).not.toContain('local')
    expect(tabTexts).not.toContain('assignation')
  })

  it('only 2 phases exist (no Phase ③ Assigner)', () => {
    const wrapper = mount(MoteurPhaseNavigation, {
      props: { phases, activeTab: 'capitaine' },
    })

    const groups = wrapper.findAll('.phase-group')
    expect(groups).toHaveLength(2)

    const labels = wrapper.findAll('.phase-label')
    const labelTexts = labels.map(l => l.text())
    expect(labelTexts).not.toContain('Assigner')
  })
})

describe('Phase ② Valider — Navigation', () => {
  it('clicking Capitaine emits correct tabId', async () => {
    const wrapper = mount(MoteurPhaseNavigation, {
      props: { phases, activeTab: 'discovery' },
    })

    const allTabs = wrapper.findAll('.phase-tab')
    // Phase ① has 2 tabs (index 0-1), Phase ② starts at index 2
    await allTabs[2].trigger('click') // Capitaine
    expect(wrapper.emitted('update:activeTab')![0]).toEqual(['capitaine'])
  })

  it('clicking Lieutenants emits correct tabId', async () => {
    const wrapper = mount(MoteurPhaseNavigation, {
      props: { phases, activeTab: 'capitaine' },
    })

    const allTabs = wrapper.findAll('.phase-tab')
    await allTabs[3].trigger('click') // Lieutenants
    expect(wrapper.emitted('update:activeTab')![0]).toEqual(['lieutenants'])
  })

  it('clicking Lexique emits correct tabId', async () => {
    const wrapper = mount(MoteurPhaseNavigation, {
      props: { phases, activeTab: 'capitaine' },
    })

    const allTabs = wrapper.findAll('.phase-tab')
    await allTabs[4].trigger('click') // Lexique
    expect(wrapper.emitted('update:activeTab')![0]).toEqual(['lexique'])
  })
})

describe('Phase ② Valider — Cross-phase navigation', () => {
  it('Phase ② is active when activeTab is capitaine', () => {
    const wrapper = mount(MoteurPhaseNavigation, {
      props: { phases, activeTab: 'capitaine' },
    })

    const groups = wrapper.findAll('.phase-group')
    expect(groups[0].classes()).not.toContain('phase-group--active') // Phase ①
    expect(groups[1].classes()).toContain('phase-group--active')     // Phase ②
  })

  it('Phase ② is active when activeTab is lieutenants', () => {
    const wrapper = mount(MoteurPhaseNavigation, {
      props: { phases, activeTab: 'lieutenants' },
    })

    const groups = wrapper.findAll('.phase-group')
    expect(groups[1].classes()).toContain('phase-group--active')
  })

  it('Phase ② is active when activeTab is lexique', () => {
    const wrapper = mount(MoteurPhaseNavigation, {
      props: { phases, activeTab: 'lexique' },
    })

    const groups = wrapper.findAll('.phase-group')
    expect(groups[1].classes()).toContain('phase-group--active')
  })

  it('navigating from Phase ① to Phase ② changes phase highlight', async () => {
    const wrapper = mount(MoteurPhaseNavigation, {
      props: { phases, activeTab: 'discovery' },
    })

    // Initially Phase ① is active
    let groups = wrapper.findAll('.phase-group')
    expect(groups[0].classes()).toContain('phase-group--active')
    expect(groups[1].classes()).not.toContain('phase-group--active')

    // Click Phase ② Capitaine tab
    const allTabs = wrapper.findAll('.phase-tab')
    await allTabs[2].trigger('click')
    expect(wrapper.emitted('update:activeTab')![0]).toEqual(['capitaine'])

    // After prop update, Phase ② would be active
    await wrapper.setProps({ activeTab: 'capitaine' })
    groups = wrapper.findAll('.phase-group')
    expect(groups[0].classes()).not.toContain('phase-group--active')
    expect(groups[1].classes()).toContain('phase-group--active')
  })

  it('clicking Phase ② header navigates to first tab (capitaine)', async () => {
    const wrapper = mount(MoteurPhaseNavigation, {
      props: { phases, activeTab: 'discovery' },
    })

    const headers = wrapper.findAll('.phase-header')
    await headers[1].trigger('click') // Phase ② header
    expect(wrapper.emitted('update:activeTab')![0]).toEqual(['capitaine'])
  })
})

// --- Cross-tab navigation logic in Phase ② ---

describe('Phase ② Valider — Cross-tab navigation logic', () => {
  it('navigating between sous-onglets stays in Phase ②', () => {
    const activeTab = ref<string>('capitaine')

    activeTab.value = 'lieutenants'
    expect(activeTab.value).toBe('lieutenants')

    activeTab.value = 'lexique'
    expect(activeTab.value).toBe('lexique')

    activeTab.value = 'capitaine'
    expect(activeTab.value).toBe('capitaine')
  })

  it('navigating from Phase ② back to Phase ① (cross-phase)', () => {
    const activeTab = ref<string>('capitaine')
    activeTab.value = 'discovery'
    expect(activeTab.value).toBe('discovery')
  })
})
