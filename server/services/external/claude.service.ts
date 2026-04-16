import Anthropic from '@anthropic-ai/sdk'
import { log } from '../../utils/logger.js'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export interface ApiUsage {
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheCreationTokens: number
  model: string
  estimatedCost: number
}

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
    response = await client.messages.create({
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
 * Adjust `max_uses` to control how many searches Claude can do per call (impacts cost heavily).
 */
export const WEB_SEARCH_TOOL = {
  type: 'web_search_20250305',
  name: 'web_search',
  max_uses: 3, // ← nombre max de recherches web par appel API (chaque recherche ajoute ~10-15k input tokens)
} as unknown as Anthropic.Messages.ToolUnion

/**
 * Stream a chat completion from Claude API.
 * Yields text chunks as they arrive.
 * Final yield is a sentinel string __USAGE__{...} with token metrics.
 *
 * @param tools — optional server-side tools (e.g., web_search). Only text deltas
 *   are yielded; server tool blocks (web_search_tool_result) stay server-side
 *   but Claude's synthesized text response is streamed normally.
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
  let stream: ReturnType<typeof client.messages.stream>
  try {
    stream = client.messages.stream({
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
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        chunkCount++
        yield event.delta.text
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
  }
  log.info(`Claude API stream done`, {
    ms: Date.now() - start, chunkCount,
    inputTokens: usage.inputTokens, outputTokens: usage.outputTokens,
    cacheRead: cacheReadTokens, cacheCreation: cacheCreationTokens,
    cost: `$${usage.estimatedCost.toFixed(4)}`,
  })
  yield `${USAGE_SENTINEL}${JSON.stringify(usage)}`
}
