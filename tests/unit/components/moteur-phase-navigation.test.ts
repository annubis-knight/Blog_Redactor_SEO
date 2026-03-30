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

describe('MoteurPhaseNavigation', () => {
  it('renders 3 phase groups with correct labels', () => {
    const wrapper = mount(MoteurPhaseNavigation, {
      props: { phases, activeTab: 'discovery' },
    })

    const groups = wrapper.findAll('.phase-group')
    expect(groups).toHaveLength(3)

    const labels = wrapper.findAll('.phase-label')
    expect(labels[0].text()).toBe('Générer')
    expect(labels[1].text()).toBe('Valider')
    expect(labels[2].text()).toBe('Assigner')
  })

  it('renders phase numbers ①②③', () => {
    const wrapper = mount(MoteurPhaseNavigation, {
      props: { phases, activeTab: 'discovery' },
    })

    const numbers = wrapper.findAll('.phase-number')
    expect(numbers[0].text()).toBe('1')
    expect(numbers[1].text()).toBe('2')
    expect(numbers[2].text()).toBe('3')
  })

  it('renders all tabs within each phase', () => {
    const wrapper = mount(MoteurPhaseNavigation, {
      props: { phases, activeTab: 'discovery' },
    })

    const tabs = wrapper.findAll('.phase-tab')
    // 3 + 4 + 1 = 8 tabs total
    expect(tabs).toHaveLength(8)

    expect(tabs[0].text()).toContain('Discovery')
    expect(tabs[1].text()).toContain('Douleur Intent')
    expect(tabs[2].text()).toBe('Douleur')
    expect(tabs[3].text()).toBe('Validation')
    expect(tabs[4].text()).toBe('Exploration')
    expect(tabs[5].text()).toBe('Audit')
    expect(tabs[6].text()).toBe('Local')
    expect(tabs[7].text()).toBe('Assignation')
  })

  it('highlights the active phase', () => {
    const wrapper = mount(MoteurPhaseNavigation, {
      props: { phases, activeTab: 'validation' },
    })

    const groups = wrapper.findAll('.phase-group')
    expect(groups[0].classes()).not.toContain('phase-group--active')
    expect(groups[1].classes()).toContain('phase-group--active')
    expect(groups[2].classes()).not.toContain('phase-group--active')
  })

  it('highlights the active tab', () => {
    const wrapper = mount(MoteurPhaseNavigation, {
      props: { phases, activeTab: 'audit' },
    })

    const tabs = wrapper.findAll('.phase-tab')
    const auditTab = tabs[5]
    expect(auditTab.classes()).toContain('phase-tab--active')

    // Other tabs should not be active
    expect(tabs[0].classes()).not.toContain('phase-tab--active')
    expect(tabs[3].classes()).not.toContain('phase-tab--active')
  })

  it('emits update:activeTab when clicking a tab', async () => {
    const wrapper = mount(MoteurPhaseNavigation, {
      props: { phases, activeTab: 'discovery' },
    })

    const tabs = wrapper.findAll('.phase-tab')
    await tabs[3].trigger('click') // Click "Validation"

    expect(wrapper.emitted('update:activeTab')).toBeTruthy()
    expect(wrapper.emitted('update:activeTab')![0]).toEqual(['validation'])
  })

  it('navigates freely between phases by clicking tabs', async () => {
    const wrapper = mount(MoteurPhaseNavigation, {
      props: { phases, activeTab: 'discovery' },
    })

    const tabs = wrapper.findAll('.phase-tab')

    // Phase ① → Phase ②
    await tabs[5].trigger('click') // Click Audit
    expect(wrapper.emitted('update:activeTab')![0]).toEqual(['audit'])

    // Phase ② → Phase ③
    await tabs[7].trigger('click') // Click Assignation
    expect(wrapper.emitted('update:activeTab')![1]).toEqual(['assignation'])

    // Phase ③ → Phase ①
    await tabs[2].trigger('click') // Click Douleur
    expect(wrapper.emitted('update:activeTab')![2]).toEqual(['douleur'])
  })

  it('emits update:activeTab when clicking a phase header', async () => {
    const wrapper = mount(MoteurPhaseNavigation, {
      props: { phases, activeTab: 'discovery' },
    })

    const headers = wrapper.findAll('.phase-header')
    await headers[1].trigger('click') // Click Phase ② header

    // Should navigate to first tab of Phase ②
    expect(wrapper.emitted('update:activeTab')![0]).toEqual(['validation'])
  })

  it('disables all tabs when disabled prop is true', () => {
    const wrapper = mount(MoteurPhaseNavigation, {
      props: { phases, activeTab: 'discovery', disabled: true },
    })

    expect(wrapper.find('.phase-nav').classes()).toContain('phase-nav--disabled')

    const tabs = wrapper.findAll('.phase-tab')
    tabs.forEach(tab => {
      expect(tab.attributes('disabled')).toBeDefined()
    })
  })

  it('does not emit when clicking a tab while disabled', async () => {
    const wrapper = mount(MoteurPhaseNavigation, {
      props: { phases, activeTab: 'discovery', disabled: true },
    })

    const tabs = wrapper.findAll('.phase-tab')
    await tabs[3].trigger('click')

    expect(wrapper.emitted('update:activeTab')).toBeFalsy()
  })

  it('marks optional tabs with optional class', () => {
    const wrapper = mount(MoteurPhaseNavigation, {
      props: { phases, activeTab: 'discovery' },
    })

    const tabs = wrapper.findAll('.phase-tab')
    expect(tabs[0].classes()).toContain('phase-tab--optional') // Discovery
    expect(tabs[1].classes()).toContain('phase-tab--optional') // Douleur Intent
    expect(tabs[2].classes()).not.toContain('phase-tab--optional') // Douleur
  })

  it('marks locked tabs and prevents clicks', async () => {
    const lockedPhases: Phase[] = [
      {
        id: 'generer',
        label: 'Générer',
        number: 1,
        tabs: [
          { id: 'discovery', label: 'Discovery', optional: true, locked: true },
          { id: 'douleur-intent', label: 'Douleur Intent', optional: true, locked: true },
          { id: 'douleur', label: 'Douleur' },
        ],
      },
      ...phases.slice(1),
    ]

    const wrapper = mount(MoteurPhaseNavigation, {
      props: { phases: lockedPhases, activeTab: 'douleur' },
    })

    const tabs = wrapper.findAll('.phase-tab')
    expect(tabs[0].classes()).toContain('phase-tab--locked')
    expect(tabs[1].classes()).toContain('phase-tab--locked')

    await tabs[0].trigger('click')
    expect(wrapper.emitted('update:activeTab')).toBeFalsy()
  })

  it('phase header skips locked tabs and selects first available', async () => {
    const lockedPhases: Phase[] = [
      {
        id: 'generer',
        label: 'Générer',
        number: 1,
        tabs: [
          { id: 'discovery', label: 'Discovery', optional: true, locked: true },
          { id: 'douleur-intent', label: 'Douleur Intent', optional: true, locked: true },
          { id: 'douleur', label: 'Douleur' },
        ],
      },
      ...phases.slice(1),
    ]

    const wrapper = mount(MoteurPhaseNavigation, {
      props: { phases: lockedPhases, activeTab: 'validation' },
    })

    const headers = wrapper.findAll('.phase-header')
    await headers[0].trigger('click') // Click Phase ① header

    // Should skip locked discovery and douleur-intent, go to douleur
    expect(wrapper.emitted('update:activeTab')![0]).toEqual(['douleur'])
  })
})
