/**
 * UX Audit — Sprint 1 Tests
 * Fondations : tokens CSS, thème clair unique, contrastes, ScoreGauge, badges
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import ScoreGauge from '../../../src/components/shared/ScoreGauge.vue'
import StatusBadge from '../../../src/components/shared/StatusBadge.vue'
import KeywordBadge from '../../../src/components/shared/KeywordBadge.vue'

// ─── 1.1 / 1.2 — Design tokens & thème clair unique ──────────────────────

describe('Design tokens (variables.css)', () => {
  const css = readFileSync(
    resolve(__dirname, '../../../src/assets/styles/variables.css'),
    'utf-8',
  )

  it('defines all required semantic color tokens', () => {
    const requiredTokens = [
      '--color-primary',
      '--color-success',
      '--color-warning',
      '--color-error',
      '--color-background',
      '--color-surface',
      '--color-text',
      '--color-text-muted',
      '--color-border',
    ]
    for (const token of requiredTokens) {
      expect(css).toContain(token)
    }
  })

  it('defines editor-specific tokens', () => {
    expect(css).toContain('--color-editor-bg')
    expect(css).toContain('--color-editor-text')
  })

  it('defines block tokens for content-valeur, content-reminder, answer-capsule', () => {
    expect(css).toContain('--color-block-info-bg')
    expect(css).toContain('--color-block-info-border')
    expect(css).toContain('--color-block-warning-bg')
    expect(css).toContain('--color-block-warning-border')
    expect(css).toContain('--color-block-answer-bg')
  })

  it('defines separate score tokens for text and arcs', () => {
    expect(css).toContain('--color-score-good')
    expect(css).toContain('--color-score-fair')
    expect(css).toContain('--color-score-poor')
    expect(css).toContain('--color-score-good-arc')
    expect(css).toContain('--color-score-fair-arc')
    expect(css).toContain('--color-score-poor-arc')
  })

  it('defines badge tokens with accessible contrasts', () => {
    const badgeTokens = [
      '--color-badge-blue-bg', '--color-badge-blue-text',
      '--color-badge-amber-bg', '--color-badge-amber-text',
      '--color-badge-green-bg', '--color-badge-green-text',
      '--color-badge-slate-bg', '--color-badge-slate-text',
    ]
    for (const token of badgeTokens) {
      expect(css).toContain(token)
    }
  })

  it('defines typography tokens', () => {
    expect(css).toContain('--font-sans')
    expect(css).toContain('--font-mono')
    expect(css).toContain('--font-editor')
  })

  it('does NOT have a dark mode media query (light theme only for writing)', () => {
    expect(css).not.toContain('@media (prefers-color-scheme: dark)')
  })

  it('uses white background for optimal readability', () => {
    expect(css).toContain('--color-background: #ffffff')
  })

  it('uses dark text on light background', () => {
    expect(css).toContain('--color-text: #1e293b')
  })
})

describe('base.css — no token collisions', () => {
  const css = readFileSync(
    resolve(__dirname, '../../../src/assets/base.css'),
    'utf-8',
  )

  it('does not define :root token block (definitions are in variables.css)', () => {
    expect(css).not.toContain(':root')
  })

  it('does not contain Vue scaffold tokens (--vt-c-*)', () => {
    expect(css).not.toContain('--vt-c-')
  })

  it('does not contain its own dark mode media query', () => {
    expect(css).not.toContain('@media (prefers-color-scheme: dark)')
  })
})

// ─── 2.1 — ScoreGauge : arc vs text colors, SVG ARIA ─────────────────────

describe('ScoreGauge', () => {
  it('uses arc color tokens for the SVG fill circle', () => {
    const wrapper = mount(ScoreGauge, {
      props: { score: 85, label: 'SEO' },
    })

    const fillCircle = wrapper.find('.gauge-fill')
    expect(fillCircle.attributes('stroke')).toBe('var(--color-score-good-arc)')
  })

  it('uses text color tokens for the score number', () => {
    const wrapper = mount(ScoreGauge, {
      props: { score: 85, label: 'SEO' },
    })

    const scoreSpan = wrapper.find('.gauge-score')
    const style = scoreSpan.attributes('style')
    expect(style).toContain('color: var(--color-score-good)')
  })

  it('returns fair colors for scores 40-69', () => {
    const wrapper = mount(ScoreGauge, {
      props: { score: 55, label: 'SEO' },
    })

    expect(wrapper.find('.gauge-fill').attributes('stroke')).toBe('var(--color-score-fair-arc)')
    expect(wrapper.find('.gauge-score').attributes('style')).toContain('var(--color-score-fair)')
  })

  it('returns poor colors for scores below 40', () => {
    const wrapper = mount(ScoreGauge, {
      props: { score: 20, label: 'SEO' },
    })

    expect(wrapper.find('.gauge-fill').attributes('stroke')).toBe('var(--color-score-poor-arc)')
    expect(wrapper.find('.gauge-score').attributes('style')).toContain('var(--color-score-poor)')
  })

  it('has role="img" on the SVG element', () => {
    const wrapper = mount(ScoreGauge, {
      props: { score: 72, label: 'SEO' },
    })

    const svg = wrapper.find('svg')
    expect(svg.attributes('role')).toBe('img')
  })

  it('has descriptive aria-label on SVG', () => {
    const wrapper = mount(ScoreGauge, {
      props: { score: 72, label: 'SEO' },
    })

    const svg = wrapper.find('svg')
    expect(svg.attributes('aria-label')).toBe('Score SEO: 72 sur 100')
  })

  it('has a <title> element inside SVG for tooltip', () => {
    const wrapper = mount(ScoreGauge, {
      props: { score: 72, label: 'SEO' },
    })

    const title = wrapper.find('title')
    expect(title.exists()).toBe(true)
    expect(title.text()).toBe('SEO: 72/100')
  })

  it('renders different sizes (sm, md, lg)', () => {
    const sm = mount(ScoreGauge, { props: { score: 50, label: 'T', size: 'sm' } })
    const lg = mount(ScoreGauge, { props: { score: 50, label: 'T', size: 'lg' } })

    expect(sm.find('svg').attributes('width')).toBe('60')
    expect(lg.find('svg').attributes('width')).toBe('120')
  })
})

// ─── 2.2 — StatusBadge : token-based colors ──────────────────────────────

describe('StatusBadge', () => {
  it('renders with status--todo class for "à rédiger"', () => {
    const wrapper = mount(StatusBadge, {
      props: { status: 'à rédiger' },
    })

    expect(wrapper.find('.status--todo').exists()).toBe(true)
    expect(wrapper.text()).toContain('À rédiger')
  })

  it('renders with status--draft class for "brouillon"', () => {
    const wrapper = mount(StatusBadge, {
      props: { status: 'brouillon' },
    })

    expect(wrapper.find('.status--draft').exists()).toBe(true)
    expect(wrapper.text()).toContain('Brouillon')
  })

  it('renders with status--published class for "publié"', () => {
    const wrapper = mount(StatusBadge, {
      props: { status: 'publié' },
    })

    expect(wrapper.find('.status--published').exists()).toBe(true)
    expect(wrapper.text()).toContain('Publié')
  })

  it('renders a status dot element', () => {
    const wrapper = mount(StatusBadge, {
      props: { status: 'brouillon' },
    })

    expect(wrapper.find('.status-dot').exists()).toBe(true)
  })
})

// ─── 2.2 — KeywordBadge : token-based colors ─────────────────────────────

describe('KeywordBadge', () => {
  it('renders Pilier keyword with kw--pilier class', () => {
    const wrapper = mount(KeywordBadge, {
      props: { keyword: { keyword: 'seo', cocoonName: 'SEO', type: 'Pilier' } },
    })

    expect(wrapper.find('.kw--pilier').exists()).toBe(true)
    expect(wrapper.text()).toBe('seo')
  })

  it('renders Moyenne traine keyword with kw--moyenne class', () => {
    const wrapper = mount(KeywordBadge, {
      props: { keyword: { keyword: 'référencement', cocoonName: 'SEO', type: 'Moyenne traine' } },
    })

    expect(wrapper.find('.kw--moyenne').exists()).toBe(true)
  })

  it('renders Longue traine keyword with kw--longue class', () => {
    const wrapper = mount(KeywordBadge, {
      props: { keyword: { keyword: 'référencement naturel pme', cocoonName: 'SEO', type: 'Longue traine' } },
    })

    expect(wrapper.find('.kw--longue').exists()).toBe(true)
  })
})

// ─── 1.4 — EditorBubbleMenu : token-based design ─────────────────────────

describe('EditorBubbleMenu — CSS tokens (static check)', () => {
  const css = readFileSync(
    resolve(__dirname, '../../../src/components/editor/EditorBubbleMenu.vue'),
    'utf-8',
  )

  it('uses --color-bg-elevated for background (not --color-text)', () => {
    expect(css).toContain('background: var(--color-bg-elevated)')
    expect(css).not.toMatch(/\.bubble-menu\s*\{[^}]*background:\s*var\(--color-text\)/)
  })

  it('uses --color-border for border and separator', () => {
    expect(css).toContain('border: 1px solid var(--color-border)')
    expect(css).toContain('background: var(--color-border)')
  })

  it('uses --color-bg-hover for button hover state', () => {
    expect(css).toContain('background: var(--color-bg-hover)')
  })

  it('uses --color-text for button text color', () => {
    expect(css).toContain('color: var(--color-text)')
  })
})
