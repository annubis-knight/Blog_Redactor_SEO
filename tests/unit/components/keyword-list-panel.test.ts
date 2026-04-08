import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import KeywordListPanel from '@/components/panels/KeywordListPanel.vue'

describe('KeywordListPanel', () => {
  it('renders keyword tags for non-empty list', () => {
    const wrapper = mount(KeywordListPanel, {
      props: { keywords: ['seo', 'blog', 'référencement'], label: 'Lieutenants' },
    })

    const tags = wrapper.findAll('.keyword-tag')
    expect(tags).toHaveLength(3)
    expect(tags[0].text()).toBe('seo')
    expect(tags[1].text()).toBe('blog')
    expect(tags[2].text()).toBe('référencement')
  })

  it('displays correct count for multiple terms', () => {
    const wrapper = mount(KeywordListPanel, {
      props: { keywords: ['a', 'b', 'c'], label: 'Test' },
    })

    expect(wrapper.find('.keyword-summary').text()).toBe('3 termes')
  })

  it('displays singular form for single term', () => {
    const wrapper = mount(KeywordListPanel, {
      props: { keywords: ['capitaine-mot'], label: 'Capitaine' },
    })

    expect(wrapper.find('.keyword-summary').text()).toBe('1 terme')
  })

  it('shows empty message when keywords is empty array', () => {
    const wrapper = mount(KeywordListPanel, {
      props: { keywords: [], label: 'Lexique' },
    })

    expect(wrapper.find('.keyword-empty').exists()).toBe(true)
    expect(wrapper.find('.keyword-empty').text()).toBe('Aucun terme défini')
    expect(wrapper.find('.keyword-list').exists()).toBe(false)
  })

  it('filters out empty strings and shows empty message (F1/F12)', () => {
    const wrapper = mount(KeywordListPanel, {
      props: { keywords: ['', '  ', ''], label: 'Capitaine' },
    })

    expect(wrapper.find('.keyword-empty').exists()).toBe(true)
    expect(wrapper.find('.keyword-summary').text()).toBe('0 termes')
  })

  it('filters empty strings but renders valid ones', () => {
    const wrapper = mount(KeywordListPanel, {
      props: { keywords: ['seo', '', 'blog'], label: 'Test' },
    })

    const tags = wrapper.findAll('.keyword-tag')
    expect(tags).toHaveLength(2)
    expect(wrapper.find('.keyword-summary').text()).toBe('2 termes')
  })
})
