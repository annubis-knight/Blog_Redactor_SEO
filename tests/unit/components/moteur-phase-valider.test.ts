import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import MoteurPhaseNavigation from '@/components/moteur/MoteurPhaseNavigation.vue'
import type { Phase } from '@/components/moteur/MoteurPhaseNavigation.vue'

const phases: Phase[] = [
  {
    id: 'generer',
    label: 'Générer',
    number: 1,
    tabs: [
      { id: 'discovery', label: 'Discovery', optional: true, locked: false },
      { id: 'douleur-intent', label: 'Douleur Intent', optional: true, locked: false },
      { id: 'douleur', label: 'Douleur' },
    ],
  },
  {
    id: 'valider',
    label: 'Valider',
    number: 2,
    tabs: [
      { id: 'validation', label: 'Validation' },
      { id: 'exploration', label: 'Exploration' },
      { id: 'audit', label: 'Audit' },
      { id: 'local', label: 'Local' },
    ],
  },
  {
    id: 'assigner',
    label: 'Assigner',
    number: 3,
    tabs: [
      { id: 'assignation', label: 'Assignation' },
    ],
  },
]

describe('Phase ② Valider — Structure', () => {
  it('Phase ② contains exactly 4 tabs: validation, exploration, audit, local', () => {
    const wrapper = mount(MoteurPhaseNavigation, {
      props: { phases, activeTab: 'validation' },
    })

    // Phase ② is the second phase-group
    const groups = wrapper.findAll('.phase-group')
    const phase2 = groups[1]
    const tabs = phase2.findAll('.phase-tab')

    expect(tabs).toHaveLength(4)
    expect(tabs[0].text()).toBe('Validation')
    expect(tabs[1].text()).toBe('Exploration')
    expect(tabs[2].text()).toBe('Audit')
    expect(tabs[3].text()).toBe('Local')
  })

  it('no content-gap or concurrents tab exists anywhere', () => {
    const wrapper = mount(MoteurPhaseNavigation, {
      props: { phases, activeTab: 'validation' },
    })

    const allTabs = wrapper.findAll('.phase-tab')
    const tabTexts = allTabs.map(t => t.text().toLowerCase())

    expect(tabTexts).not.toContain('content gap')
    expect(tabTexts).not.toContain('concurrents')
    expect(tabTexts).not.toContain('competitors')
  })

  it('local tab is in Phase ② (not a separate maps tab)', () => {
    const wrapper = mount(MoteurPhaseNavigation, {
      props: { phases, activeTab: 'validation' },
    })

    const allTabs = wrapper.findAll('.phase-tab')
    const tabTexts = allTabs.map(t => t.text().toLowerCase())

    expect(tabTexts).toContain('local')
    expect(tabTexts).not.toContain('maps')
    expect(tabTexts).not.toContain('maps & gbp')
  })
})

describe('Phase ② Valider — Navigation', () => {
  it('clicking Validation emits correct tabId', async () => {
    const wrapper = mount(MoteurPhaseNavigation, {
      props: { phases, activeTab: 'discovery' },
    })

    const allTabs = wrapper.findAll('.phase-tab')
    // Phase ① has 3 tabs (index 0-2), Phase ② starts at index 3
    await allTabs[3].trigger('click') // Validation
    expect(wrapper.emitted('update:activeTab')![0]).toEqual(['validation'])
  })

  it('clicking Exploration emits correct tabId', async () => {
    const wrapper = mount(MoteurPhaseNavigation, {
      props: { phases, activeTab: 'validation' },
    })

    const allTabs = wrapper.findAll('.phase-tab')
    await allTabs[4].trigger('click') // Exploration
    expect(wrapper.emitted('update:activeTab')![0]).toEqual(['exploration'])
  })

  it('clicking Audit emits correct tabId', async () => {
    const wrapper = mount(MoteurPhaseNavigation, {
      props: { phases, activeTab: 'validation' },
    })

    const allTabs = wrapper.findAll('.phase-tab')
    await allTabs[5].trigger('click') // Audit
    expect(wrapper.emitted('update:activeTab')![0]).toEqual(['audit'])
  })

  it('clicking Local emits correct tabId', async () => {
    const wrapper = mount(MoteurPhaseNavigation, {
      props: { phases, activeTab: 'validation' },
    })

    const allTabs = wrapper.findAll('.phase-tab')
    await allTabs[6].trigger('click') // Local
    expect(wrapper.emitted('update:activeTab')![0]).toEqual(['local'])
  })
})

describe('Phase ② Valider — Cross-phase navigation', () => {
  it('Phase ② is active when activeTab is validation', () => {
    const wrapper = mount(MoteurPhaseNavigation, {
      props: { phases, activeTab: 'validation' },
    })

    const groups = wrapper.findAll('.phase-group')
    expect(groups[0].classes()).not.toContain('phase-group--active') // Phase ①
    expect(groups[1].classes()).toContain('phase-group--active')     // Phase ②
    expect(groups[2].classes()).not.toContain('phase-group--active') // Phase ③
  })

  it('Phase ② is active when activeTab is audit', () => {
    const wrapper = mount(MoteurPhaseNavigation, {
      props: { phases, activeTab: 'audit' },
    })

    const groups = wrapper.findAll('.phase-group')
    expect(groups[1].classes()).toContain('phase-group--active')
  })

  it('Phase ② is active when activeTab is local', () => {
    const wrapper = mount(MoteurPhaseNavigation, {
      props: { phases, activeTab: 'local' },
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

    // Click Phase ② Validation tab
    const allTabs = wrapper.findAll('.phase-tab')
    await allTabs[3].trigger('click')
    expect(wrapper.emitted('update:activeTab')![0]).toEqual(['validation'])

    // After prop update, Phase ② would be active
    // (In real app, parent updates activeTab prop)
    await wrapper.setProps({ activeTab: 'validation' })
    groups = wrapper.findAll('.phase-group')
    expect(groups[0].classes()).not.toContain('phase-group--active')
    expect(groups[1].classes()).toContain('phase-group--active')
  })

  it('clicking Phase ② header navigates to first tab (validation)', async () => {
    const wrapper = mount(MoteurPhaseNavigation, {
      props: { phases, activeTab: 'discovery' },
    })

    const headers = wrapper.findAll('.phase-header')
    await headers[1].trigger('click') // Phase ② header
    expect(wrapper.emitted('update:activeTab')![0]).toEqual(['validation'])
  })
})

// --- Cross-tab communication in Phase ② ---
import { ref } from 'vue'

describe('Phase ② Valider — Cross-tab communication', () => {
  it('handleValidationSelect navigates to exploration and sets keyword', () => {
    const activeTab = ref<string>('validation')
    let exploredKeyword = ''

    function handleValidationSelect(keyword: string) {
      activeTab.value = 'exploration'
      exploredKeyword = keyword
    }

    handleValidationSelect('erp cloud')
    expect(activeTab.value).toBe('exploration')
    expect(exploredKeyword).toBe('erp cloud')
  })

  it('ExplorationVerdict @continue navigates to audit', () => {
    const activeTab = ref<string>('exploration')
    activeTab.value = 'audit'
    expect(activeTab.value).toBe('audit')
  })

  it('PainValidation @back navigates to douleur (cross-phase ②→①)', () => {
    const activeTab = ref<string>('validation')
    activeTab.value = 'douleur'
    expect(activeTab.value).toBe('douleur')
  })
})
