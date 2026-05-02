import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AiTriggerButton from '@/components/moteur/ai-panel/AiTriggerButton.vue'

describe('AiTriggerButton', () => {
  it('renders default primary variant with label "Analyser avec l\'IA"', () => {
    const w = mount(AiTriggerButton)
    expect(w.find('[data-testid="ai-trigger-primary"]').exists()).toBe(true)
    expect(w.text()).toContain("Analyser avec l'IA")
  })

  it('shows loading label and spinner when loading=true', () => {
    const w = mount(AiTriggerButton, { props: { loading: true } })
    expect(w.text()).toContain('Analyse en cours')
    expect(w.find('.aip-cta__spinner').exists()).toBe(true)
  })

  it('is disabled when loading', () => {
    const w = mount(AiTriggerButton, { props: { loading: true } })
    expect(w.find('button').attributes('disabled')).toBeDefined()
  })

  it('is disabled when disabled=true', () => {
    const w = mount(AiTriggerButton, { props: { disabled: true } })
    expect(w.find('button').attributes('disabled')).toBeDefined()
  })

  it('emits "click" when clicked and not disabled', async () => {
    const w = mount(AiTriggerButton)
    await w.find('button').trigger('click')
    expect(w.emitted('click')).toHaveLength(1)
  })

  it('does not emit click when disabled', async () => {
    const w = mount(AiTriggerButton, { props: { disabled: true } })
    await w.find('button').trigger('click')
    expect(w.emitted('click')).toBeUndefined()
  })

  it('accepts custom label', () => {
    const w = mount(AiTriggerButton, { props: { label: 'Surfacer les candidats' } })
    expect(w.text()).toContain('Surfacer les candidats')
  })

  it('renders regen variant with rotate icon', () => {
    const w = mount(AiTriggerButton, { props: { variant: 'regen', label: 'Régénérer' } })
    expect(w.find('[data-testid="ai-trigger-regen"]').exists()).toBe(true)
    expect(w.text()).toContain('Régénérer')
  })
})
