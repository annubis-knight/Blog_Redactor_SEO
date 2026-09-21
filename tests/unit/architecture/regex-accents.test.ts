/**
 * Garde-fou : jamais de `\b` collé à une lettre accentuée dans une regex.
 *
 * En JavaScript, `\b` ne connaît que `[A-Za-z0-9_]`. Une lettre accentuée
 * n'étant pas un caractère de mot, un motif comme `où\b`, `\bétape` ou
 * `augmenté\b` ne matche JAMAIS — sans lever la moindre erreur. Le filtre
 * répond « rien trouvé », exactement comme si le texte était propre.
 *
 * Ce défaut a coûté deux bugs silencieux (audit 2026-09-19) :
 *   - `export.service` : les sections « Où … » n'entraient pas dans le FAQPage,
 *   - `geo-calculator`  : ces titres n'étaient pas comptés comme questions.
 *
 * Correctif à utiliser : `FRENCH_WORD_END` de `shared/french-text.ts`
 * (anticipation Unicode) avec le drapeau `u`.
 */
import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOTS = ['shared', 'server', 'src', 'scripts']
const EXTENSIONS = /\.(ts|vue|mjs|cjs|js)$/
const IGNORED_DIRS = new Set(['node_modules', '_archive', 'archive', 'dist', 'mock-fixtures'])

/** Lettres accentuées latines courantes (hors A-Z). */
const ACCENTED = 'À-ÖØ-öø-ÿ'
const BROKEN_BOUNDARY = new RegExp(`([${ACCENTED}]\\\\b|\\\\b[${ACCENTED}])`)

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (IGNORED_DIRS.has(entry) || entry.endsWith('.bak')) continue
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) sourceFiles(full, out)
    else if (EXTENSIONS.test(entry)) out.push(full)
  }
  return out
}

/** Une ligne de commentaire peut citer le piège sans le commettre. */
function isComment(line: string): boolean {
  const trimmed = line.trim()
  return trimmed.startsWith('*') || trimmed.startsWith('//') || trimmed.startsWith('/*')
}

describe('architecture — pas de `\\b` sur une lettre accentuée', () => {
  const offenders: string[] = []

  for (const root of ROOTS) {
    for (const file of sourceFiles(root)) {
      const lines = readFileSync(file, 'utf8').split('\n')
      lines.forEach((line, index) => {
        if (isComment(line) || !BROKEN_BOUNDARY.test(line)) return
        offenders.push(`${relative('.', file).replace(/\\/g, '/')}:${index + 1} → ${line.trim().slice(0, 100)}`)
      })
    }
  }

  it('aucun fichier source ne colle `\\b` à une lettre accentuée', () => {
    expect(offenders, `Utilise FRENCH_WORD_END (shared/french-text.ts) à la place :\n${offenders.join('\n')}`).toEqual(
      [],
    )
  })

  it('le scanner fonctionne (sentinelle)', () => {
    expect(BROKEN_BOUNDARY.test("const re = /augmenté\\b/i")).toBe(true)
    expect(BROKEN_BOUNDARY.test("const re = /\\bétape/i")).toBe(true)
    expect(BROKEN_BOUNDARY.test("const re = /augmente\\b/i")).toBe(false)
    expect(BROKEN_BOUNDARY.test('const re = /\\bDELETE\\s+FROM/i')).toBe(false)
  })
})
