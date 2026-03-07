import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ActionResult from '../../../src/components/actions/ActionResult.vue'

describe('ActionResult', () => {
  it('renders result text and Accept/Reject buttons', () => {
    const wrapper = mount(ActionResult, {
      props: { result: 'Reformulated text here', isStreaming: false },
    })

    expect(wrapper.find('.result-text').text()).toBe('Reformulated text here')
    expect(wrapper.find('.btn-accept').exists()).toBe(true)
    expect(wrapper.find('.btn-reject').exists()).toBe(true)
  })

  it('disables Accept button during streaming', () => {
    const wrapper = mount(ActionResult, {
      props: { result: 'Partial...', isStreaming: true },
    })

    const acceptBtn = wrapper.find('.btn-accept')
    expect((acceptBtn.element as HTMLButtonElement).disabled).toBe(true)

    const rejectBtn = wrapper.find('.btn-reject')
    expect((rejectBtn.element as HTMLButtonElement).disabled).toBe(false)
  })
})
