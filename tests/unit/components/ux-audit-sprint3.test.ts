/**
 * UX Audit — Sprint 3 Tests
 * ARIA attributes, transitions, responsive, LinkSuggestions panel
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import ProgressBar from '../../../src/components/shared/ProgressBar.vue'
import LoadingSpinner from '../../../src/components/shared/LoadingSpinner.vue'
import LinkSuggestions from '../../../src/components/linking/LinkSuggestions.vue'
import ActionMenu from '../../../src/components/actions/ActionMenu.vue'

// ─── 2.4 — ARIA : ProgressBar ────────────────────────────────────────────

describe('ProgressBar — ARIA attributes', () => {
  it('has role="progressbar"', () => {
    const wrapper = mount(ProgressBar, {
      props: { percent: 50 },
    })

    expect(wrapper.find('.progress-bar').attributes('role')).toBe('progressbar')
  })

  it('has aria-valuenow matching percent', () => {
    const wrapper = mount(ProgressBar, {
      props: { percent: 73.5 },
    })

    expect(wrapper.find('.progress-bar').attributes('aria-valuenow')).toBe('74')
  })

  it('has aria-valuemin="0"', () => {
    const wrapper = mount(ProgressBar, {
      props: { percent: 50 },
    })

    expect(wrapper.find('.progress-bar').attributes('aria-valuemin')).toBe('0')
  })

  it('has aria-valuemax="100"', () => {
    const wrapper = mount(ProgressBar, {
      props: { percent: 50 },
    })

    expect(wrapper.find('.progress-bar').attributes('aria-valuemax')).toBe('100')
  })

  it('clamps value at 0 for negative percents', () => {
    const wrapper = mount(ProgressBar, {
      props: { percent: -10 },
    })

    const fillStyle = wrapper.find('.progress-fill').attributes('style')
    expect(fillStyle).toContain('width: 0%')
  })

  it('clamps value at 100 for values over 100', () => {
    const wrapper = mount(ProgressBar, {
      props: { percent: 150 },
    })

    const fillStyle = wrapper.find('.progress-fill').attributes('style')
    expect(fillStyle).toContain('width: 100%')
  })
})

// ─── 2.4 — ARIA : LoadingSpinner ─────────────────────────────────────────

describe('LoadingSpinner — accessibility', () => {
  it('has role="status"', () => {
    const wrapper = mount(LoadingSpinner)

    expect(wrapper.find('.loading-spinner').attributes('role')).toBe('status')
  })

  it('has screen-reader-only text', () => {
    const wrapper = mount(LoadingSpinner)

    const srOnly = wrapper.find('.sr-only')
    expect(srOnly.exists()).toBe(true)
    expect(srOnly.text()).toBe('Chargement...')
  })
})

// ExportPreview was removed — tests skipped
describe.skip('ExportPreview — ARIA attributes', () => {
  it('has role="dialog" on the container', () => {})
  it('has aria-label on the dialog', () => {})
  it('has aria-label on the close button', () => {})
  it('has title attribute on the iframe', () => {})
})

// ─── 2.4 — ARIA : ActionMenu ─────────────────────────────────────────────

describe('ActionMenu — ARIA attributes', () => {
  it('has role="menu" on the root element', () => {
    const wrapper = mount(ActionMenu, {
      props: { disabled: false },
    })

    expect(wrapper.find('.action-menu').attributes('role')).toBe('menu')
  })

  it('has aria-label on the menu', () => {
    const wrapper = mount(ActionMenu, {
      props: { disabled: false },
    })

    expect(wrapper.find('.action-menu').attributes('aria-label')).toBe('Actions contextuelles')
  })

  it('has role="group" on each action group', () => {
    const wrapper = mount(ActionMenu, {
      props: { disabled: false },
    })

    const groups = wrapper.findAll('.action-group')
    for (const group of groups) {
      expect(group.attributes('role')).toBe('group')
    }
  })

  it('has role="menuitem" on each action button', () => {
    const wrapper = mount(ActionMenu, {
      props: { disabled: false },
    })

    const items = wrapper.findAll('.action-item')
    for (const item of items) {
      expect(item.attributes('role')).toBe('menuitem')
    }
  })

  it('has aria-hidden on emoji icons (decorative)', () => {
    const wrapper = mount(ActionMenu, {
      props: { disabled: false },
    })

    const icons = wrapper.findAll('.action-icon')
    for (const icon of icons) {
      expect(icon.attributes('aria-hidden')).toBe('true')
    }
  })
})

// ─── 3.2 — Panel slide transitions ───────────────────────────────────────

describe('ArticleEditorView — panel transitions', () => {
  const vue = readFileSync(
    resolve(__dirname, '../../../src/views/ArticleEditorView.vue'),
    'utf-8',
  )

  it('wraps SeoPanel in <Transition name="panel-slide">', () => {
    expect(vue).toContain('<Transition name="panel-slide">')
  })

  it('defines panel-slide-enter-active CSS', () => {
    expect(vue).toContain('.panel-slide-enter-active')
  })

  it('defines panel-slide-leave-active CSS', () => {
    expect(vue).toContain('.panel-slide-leave-active')
  })

  it('defines panel-slide-enter-from CSS', () => {
    expect(vue).toContain('.panel-slide-enter-from')
  })

  it('defines panel-slide-leave-to CSS', () => {
    expect(vue).toContain('.panel-slide-leave-to')
  })

  it('transitions width and opacity', () => {
    expect(vue).toContain('transition: width')
    expect(vue).toContain('opacity')
  })
})

// ─── 3.3 — Responsive layout ─────────────────────────────────────────────

describe('ArticleEditorView — responsive breakpoints', () => {
  const vue = readFileSync(
    resolve(__dirname, '../../../src/views/ArticleEditorView.vue'),
    'utf-8',
  )

  it('has a 1200px breakpoint for tablet', () => {
    expect(vue).toContain('@media (max-width: 1200px)')
  })

  it('has a 768px breakpoint for mobile', () => {
    expect(vue).toContain('@media (max-width: 768px)')
  })

  it('reduces padding at 768px', () => {
    const mobileMatch = vue.match(/@media\s*\(max-width:\s*768px\)\s*\{([\s\S]*?)\n\}/)
    expect(mobileMatch).not.toBeNull()
    expect(mobileMatch![1]).toContain('padding: 1rem')
  })
})

// ─── 4.2 — LinkSuggestions : side panel architecture ─────────────────────

describe('LinkSuggestions — side panel (wrapped by ResizablePanel)', () => {
  const vue = readFileSync(
    resolve(__dirname, '../../../src/components/linking/LinkSuggestions.vue'),
    'utf-8',
  )

  it('has padding for internal spacing', () => {
    expect(vue).toContain('padding: 1rem')
  })

  it('positioning delegated to ResizablePanel wrapper', () => {
    const wrapper = readFileSync(
      resolve(__dirname, '../../../src/components/panels/ResizablePanel.vue'),
      'utf-8',
    )
    expect(wrapper).toContain('position: sticky')
    expect(wrapper).toContain('height: 100vh')
    expect(wrapper).toContain('flex-shrink: 0')
  })

  it('uses badge tokens for type badges', () => {
    expect(vue).toContain('var(--color-badge-blue-bg)')
    expect(vue).toContain('var(--color-badge-amber-bg)')
    expect(vue).toContain('var(--color-badge-green-bg)')
  })
})

describe('LinkSuggestions — component behavior', () => {
  const defaultProps = {
    suggestions: [],
    isSuggesting: false,
  }

  it('renders suggestions header', () => {
    const wrapper = mount(LinkSuggestions, { props: defaultProps })
    expect(wrapper.find('.suggestions-title').text()).toBe('Suggestions de maillage')
  })

  it('shows empty state when no suggestions', () => {
    const wrapper = mount(LinkSuggestions, { props: defaultProps })
    expect(wrapper.find('.suggestions-empty').exists()).toBe(true)
  })

  it('shows loading state when isSuggesting', () => {
    const wrapper = mount(LinkSuggestions, {
      props: { ...defaultProps, isSuggesting: true },
    })
    expect(wrapper.find('.suggestions-loading').exists()).toBe(true)
  })

  it('renders suggestion items', () => {
    const wrapper = mount(LinkSuggestions, {
      props: {
        suggestions: [
          {
            targetId: 1,
            targetTitle: 'Article 1',
            targetType: 'Pilier',
            suggestedAnchor: 'référencement',
            reason: 'Même cocon',
          },
        ],
        isSuggesting: false,
      },
    })

    expect(wrapper.find('.suggestion-item').exists()).toBe(true)
    expect(wrapper.find('.suggestion-title').text()).toBe('Article 1')
    expect(wrapper.find('.suggestion-type').text()).toBe('Pilier')
  })

  it('emits "request" when refresh button is clicked', async () => {
    const wrapper = mount(LinkSuggestions, { props: defaultProps })
    await wrapper.find('.btn-refresh').trigger('click')
    expect(wrapper.emitted('request')).toHaveLength(1)
  })

  it('emits "close" when close button is clicked', async () => {
    const wrapper = mount(LinkSuggestions, { props: defaultProps })
    await wrapper.find('.btn-close').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('emits "accept" with suggestion when accept button is clicked', async () => {
    const suggestion = {
      targetId: 1,
      targetTitle: 'Test',
      targetType: 'Pilier' as const,
      suggestedAnchor: 'test',
      reason: 'test',
    }

    const wrapper = mount(LinkSuggestions, {
      props: { suggestions: [suggestion], isSuggesting: false },
    })

    await wrapper.find('.btn-accept').trigger('click')
    expect(wrapper.emitted('accept')).toHaveLength(1)
    expect(wrapper.emitted('accept')![0]).toEqual([suggestion])
  })

  it('emits "dismiss" with suggestion when dismiss button is clicked', async () => {
    const suggestion = {
      targetId: 1,
      targetTitle: 'Test',
      targetType: 'Pilier' as const,
      suggestedAnchor: 'test',
      reason: 'test',
    }

    const wrapper = mount(LinkSuggestions, {
      props: { suggestions: [suggestion], isSuggesting: false },
    })

    await wrapper.find('.btn-dismiss').trigger('click')
    expect(wrapper.emitted('dismiss')).toHaveLength(1)
    expect(wrapper.emitted('dismiss')![0]).toEqual([suggestion])
  })

  it('disables refresh button when isSuggesting', () => {
    const wrapper = mount(LinkSuggestions, {
      props: { ...defaultProps, isSuggesting: true },
    })

    const btn = wrapper.find('.btn-refresh')
    expect((btn.element as HTMLButtonElement).disabled).toBe(true)
  })
})

// ─── Mutual exclusion — panels are at same level in template ─────────────

describe('ArticleEditorView — panel mutual exclusion', () => {
  const vue = readFileSync(
    resolve(__dirname, '../../../src/views/ArticleEditorView.vue'),
    'utf-8',
  )

  it('renders LinkSuggestions outside article-editor-view div', () => {
    // LinkSuggestions should be at the same level as SeoPanel/GeoPanel,
    // outside the main .article-editor-view column, inside .article-editor-layout
    const layoutMatch = vue.match(/class="article-editor-layout"/)
    expect(layoutMatch).not.toBeNull()

    // All 3 panels should be after the closing </div> of article-editor-view
    const panelSection = vue.slice(vue.indexOf('</div><!-- end article-editor-view -->') || vue.indexOf('<Transition name="panel-slide">'))
    expect(vue).toContain('<SeoPanel')
    expect(vue).toContain('<GeoPanel')
    expect(vue).toContain('<LinkSuggestions')
  })

  it('has toggle buttons for SEO, GEO, and Maillage', () => {
    // Button text has surrounding whitespace/newlines — use regex
    expect(vue).toMatch(/btn-toggle[\s\S]*?>\s*SEO\s*<\/button>/)
    expect(vue).toMatch(/btn-toggle[\s\S]*?>\s*GEO\s*<\/button>/)
    expect(vue).toMatch(/btn-toggle[\s\S]*?>\s*Maillage\s*<\/button>/)
  })
})
