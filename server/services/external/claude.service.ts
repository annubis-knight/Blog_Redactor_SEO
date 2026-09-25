import Anthropic from '@anthropic-ai/sdk'
import { log } from '../../utils/logger.js'
import { filterToolPreambles, type StreamBlockEvent } from './claude-stream.js'

// Lazy-init du client Anthropic : évite que l'import de ce module déclenche
// `new Anthropic()` au top-level (sinon les environnements de test browser-like
// crashent à l'import même quand l'appel API est mocké en aval).
let _client: Anthropic | null = null
function getClient(): Anthropic {
  if (_client === null) {
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }
  return _client
}

export interface ApiUsage {
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheCreationTokens: number
  model: string
  estimatedCost: number
  /**
   * Pourquoi le modèle s'est arrêté (flux seulement) : `max_tokens` = coupé au
   * plafond, le texte est incomplet (FR-RED-DRAFT-SINGLE-PASS).
   */
  stopReason?: StopReason
  /** Résultats réels de la recherche web (FR-RED-ENRICH-SOURCES). */
  webSources?: Array<{ url: string; title: string; pageAge: string | null }>
}

export type StopReason = 'end' | 'max_tokens' | 'other'

// Pricing per million tokens
const PRICING: Record<string, { input: number; output: number }> = {
  'claude-sonnet-4-6': { input: 3, output: 15 },
  'claude-sonnet-4-5-20250514': { input: 3, output: 15 },
  'claude-haiku-4-5-20251001': { input: 0.8, output: 4 },
  'claude-opus-4-6': { input: 15, output: 75 },
}

export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
  cacheReadTokens = 0,
  cacheCreationTokens = 0,
): number {
  const pricing = PRICING[model] ?? { input: 3, output: 15 }
  const inputCost = inputTokens * pricing.input
  const outputCost = outputTokens * pricing.output
  const cacheReadCost = cacheReadTokens * pricing.input * 0.1   // 90% discount
  const cacheCreationCost = cacheCreationTokens * pricing.input * 1.25
  return (inputCost + outputCost + cacheReadCost + cacheCreationCost) / 1_000_000
}

/**
 * Non-streaming call with forced tool_use — guarantees structured JSON output.
 * Claude is forced to call the specified tool, returning its input_schema-validated params.
 */
export async function classifyWithTool<T>(
  systemPrompt: string,
  userPrompt: string,
  tool: { name: string; description: string; input_schema: Anthropic.Tool['input_schema'] },
  model = 'claude-haiku-4-5-20251001',
  maxTokens = 4096,
): Promise<{ result: T; usage: ApiUsage }> {
  const promptChars = systemPrompt.length + userPrompt.length
  log.info(`Claude API tool call start`, { model, tool: tool.name, maxTokens, promptChars })

  const start = Date.now()
  let response: Anthropic.Message
  try {
    response = await getClient().messages.create({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      tools: [tool],
      tool_choice: { type: 'tool', name: tool.name },
    })
  } catch (err) {
    log.error(`Claude API tool call failed`, { model, tool: tool.name, ms: Date.now() - start, error: (err as Error).message })
    throw err
  }

  const toolBlock = response.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
  )
  if (!toolBlock) {
    log.error(`Claude API no tool_use block in response`, { model, tool: tool.name, stopReason: response.stop_reason })
    throw new Error(`Expected tool_use response from ${tool.name} but got none`)
  }

  const usageAny = response.usage as unknown as Record<string, number>
  const cacheRead = usageAny.cache_read_input_tokens ?? 0
  const cacheCreation = usageAny.cache_creation_input_tokens ?? 0
  const usage: ApiUsage = {
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    cacheReadTokens: cacheRead,
    cacheCreationTokens: cacheCreation,
    model,
    estimatedCost: calculateCost(model, response.usage.input_tokens, response.usage.output_tokens, cacheRead, cacheCreation),
  }
  log.info(`Claude API tool call done`, { tool: tool.name, ms: Date.now() - start, inputTokens: usage.inputTokens, outputTokens: usage.outputTokens, cost: `$${usage.estimatedCost.toFixed(4)}` })

  return { result: toolBlock.input as T, usage }
}

export const USAGE_SENTINEL = '__USAGE__'

/**
 * Claude server-side web search tool — runs on Anthropic's infra, no client-side exec.
 * Pass in the `tools` array of streamChatCompletion to let Claude search the web
 * and ground its response with real sources.
 *
 * Localisée en France, à l'heure de Paris, et dans la ville de la zone du client
 * quand elle est connue (FR-RED-ENRICH-SOURCES) : la recherche partait sans lieu
 * et le pilier 1013 citait la Vendée.
 *
 * Adjust `max_uses` to control how many searches Claude can do per call (impacts cost heavily).
 */
export function webSearchTool(zone?: string | null, maxUses = 3): Anthropic.Messages.ToolUnion {
  const city = zone?.split(',')[0]?.trim()
  return {
    type: 'web_search_20250305',
    name: 'web_search',
    max_uses: maxUses, // ← chaque recherche ajoute ~10-15k jetons d'entrée
    user_location: { type: 'approximate', country: 'FR', timezone: 'Europe/Paris', ...(city ? { city } : {}) },
  } as unknown as Anthropic.Messages.ToolUnion
}

