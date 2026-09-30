import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, ref } from 'vue'
import { safeHtmlDirective, safeSvgDirective, sanitizeHtml, sanitizeSvg } from '../../../src/directives/v-safe-html'

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

// FR-UI-RADAR-CARD — recette du 2026-09-30 (UI-1, RAD-4) : les pictogrammes
// d'intention des cartes Radar et Capitaine sont des tracés sans `<svg>`
// englobant, posés dans le `<svg>` du gabarit. L'assainissement les vidait.
describe('v-safe-svg — un tracé seul, posé dans un <svg> (FR-UI-RADAR-CARD)', () => {
  function mountSvg(markup: string) {
    return mount(defineComponent({
      directives: { 'safe-svg': safeSvgDirective },
      template: '<svg viewBox="0 0 24 24" v-safe-svg="markup" />',
      setup: () => ({ markup }),
    }))
  }

  it('garde le cercle et le chemin d’un pictogramme sans <svg> englobant', () => {
    const svg = mountSvg('<circle cx="12" cy="12" r="10" fill="none" stroke="currentColor"/><path d="M12 16v-4" stroke="currentColor"/>').find('svg').element
    expect(svg.querySelectorAll('circle')).toHaveLength(1)
    expect(svg.querySelectorAll('path')).toHaveLength(1)
    expect(svg.querySelector('path')?.getAttribute('d')).toBe('M12 16v-4')
  })

  it('garde un texte SVG (pictogramme « Commercial »)', () => {
    const svg = mountSvg('<text x="12" y="16" text-anchor="middle">€</text>').find('svg').element
    expect(svg.querySelector('text')?.textContent).toBe('€')
  })

  it('assainit toujours : pas de script ni de gestionnaire d’événement', () => {
    const svg = mountSvg('<path d="M0 0" onclick="alert(1)"/><script>alert(2)</script>').find('svg').element
    expect(svg.querySelectorAll('path')).toHaveLength(1)
    expect(svg.innerHTML).not.toContain('onclick')
    expect(svg.innerHTML).not.toContain('script')
  })

  it('un <svg> complet passe comme avant', () => {
    expect(sanitizeSvg('<svg viewBox="0 0 24 24"><path d="M1 1"/></svg>')).toContain('<path d="M1 1"')
  })
})

describe('sanitizeHtml function', () => {
  it('strips scripts from raw string', () => {
    const result = sanitizeHtml('<p>Safe</p><script>alert(1)</script>')
    expect(result).toContain('<p>Safe</p>')
    expect(result).not.toContain('<script>')
  })
})
