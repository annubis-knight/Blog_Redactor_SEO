import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, ref } from 'vue'
import { safeHtmlDirective, sanitizeHtml } from '../../../src/directives/v-safe-html'

function mountWithDirective(template: string, setup?: () => Record<string, unknown>) {
  const component = defineComponent({
    directives: { 'safe-html': safeHtmlDirective },
    template,
    setup,
  })
  return mount(component)
}

describe('v-safe-html directive', () => {
  it('sanitize les balises script', () => {
    const wrapper = mountWithDirective(
      '<div v-safe-html="html" />',
      () => ({ html: '<p>OK</p><script>alert("xss")</script>' }),
    )
    expect(wrapper.html()).toContain('<p>OK</p>')
    expect(wrapper.html()).not.toContain('<script>')
  })

  it('conserve le HTML standard', () => {
    const wrapper = mountWithDirective(
      '<div v-safe-html="html" />',
      () => ({ html: '<h2>Title</h2><p>Text</p>' }),
    )
    expect(wrapper.html()).toContain('<h2>Title</h2>')
    expect(wrapper.html()).toContain('<p>Text</p>')
  })

  it('conserve les tags SVG autorisés', () => {
    const wrapper = mountWithDirective(
      '<div v-safe-html="html" />',
      () => ({ html: '<svg><path d="M0 0"/></svg>' }),
    )
    expect(wrapper.html()).toContain('<svg>')
    expect(wrapper.html()).toContain('<path')
  })

  it('supprime les event handlers', () => {
    const wrapper = mountWithDirective(
      '<div v-safe-html="html" />',
      () => ({ html: '<img onerror="alert(\'xss\')" src="x">' }),
    )
    expect(wrapper.html()).not.toContain('onerror')
  })

  it('met à jour quand la valeur change', async () => {
    const html = ref('<p>Initial</p>')
    const wrapper = mountWithDirective(
      '<div v-safe-html="html" />',
      () => ({ html }),
    )
    expect(wrapper.html()).toContain('Initial')
    html.value = '<p>Updated</p>'
    await wrapper.vm.$nextTick()
    expect(wrapper.html()).toContain('Updated')
  })

  it('gère les valeurs null/undefined sans crash', () => {
    const wrapper = mountWithDirective(
      '<div v-safe-html="html" />',
      () => ({ html: null }),
    )
    expect(wrapper.find('div').element.innerHTML).toBe('')
  })
})

describe('sanitizeHtml function', () => {
  it('strips scripts from raw string', () => {
    const result = sanitizeHtml('<p>Safe</p><script>alert(1)</script>')
    expect(result).toContain('<p>Safe</p>')
    expect(result).not.toContain('<script>')
  })
})
