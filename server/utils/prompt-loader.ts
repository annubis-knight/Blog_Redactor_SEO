import { readFile } from 'fs/promises'
import { join } from 'path'
import { log } from './logger.js'
import { getCocoonStrategy } from '../services/cocoon-strategy.service.js'
import type { CocoonStrategy } from '../../shared/types/index.js'

const PROMPTS_DIR = join(process.cwd(), 'server', 'prompts')

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

/** Load a prompt template and replace {{variable}} placeholders */
export async function loadPrompt(
  name: string,
  variables: Record<string, string> = {},
  options?: { cocoonSlug?: string },
): Promise<string> {
  log.debug(`loadPrompt: ${name}`, { variables: Object.keys(variables), cocoonSlug: options?.cocoonSlug ?? null })
  const content = await readFile(join(PROMPTS_DIR, `${name}.md`), 'utf-8')

  // Build cocoon strategy enrichment if cocoonSlug provided
  let strategyBlock = ''
  if (options?.cocoonSlug) {
    strategyBlock = await loadCocoonStrategyBlock(options.cocoonSlug)
  }

  // Add strategy_context to variables for explicit {{strategy_context}} placeholders
  const allVariables = { ...variables, strategy_context: strategyBlock }

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
