/**
 * UX Audit — Sprint 4 Tests
 * Nettoyage : double padding, dead code CSS, prefers-reduced-motion
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// ─── 4.3 — Double padding supprimé ───────────────────────────────────────

describe('App.vue — no double padding', () => {
  const vue = readFileSync(
    resolve(__dirname, '../../../src/App.vue'),
    'utf-8',
  )

  it('does not have padding on .app-main', () => {
    const appMainMatch = vue.match(/\.app-main\s*\{([^}]*)/)
    expect(appMainMatch).not.toBeNull()
    expect(appMainMatch![1]).not.toContain('padding')
  })

  it('does not have max-width on .app-main', () => {
    const appMainMatch = vue.match(/\.app-main\s*\{([^}]*)/)
    expect(appMainMatch).not.toBeNull()
    expect(appMainMatch![1]).not.toContain('max-width')
  })

  it('has flex: 1 on .app-main', () => {
    const appMainMatch = vue.match(/\.app-main\s*\{([^}]*)/)
    expect(appMainMatch).not.toBeNull()
    expect(appMainMatch![1]).toContain('flex: 1')
  })
})

describe('Views — own padding', () => {
  it('DashboardView has padding: 2rem', () => {
    const vue = readFileSync(
      resolve(__dirname, '../../../src/views/DashboardView.vue'),
      'utf-8',
    )
    expect(vue).toContain('padding: 2rem')
  })

  it('CocoonLandingView has padding: 2rem', () => {
    const vue = readFileSync(
      resolve(__dirname, '../../../src/views/CocoonLandingView.vue'),
      'utf-8',
    )
    expect(vue).toContain('padding: 2rem')
  })

  it('ArticleEditorView has padding: 2rem', () => {
    const vue = readFileSync(
      resolve(__dirname, '../../../src/views/ArticleEditorView.vue'),
      'utf-8',
    )
    expect(vue).toContain('padding: 2rem')
  })

  it('ArticleWorkflowView has padding: 2rem', () => {
    const vue = readFileSync(
      resolve(__dirname, '../../../src/views/ArticleWorkflowView.vue'),
      'utf-8',
    )
    expect(vue).toContain('padding: 2rem')
  })

  it('LinkingMatrixView has padding: 2rem', () => {
    const vue = readFileSync(
      resolve(__dirname, '../../../src/views/LinkingMatrixView.vue'),
      'utf-8',
    )
    expect(vue).toContain('padding: 2rem')
  })
})

// ─── 4.4 — Dead code CSS supprimé ────────────────────────────────────────

describe('main.css (scaffold) — cleaned', () => {
  const css = readFileSync(
    resolve(__dirname, '../../../src/assets/main.css'),
    'utf-8',
  )

  it('only contains an import to styles/main.css', () => {
    expect(css).toContain("@import './styles/main.css'")
  })

  it('does not define #app styles', () => {
    expect(css).not.toContain('#app')
  })

  it('does not contain Vue scaffold green branding', () => {
    expect(css).not.toContain('.green')
    expect(css).not.toContain('hsla(160')
  })

  it('does not contain grid layout', () => {
    expect(css).not.toContain('grid-template-columns')
    expect(css).not.toContain('display: grid')
  })

  it('does not contain body flex layout', () => {
    expect(css).not.toContain('place-items: center')
  })
})

// ─── 2.5 — prefers-reduced-motion ────────────────────────────────────────

describe('Global prefers-reduced-motion', () => {
  const css = readFileSync(
    resolve(__dirname, '../../../src/assets/styles/main.css'),
    'utf-8',
  )

  it('has a prefers-reduced-motion media query', () => {
    expect(css).toContain('@media (prefers-reduced-motion: reduce)')
  })

  it('sets animation-duration to near-zero', () => {
    expect(css).toContain('animation-duration: 0.01ms !important')
  })

  it('sets animation-iteration-count to 1', () => {
    expect(css).toContain('animation-iteration-count: 1 !important')
  })

  it('sets transition-duration to near-zero', () => {
    expect(css).toContain('transition-duration: 0.01ms !important')
  })

  it('applies to all elements via * selector', () => {
    const reducedBlock = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'))
    expect(reducedBlock).toContain('*,')
    expect(reducedBlock).toContain('*::before')
    expect(reducedBlock).toContain('*::after')
  })
})

describe('LoadingSpinner — no duplicate reduced-motion rule', () => {
  const vue = readFileSync(
    resolve(__dirname, '../../../src/components/shared/LoadingSpinner.vue'),
    'utf-8',
  )

  it('does not have its own prefers-reduced-motion rule (handled globally)', () => {
    expect(vue).not.toContain('prefers-reduced-motion')
  })
})

// ─── CSS entry point — proper import chain ───────────────────────────────

describe('styles/main.css — CSS entry point', () => {
  const css = readFileSync(
    resolve(__dirname, '../../../src/assets/styles/main.css'),
    'utf-8',
  )

  it('imports variables.css', () => {
    expect(css).toContain("@import './variables.css'")
  })

  it('imports editor.css', () => {
    expect(css).toContain("@import './editor.css'")
  })

  it('imports base.css', () => {
    expect(css).toContain("@import '../base.css'")
  })

  it('sets body font-family to --font-sans', () => {
    expect(css).toContain('font-family: var(--font-sans)')
  })

  it('sets body color to --color-text', () => {
    expect(css).toContain('color: var(--color-text)')
  })

  it('sets body background to --color-background', () => {
    expect(css).toContain('background: var(--color-background)')
  })
})
