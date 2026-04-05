import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import TopicSuggestions from '../../../src/components/production/TopicSuggestions.vue'
import type { SuggestedTopic } from '../../../shared/types/strategy.types'

function makeTopic(topic: string, checked = true): SuggestedTopic {
  return { id: `id-${topic}`, topic, checked }
}

const defaultTopics: SuggestedTopic[] = [
  makeTopic('Stratégie SEO locale'),
  makeTopic('Référencement technique'),
  makeTopic('Content marketing B2B', false),
]

function mountComponent(overrides: Partial<{
  topics: SuggestedTopic[]
  userContext: string
  loading: boolean
  error: string | null
}> = {}) {
  return mount(TopicSuggestions, {
    props: {
      topics: overrides.topics ?? defaultTopics,
      userContext: overrides.userContext ?? '',
      loading: overrides.loading ?? false,
      error: overrides.error ?? null,
    },
  })
}

describe('TopicSuggestions', () => {
  it('renders checkboxes when topics are provided', () => {
    const wrapper = mountComponent()
    const checkboxes = wrapper.findAll('.topic-checkbox')
    expect(checkboxes).toHaveLength(3)
    expect(wrapper.text()).toContain('Stratégie SEO locale')
    expect(wrapper.text()).toContain('Référencement technique')
    expect(wrapper.text()).toContain('Content marketing B2B')
  })

  it('does not render checkboxes when topics is empty and not loading', () => {
    const wrapper = mountComponent({ topics: [] })
    expect(wrapper.findAll('.topic-checkbox')).toHaveLength(0)
    expect(wrapper.find('.topic-loading').exists()).toBe(false)
  })

  it('shows loader when loading is true', () => {
    const wrapper = mountComponent({ loading: true })
    expect(wrapper.find('.topic-loading').exists()).toBe(true)
    expect(wrapper.text()).toContain('Génération des sujets')
  })

  it('shows error message when error is non-null', () => {
    const wrapper = mountComponent({ error: 'Échec de la génération.' })
    expect(wrapper.find('.topic-error').exists()).toBe(true)
    expect(wrapper.text()).toContain('Échec de la génération.')
  })

  it('emits toggle with correct index on checkbox click', async () => {
    const wrapper = mountComponent()
    const checkboxes = wrapper.findAll('.topic-checkbox')
    await checkboxes[1].trigger('change')
    expect(wrapper.emitted('toggle')).toEqual([[1]])
  })

  it('emits remove with correct index on delete click', async () => {
    const wrapper = mountComponent()
    const removeBtns = wrapper.findAll('.topic-remove-btn')
    await removeBtns[2].trigger('click')
    expect(wrapper.emitted('remove')).toEqual([[2]])
  })

  it('emits add with value on input + click "+"', async () => {
    const wrapper = mountComponent()
    const input = wrapper.find('.topic-add-input')
    await input.setValue('Nouveau sujet')
    await wrapper.find('.topic-add-btn').trigger('click')
    expect(wrapper.emitted('add')).toEqual([['Nouveau sujet']])
    // Input should be cleared
    expect((input.element as HTMLInputElement).value).toBe('')
  })

  it('does not emit add when input is empty', async () => {
    const wrapper = mountComponent()
    await wrapper.find('.topic-add-btn').trigger('click')
    expect(wrapper.emitted('add')).toBeUndefined()
  })

  it('emits regenerate on regenerate button click', async () => {
    const wrapper = mountComponent()
    await wrapper.find('.topic-regen-btn').trigger('click')
    expect(wrapper.emitted('regenerate')).toHaveLength(1)
  })

  it('emits update:user-context on textarea input', async () => {
    const wrapper = mountComponent()
    const textarea = wrapper.find('.topic-context')
    await textarea.setValue('Mon contexte additionnel')
    expect(wrapper.emitted('update:user-context')).toBeTruthy()
    const emitted = wrapper.emitted('update:user-context')!
    expect(emitted[emitted.length - 1][0]).toBe('Mon contexte additionnel')
  })

  it('shows retry button in error state that emits regenerate', async () => {
    const wrapper = mountComponent({ error: 'Erreur' })
    const retryBtn = wrapper.find('.topic-retry-btn')
    expect(retryBtn.exists()).toBe(true)
    await retryBtn.trigger('click')
    expect(wrapper.emitted('regenerate')).toHaveLength(1)
  })

  it('applies unchecked style to unchecked topics', () => {
    const wrapper = mountComponent()
    const texts = wrapper.findAll('.topic-text')
    // Third topic is unchecked
    expect(texts[2].classes()).toContain('topic-text--unchecked')
    // First two are checked
    expect(texts[0].classes()).not.toContain('topic-text--unchecked')
  })

  it('disables regenerate button when loading', () => {
    const wrapper = mountComponent({ loading: true })
    const regenBtn = wrapper.find('.topic-regen-btn')
    expect(regenBtn.classes()).toContain('topic-regen-btn--disabled')
  })

  it('starts expanded by default (body visible)', () => {
    const wrapper = mountComponent()
    expect(wrapper.find('.topic-body--collapsed').exists()).toBe(false)
    expect(wrapper.find('.topic-body').exists()).toBe(true)
  })

  it('collapses body when header is clicked', async () => {
    const wrapper = mountComponent()
    await wrapper.find('.topic-header').trigger('click')
    expect(wrapper.find('.topic-body--collapsed').exists()).toBe(true)
  })

  it('toggles back to expanded on second click', async () => {
    const wrapper = mountComponent()
    const header = wrapper.find('.topic-header')
    await header.trigger('click')
    expect(wrapper.find('.topic-body--collapsed').exists()).toBe(true)
    await header.trigger('click')
    expect(wrapper.find('.topic-body--collapsed').exists()).toBe(false)
  })

  it('shows badge with checked count when collapsed', async () => {
    const wrapper = mountComponent()
    expect(wrapper.find('.topic-badge').exists()).toBe(false)
    await wrapper.find('.topic-header').trigger('click')
    const badge = wrapper.find('.topic-badge')
    expect(badge.exists()).toBe(true)
    expect(badge.text()).toBe('2/3')
  })

  it('does not show badge when collapsed with no topics', async () => {
    const wrapper = mountComponent({ topics: [] })
    await wrapper.find('.topic-header').trigger('click')
    expect(wrapper.find('.topic-badge').exists()).toBe(false)
  })

  it('regen button click does not toggle collapse', async () => {
    const wrapper = mountComponent()
    await wrapper.find('.topic-regen-btn').trigger('click')
    expect(wrapper.find('.topic-body--collapsed').exists()).toBe(false)
    expect(wrapper.emitted('regenerate')).toHaveLength(1)
  })
})
