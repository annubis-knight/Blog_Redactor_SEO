import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import NlpTerms from '@/components/panels/NlpTerms.vue'
import type { NlpTermResult } from '@shared/types/seo.types'

function makeTerms(): NlpTermResult[] {
  return [
    { term: 'référencement', isDetected: true, searchVolume: 5000 },
    { term: 'backlinks', isDetected: false, searchVolume: 3000 },
    { term: 'indexation', isDetected: true, searchVolume: 1000 },
  ]
}

describe('NlpTerms', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders summary with detection count', () => {
    const wrapper = mount(NlpTerms, {
      props: { terms: makeTerms() },
    })

    expect(wrapper.text()).toContain('2/3 termes détectés')
  })

  it('renders all terms as tags', () => {
    const wrapper = mount(NlpTerms, {
      props: { terms: makeTerms() },
    })

    const tags = wrapper.findAll('.nlp-tag')
    expect(tags).toHaveLength(3)
  })

  it('sorts detected terms first, then by volume', () => {
    const wrapper = mount(NlpTerms, {
      props: { terms: makeTerms() },
    })

    const tags = wrapper.findAll('.nlp-tag')
    // Detected first (sorted by volume desc): référencement (5000), indexation (1000)
    // Then undetected: backlinks (3000)
    expect(tags[0].text()).toBe('référencement')
    expect(tags[1].text()).toBe('indexation')
    expect(tags[2].text()).toBe('backlinks')
  })

  it('applies detected class to detected terms', () => {
    const wrapper = mount(NlpTerms, {
      props: { terms: makeTerms() },
    })

    const tags = wrapper.findAll('.nlp-tag')
    expect(tags[0].classes()).toContain('detected')
    expect(tags[2].classes()).not.toContain('detected')
  })

  it('shows empty message when no terms', () => {
    const wrapper = mount(NlpTerms, {
      props: { terms: [] },
    })

    expect(wrapper.text()).toContain('Aucun terme NLP disponible')
  })

  it('copies term to clipboard on click', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })

    const wrapper = mount(NlpTerms, {
      props: { terms: makeTerms() },
    })

    const firstTag = wrapper.findAll('.nlp-tag')[0]
    await firstTag.trigger('click')

    expect(writeText).toHaveBeenCalledWith('référencement')
  })

  it('shows "Copié !" feedback after click', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })

    const wrapper = mount(NlpTerms, {
      props: { terms: makeTerms() },
    })

    const firstTag = wrapper.findAll('.nlp-tag')[0]
    await firstTag.trigger('click')
    await wrapper.vm.$nextTick()

    expect(firstTag.text()).toBe('Copié !')
    expect(firstTag.classes()).toContain('copied')
  })

  it('copies term on Enter key', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })

    const wrapper = mount(NlpTerms, {
      props: { terms: makeTerms() },
    })

    const firstTag = wrapper.findAll('.nlp-tag')[0]
    await firstTag.trigger('keydown.enter')

    expect(writeText).toHaveBeenCalledWith('référencement')
  })

  it('has correct title tooltip on tags', () => {
    const wrapper = mount(NlpTerms, {
      props: { terms: makeTerms() },
    })

    const firstTag = wrapper.findAll('.nlp-tag')[0]
    expect(firstTag.attributes('title')).toContain('référencement')
    expect(firstTag.attributes('title')).toContain('Vol: 5000')
  })

  it('tags have role=button and tabindex=0', () => {
    const wrapper = mount(NlpTerms, {
      props: { terms: makeTerms() },
    })

    const firstTag = wrapper.findAll('.nlp-tag')[0]
    expect(firstTag.attributes('role')).toBe('button')
    expect(firstTag.attributes('tabindex')).toBe('0')
  })
})
