import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SkeletonLoader from '../../../src/components/shared/SkeletonLoader.vue'
import SkeletonCard from '../../../src/components/shared/SkeletonCard.vue'
import SkeletonText from '../../../src/components/shared/SkeletonText.vue'

describe('SkeletonLoader', () => {
  it('affiche le skeleton quand loading=true', () => {
    const wrapper = mount(SkeletonLoader, {
      props: { loading: true },
      slots: { default: '<p>Contenu</p>' },
    })
    expect(wrapper.find('.skeleton-lines').exists()).toBe(true)
    expect(wrapper.find('p').exists()).toBe(false)
  })

  it('affiche le slot quand loading=false', () => {
    const wrapper = mount(SkeletonLoader, {
      props: { loading: false },
      slots: { default: '<p>Contenu</p>' },
    })
    expect(wrapper.find('.skeleton-lines').exists()).toBe(false)
    expect(wrapper.find('p').text()).toBe('Contenu')
  })

  it('affiche le bon nombre de lignes', () => {
    const wrapper = mount(SkeletonLoader, {
      props: { loading: true, lines: 5 },
    })
    expect(wrapper.findAll('.skeleton-line')).toHaveLength(5)
  })

  it('applique l animation shimmer', () => {
    const wrapper = mount(SkeletonLoader, {
      props: { loading: true },
    })
    expect(wrapper.find('.skeleton-line').exists()).toBe(true)
    // The shimmer is applied via ::after pseudo-element with CSS animation
    // We verify the line element exists (the animation is CSS-only)
  })

  it('utilise 3 lignes par defaut', () => {
    const wrapper = mount(SkeletonLoader, {
      props: { loading: true },
    })
    expect(wrapper.findAll('.skeleton-line')).toHaveLength(3)
  })
})

describe('SkeletonCard', () => {
  it('affiche un skeleton card avec header et body', () => {
    const wrapper = mount(SkeletonCard)
    expect(wrapper.find('.skeleton-card').exists()).toBe(true)
    expect(wrapper.find('.skeleton-card-header').exists()).toBe(true)
    expect(wrapper.find('.skeleton-card-body').exists()).toBe(true)
  })

  it('accepte des props width et height', () => {
    const wrapper = mount(SkeletonCard, {
      props: { width: '300px', height: '200px' },
    })
    const card = wrapper.find('.skeleton-card')
    expect(card.attributes('style')).toContain('width: 300px')
    expect(card.attributes('style')).toContain('height: 200px')
  })
})

describe('SkeletonText', () => {
  it('affiche le bon nombre de lignes', () => {
    const wrapper = mount(SkeletonText, {
      props: { lines: 4 },
    })
    expect(wrapper.findAll('.skeleton-line')).toHaveLength(4)
  })

  it('applique la largeur de la derniere ligne', () => {
    const wrapper = mount(SkeletonText, {
      props: { lines: 3, lastLineWidth: '40%' },
    })
    const lines = wrapper.findAll('.skeleton-line')
    expect(lines[2]!.attributes('style')).toContain('width: 40%')
  })

  it('les lignes non finales font 100%', () => {
    const wrapper = mount(SkeletonText, {
      props: { lines: 3 },
    })
    const lines = wrapper.findAll('.skeleton-line')
    expect(lines[0]!.attributes('style')).toContain('width: 100%')
    expect(lines[1]!.attributes('style')).toContain('width: 100%')
  })
})
