// ---------------------------------------------------------------------------
// WARNING — Prompt injection hardening (finding G3)
// ---------------------------------------------------------------------------
// NEVER call `loadPrompt` on user-controlled content without passing the
// matching key in `options.escapeKeys`. User content (articleHtml, sectionHtml,
// selectedText, etc.) MUST be escaped with `escapePromptContent` before it is
// interpolated into a Markdown prompt — otherwise a malicious payload could
// inject `\n\nHuman: ...` / `<system>` / `{{...}}` sequences and hijack the
// model's instructions.
// ---------------------------------------------------------------------------

import { readFile } from 'fs/promises'
import { join } from 'path'
import { log } from './logger.js'
import { getCocoonStrategy } from '../services/strategy/cocoon-strategy.service.js'
import { formatFrenchDate, currentYear, loadZoneContext } from '../services/strategy/prompt-context.service.js'
import type { CocoonStrategy } from '../../shared/types/index.js'

const PROMPTS_DIR = join(process.cwd(), 'server', 'prompts')

/**
 * Neutralize instruction sequences and delimiters in user-provided content,
 * then wrap the result in a `<user-content>...</user-content>` envelope so the
 * downstream prompt can reference it explicitly and tell Claude to ignore any
 * embedded instructions.
 *
 * Targeted sequences (finding G3):
 *   - `\n\nHuman:` / `\n\nAssistant:` — legacy Anthropic turn markers
 *   - `<system>` / `</system>` — system-block injection
 *   - `<user-content>` / `</user-content>` — envelope spoofing
 *   - `{{` / `}}` — template placeholder injection
 */
const INSTRUCTION_SEQUENCES: RegExp[] = [
  /\n\nHuman:/g,
  /\n\nAssistant:/g,
  /<system>/gi,
  /<\/system>/gi,
  /<user-content>/gi,
  /<\/user-content>/gi,
  /\{\{/g,
  /\}\}/g,
]

