import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AiPanelHeader from '@/components/moteur/ai-panel/AiPanelHeader.vue'

describe('AiPanelHeader', () => {
  it('renders title', () => {
    const w = mount(AiPanelHeader, { props: { title: 'Mon Panel' } })
    expect(w.text()).toContain('Mon Panel')
  })

  it('renders subtitle when provided', () => {
    const w = mount(AiPanelHeader, { props: { title: 'T', subtitle: 'Sous-titre IA' } })
    expect(w.text()).toContain('Sous-titre IA')
  })

  it('hides subtitle when not provided', () => {
    const w = mount(AiPanelHeader, { props: { title: 'T' } })
    expect(w.find('.aip-header__subtitle').exists()).toBe(false)
  })

  it('renders Sparkles SVG icon', () => {
    const w = mount(AiPanelHeader, { props: { title: 'T' } })
    expect(w.find('svg').exists()).toBe(true)
  })
})
