// @vitest-environment node
/**
 * NFR-UX-SCREEN-TEXT — un compteur s'accorde avec son nombre.
 *
 * Recette du 2026-09-30 : le tableau de bord affichait « 1 articles ». Un
 * compteur écrit `{{ n }} articles` (ou `${n} termes`) met le nom au pluriel
 * quel que soit le nombre. Le nom passe par `plural(n, …)`
 * (`src/utils/plural.ts`) : singulier pour 0 et 1, pluriel à partir de 2.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { plural } from '../../../src/utils/plural'

const ROOT = join(__dirname, '..', '..', '..')
const BACKSLASH = String.fromCharCode(92)

/** Noms comptés à l'écran. */
const COUNTED = ['articles', 'mots-clés', 'mots-cl&eacute;s', 'mots', 'termes', 'concurrents', 'questions', 'liens',
  'lieutenants', 'propositions', 'suggestions', 'résultats', 'cartes', 'entrées', 'chapitres', 'sections', 'images']

/** Un nombre écrit juste avant un nom au pluriel figé : `{{ n }} articles`, `${n} termes`. */
const FROZEN_PLURAL = new RegExp(`(?:\\}\\}|\\})\\s*(?:${COUNTED.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})(?![\\wÀ-ÿ-])`)

export function frozenPlural(line: string): boolean {
  if (/\blog\.(debug|info|warn|error)\(|console\.|^\s*(\*|\/\/|\/\*)/.test(line)) return false
  return FROZEN_PLURAL.test(line)
}

function files(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) files(full, out)
    else if (/\.(vue|ts)$/.test(entry.name)) out.push(full)
  }
  return out
}

describe('NFR-UX-SCREEN-TEXT — les compteurs s\'accordent avec leur nombre', () => {
  it('aucun écran n\'écrit un nombre suivi d\'un nom au pluriel figé', () => {
    const offenders: string[] = []
    for (const file of files(join(ROOT, 'src'))) {
      const lines = readFileSync(file, 'utf8').split('\n')
      lines.forEach((line, i) => {
        // Accord déjà traité par une branche (`n === 1 ? '1 lien … a été retiré' : `${n} liens …``).
        const branched = lines.slice(Math.max(0, i - 2), i + 1).some(l => /[=!]==\s*1\s*$|[=!]==\s*1\s*\?/.test(l))
        if (frozenPlural(line) && !branched) offenders.push(`${relative(ROOT, file).replaceAll(BACKSLASH, '/')}:${i + 1} — ${line.trim().slice(0, 120)}`)
      })
    }
    expect(
      offenders,
      `Compteur au pluriel figé (« 1 articles ») : accorde le nom avec plural(n, …).\n${offenders.join('\n')}`,
    ).toEqual([])
  })

  it('sentinelle : repère le pluriel figé, pas le nom accordé', () => {
    expect(frozenPlural('<span>{{ cocoon.stats.totalArticles }} articles</span>')).toBe(true)
    expect(frozenPlural(':title="`Lexique (${lexique.length} termes)`"')).toBe(true)
    expect(frozenPlural('<span>{{ n }} {{ plural(n, \'article\') }}</span>')).toBe(false)
    expect(frozenPlural("{{ n }} concurrent{{ n > 1 ? 's' : '' }}")).toBe(false)
    expect(frozenPlural('<span>{{ n }} articlesX</span>')).toBe(false)
    expect(frozenPlural("log.info(`[articles] fetched ${n} articles`)")).toBe(false)
  })

  it('plural : singulier pour 0 et 1, pluriel à partir de 2, pluriel irrégulier possible', () => {
    expect([0, 1, 2, 10].map(n => `${n} ${plural(n, 'article')}`)).toEqual(['0 article', '1 article', '2 articles', '10 articles'])
    expect(`1 ${plural(1, 'mot-clé', 'mots-clés')}`).toBe('1 mot-clé')
    expect(`3 ${plural(3, 'mot-clé', 'mots-clés')}`).toBe('3 mots-clés')
  })
})
