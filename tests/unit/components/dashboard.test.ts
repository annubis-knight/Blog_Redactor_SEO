import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ProgressBar from '../../../src/components/shared/ProgressBar.vue'
import ErrorMessage from '../../../src/components/shared/ErrorMessage.vue'
import CocoonCard from '../../../src/components/dashboard/CocoonCard.vue'
import type { Cocoon } from '../../../shared/types/index.js'

const mockCocoon: Cocoon = {
  id: 0,
  name: 'Refonte de site web pour PME',
  siloName: 'Création de site',
  articles: [
    { title: 'Article 1', type: 'Pilier', slug: 'article-1', topic: null, status: 'à rédiger' },
  ],
  stats: {
    totalArticles: 10,
    byType: { pilier: 1, intermediaire: 4, specialise: 5 },
    byStatus: { aRediger: 8, brouillon: 1, publie: 1 },
    completionPercent: 20,
  },
}

describe('ProgressBar', () => {
  it('renders with correct width style', () => {
    const wrapper = mount(ProgressBar, { props: { percent: 45 } })
    const fill = wrapper.find('.progress-fill')
    expect(fill.attributes('style')).toContain('width: 45%')
  })

  it('clamps percent between 0 and 100', () => {
    const wrapper = mount(ProgressBar, { props: { percent: 150 } })
    const fill = wrapper.find('.progress-fill')
    expect(fill.attributes('style')).toContain('width: 100%')
  })
})

describe('ErrorMessage', () => {
  it('displays the error message', () => {
    const wrapper = mount(ErrorMessage, { props: { message: 'Something went wrong' } })
    expect(wrapper.text()).toContain('Something went wrong')
  })

  it('emits retry on button click', async () => {
    const wrapper = mount(ErrorMessage, { props: { message: 'Error' } })
    await wrapper.find('.retry-button').trigger('click')
    expect(wrapper.emitted('retry')).toHaveLength(1)
  })
})

describe('CocoonCard', () => {
  it('displays the cocoon name', () => {
    const wrapper = mount(CocoonCard, {
      props: { cocoon: mockCocoon },
      global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } },
    })
    expect(wrapper.text()).toContain('Refonte de site web pour PME')
  })

  it('displays total articles count', () => {
    const wrapper = mount(CocoonCard, {
      props: { cocoon: mockCocoon },
      global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } },
    })
    expect(wrapper.text()).toContain('10 articles')
  })

  it('displays completion percent', () => {
    const wrapper = mount(CocoonCard, {
      props: { cocoon: mockCocoon },
      global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } },
    })
    expect(wrapper.text()).toContain('20% complété')
  })

  it('displays type breakdown', () => {
    const wrapper = mount(CocoonCard, {
      props: { cocoon: mockCocoon },
      global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } },
    })
    expect(wrapper.text()).toContain('1 Pilier')
    expect(wrapper.text()).toContain('4 Inter.')
    expect(wrapper.text()).toContain('5 Spéc.')
  })
})
