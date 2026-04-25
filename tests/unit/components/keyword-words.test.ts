import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import KeywordWords from '../../../src/components/intent/KeywordWords.vue'

function mountKeywordWords(props: {
  words: string[]
  activeIndices: number[]
  loading?: boolean
}) {
  return mount(KeywordWords, {
    props: { loading: false, ...props },
  })
}

describe('KeywordWords (F4 — suppression arbitraire)', () => {
  const words = ['creation', 'site', 'web', 'entreprise', 'toulouse']

  it('renders all words', () => {
    const wrapper = mountKeywordWords({ words, activeIndices: [0, 1, 2, 3, 4] })
    const spans = wrapper.findAll('.kw-word')
    expect(spans).toHaveLength(5)
    expect(spans[0].text()).toBe('creation')
    expect(spans[4].text()).toBe('toulouse')
  })

  it('applies active class to indices in activeIndices', () => {
    const wrapper = mountKeywordWords({ words, activeIndices: [0, 1, 2] })
    const spans = wrapper.findAll('.kw-word')
    expect(spans[0].classes()).toContain('kw-word--active')
    expect(spans[1].classes()).toContain('kw-word--active')
    expect(spans[2].classes()).toContain('kw-word--active')
  })

  it('applies inactive class to indices NOT in activeIndices', () => {
    const wrapper = mountKeywordWords({ words, activeIndices: [0, 2, 4] })
    const spans = wrapper.findAll('.kw-word')
    expect(spans[1].classes()).toContain('kw-word--inactive')
    expect(spans[3].classes()).toContain('kw-word--inactive')
  })

  it('clicking an active word emits update:activeIndices without that index', async () => {
    const wrapper = mountKeywordWords({ words, activeIndices: [0, 1, 2, 3, 4] })
    const spans = wrapper.findAll('.kw-word')
    // Click "entreprise" (index 3)
    await spans[3].trigger('click')
    expect(wrapper.emitted('update:activeIndices')).toBeTruthy()
    expect(wrapper.emitted('update:activeIndices')![0]).toEqual([[0, 1, 2, 4]])
  })

  it('clicking an inactive word emits update:activeIndices with that index added (sorted)', async () => {
    const wrapper = mountKeywordWords({ words, activeIndices: [0, 1, 2] })
    const spans = wrapper.findAll('.kw-word')
    // Click "entreprise" (index 3, inactive)
    await spans[3].trigger('click')
    expect(wrapper.emitted('update:activeIndices')![0]).toEqual([[0, 1, 2, 3]])
  })

  it('F4 — can remove the first word (previously impossible with truncation)', async () => {
    const wrapper = mountKeywordWords({ words, activeIndices: [0, 1, 2, 3, 4] })
    const spans = wrapper.findAll('.kw-word')
    // Click "creation" (index 0) — désactivation arbitraire
    await spans[0].trigger('click')
    expect(wrapper.emitted('update:activeIndices')![0]).toEqual([[1, 2, 3, 4]])
  })

  it('F4 — refuse to deactivate if less than 2 significant words would remain', async () => {
    // "site" est un mot significatif; si on retire "creation" et "web", il ne reste que "site" (1 significatif)
    const wrapper = mountKeywordWords({ words: ['creation', 'site', 'web'], activeIndices: [1, 2] })
    const spans = wrapper.findAll('.kw-word')
    // Essayer de désactiver "site" (index 1) → refusé car ne resterait que "web" (1 significatif)
    await spans[1].trigger('click')
    expect(wrapper.emitted('update:activeIndices')).toBeFalsy()
  })

  it('shows loading spinner when loading is true', () => {
    const wrapper = mountKeywordWords({ words, activeIndices: [0, 1, 2, 3, 4], loading: true })
    expect(wrapper.find('.kw-loading').exists()).toBe(true)
  })

  it('does not show loading spinner when loading is false', () => {
    const wrapper = mountKeywordWords({ words, activeIndices: [0, 1, 2, 3, 4], loading: false })
    expect(wrapper.find('.kw-loading').exists()).toBe(false)
  })

  it('applies kw-word--locked class when deactivation would violate minimum', () => {
    // 2 mots significatifs actifs : désactiver l'un violerait la règle
    const wrapper = mountKeywordWords({ words: ['creation', 'site'], activeIndices: [0, 1] })
    const spans = wrapper.findAll('.kw-word')
    // Les 2 mots sont considérés "locked" car on ne peut pas les retirer
    expect(spans[0].classes()).toContain('kw-word--locked')
    expect(spans[1].classes()).toContain('kw-word--locked')
  })
})
