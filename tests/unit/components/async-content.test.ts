import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AsyncContent from '../../../src/components/shared/AsyncContent.vue'

describe('AsyncContent', () => {
  it('shows loading spinner when isLoading', () => {
    const wrapper = mount(AsyncContent, {
      props: { isLoading: true, error: null },
    })
    expect(wrapper.find('.loading-spinner').exists()).toBe(true)
    expect(wrapper.find('.error-message').exists()).toBe(false)
  })

  it('shows error message when error is set', () => {
    const wrapper = mount(AsyncContent, {
      props: { isLoading: false, error: 'Something went wrong' },
    })
    expect(wrapper.find('.error-message').exists()).toBe(true)
    expect(wrapper.text()).toContain('Something went wrong')
    expect(wrapper.find('.loading-spinner').exists()).toBe(false)
  })

  it('shows slot content when not loading and no error', () => {
    const wrapper = mount(AsyncContent, {
      props: { isLoading: false, error: null },
      slots: { default: '<p class="test-content">Hello</p>' },
    })
    expect(wrapper.find('.test-content').exists()).toBe(true)
    expect(wrapper.find('.loading-spinner').exists()).toBe(false)
    expect(wrapper.find('.error-message').exists()).toBe(false)
  })

  it('prefers loading over error (loading takes priority)', () => {
    const wrapper = mount(AsyncContent, {
      props: { isLoading: true, error: 'Error' },
    })
    expect(wrapper.find('.loading-spinner').exists()).toBe(true)
    expect(wrapper.find('.error-message').exists()).toBe(false)
  })

  it('shows retry button by default on error', () => {
    const wrapper = mount(AsyncContent, {
      props: { isLoading: false, error: 'Oops' },
    })
    expect(wrapper.find('.retry-button').exists()).toBe(true)
  })

  it('hides retry button when hideRetry is true', () => {
    const wrapper = mount(AsyncContent, {
      props: { isLoading: false, error: 'Oops', hideRetry: true },
    })
    expect(wrapper.find('.retry-button').exists()).toBe(false)
  })

  it('emits retry event on retry click', async () => {
    const wrapper = mount(AsyncContent, {
      props: { isLoading: false, error: 'Oops' },
    })
    await wrapper.find('.retry-button').trigger('click')
    expect(wrapper.emitted('retry')).toHaveLength(1)
  })

  it('renders empty slot content when no default slot provided', () => {
    const wrapper = mount(AsyncContent, {
      props: { isLoading: false, error: null },
    })
    expect(wrapper.find('.async-content').exists()).toBe(true)
    expect(wrapper.find('.loading-spinner').exists()).toBe(false)
    expect(wrapper.find('.error-message').exists()).toBe(false)
  })
})
