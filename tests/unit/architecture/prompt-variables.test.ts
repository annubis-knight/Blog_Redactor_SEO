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
import { templateKeys, PROMPT_GLOBALS } from '../../../server/utils/prompt-loader'

const ROOT = join(__dirname, '..', '..', '..')

/** Clés qui portent du contenu fourni par l'utilisateur. */
const USER_CONTENT_KEYS = ['selectedText', 'sectionHtml', 'articleHtml', 'articleContent', 'articleText', 'chapterHtml', 'instruction']

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

/**
 * Ce qui entre dans l'objet `variables` d'un fichier : son littéral et chaque
 * `variables.clé = …` — pas le reste du fichier (un type qui déclare
 * `articleHtml` ne transmet rien au prompt).
 */
function variablesScope(source: string): string {
  const parts = [...source.matchAll(/\bvariables\.(\w+)\s*=/g)].map(m => `${m[1]}:`)
  const start = source.search(/\bconst variables\b[^=]*=\s*\{/)
  if (start !== -1) {
    const open = source.indexOf('{', source.indexOf('=', start))
    let depth = 0
    let end = open
    for (; end < source.length; end++) {
      if (source[end] === '{') depth++
      else if (source[end] === '}' && --depth === 0) break
    }
    parts.push(source.slice(open, end + 1))
  }
  return parts.join('\n')
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
        const scope = /loadPrompt\([^,]+,\s*variables\b/.test(call) ? variablesScope(source) : call
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

  // FR-INFRA-PROMPT-LAYERS — le chargeur est strict à l'exécution ; ce test le
  // prouve pour TOUS les appels, y compris ceux dont les tests de route
  // simulent loadPrompt (et n'exercent donc jamais le mode strict).
  it('chaque appel loadPrompt fournit exactement les repères de son prompt', () => {
    const problems: string[] = []
    let checked = 0
    for (const file of walk(join(ROOT, 'server'))) {
      if (file.endsWith('prompt-loader.ts')) continue
      const source = readFileSync(file, 'utf8')
      for (const call of loadPromptCalls(source)) {
        const name = /^loadPrompt\(\s*['"]([^'"]+)['"]/.exec(call)?.[1]
        if (!name) continue // nom calculé (actions/${type}) : couvert par le test suivant
        const provided = providedKeys(call, source)
        if (provided === null) {
          problems.push(`${relative(ROOT, file)} — ${name} : variables illisibles (objet non littéral)`)
          continue
        }
        const cited = templateKeys(readFileSync(join(ROOT, 'server/prompts', `${name}.md`), 'utf8')).variables
        const missing = cited.filter(k => !provided.includes(k) && !(PROMPT_GLOBALS as readonly string[]).includes(k))
        const unused = provided.filter(k => !cited.includes(k))
        if (missing.length || unused.length) {
          problems.push(`${relative(ROOT, file)} — ${name} : manquantes [${missing.join(', ')}], inutilisées [${unused.join(', ')}]`)
        }
        checked++
      }
    }
    expect(checked, 'le test doit lire des appels').toBeGreaterThan(20)
    expect(problems, problems.join('\n')).toEqual([])
  })

  it('les actions contextuelles attendent toutes selectedText et keywordInstruction, rien d’autre', () => {
    // Hors variables globales ({{year}}…), fournies par le chargeur lui-même.
    const dir = join(ROOT, 'server/prompts/actions')
    for (const file of readdirSync(dir).filter(f => f.endsWith('.md'))) {
      const { variables } = templateKeys(readFileSync(join(dir, file), 'utf8'))
      const own = variables.filter(k => !(PROMPT_GLOBALS as readonly string[]).includes(k))
      expect(own.sort(), file).toEqual(['keywordInstruction', 'selectedText'])
    }
  })
})

/** Clés du 2e argument d'un appel loadPrompt ; `...nom` résolu dans le même fichier. */
function providedKeys(call: string, source: string): string[] | null {
  const open = call.indexOf(',')
  if (open === -1) return []
  const rest = call.slice(open + 1).trimStart()
  if (rest.startsWith(')')) return []
  if (!rest.startsWith('{')) return null
  return objectKeys(rest, source)
}

function objectKeys(literal: string, source: string): string[] | null {
  const keys: string[] = []
  for (const entry of topLevelEntries(literal)) {
    const spread = /^\.\.\.(\w+)$/.exec(entry)
    if (spread) {
      const decl = new RegExp(`const ${spread[1]}\\s*=\\s*\\{`).exec(source)
      if (!decl) return null
      const inner = objectKeys(source.slice(decl.index + decl[0].length - 1), source)
      if (!inner) return null
      keys.push(...inner)
      continue
    }
    const key = /^['"]?([A-Za-z_]\w*)['"]?\s*(?::|$)/.exec(entry)?.[1]
    if (key) keys.push(key)
  }
  return keys
}

/** Entrées de premier niveau d'un littéral objet (chaînes, gabarits et commentaires sautés). */
function topLevelEntries(text: string): string[] {
  const entries: string[] = []
  let depth = 0
  let start = 1
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!
    if (c === '/' && text[i + 1] === '/') { i = text.indexOf('\n', i); if (i === -1) break; continue }
    if (c === '/' && text[i + 1] === '*') { i = text.indexOf('*/', i) + 1; continue }
    if (c === '"' || c === "'" || c === '`') { i = skipString(text, i); continue }
    if ('{[('.includes(c)) { depth++; continue }
    if ('}])'.includes(c)) {
      depth--
      if (depth === 0) { entries.push(stripComments(text.slice(start, i))); break }
      continue
    }
    if (c === ',' && depth === 1) { entries.push(stripComments(text.slice(start, i))); start = i + 1 }
  }
  return entries.map(e => e.trim()).filter(Boolean)
}

function skipString(text: string, i: number): number {
  const quote = text[i]
  for (let j = i + 1; j < text.length; j++) {
    if (text[j] === '\\') { j++; continue }
    if (quote === '`' && text[j] === '$' && text[j + 1] === '{') {
      let depth = 1
      j += 2
      for (; j < text.length && depth > 0; j++) {
        if (text[j] === '{') depth++
        else if (text[j] === '}') depth--
      }
      j--
      continue
    }
    if (text[j] === quote) return j
  }
  return text.length
}

function stripComments(entry: string): string {
  return entry.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '')
}