/** Un résultat réel de la recherche web. */
export interface WebSourceUsage {
  url: string
  title: string
  pageAge: string | null
}

/**
 * Résultats réels de la recherche web, lus dans le message final : on garde les
 * URL trouvées pour vérifier celles que le texte cite (elles étaient jetées).
 */
export function webSourcesOf(content: ReadonlyArray<{ type: string }>): WebSourceUsage[] {
  const seen = new Map<string, WebSourceUsage>()
  for (const block of content) {
    if (block.type !== 'web_search_tool_result') continue
    const results = (block as { content?: unknown }).content
    if (!Array.isArray(results)) continue
    for (const r of results as Array<{ type?: string; url?: string; title?: string; page_age?: string | null }>) {
      if (r.type === 'web_search_result' && r.url && !seen.has(r.url)) {
        seen.set(r.url, { url: r.url, title: r.title ?? '', pageAge: r.page_age ?? null })
      }
    }
  }
  return [...seen.values()]
}

/** Raison d'arrêt de Claude, ramenée aux trois cas utiles. */
function toStopReason(reason: string | null | undefined): StopReason {
  if (reason === 'max_tokens') return 'max_tokens'
  if (reason === 'end_turn' || reason === 'stop_sequence') return 'end'
  return 'other'
}

/**
 * Stream a chat completion from Claude API.
 * Yields text chunks as they arrive.
 * Final yield is a sentinel string __USAGE__{...} with token metrics.
 *
 * @param tools — optional server-side tools (e.g., web_search). Only text deltas
 *   are yielded; the web search results stay server-side, but their URLs come
 *   back in the usage sentinel (`webSources`) so the caller can check citations.
 */
export async function* streamChatCompletion(
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 4096,
  tools?: Anthropic.Messages.ToolUnion[],
): AsyncGenerator<string> {
  const model = process.env.CLAUDE_MODEL || 'claude-sonnet-4-6'
  const promptChars = systemPrompt.length + userPrompt.length

  log.info(`Claude API stream start`, { model, maxTokens, promptChars, toolCount: tools?.length ?? 0 })

  const start = Date.now()
  let stream: ReturnType<Anthropic['messages']['stream']>
  try {
    stream = getClient().messages.stream({
      model,
      max_tokens: maxTokens,
      system: [{ type: 'text' as const, text: systemPrompt, cache_control: { type: 'ephemeral' as const } }],
      messages: [{ role: 'user', content: userPrompt }],
      ...(tools && tools.length > 0 ? { tools } : {}),
    })
  } catch (err) {
    log.error(`Claude API stream creation failed`, { model, ms: Date.now() - start, error: (err as Error).message })
    throw err
  }

  let chunkCount = 0
  try {
    if (tools && tools.length > 0) {
      // Outils actifs (recherche web) : Claude annonce ses recherches dans des
      // blocs de texte séparés (« Je vais d'abord faire une recherche… »).
      // `filterToolPreambles` les écarte — sans ce filtre, le monologue part
      // dans l'article (audit 2026-09-19). Émission bloc par bloc.
      for await (const chunk of filterToolPreambles(stream as unknown as AsyncIterable<StreamBlockEvent>)) {
        chunkCount++
        yield chunk
      }
    } else {
      // Sans outil, aucun préambule possible : streaming token par token,
      // comportement historique inchangé.
      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          chunkCount++
          yield event.delta.text
        }
      }
    }
  } catch (err) {
    log.error(`Claude API stream interrupted`, { model, ms: Date.now() - start, chunkCount, error: (err as Error).message })
    throw err
  }

  // Extract usage from final message (including cache metrics)
  const finalMessage = await stream.finalMessage()
  const finalUsageAny = finalMessage.usage as unknown as Record<string, number>
  const cacheReadTokens = finalUsageAny.cache_read_input_tokens ?? 0
  const cacheCreationTokens = finalUsageAny.cache_creation_input_tokens ?? 0
  const usage: ApiUsage = {
    inputTokens: finalMessage.usage.input_tokens,
    outputTokens: finalMessage.usage.output_tokens,
    cacheReadTokens,
    cacheCreationTokens,
    model,
    estimatedCost: calculateCost(model, finalMessage.usage.input_tokens, finalMessage.usage.output_tokens, cacheReadTokens, cacheCreationTokens),
    stopReason: toStopReason(finalMessage.stop_reason),
  }
  const webSources = webSourcesOf(finalMessage.content ?? [])
  if (webSources.length) usage.webSources = webSources
  log.info(`Claude API stream done`, {
    ms: Date.now() - start, chunkCount,
    inputTokens: usage.inputTokens, outputTokens: usage.outputTokens,
    cacheRead: cacheReadTokens, cacheCreation: cacheCreationTokens,
    cost: `$${usage.estimatedCost.toFixed(4)}`,
    stopReason: usage.stopReason,
    webSources: webSources.length,
  })
  yield `${USAGE_SENTINEL}${JSON.stringify(usage)}`
}
