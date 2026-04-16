import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ArticleCard from '../../../src/components/dashboard/ArticleCard.vue'
import KeywordBadge from '../../../src/components/shared/KeywordBadge.vue'
import type { Article, Keyword } from '../../../shared/types/index.js'

const mockArticle: Article = {
  id: 10,
  title: 'Pourquoi refondre votre site web en 2025',
  type: 'Pilier',
  slug: 'pourquoi-refondre-votre-site',
  topic: null,
  status: 'à rédiger',
  phase: 'proposed',
  completedChecks: [],
}

const mockKeywords: Keyword[] = [
  { keyword: 'refonte site web', cocoonName: 'Refonte', type: 'Pilier' },
  { keyword: 'agence web refonte', cocoonName: 'Refonte', type: 'Moyenne traine' },
]

describe('ArticleCard', () => {
  it('displays the article title', () => {
    const wrapper = mount(ArticleCard, {
      props: { article: mockArticle },
      global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } },
    })
    expect(wrapper.text()).toContain('Pourquoi refondre votre site web en 2025')
  })

  it('displays the article status via StatusBadge', () => {
    const wrapper = mount(ArticleCard, {
      props: { article: mockArticle },
      global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } },
    })
    expect(wrapper.text()).toContain('À rédiger')
  })

  it('links to the article editor', () => {
    const wrapper = mount(ArticleCard, {
      props: { article: mockArticle },
      global: { stubs: { RouterLink: { template: '<a :to="to"><slot /></a>', props: ['to'] } } },
    })
    expect(wrapper.find('a').attributes('to')).toBe('/article/10/editor')
  })
})

describe('KeywordBadge', () => {
  it('displays the keyword text', () => {
    const wrapper = mount(KeywordBadge, {
      props: { keyword: mockKeywords[0] },
    })
    expect(wrapper.text()).toContain('refonte site web')
  })

  it('applies pilier class for Pilier type', () => {
    const wrapper = mount(KeywordBadge, {
      props: { keyword: mockKeywords[0] },
    })
    expect(wrapper.find('.kw--pilier').exists()).toBe(true)
  })

  it('applies moyenne class for Moyenne traine type', () => {
    const wrapper = mount(KeywordBadge, {
      props: { keyword: mockKeywords[1] },
    })
    expect(wrapper.find('.kw--moyenne').exists()).toBe(true)
  })
})
