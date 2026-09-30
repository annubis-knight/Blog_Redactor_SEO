// @vitest-environment node
/**
 * FR-RED-DRAFT-SINGLE-PASS — une panne de rédaction se dit à l'écran.
 *
 * La rédaction guidée utilisait `<ErrorMessage>` sans l'importer : Vue ne le
 * résout pas (« Failed to resolve component: ErrorMessage » en console), la
 * balise est rendue vide, et aucune panne de rédaction, de méta, de réduction ni
 * d'humanisation ne s'affichait (recette du 2026-09-30). Aucun composant n'est
 * enregistré globalement dans ce projet : tout composant écrit dans un gabarit
 * doit être importé par le fichier (ou être le fichier lui-même, en récursion).
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, basename } from 'node:path'

const ROOT = join(__dirname, '..', '..', '..')

/** Composants fournis par Vue et Vue Router, sans import. */
const BUILT_INS = new Set([
  'RouterLink', 'RouterView', 'Transition', 'TransitionGroup', 'KeepAlive', 'Teleport', 'Suspense', 'Component',
])

function vueFiles(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) out.push(...vueFiles(path))
    else if (name.endsWith('.vue')) out.push(path)
  }
  return out
}

/** Le gabarit, sans ses commentaires HTML. */
function templateOf(source: string): string {
  const start = source.indexOf('<template')
  const end = source.lastIndexOf('</template>')
  if (start < 0 || end < 0) return ''
  return source.slice(start, end).replace(/<!--[\s\S]*?-->/g, '')
}

/** Les scripts (setup et classique), où vivent les imports. */
function scriptsOf(source: string): string {
  return [...source.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n')
}

function missingImports(file: string): string[] {
  const source = readFileSync(file, 'utf8')
  const scripts = scriptsOf(source)
  const self = basename(file, '.vue')
  const used = new Set([...templateOf(source).matchAll(/<([A-Z][A-Za-z0-9]*)[\s/>]/g)].map(m => m[1]!))
  return [...used].filter(name =>
    !BUILT_INS.has(name)
    && name !== self
    && !new RegExp(`(import\\s+${name}\\b|import\\s*\\{[^}]*\\b${name}\\b[^}]*\\}|import\\s+type\\s+\\{[^}]*\\b${name}\\b)`).test(scripts),
  )
}

describe('Gabarits — tout composant utilisé est importé (FR-RED-DRAFT-SINGLE-PASS)', () => {
  const files = vueFiles(join(ROOT, 'src'))

  it('sentinelle : les composants de src/ sont lus', () => {
    expect(files.length).toBeGreaterThan(100)
  })

  it('aucune balise de composant sans import (elle serait rendue vide, sans erreur visible)', () => {
    const problems = files.flatMap(file =>
      missingImports(file).map(name => `  ${relative(ROOT, file)} : <${name}> utilisé sans import`),
    )
    expect(problems, `Composant(s) non importé(s) :\n${problems.join('\n')}`).toEqual([])
  })

  it('la rédaction guidée importe ErrorMessage, qui affiche ses pannes', () => {
    expect(missingImports(join(ROOT, 'src/views/ArticleWorkflowView.vue'))).toEqual([])
    expect(readFileSync(join(ROOT, 'src/views/ArticleWorkflowView.vue'), 'utf8')).toMatch(/<ErrorMessage[\s\S]*?editorStore\.error/)
  })
})
