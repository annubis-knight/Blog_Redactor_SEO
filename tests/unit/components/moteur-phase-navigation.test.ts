import { describe, it, expect } from 'vitest'
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

describe('MoteurPhaseNavigation', () => {
  it('renders 2 phase groups with correct labels', () => {
    const wrapper = mount(MoteurPhaseNavigation, {
      props: { phases, activeTab: 'discovery' },
    })

    const groups = wrapper.findAll('.phase-group')
    expect(groups).toHaveLength(2)

    const labels = wrapper.findAll('.phase-label')
    expect(labels[0].text()).toBe('Explorer')
    expect(labels[1].text()).toBe('Valider')
  })

  it('renders phase numbers ①②', () => {
    const wrapper = mount(MoteurPhaseNavigation, {
      props: { phases, activeTab: 'discovery' },
    })

    const numbers = wrapper.findAll('.phase-number')
    expect(numbers[0].text()).toBe('1')
    expect(numbers[1].text()).toBe('2')
  })

  it('renders all tabs within each phase', () => {
    const wrapper = mount(MoteurPhaseNavigation, {
      props: { phases, activeTab: 'discovery' },
    })

    const tabs = wrapper.findAll('.phase-tab')
    // 2 + 3 = 5 tabs total
    expect(tabs).toHaveLength(5)

    expect(tabs[0].text()).toContain('Discovery')
    expect(tabs[1].text()).toContain('Radar')
    expect(tabs[2].text()).toBe('Capitaine')
    expect(tabs[3].text()).toBe('Lieutenants')
    expect(tabs[4].text()).toBe('Lexique')
  })

  it('highlights the active phase', () => {
    const wrapper = mount(MoteurPhaseNavigation, {
      props: { phases, activeTab: 'capitaine' },
    })

    const groups = wrapper.findAll('.phase-group')
    expect(groups[0].classes()).not.toContain('phase-group--active')
    expect(groups[1].classes()).toContain('phase-group--active')
  })

  it('highlights the active tab', () => {
    const wrapper = mount(MoteurPhaseNavigation, {
      props: { phases, activeTab: 'lieutenants' },
    })

    const tabs = wrapper.findAll('.phase-tab')
    const lieutenantsTab = tabs[3]
    expect(lieutenantsTab.classes()).toContain('phase-tab--active')

    // Other tabs should not be active
    expect(tabs[0].classes()).not.toContain('phase-tab--active')
    expect(tabs[2].classes()).not.toContain('phase-tab--active')
  })

  it('emits update:activeTab when clicking a tab', async () => {
    const wrapper = mount(MoteurPhaseNavigation, {
      props: { phases, activeTab: 'discovery' },
    })

    const tabs = wrapper.findAll('.phase-tab')
    await tabs[2].trigger('click') // Click "Capitaine"

    expect(wrapper.emitted('update:activeTab')).toBeTruthy()
    expect(wrapper.emitted('update:activeTab')![0]).toEqual(['capitaine'])
  })

  it('navigates freely between phases by clicking tabs', async () => {
    const wrapper = mount(MoteurPhaseNavigation, {
      props: { phases, activeTab: 'discovery' },
    })

    const tabs = wrapper.findAll('.phase-tab')

    // Phase ① → Phase ②
    await tabs[3].trigger('click') // Click Lieutenants
    expect(wrapper.emitted('update:activeTab')![0]).toEqual(['lieutenants'])

    // Phase ② → Phase ①
    await tabs[1].trigger('click') // Click Radar
    expect(wrapper.emitted('update:activeTab')![1]).toEqual(['radar'])
  })

  it('emits update:activeTab when clicking a phase header', async () => {
    const wrapper = mount(MoteurPhaseNavigation, {
      props: { phases, activeTab: 'discovery' },
    })

    const headers = wrapper.findAll('.phase-header')
    await headers[1].trigger('click') // Click Phase ② header

    // Should navigate to first tab of Phase ②
    expect(wrapper.emitted('update:activeTab')![0]).toEqual(['capitaine'])
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
    await tabs[2].trigger('click')

    expect(wrapper.emitted('update:activeTab')).toBeFalsy()
  })

  it('marks optional tabs with optional class', () => {
    const wrapper = mount(MoteurPhaseNavigation, {
      props: { phases, activeTab: 'discovery' },
    })

    const tabs = wrapper.findAll('.phase-tab')
    expect(tabs[0].classes()).toContain('phase-tab--optional') // Discovery
    expect(tabs[1].classes()).toContain('phase-tab--optional') // Radar
    expect(tabs[2].classes()).not.toContain('phase-tab--optional') // Capitaine
  })

  it('marks locked tabs and prevents clicks', async () => {
    const lockedPhases: Phase[] = [
      {
        id: 'generer',
        label: 'Explorer',
        number: 1,
        tabs: [
          { id: 'discovery', label: 'Discovery', optional: true, locked: true },
          { id: 'radar', label: 'Radar', optional: true, locked: true },
        ],
      },
      ...phases.slice(1),
    ]

    const wrapper = mount(MoteurPhaseNavigation, {
      props: { phases: lockedPhases, activeTab: 'capitaine' },
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
        label: 'Explorer',
        number: 1,
        tabs: [
          { id: 'discovery', label: 'Discovery', optional: true, locked: true },
          { id: 'radar', label: 'Radar', optional: true, locked: true },
        ],
      },
      ...phases.slice(1),
    ]

    const wrapper = mount(MoteurPhaseNavigation, {
      props: { phases: lockedPhases, activeTab: 'capitaine' },
    })

    const headers = wrapper.findAll('.phase-header')
    await headers[0].trigger('click') // Click Phase ① header

    // All Phase ① tabs are locked — should not emit (or emit nothing clickable)
    const emitted = wrapper.emitted('update:activeTab')
    if (emitted) {
      // If it emits, it should NOT be a locked tab
      expect(['discovery', 'radar']).not.toContain(emitted[0][0])
    }
  })
})
