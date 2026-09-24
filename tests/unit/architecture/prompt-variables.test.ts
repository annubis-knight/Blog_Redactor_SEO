// @vitest-environment node
/**
 * Règles de code sur les variables de prompt (épopée qualité SEO, R2 et R12).
 *
 * R12 — le texte tapé ou sélectionné par l'utilisateur doit être échappé avant
 * d'entrer dans un prompt (`loadPrompt(…, { escapeKeys })`, finding G3) : sans
 * cela, une sélection contenant `{{…}}` ou `</system>` peut détourner l'IA.
 * La route des actions contextuelles passait `selectedText` brut.
 *
 * R2 — une variable transmise à un prompt qui ne contient pas son repère est
 * jetée sans bruit : le micro-contexte (angle, ton, consignes) n'arrivait
 * jamais au sommaire. Le chargeur deviendra strict pour tous les prompts
 * (chantier C4) ; ce test garde déjà le prompt du sommaire.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = join(__dirname, '..', '..', '..')

/** Clés qui portent du contenu fourni par l'utilisateur. */
const USER_CONTENT_KEYS = ['selectedText', 'sectionHtml', 'articleHtml']

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '_archive') walk(full, out)
    } else if (entry.name.endsWith('.ts')) {
      out.push(full)
    }
  }
  return out
}

/** Texte complet de chaque appel `loadPrompt(…)`, parenthèses équilibrées. */
function loadPromptCalls(source: string): string[] {
  const calls: string[] = []
  let from = 0
  for (;;) {
    const start = source.indexOf('loadPrompt(', from)
    if (start === -1) return calls
    let depth = 0
    let end = start + 'loadPrompt'.length
    for (; end < source.length; end++) {
      if (source[end] === '(') depth++
      else if (source[end] === ')' && --depth === 0) break
    }
    calls.push(source.slice(start, end + 1))
    from = end + 1
  }
}

describe('Variables de prompt', () => {
  it('le contenu fourni par l’utilisateur est toujours échappé', () => {
    const violations: string[] = []
    for (const file of walk(join(ROOT, 'server'))) {
      const source = readFileSync(file, 'utf8')
      if (file.endsWith('prompt-loader.ts')) continue
      for (const call of loadPromptCalls(source)) {
        // Les variables peuvent être construites avant l'appel : on regarde
        // aussi l'objet `variables` du fichier quand l'appel le référence.
        const scope = /loadPrompt\([^,]+,\s*variables\b/.test(call) ? source : call
        for (const key of USER_CONTENT_KEYS) {
          const passed = new RegExp(`\\b${key}\\b\\s*[,:}\\n]`).test(scope)
          const escaped = new RegExp(`escapeKeys:\\s*\\[[^\\]]*'${key}'`).test(call)
          if (passed && !escaped) violations.push(`${relative(ROOT, file)} — ${key}`)
        }
      }
    }
    expect(violations, `Contenu utilisateur transmis à loadPrompt sans escapeKeys :\n${violations.join('\n')}`).toEqual([])
  })

  it('chaque variable transmise au prompt du sommaire y a son repère', () => {
    const route = readFileSync(join(ROOT, 'server/routes/generate/outline.routes.ts'), 'utf8')
    const template = readFileSync(join(ROOT, 'server/prompts/generate-outline.md'), 'utf8')
    const call = loadPromptCalls(route).find(c => c.includes("'generate-outline'"))
    expect(call, 'appel loadPrompt(\'generate-outline\') introuvable').toBeDefined()
    const keys = [...call!.matchAll(/^\s{6}(\w+)(?=[:,])/gm)].map(m => m[1])
    expect(keys.length, 'le test doit lire les clés transmises').toBeGreaterThan(5)
    const missing = keys.filter(k => !template.includes(`{{${k}}}`))
    expect(missing, `variables transmises mais absentes de generate-outline.md : ${missing.join(', ')}`).toEqual([])
  })
})
