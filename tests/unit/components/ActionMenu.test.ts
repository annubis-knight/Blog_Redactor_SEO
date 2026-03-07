import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ActionMenu from '../../../src/components/actions/ActionMenu.vue'

describe('ActionMenu', () => {
  it('renders all 9 action items', () => {
    const wrapper = mount(ActionMenu, {
      props: { disabled: false },
    })

    const items = wrapper.findAll('.action-item')
    expect(items.length).toBe(9)
  })

  it('emits select-action with correct type on click', async () => {
    const wrapper = mount(ActionMenu, {
      props: { disabled: false },
    })

    const firstItem = wrapper.findAll('.action-item')[0]
    await firstItem.trigger('click')

    expect(wrapper.emitted('select-action')).toHaveLength(1)
    expect(wrapper.emitted('select-action')![0]).toEqual(['reformulate'])
  })
})
