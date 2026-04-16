import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { useKeyboardShortcuts } from '../../../src/composables/ui/useKeyboardShortcuts'

function createTestComponent(shortcuts: Parameters<typeof useKeyboardShortcuts>[0]) {
  return defineComponent({
    setup() {
      useKeyboardShortcuts(shortcuts)
      return {}
    },
    template: '<div>test</div>',
  })
}

function fireKeydown(key: string, options: Partial<KeyboardEventInit> = {}) {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...options,
  })
  document.dispatchEvent(event)
  return event
}

describe('useKeyboardShortcuts', () => {
  let wrapper: VueWrapper

  afterEach(() => {
    wrapper?.unmount()
  })

  it('execute l action quand le raccourci est presse', () => {
    const action = vi.fn()
    const Component = createTestComponent([
      { keys: 'ctrl+s', action, global: true },
    ])
    wrapper = mount(Component, { attachTo: document.body })

    fireKeydown('s', { ctrlKey: true })

    expect(action).toHaveBeenCalledOnce()
  })

  it('ne s active pas dans un input (sauf si global)', () => {
    const action = vi.fn()
    const Component = createTestComponent([
      { keys: 'ctrl+z', action }, // NOT global
    ])
    wrapper = mount(Component, { attachTo: document.body })

    // Create and focus an input
    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()

    fireKeydown('z', { ctrlKey: true })

    expect(action).not.toHaveBeenCalled()

    document.body.removeChild(input)
  })

  it('s active dans un input si global=true', () => {
    const action = vi.fn()
    const Component = createTestComponent([
      { keys: 'ctrl+s', action, global: true },
    ])
    wrapper = mount(Component, { attachTo: document.body })

    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()

    fireKeydown('s', { ctrlKey: true })

    expect(action).toHaveBeenCalledOnce()

    document.body.removeChild(input)
  })

  it('cleanup les listeners sur unmount', () => {
    const action = vi.fn()
    const Component = createTestComponent([
      { keys: 'ctrl+s', action, global: true },
    ])
    wrapper = mount(Component, { attachTo: document.body })

    wrapper.unmount()

    fireKeydown('s', { ctrlKey: true })

    expect(action).not.toHaveBeenCalled()
  })

  it('empeche le comportement par defaut du navigateur', () => {
    const action = vi.fn()
    const Component = createTestComponent([
      { keys: 'ctrl+s', action, global: true },
    ])
    wrapper = mount(Component, { attachTo: document.body })

    const event = new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    })
    const spy = vi.spyOn(event, 'preventDefault')
    document.dispatchEvent(event)

    expect(spy).toHaveBeenCalled()
  })

  it('gere le raccourci Escape', () => {
    const action = vi.fn()
    const Component = createTestComponent([
      { keys: 'escape', action },
    ])
    wrapper = mount(Component, { attachTo: document.body })

    fireKeydown('Escape')

    expect(action).toHaveBeenCalledOnce()
  })

  it('ignore les raccourcis non matches', () => {
    const action = vi.fn()
    const Component = createTestComponent([
      { keys: 'ctrl+s', action, global: true },
    ])
    wrapper = mount(Component, { attachTo: document.body })

    fireKeydown('a', { ctrlKey: true })

    expect(action).not.toHaveBeenCalled()
  })

  it('ne matche pas Ctrl+Shift+S quand seulement Ctrl+S est attendu', () => {
    const action = vi.fn()
    const Component = createTestComponent([
      { keys: 'ctrl+s', action, global: true },
    ])
    wrapper = mount(Component, { attachTo: document.body })

    fireKeydown('s', { ctrlKey: true, shiftKey: true })

    expect(action).not.toHaveBeenCalled()
  })
})
