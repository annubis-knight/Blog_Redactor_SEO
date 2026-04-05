import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import KeywordWords from '../../../src/components/intent/KeywordWords.vue'

function mountKeywordWords(props: {
  words: string[]
  activeCount: number
  minActiveCount: number
  loading?: boolean
}) {
  return mount(KeywordWords, {
    props: { loading: false, ...props },
  })
}

describe('KeywordWords', () => {
  const words = ['creation', 'site', 'web', 'entreprise', 'toulouse']

  it('renders all words', () => {
    const wrapper = mountKeywordWords({ words, activeCount: 5, minActiveCount: 2 })
    const spans = wrapper.findAll('.kw-word')
    expect(spans).toHaveLength(5)
    expect(spans[0].text()).toBe('creation')
    expect(spans[4].text()).toBe('toulouse')
  })

  it('applies core class to words below minActiveCount', () => {
    const wrapper = mountKeywordWords({ words, activeCount: 5, minActiveCount: 2 })
    const spans = wrapper.findAll('.kw-word')
    expect(spans[0].classes()).toContain('kw-word--core')
    expect(spans[1].classes()).toContain('kw-word--core')
  })

  it('applies active class to words between minActiveCount and activeCount', () => {
    const wrapper = mountKeywordWords({ words, activeCount: 5, minActiveCount: 2 })
    const spans = wrapper.findAll('.kw-word')
    expect(spans[2].classes()).toContain('kw-word--active')
    expect(spans[3].classes()).toContain('kw-word--active')
    expect(spans[4].classes()).toContain('kw-word--active')
  })

  it('applies inactive class to words beyond activeCount', () => {
    const wrapper = mountKeywordWords({ words, activeCount: 3, minActiveCount: 2 })
    const spans = wrapper.findAll('.kw-word')
    expect(spans[3].classes()).toContain('kw-word--inactive')
    expect(spans[4].classes()).toContain('kw-word--inactive')
  })

  it('clicking an active word emits update:activeCount with that index', async () => {
    const wrapper = mountKeywordWords({ words, activeCount: 5, minActiveCount: 2 })
    const spans = wrapper.findAll('.kw-word')
    // Click "entreprise" (index 3, active) → removes it and toulouse
    await spans[3].trigger('click')
    expect(wrapper.emitted('update:activeCount')).toBeTruthy()
    expect(wrapper.emitted('update:activeCount')![0]).toEqual([3])
  })

  it('clicking an inactive word emits update:activeCount to restore up to that word', async () => {
    const wrapper = mountKeywordWords({ words, activeCount: 3, minActiveCount: 2 })
    const spans = wrapper.findAll('.kw-word')
    // Click "entreprise" (index 3, inactive) → restore up to and including it
    await spans[3].trigger('click')
    expect(wrapper.emitted('update:activeCount')![0]).toEqual([4])
  })

  it('clicking a core word does NOT emit', async () => {
    const wrapper = mountKeywordWords({ words, activeCount: 5, minActiveCount: 2 })
    const spans = wrapper.findAll('.kw-word')
    await spans[0].trigger('click')
    expect(wrapper.emitted('update:activeCount')).toBeFalsy()
  })

  it('shows loading spinner when loading is true', () => {
    const wrapper = mountKeywordWords({ words, activeCount: 5, minActiveCount: 2, loading: true })
    expect(wrapper.find('.kw-loading').exists()).toBe(true)
  })

  it('does not show loading spinner when loading is false', () => {
    const wrapper = mountKeywordWords({ words, activeCount: 5, minActiveCount: 2, loading: false })
    expect(wrapper.find('.kw-loading').exists()).toBe(false)
  })

  it('respects minActiveCount — all words are core when minActiveCount equals word count', () => {
    const wrapper = mountKeywordWords({ words: ['seo', 'local'], activeCount: 2, minActiveCount: 2 })
    const spans = wrapper.findAll('.kw-word')
    expect(spans[0].classes()).toContain('kw-word--core')
    expect(spans[1].classes()).toContain('kw-word--core')
  })
})
