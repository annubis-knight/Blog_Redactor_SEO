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

/**
 * Load a prompt template and replace {{variable}} placeholders.
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

  // Build cocoon strategy enrichment if cocoonSlug provided
  let strategyBlock = ''
  if (options?.cocoonSlug) {
    strategyBlock = await loadCocoonStrategyBlock(options.cocoonSlug)
  }

  // Escape user-provided content before interpolation (finding G3).
  const escapeKeySet = new Set(options?.escapeKeys ?? [])
  const sanitizedVariables = Object.fromEntries(
    Object.entries(variables).map(([k, v]) => [
      k,
      escapeKeySet.has(k) ? escapePromptContent(v) : v,
    ]),
  )

  // Add strategy_context to variables for explicit {{strategy_context}} placeholders
  const allVariables = { ...sanitizedVariables, strategy_context: strategyBlock }

  let result = Object.entries(allVariables).reduce(
    (text, [key, value]) => text.replaceAll(`{{${key}}}`, value),
    content,
  )

  // If prompt didn't have {{strategy_context}} placeholder and we have a block, append it
  if (strategyBlock && !content.includes('{{strategy_context}}')) {
    result = result + '\n\n' + strategyBlock
  }

  log.debug(`loadPrompt: ${name} loaded (${result.length} chars, ${Object.keys(variables).length} replacements${strategyBlock ? ', +strategy' : ''})`)
  return result
}
