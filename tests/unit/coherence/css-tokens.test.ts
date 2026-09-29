// @vitest-environment node
/**
 * Jetons CSS : un `var(--x)` sans définition retombe sur sa couleur de repli
 * codée en dur (hors charte), ou sur la couleur héritée s'il n'en a pas — un
 * texte d'alerte pouvait ainsi prendre la couleur de son parent (épopée
 * qualité SEO, U1).
 *
 * Cliquet : la liste des jetons utilisés sans définition ne peut que
 * raccourcir. Un nouveau jeton se définit dans `src/assets/styles/variables.css`.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = join(__dirname, '..', '..', '..')
const SRC = join(ROOT, 'src')

function walk(dir: string, exts: string[], out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (!['node_modules', '__tests__'].includes(entry.name)) walk(full, exts, out)
    } else if (exts.some(e => entry.name.endsWith(e))) out.push(full)
  }
  return out
}

/**
 * Relevé du 2026-09-25 (U1 soldé : la famille « warning » est définie).
 * Chaque jeton retiré de cette liste doit l'être parce qu'il est enfin défini
 * ou n'est plus utilisé — jamais pour faire passer un nouveau jeton orphelin.
 */
const UNDEFINED_BASELINE = [
  '--color-background-mute',
  '--color-badge-orange-bg', '--color-badge-orange-text',
  '--color-badge-red-bg', '--color-badge-red-text',
  '--color-badge-yellow-bg', '--color-badge-yellow-text',
  '--color-bg', '--color-bg-muted', '--color-bg-rgb', '--color-bg-secondary', '--color-bg-subtle',
  '--color-block-amber-bg', '--color-block-error-bg', '--color-block-success-bg',
  '--color-border-light',
  '--color-danger', '--color-danger-soft',
  '--color-error-border', '--color-error-soft',
  '--color-info',
  '--color-primary-bg', '--color-primary-light', '--color-primary-rgb', '--color-primary-soft',
  '--color-success-bg',
  '--color-surface-alt', '--color-surface-dim', '--color-surface-subtle',
  '--color-text-secondary',
]

function scan(): { defined: Set<string>; used: Map<string, string> } {
  const defined = new Set<string>()
  const used = new Map<string, string>()
  for (const file of walk(SRC, ['.css', '.vue', '.ts'])) {
    const text = readFileSync(file, 'utf8')
    // Déclaration CSS (`--x: …`) ou liaison de style Vue (`'--x': …`).
    for (const m of text.matchAll(/(?:^|[\s{;'"])(--[a-z0-9-]+)['"]?\s*:/gim)) defined.add(m[1]!)
    for (const m of text.matchAll(/var\(\s*(--[a-z0-9-]+)/gi)) {
      if (!used.has(m[1]!)) used.set(m[1]!, relative(ROOT, file))
    }
  }
  return { defined, used }
}

describe('jetons CSS', () => {
  const { defined, used } = scan()
  const undefinedTokens = [...used.keys()].filter(t => !defined.has(t)).sort()

  it('la famille « warning » est définie (U1)', () => {
    for (const token of ['--color-warning', '--color-warning-bg', '--color-warning-text', '--color-warning-border', '--color-warning-soft', '--color-warning-hover']) {
      expect(defined.has(token), `${token} doit être défini dans variables.css`).toBe(true)
    }
  })

  it('aucun nouveau jeton utilisé sans définition', () => {
    const nouveaux = undefinedTokens.filter(t => !UNDEFINED_BASELINE.includes(t)).map(t => `${t} (${used.get(t)})`)
    expect(nouveaux, 'définir ces jetons dans src/assets/styles/variables.css').toEqual([])
  })

  it('le relevé suit la réalité : un jeton défini ou disparu sort de la liste', () => {
    const soldes = UNDEFINED_BASELINE.filter(t => !undefinedTokens.includes(t))
    expect(soldes, 'retirer ces jetons de UNDEFINED_BASELINE').toEqual([])
  })
})
