// @vitest-environment node
/**
 * NFR-UX-SCREEN-TEXT — un texte d'écran s'affiche tel qu'il est écrit.
 *
 * Dans le `<template>` d'un composant Vue, une séquence d'échappement Unicode
 * (antislash, « u », quatre chiffres hexadécimaux) n'est pas interprétée : elle
 * s'affiche telle quelle. Le tableau de bord a ainsi montré « th », la séquence,
 * puis « matique », au lieu de « thématique ». Les accents s'écrivent directement.
 *
 * Le motif est construit à partir du code du caractère antislash, pour qu'aucun
 * outil d'écriture ne le transforme en lettre accentuée.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = join(__dirname, '..', '..', '..')
const BACKSLASH = String.fromCharCode(92)
const UNICODE_ESCAPE = new RegExp(`${BACKSLASH}${BACKSLASH}u[0-9A-Fa-f]{4}`)

function vueFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) vueFiles(full, out)
    else if (entry.name.endsWith('.vue')) out.push(full)
  }
  return out
}

/**
 * Retire d'une ligne de template ce qui est du JavaScript, où une séquence
 * d'échappement est interprétée normalement : les interpolations `{{ … }}` et les
 * attributs liés (`:attr="…"`, `v-…="…"`, `@evenement="…"`). Reste le texte fixe.
 */
function staticText(line: string): string {
  return line
    .replace(/\{\{.*?\}\}/g, '')
    .replace(/(^|\s)(?::|@|v-)[\w:.\-[\]]*="[^"]*"/g, '$1')
}

/** Les lignes du bloc `<template>` d'un composant, avec leur numéro. */
function templateLines(source: string): Array<{ line: number; text: string }> {
  const lines = source.split('\n')
  const start = lines.findIndex(l => l.trimStart().startsWith('<template'))
  if (start < 0) return []
  let end = lines.length - 1
  for (let i = lines.length - 1; i > start; i--) {
    if (lines[i]!.trimStart().startsWith('</template>')) {
      end = i
      break
    }
  }
  return lines.slice(start, end + 1).map((text, i) => ({ line: start + i + 1, text }))
}

describe('NFR-UX-SCREEN-TEXT — aucun texte d\'écran ne contient de séquence d\'échappement', () => {
  it('aucun template Vue ne contient de séquence d\'échappement Unicode', () => {
    const offenders: string[] = []
    for (const file of vueFiles(join(ROOT, 'src'))) {
      for (const { line, text } of templateLines(readFileSync(file, 'utf8'))) {
        if (UNICODE_ESCAPE.test(staticText(text))) offenders.push(`${relative(ROOT, file).replaceAll(BACKSLASH, '/')}:${line} — ${text.trim()}`)
      }
    }
    expect(
      offenders,
      `Texte d'écran avec une séquence d'échappement : écris l'accent directement.\n${offenders.join('\n')}`,
    ).toEqual([])
  })

  it('sentinelle : le motif reconnaît bien une séquence d\'échappement', () => {
    expect(UNICODE_ESCAPE.test(`th${BACKSLASH}u00e9matique`)).toBe(true)
    expect(UNICODE_ESCAPE.test('thématique')).toBe(false)
  })

  it('sentinelle : le texte fixe est contrôlé, le JavaScript du template ne l\'est pas', () => {
    const escape = `${BACKSLASH}u2192`
    expect(UNICODE_ESCAPE.test(staticText(`<p>Aller ${escape} suite</p>`))).toBe(true)
    expect(UNICODE_ESCAPE.test(staticText(`<span title="a ${escape} b">x</span>`))).toBe(true)
    expect(UNICODE_ESCAPE.test(staticText(`<span>{{ open ? '${escape}' : '' }}</span>`))).toBe(false)
    expect(UNICODE_ESCAPE.test(staticText(`<span :class="t.replace(/[${escape}]/g, '')">x</span>`))).toBe(false)
  })
})
