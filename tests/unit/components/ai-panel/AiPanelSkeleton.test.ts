import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AiPanelSkeleton from '@/components/moteur/ai-panel/AiPanelSkeleton.vue'

describe('AiPanelSkeleton', () => {
  it('renders 4 lines by default', () => {
    const w = mount(AiPanelSkeleton)
    expect(w.findAll('.aip-skeleton__line').length).toBe(4)
  })

  it('respects custom lines prop', () => {
    const w = mount(AiPanelSkeleton, { props: { lines: 7 } })
    expect(w.findAll('.aip-skeleton__line').length).toBe(7)
  })

  it('has aria role status', () => {
    const w = mount(AiPanelSkeleton)
    expect(w.find('[role="status"]').exists()).toBe(true)
  })
})