export function escapePromptContent(raw: string): string {
  if (!raw) return '<user-content>\n\n</user-content>'
  let out = raw
  for (const re of INSTRUCTION_SEQUENCES) {
    out = out.replace(re, (match) =>
      match.replace(/[<{}HA/]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`),
    )
  }
  return `<user-content>\n${out}\n</user-content>`
}

/** Build a markdown strategy context block from a cocoon strategy */
export function buildCocoonStrategyBlock(strategy: CocoonStrategy): string {
  const parts: string[] = ['## Contexte stratégique du cocon\n']

  if (strategy.cible.validated) parts.push(`- **Cible** : ${strategy.cible.validated}`)
  if (strategy.douleur.validated) parts.push(`- **Douleur** : ${strategy.douleur.validated}`)
  if (strategy.angle.validated) parts.push(`- **Angle** : ${strategy.angle.validated}`)
  if (strategy.promesse.validated) parts.push(`- **Promesse** : ${strategy.promesse.validated}`)
  if (strategy.cta.validated) parts.push(`- **CTA** : ${strategy.cta.validated}`)

  if (parts.length === 1) return '' // Only header, no data

  parts.push('')
  parts.push('Tiens compte de ce contexte stratégique pour aligner tes suggestions avec la stratégie du cocon.')

  return parts.join('\n')
}

/** Load a cocoon strategy and format as a context block, or return empty string */
async function loadCocoonStrategyBlock(cocoonSlug: string): Promise<string> {
  try {
    const strategy = await getCocoonStrategy(cocoonSlug)
    if (!strategy) return ''
    return buildCocoonStrategyBlock(strategy)
  } catch (err) {
    log.warn(`loadCocoonStrategyBlock: failed for "${cocoonSlug}" — ${(err as Error).message}`)
    return ''
  }
}

// ---------------------------------------------------------------------------
// Rendu strict (FR-INFRA-PROMPT-LAYERS)
// ---------------------------------------------------------------------------

/** Variables fournies par le chargeur lui-même (couche contexte), si le prompt les cite. */
export const PROMPT_GLOBALS = ['strategy_context', 'today', 'year', 'zone', 'zone_landmarks'] as const

const KEY = '[A-Za-z_][A-Za-z0-9_]*'
const SECTION_RE = new RegExp(`\\{\\{#(${KEY})\\}\\}([\\s\\S]*?)\\{\\{\\/\\1\\}\\}`, 'g')
const PLACEHOLDER_RE = new RegExp(`\\{\\{([#/]?)(${KEY})\\}\\}`, 'g')
const VARIABLE_RE = new RegExp(`\\{\\{(${KEY})\\}\\}`, 'g')

export class PromptTemplateError extends Error {
  constructor(readonly promptName: string, readonly missing: string[], readonly unused: string[]) {
    const parts: string[] = []
    if (missing.length) parts.push(`variables attendues mais absentes : ${missing.join(', ')}`)
    if (unused.length) parts.push(`variables fournies mais inutilisées : ${unused.join(', ')}`)
    super(`Prompt « ${promptName} » : ${parts.join(' ; ')}`)
    this.name = 'PromptTemplateError'
  }
}

/** Clés citées par un modèle : variables (`{{x}}` et sections) et sections seules. */
export function templateKeys(template: string): { variables: string[]; sections: string[] } {
  const variables = new Set<string>()
  const sections = new Set<string>()
  for (const [, marker, key] of template.matchAll(PLACEHOLDER_RE)) {
    variables.add(key!)
    if (marker === '#') sections.add(key!)
  }
  return { variables: [...variables], sections: [...sections] }
}

/**
 * Rend un modèle en une passe :
 *   1. `{{#clé}}…{{/clé}}` gardé (sans ses marqueurs) si la valeur n'est pas vide, retiré sinon ;
 *   2. `{{clé}}` remplacé par sa valeur — par fonction : aucun motif `$` interprété,
 *      et une valeur qui contient `{{autre}}` n'est jamais réinterprétée.
 * Le contrôle porte sur le MODÈLE : `missing` = clés citées non fournies,
 * `unused` = clés fournies non citées (hors variables globales).
 */
export function renderPromptTemplate(
  template: string,
  variables: Record<string, string>,
  options: { globals?: readonly string[] } = {},
): { text: string; missing: string[]; unused: string[] } {
  const { variables: cited } = templateKeys(template)
  const globals = new Set(options.globals ?? [])
  const missing = cited.filter(k => !(k in variables))
  const unused = Object.keys(variables).filter(k => !cited.includes(k) && !globals.has(k))

  const valueOf = (key: string): string => variables[key] ?? ''
  let text = template
  // Sections imbriquées : on repasse tant qu'il en reste (profondeur bornée).
  for (let depth = 0; depth < 5; depth++) {
    const next = text.replace(SECTION_RE, (_m, key: string, inner: string) => (valueOf(key).trim() ? inner : ''))
    if (next === text) break
    text = next
  }
  text = text.replace(VARIABLE_RE, (_m, key: string) => valueOf(key))
  return { text, missing, unused }
}

async function loadGlobals(template: string, cocoonSlug: string | undefined): Promise<{ values: Record<string, string>; strategyBlock: string }> {
  const cited = new Set(templateKeys(template).variables)
  const values: Record<string, string> = {}
  const strategyBlock = cocoonSlug ? await loadCocoonStrategyBlock(cocoonSlug) : ''
  values.strategy_context = strategyBlock
  if (cited.has('today') || cited.has('year')) {
    const now = new Date()
    values.today = formatFrenchDate(now)
    values.year = currentYear(now)
  }
  if (cited.has('zone') || cited.has('zone_landmarks')) {
    const { zone, landmarks } = await loadZoneContext()
    values.zone = zone
    values.zone_landmarks = landmarks
  }
  return { values, strategyBlock }
}

/**
 * Load a prompt template and render its {{variable}} placeholders.
 *
 * Strict hors production : une variable attendue et absente, ou fournie et
 * inutilisée, lève `PromptTemplateError` (le budget de mots du pilier 1013
 * s'est perdu ainsi). En production, l'écart est journalisé et le rendu continue.
 *
 * @param options.escapeKeys  Keys from `variables` whose values are treated as
 *                            user-provided content and MUST be wrapped with
 *                            `escapePromptContent` before interpolation
 *                            (finding G3). Prevents prompt injection attacks
 *                            via article/section HTML.
 */
export async function loadPrompt(
  name: string,
  variables: Record<string, string> = {},
  options?: { cocoonSlug?: string; escapeKeys?: string[] },
): Promise<string> {
  log.debug(`loadPrompt: ${name}`, { variables: Object.keys(variables), cocoonSlug: options?.cocoonSlug ?? null, escapeKeys: options?.escapeKeys ?? [] })
  const content = await readFile(join(PROMPTS_DIR, `${name}.md`), 'utf-8')

  // Escape user-provided content before interpolation (finding G3).
  // Une valeur vide reste vide : son enveloppe `<user-content>` garderait à
  // tort la section `{{#clé}}…{{/clé}}` qui dépend d'elle.
  const escapeKeys = options?.escapeKeys ?? []
  const escapeKeySet = new Set(escapeKeys)
  const sanitizedVariables = Object.fromEntries(
    Object.entries(variables).map(([k, v]) => [
      k,
      escapeKeySet.has(k) && v.trim() ? escapePromptContent(v) : v,
    ]),
  )

  // Couche contexte : les globales fournies par l'appelant l'emportent.
  const { values: globals, strategyBlock } = await loadGlobals(content, options?.cocoonSlug)
  const { text, missing, unused } = renderPromptTemplate(content, { ...globals, ...sanitizedVariables }, { globals: PROMPT_GLOBALS })
  const unknownEscapes = escapeKeys.filter(k => !(k in variables))
  const problems = [...unused, ...unknownEscapes.map(k => `${k} (escapeKeys)`)]
  if (missing.length || problems.length) {
    const error = new PromptTemplateError(name, missing, problems)
    if (process.env.NODE_ENV !== 'production') throw error
    log.error(error.message)
  }

  // Sans repère {{strategy_context}}, la stratégie du cocon est ajoutée en fin de prompt.
  let result = text
  if (strategyBlock && !templateKeys(content).variables.includes('strategy_context')) {
    result = result + '\n\n' + strategyBlock
  }

  log.debug(`loadPrompt: ${name} loaded (${result.length} chars, ${Object.keys(variables).length} variables${strategyBlock ? ', +strategy' : ''})`)
  return result
}
