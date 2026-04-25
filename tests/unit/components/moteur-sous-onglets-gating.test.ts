import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, computed, defineComponent, h } from 'vue'
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

describe('Phase ② Valider — Sous-onglets Navigation', () => {
  it('Phase ② contains exactly 3 tabs: capitaine, lieutenants, lexique', () => {
    const wrapper = mount(MoteurPhaseNavigation, {
      props: { phases, activeTab: 'capitaine' },
    })

    const groups = wrapper.findAll('.phase-group')
    const phase2 = groups[1]
    const tabs = phase2.findAll('.phase-tab')

    expect(tabs).toHaveLength(3)
    expect(tabs[0].text()).toBe('Capitaine')
    expect(tabs[1].text()).toBe('Lieutenants')
    expect(tabs[2].text()).toBe('Lexique')
  })

  it('Phase ② is active when activeTab is capitaine', () => {
    const wrapper = mount(MoteurPhaseNavigation, {
      props: { phases, activeTab: 'capitaine' },
    })

    const groups = wrapper.findAll('.phase-group')
    expect(groups[0].classes()).not.toContain('phase-group--active')
    expect(groups[1].classes()).toContain('phase-group--active')
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

  it('clicking Phase ② header navigates to capitaine', async () => {
    const wrapper = mount(MoteurPhaseNavigation, {
      props: { phases, activeTab: 'discovery' },
    })

    const headers = wrapper.findAll('.phase-header')
    await headers[1].trigger('click') // Phase ② header
    expect(wrapper.emitted('update:activeTab')![0]).toEqual(['capitaine'])
  })
})

// --- Soft gating harness for Phase ② sous-onglets ---

const SoftGateHarness = defineComponent({
  props: {
    isCaptaineLocked: { type: Boolean, default: false },
    isLieutenantsLocked: { type: Boolean, default: false },
    activeTab: { type: String, default: 'capitaine' },
  },
  setup(props) {
    return () => {
      if (props.activeTab === 'capitaine') {
        return h('div', { class: 'tab-content' }, [
          h('div', { class: 'subtab-placeholder' }, 'Capitaine placeholder'),
        ])
      }

      if (props.activeTab === 'lieutenants') {
        const children = []
        if (!props.isCaptaineLocked) {
          children.push(
            h('div', { class: 'soft-gate-message' }, [
              h('p', "Verrouillez d'abord le Capitaine pour débloquer les actions Lieutenants."),
            ]),
          )
        }
        children.push(
          h('div', { class: props.isCaptaineLocked ? '' : 'content-disabled' }, [
            h('div', { class: 'subtab-placeholder' }, 'Lieutenants placeholder'),
          ]),
        )
        return h('div', { class: 'tab-content' }, children)
      }

      if (props.activeTab === 'lexique') {
        const children = []
        if (!props.isLieutenantsLocked) {
          children.push(
            h('div', { class: 'soft-gate-message' }, [
              h('p', "Verrouillez d'abord les Lieutenants pour débloquer les actions Lexique."),
            ]),
          )
        }
        children.push(
          h('div', { class: props.isLieutenantsLocked ? '' : 'content-disabled' }, [
            h('div', { class: 'subtab-placeholder' }, 'Lexique placeholder'),
          ]),
        )
        return h('div', { class: 'tab-content' }, children)
      }

      return h('div', 'Other tab')
    }
  },
})

describe('Phase ② Valider — Soft gating Lieutenants', () => {
  it('shows soft gate message when capitaine is NOT locked', () => {
    const wrapper = mount(SoftGateHarness, {
      props: { isCaptaineLocked: false, activeTab: 'lieutenants' },
    })

    expect(wrapper.find('.soft-gate-message').exists()).toBe(true)
    expect(wrapper.find('.soft-gate-message').text()).toContain('Verrouillez d\'abord le Capitaine')
    expect(wrapper.find('.content-disabled').exists()).toBe(true)
  })

  it('hides soft gate message when capitaine IS locked', () => {
    const wrapper = mount(SoftGateHarness, {
      props: { isCaptaineLocked: true, activeTab: 'lieutenants' },
    })

    expect(wrapper.find('.soft-gate-message').exists()).toBe(false)
    expect(wrapper.find('.content-disabled').exists()).toBe(false)
  })

  it('placeholder content remains visible even with gate message (soft gating)', () => {
    const wrapper = mount(SoftGateHarness, {
      props: { isCaptaineLocked: false, activeTab: 'lieutenants' },
    })

    expect(wrapper.find('.soft-gate-message').exists()).toBe(true)
    expect(wrapper.find('.subtab-placeholder').exists()).toBe(true)
  })
})

describe('Phase ② Valider — Soft gating Lexique', () => {
  it('shows soft gate message when lieutenants is NOT locked', () => {
    const wrapper = mount(SoftGateHarness, {
      props: { isLieutenantsLocked: false, activeTab: 'lexique' },
    })

    expect(wrapper.find('.soft-gate-message').exists()).toBe(true)
    expect(wrapper.find('.soft-gate-message').text()).toContain('Verrouillez d\'abord les Lieutenants')
    expect(wrapper.find('.content-disabled').exists()).toBe(true)
  })

  it('hides soft gate message when lieutenants IS locked', () => {
    const wrapper = mount(SoftGateHarness, {
      props: { isLieutenantsLocked: true, activeTab: 'lexique' },
    })

    expect(wrapper.find('.soft-gate-message').exists()).toBe(false)
    expect(wrapper.find('.content-disabled').exists()).toBe(false)
  })

  it('placeholder content remains visible even with gate message (soft gating)', () => {
    const wrapper = mount(SoftGateHarness, {
      props: { isLieutenantsLocked: false, activeTab: 'lexique' },
    })

    expect(wrapper.find('.soft-gate-message').exists()).toBe(true)
    expect(wrapper.find('.subtab-placeholder').exists()).toBe(true)
  })
})

// --- isCaptaineLocked / isLieutenantsLocked computed logic ---

describe('Phase ② Valider — Lock computed logic', () => {
  function createLockComputed(completedChecks: string[]) {
    const progress = ref({ completedChecks })
    const isCaptaineLocked = computed(() =>
      progress.value.completedChecks.includes('moteur:capitaine_locked'),
    )
    const isLieutenantsLocked = computed(() =>
      progress.value.completedChecks.includes('moteur:lieutenants_locked'),
    )
    return { isCaptaineLocked, isLieutenantsLocked }
  }

  it('isCaptaineLocked is false when check not present', () => {
    const { isCaptaineLocked } = createLockComputed([])
    expect(isCaptaineLocked.value).toBe(false)
  })

  it('isCaptaineLocked is true when check present', () => {
    const { isCaptaineLocked } = createLockComputed(['moteur:capitaine_locked'])
    expect(isCaptaineLocked.value).toBe(true)
  })

  it('isLieutenantsLocked is false when check not present', () => {
    const { isLieutenantsLocked } = createLockComputed(['moteur:capitaine_locked'])
    expect(isLieutenantsLocked.value).toBe(false)
  })

  it('isLieutenantsLocked is true when check present', () => {
    const { isLieutenantsLocked } = createLockComputed(['moteur:capitaine_locked', 'moteur:lieutenants_locked'])
    expect(isLieutenantsLocked.value).toBe(true)
  })
})
