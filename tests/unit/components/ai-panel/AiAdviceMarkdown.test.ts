import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AiAdviceMarkdown from '@/components/moteur/ai-panel/AiAdviceMarkdown.vue'

describe('AiAdviceMarkdown', () => {
  it('renders nothing for empty markdown', () => {
    const w = mount(AiAdviceMarkdown, { props: { markdown: '' } })
    expect(w.find('[data-testid="ai-advice-markdown"]').text()).toBe('')
  })

  it('renders headings and paragraphs', () => {
    const md = '## Titre\n\nUn paragraphe.'
    const w = mount(AiAdviceMarkdown, { props: { markdown: md } })
    expect(w.html()).toContain('<h2>Titre</h2>')
    expect(w.html()).toContain('Un paragraphe')
  })

  it('renders bullet list', () => {
    const md = '- a\n- b\n- c'
    const w = mount(AiAdviceMarkdown, { props: { markdown: md } })
    expect(w.html()).toContain('<ul>')
    expect(w.html()).toContain('<li>a</li>')
  })

  it('shows blinking caret when streaming=true', () => {
    const w = mount(AiAdviceMarkdown, { props: { markdown: 'partial', streaming: true } })
    expect(w.find('.aip-advice__caret').exists()).toBe(true)
  })

  it('hides caret when streaming=false', () => {
    const w = mount(AiAdviceMarkdown, { props: { markdown: 'done' } })
    expect(w.find('.aip-advice__caret').exists()).toBe(false)
  })

  it('sanitizes XSS attempts', () => {
    const md = '<script>alert("xss")</script>\n\n**bold**'
    const w = mount(AiAdviceMarkdown, { props: { markdown: md } })
    expect(w.html()).not.toContain('<script>')
    expect(w.html()).toContain('<strong>bold</strong>')
  })
})
