import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ArticleActions from '../../../src/components/article/ArticleActions.vue'

describe('ArticleActions', () => {
  it('shows generate button when outline validated and no content', () => {
    const wrapper = mount(ArticleActions, {
      props: { isGenerating: false, hasContent: false, isOutlineValidated: true },
    })

    const btn = wrapper.find('.action-btn.primary')
    expect(btn.exists()).toBe(true)
    expect(btn.text()).toBe("Générer l'article")
  })

  it('shows regenerate button when content exists', () => {
    const wrapper = mount(ArticleActions, {
      props: { isGenerating: false, hasContent: true, isOutlineValidated: true },
    })

    const btn = wrapper.find('.action-btn.secondary')
    expect(btn.exists()).toBe(true)
    expect(btn.text()).toBe("Régénérer l'article")
    expect(wrapper.find('.action-btn.primary').exists()).toBe(false)
  })

  it('disables buttons during generation', () => {
    const wrapper = mount(ArticleActions, {
      props: { isGenerating: true, hasContent: false, isOutlineValidated: true },
    })

    const btn = wrapper.find('.action-btn.primary')
    expect((btn.element as HTMLButtonElement).disabled).toBe(true)
    expect(btn.text()).toBe('Génération en cours...')
  })
})
