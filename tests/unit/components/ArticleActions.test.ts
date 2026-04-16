import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ArticleActions from '../../../src/components/article/ArticleActions.vue'

const defaultProps = {
  isGenerating: false,
  hasContent: false,
  isOutlineValidated: true,
  isReducing: false,
  isHumanizing: false,
  canReduce: false,
  wordCountDelta: null as number | null,
  humanizeProgress: null as { current: number; total: number; title: string } | null,
  reduceProgress: null as { current: number; total: number; title: string } | null,
}

describe('ArticleActions', () => {
  it('shows generate button when outline validated and no content', () => {
    const wrapper = mount(ArticleActions, { props: defaultProps })

    const btn = wrapper.find('[data-testid="generate-button"]')
    expect(btn.exists()).toBe(true)
    expect(btn.text()).toBe("Générer l'article")
  })

  it('shows regenerate button when content exists', () => {
    const wrapper = mount(ArticleActions, {
      props: { ...defaultProps, hasContent: true },
    })

    const btn = wrapper.find('[data-testid="regenerate-button"]')
    expect(btn.exists()).toBe(true)
    expect(btn.text()).toBe("Régénérer l'article")
    expect(wrapper.find('[data-testid="generate-button"]').exists()).toBe(false)
  })

  it('disables buttons during generation', () => {
    const wrapper = mount(ArticleActions, {
      props: { ...defaultProps, isGenerating: true },
    })

    const btn = wrapper.find('[data-testid="generate-button"]')
    expect((btn.element as HTMLButtonElement).disabled).toBe(true)
    expect(btn.text()).toBe('Génération en cours...')
  })

  it('reduce button is always visible, disabled without content', () => {
    const wrapper = mount(ArticleActions, { props: defaultProps })

    const btn = wrapper.find('[data-testid="reduce-button"]')
    expect(btn.exists()).toBe(true)
    expect((btn.element as HTMLButtonElement).disabled).toBe(true)
  })

  it('humanize button is always visible, disabled without content', () => {
    const wrapper = mount(ArticleActions, { props: defaultProps })

    const btn = wrapper.find('[data-testid="humanize-button"]')
    expect(btn.exists()).toBe(true)
    expect((btn.element as HTMLButtonElement).disabled).toBe(true)
  })

  it('shows reduce button with delta when content exists', () => {
    const wrapper = mount(ArticleActions, {
      props: { ...defaultProps, hasContent: true, canReduce: true, wordCountDelta: 320 },
    })

    const btn = wrapper.find('[data-testid="reduce-button"]')
    expect(btn.exists()).toBe(true)
    expect(btn.text()).toContain('Réduire (-320 mots)')
  })

  it('disables reduce button when canReduce is false', () => {
    const wrapper = mount(ArticleActions, {
      props: { ...defaultProps, hasContent: true, canReduce: false },
    })

    const btn = wrapper.find('[data-testid="reduce-button"]')
    expect(btn.exists()).toBe(true)
    expect((btn.element as HTMLButtonElement).disabled).toBe(true)
  })

  it('hides reduce button and shows abort when isReducing is true', () => {
    const wrapper = mount(ArticleActions, {
      props: { ...defaultProps, hasContent: true, canReduce: true, isReducing: true },
    })

    expect(wrapper.find('[data-testid="reduce-button"]').exists()).toBe(false)
    const abortBtn = wrapper.find('[data-testid="abort-reduce-button"]')
    expect(abortBtn.exists()).toBe(true)
    expect(abortBtn.text()).toBe('Annuler réduction')
  })

  it('shows humanize button when content exists and not humanizing', () => {
    const wrapper = mount(ArticleActions, {
      props: { ...defaultProps, hasContent: true },
    })

    const btn = wrapper.find('[data-testid="humanize-button"]')
    expect(btn.exists()).toBe(true)
    expect(btn.text()).toBe("Humaniser l'article")
  })

  it('shows abort button when isHumanizing is true (G6)', () => {
    const wrapper = mount(ArticleActions, {
      props: { ...defaultProps, hasContent: true, isHumanizing: true },
    })

    expect(wrapper.find('[data-testid="humanize-button"]').exists()).toBe(false)
    const abortBtn = wrapper.find('[data-testid="abort-humanize-button"]')
    expect(abortBtn.exists()).toBe(true)
    expect(abortBtn.text()).toBe('Annuler humanisation')
  })

  it('shows humanize progress indicator when humanizeProgress is set', () => {
    const wrapper = mount(ArticleActions, {
      props: {
        ...defaultProps,
        hasContent: true,
        isHumanizing: true,
        humanizeProgress: { current: 1, total: 5, title: 'Les avantages' },
      },
    })

    const indicator = wrapper.find('[data-testid="humanize-progress-indicator"]')
    expect(indicator.exists()).toBe(true)
    expect(indicator.text()).toContain('2/5')
    expect(indicator.text()).toContain('Les avantages')
  })

  it('emits reduce event on click', async () => {
    const wrapper = mount(ArticleActions, {
      props: { ...defaultProps, hasContent: true, canReduce: true, wordCountDelta: 200 },
    })

    await wrapper.find('[data-testid="reduce-button"]').trigger('click')
    expect(wrapper.emitted('reduce')).toHaveLength(1)
  })

  it('emits humanize event on click', async () => {
    const wrapper = mount(ArticleActions, {
      props: { ...defaultProps, hasContent: true },
    })

    await wrapper.find('[data-testid="humanize-button"]').trigger('click')
    expect(wrapper.emitted('humanize')).toHaveLength(1)
  })

  it('emits abort-humanize event on click', async () => {
    const wrapper = mount(ArticleActions, {
      props: { ...defaultProps, hasContent: true, isHumanizing: true },
    })

    await wrapper.find('[data-testid="abort-humanize-button"]').trigger('click')
    expect(wrapper.emitted('abort-humanize')).toHaveLength(1)
  })

  it('shows reduce progress indicator when reduceProgress is set', () => {
    const wrapper = mount(ArticleActions, {
      props: {
        ...defaultProps,
        hasContent: true,
        isReducing: true,
        reduceProgress: { current: 2, total: 6, title: 'Les bénéfices' },
      },
    })

    const indicator = wrapper.find('[data-testid="reduce-progress-indicator"]')
    expect(indicator.exists()).toBe(true)
    expect(indicator.text()).toContain('3/6')
    expect(indicator.text()).toContain('Les bénéfices')
  })

  it('emits abort-reduce event on click', async () => {
    const wrapper = mount(ArticleActions, {
      props: { ...defaultProps, hasContent: true, isReducing: true },
    })

    await wrapper.find('[data-testid="abort-reduce-button"]').trigger('click')
    expect(wrapper.emitted('abort-reduce')).toHaveLength(1)
  })

  it('disables humanize button when isReducing is true', () => {
    const wrapper = mount(ArticleActions, {
      props: { ...defaultProps, hasContent: true, isReducing: true },
    })

    const btn = wrapper.find('[data-testid="humanize-button"]')
    expect((btn.element as HTMLButtonElement).disabled).toBe(true)
  })
})
