/**
 * UX Audit — Sprint 2 Tests
 * Confort éditeur : sticky panels, header restructuré, polices, couleurs migrées
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// ─── 3.1 — Sticky side panels ────────────────────────────────────────────

describe('ResizablePanel — sticky positioning (wraps SeoPanel/GeoPanel)', () => {
  const vue = readFileSync(
    resolve(__dirname, '../../../src/components/panels/ResizablePanel.vue'),
    'utf-8',
  )

  it('has position: sticky', () => {
    expect(vue).toContain('position: sticky')
  })

  it('has top: 0', () => {
    expect(vue).toContain('top: 0')
  })

  it('has height: 100vh', () => {
    expect(vue).toContain('height: 100vh')
  })

  it('has flex-shrink: 0 to prevent collapsing', () => {
    expect(vue).toContain('flex-shrink: 0')
  })

  it('has overflow-y: auto for scrollable content', () => {
    expect(vue).toContain('overflow-y: auto')
  })

  it('uses --color-background token', () => {
    expect(vue).toContain('background: var(--color-background)')
  })

  it('has resize handle with col-resize cursor', () => {
    expect(vue).toContain('cursor: col-resize')
  })
})

// ─── 4.1 — Header restructuré ────────────────────────────────────────────

describe('ArticleEditorView — header structure', () => {
  const vue = readFileSync(
    resolve(__dirname, '../../../src/views/ArticleEditorView.vue'),
    'utf-8',
  )

  it('has three header groups: left, center, right', () => {
    expect(vue).toContain('header-left')
    expect(vue).toContain('header-center')
    expect(vue).toContain('header-right')
  })

  it('uses role="toolbar" on header-center', () => {
    expect(vue).toContain('role="toolbar"')
  })

  it('uses generic .btn-toggle class (not .btn-toggle-seo)', () => {
    expect(vue).toContain('btn-toggle')
    expect(vue).not.toContain('btn-toggle-seo')
  })

  it('has aria-pressed on toggle buttons', () => {
    expect(vue).toContain(':aria-pressed')
  })
})

// ─── 1.3 — Hardcoded colors migrated to tokens ───────────────────────────

describe('editor.css — block colors use tokens', () => {
  const css = readFileSync(
    resolve(__dirname, '../../../src/assets/styles/editor.css'),
    'utf-8',
  )

  it('content-valeur uses --color-block-info-bg', () => {
    expect(css).toContain('var(--color-block-info-bg)')
  })

  it('content-valeur uses --color-block-info-border', () => {
    expect(css).toContain('var(--color-block-info-border)')
  })

  it('content-reminder uses --color-block-warning-bg', () => {
    expect(css).toContain('var(--color-block-warning-bg)')
  })

  it('content-reminder uses --color-block-warning-border', () => {
    expect(css).toContain('var(--color-block-warning-border)')
  })

  it('answer-capsule uses --color-block-answer-bg', () => {
    expect(css).toContain('var(--color-block-answer-bg)')
  })

  it('does not contain hardcoded hex colors for blocks', () => {
    // These were the old hardcoded values
    expect(css).not.toContain('#eff6ff')
    expect(css).not.toContain('#fef3c7')
    expect(css).not.toContain('#f8fafc')
  })
})

describe('ExportButton — token-based colors', () => {
  const vue = readFileSync(
    resolve(__dirname, '../../../src/components/export/ExportButton.vue'),
    'utf-8',
  )

  it('uses --color-success instead of hardcoded green', () => {
    expect(vue).toContain('var(--color-success)')
    expect(vue).not.toContain('#16a34a')
  })

  it('uses --color-error instead of hardcoded red', () => {
    expect(vue).toContain('var(--color-error)')
    expect(vue).not.toContain('#dc2626')
  })
})

describe('ExportPreview — token-based colors', () => {
  const vue = readFileSync(
    resolve(__dirname, '../../../src/components/export/ExportPreview.vue'),
    'utf-8',
  )

  it('uses --color-bg-elevated for background', () => {
    expect(vue).toContain('var(--color-bg-elevated)')
  })

  it('uses --color-success for download button', () => {
    expect(vue).toContain('var(--color-success)')
    expect(vue).not.toContain('#16a34a')
  })
})

describe('DashboardView — token-based colors', () => {
  const vue = readFileSync(
    resolve(__dirname, '../../../src/views/DashboardView.vue'),
    'utf-8',
  )

  it('uses --color-bg-hover instead of hardcoded rgba', () => {
    expect(vue).toContain('var(--color-bg-hover)')
    expect(vue).not.toContain('rgba(59, 130, 246')
  })
})

describe('ArticleEditorView — token-based colors', () => {
  const vue = readFileSync(
    resolve(__dirname, '../../../src/views/ArticleEditorView.vue'),
    'utf-8',
  )

  it('uses --color-error-bg and --color-error for action errors', () => {
    expect(vue).toContain('var(--color-error-bg)')
    expect(vue).toContain('var(--color-error)')
  })
})

// ─── 2.3 — Font sizes >= 12px (0.75rem) ──────────────────────────────────

describe('Font sizes — minimum readability', () => {
  it('ActionMenu group-label uses 0.75rem (12px)', () => {
    const vue = readFileSync(
      resolve(__dirname, '../../../src/components/actions/ActionMenu.vue'),
      'utf-8',
    )
    const groupLabelMatch = vue.match(/\.group-label\s*\{[^}]*font-size:\s*([^;]+)/)
    expect(groupLabelMatch).not.toBeNull()
    expect(groupLabelMatch![1].trim()).toBe('0.75rem')
  })

  it('SeoPanel meta-range uses 0.75rem (12px)', () => {
    const vue = readFileSync(
      resolve(__dirname, '../../../src/components/panels/SeoPanel.vue'),
      'utf-8',
    )
    const metaMatch = vue.match(/\.meta-range\s*\{[^}]*font-size:\s*([^;]+)/)
    expect(metaMatch).not.toBeNull()
    expect(metaMatch![1].trim()).toBe('0.75rem')
  })

  it('GeoPanel metric-target uses 0.75rem (12px)', () => {
    const vue = readFileSync(
      resolve(__dirname, '../../../src/components/panels/GeoPanel.vue'),
      'utf-8',
    )
    const metricMatch = vue.match(/\.metric-target\s*\{[^}]*font-size:\s*([^;]+)/)
    expect(metricMatch).not.toBeNull()
    expect(metricMatch![1].trim()).toBe('0.75rem')
  })
})

// ─── Panels — color token migration ──────────────────────────────────────

describe('SeoPanel — color tokens', () => {
  const vue = readFileSync(
    resolve(__dirname, '../../../src/components/panels/SeoPanel.vue'),
    'utf-8',
  )

  it('uses --color-success for valid headings', () => {
    expect(vue).toContain('var(--color-success)')
  })

  it('uses --color-error for validation errors', () => {
    expect(vue).toContain('var(--color-error)')
  })

  it('uses --color-warning for meta warnings', () => {
    expect(vue).toContain('var(--color-warning)')
  })
})

describe('GeoPanel — color tokens', () => {
  const vue = readFileSync(
    resolve(__dirname, '../../../src/components/panels/GeoPanel.vue'),
    'utf-8',
  )

  it('uses --color-success for metric-ok', () => {
    expect(vue).toContain('var(--color-success)')
  })

  it('uses --color-warning for metric-warn', () => {
    expect(vue).toContain('var(--color-warning)')
  })

  it('uses --color-error for missing capsules', () => {
    expect(vue).toContain('var(--color-error)')
  })
})
