import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import ErrorBoundary from '../../../src/components/shared/ErrorBoundary.vue'

// A child component that throws during render (not setup — render errors are caught by onErrorCaptured)
const ThrowingChild = defineComponent({
  name: 'ThrowingChild',
  render() {
    throw new Error('Test error')
  },
})

const GoodChild = defineComponent({
  name: 'GoodChild',
  template: '<p data-testid="child">OK</p>',
})

// Wrapper that uses ErrorBoundary with a throwing child as a real child component
const WrapperWithThrow = defineComponent({
  components: { ErrorBoundary, ThrowingChild },
  props: { fallbackMessage: { type: String, default: undefined } },
  template: '<ErrorBoundary :fallback-message="fallbackMessage"><ThrowingChild /></ErrorBoundary>',
})

const WrapperWithGood = defineComponent({
  components: { ErrorBoundary, GoodChild },
  props: { fallbackMessage: { type: String, default: undefined } },
  template: '<ErrorBoundary :fallback-message="fallbackMessage"><GoodChild /></ErrorBoundary>',
})

describe('ErrorBoundary', () => {
  const originalWarn = console.warn
  const originalError = console.error

  beforeEach(() => {
    console.warn = vi.fn()
    console.error = vi.fn()
  })

  afterEach(() => {
    console.warn = originalWarn
    console.error = originalError
  })

  it("affiche le slot enfant quand pas d'erreur", () => {
    const wrapper = mount(WrapperWithGood)
    expect(wrapper.find('[data-testid="error-boundary-fallback"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="child"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('OK')
  })

  it('affiche le fallback quand un enfant throw', async () => {
    const wrapper = mount(WrapperWithThrow)
    await nextTick()
    expect(wrapper.find('[data-testid="error-boundary-fallback"]').exists()).toBe(true)
  })

  it('affiche le message custom', async () => {
    const wrapper = mount(WrapperWithThrow, {
      props: { fallbackMessage: 'Custom Error' },
    })
    await nextTick()
    expect(wrapper.text()).toContain('Custom Error')
  })

  it('permet de réessayer', async () => {
    const wrapper = mount(WrapperWithThrow)
    await nextTick()
    expect(wrapper.find('[data-testid="error-boundary-fallback"]').exists()).toBe(true)

    const retryBtn = wrapper.find('[data-testid="error-boundary-retry"]')
    expect(retryBtn.exists()).toBe(true)
    await retryBtn.trigger('click')
    await nextTick()
    // After retry, it tries to render the child again — which throws again → fallback again
    expect(wrapper.find('[data-testid="error-boundary-fallback"]').exists()).toBe(true)
  })

  it("ne propage pas l'erreur au parent", () => {
    // The fact that mount() doesn't throw proves the error is caught
    expect(() => mount(WrapperWithThrow)).not.toThrow()
  })
})
