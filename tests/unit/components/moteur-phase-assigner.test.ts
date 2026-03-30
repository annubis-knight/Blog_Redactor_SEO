import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, computed, defineComponent, h } from 'vue'
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

describe('Phase ③ Assigner — Navigation', () => {
  it('Phase ③ contains exactly 1 tab: assignation', () => {
    const wrapper = mount(MoteurPhaseNavigation, {
      props: { phases, activeTab: 'assignation' },
    })

    const groups = wrapper.findAll('.phase-group')
    const phase3 = groups[2]
    const tabs = phase3.findAll('.phase-tab')

    expect(tabs).toHaveLength(1)
    expect(tabs[0].text()).toBe('Assignation')
  })

  it('Phase ③ is active when activeTab is assignation', () => {
    const wrapper = mount(MoteurPhaseNavigation, {
      props: { phases, activeTab: 'assignation' },
    })

    const groups = wrapper.findAll('.phase-group')
    expect(groups[0].classes()).not.toContain('phase-group--active')
    expect(groups[1].classes()).not.toContain('phase-group--active')
    expect(groups[2].classes()).toContain('phase-group--active')
  })

  it('clicking Phase ③ header navigates to assignation', async () => {
    const wrapper = mount(MoteurPhaseNavigation, {
      props: { phases, activeTab: 'discovery' },
    })

    const headers = wrapper.findAll('.phase-header')
    await headers[2].trigger('click') // Phase ③ header
    expect(wrapper.emitted('update:activeTab')![0]).toEqual(['assignation'])
  })
})

// --- AssignmentGate harness ---

const AssignmentGateHarness = defineComponent({
  props: {
    hasKeywords: { type: Boolean, default: false },
    activeTab: { type: String, default: 'assignation' },
  },
  emits: ['navigate'],
  setup(props, { emit }) {
    return () => {
      if (props.activeTab !== 'assignation') {
        return h('div', { class: 'not-assignation' }, 'Not on assignation tab')
      }

      const children = []

      // AssignmentGate
      if (!props.hasKeywords) {
        children.push(
          h('div', { class: 'assignment-gate' }, [
            h('p', { class: 'assignment-gate-message' },
              'Aucun mot-clé capitaine validé pour cet article.',
            ),
            h('button', {
              class: 'assignment-gate-link',
              onClick: () => emit('navigate', 'audit'),
            }, 'Aller à l\'Audit →'),
          ]),
        )
      }

      // Assignation content (always rendered — soft gating)
      children.push(
        h('div', { class: 'assignation-content' }, 'Assignation content here'),
      )

      return h('div', { class: 'tab-content' }, children)
    }
  },
})

describe('Phase ③ Assigner — AssignmentGate', () => {
  it('shows assignment gate when no capitaine keyword', () => {
    const wrapper = mount(AssignmentGateHarness, {
      props: { hasKeywords: false, activeTab: 'assignation' },
    })

    expect(wrapper.find('.assignment-gate').exists()).toBe(true)
    expect(wrapper.find('.assignment-gate-message').text()).toContain('Aucun mot-clé capitaine')
    expect(wrapper.find('.assignment-gate-link').exists()).toBe(true)
  })

  it('hides assignment gate when capitaine exists', () => {
    const wrapper = mount(AssignmentGateHarness, {
      props: { hasKeywords: true, activeTab: 'assignation' },
    })

    expect(wrapper.find('.assignment-gate').exists()).toBe(false)
  })

  it('clicking audit link emits navigation to audit', async () => {
    const wrapper = mount(AssignmentGateHarness, {
      props: { hasKeywords: false, activeTab: 'assignation' },
    })

    await wrapper.find('.assignment-gate-link').trigger('click')
    expect(wrapper.emitted('navigate')![0]).toEqual(['audit'])
  })

  it('assignation content remains visible even with gate message (soft gating)', () => {
    const wrapper = mount(AssignmentGateHarness, {
      props: { hasKeywords: false, activeTab: 'assignation' },
    })

    // Both gate AND content are present
    expect(wrapper.find('.assignment-gate').exists()).toBe(true)
    expect(wrapper.find('.assignation-content').exists()).toBe(true)
  })

  it('does not show gate on non-assignation tabs', () => {
    const wrapper = mount(AssignmentGateHarness, {
      props: { hasKeywords: false, activeTab: 'audit' },
    })

    expect(wrapper.find('.assignment-gate').exists()).toBe(false)
  })
})

// --- hasKeywords logic ---

describe('Phase ③ Assigner — hasKeywords logic', () => {
  function createHasKeywords(capitaine: string) {
    const keywords = ref<{ capitaine: string } | null>(
      capitaine ? { capitaine } : null,
    )
    return computed(() => !!keywords.value?.capitaine)
  }

  it('hasKeywords is false when keywords is null', () => {
    const keywords = ref(null)
    const hasKeywords = computed(() => !!keywords.value)
    expect(hasKeywords.value).toBe(false)
  })

  it('hasKeywords is false when capitaine is empty', () => {
    const hasKeywords = createHasKeywords('')
    expect(hasKeywords.value).toBe(false)
  })

  it('hasKeywords is true when capitaine has a value', () => {
    const hasKeywords = createHasKeywords('erp cloud pme')
    expect(hasKeywords.value).toBe(true)
  })
})
