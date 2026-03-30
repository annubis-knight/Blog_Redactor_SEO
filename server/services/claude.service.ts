import Anthropic from '@anthropic-ai/sdk'
import { log } from '../utils/logger.js'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export interface ApiUsage {
  inputTokens: number
  outputTokens: number
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

function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = PRICING[model] ?? { input: 3, output: 15 }
  return (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000
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
  log.info(`Claude API tool call start`, { model, tool: tool.name })

  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
    tools: [tool],
    tool_choice: { type: 'tool', name: tool.name },
  })

  const toolBlock = response.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
  )
  if (!toolBlock) {
    throw new Error(`Expected tool_use response from ${tool.name} but got none`)
  }

  const usage: ApiUsage = {
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    model,
    estimatedCost: calculateCost(model, response.usage.input_tokens, response.usage.output_tokens),
  }
  log.info(`Claude API tool call done`, { tool: tool.name, inputTokens: usage.inputTokens, outputTokens: usage.outputTokens, cost: `$${usage.estimatedCost.toFixed(4)}` })

  return { result: toolBlock.input as T, usage }
}

export const USAGE_SENTINEL = '__USAGE__'

/**
 * Stream a chat completion from Claude API.
 * Yields text chunks as they arrive.
 * Final yield is a sentinel string __USAGE__{...} with token metrics.
 */
export async function* streamChatCompletion(
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 4096,
): AsyncGenerator<string> {
  const model = process.env.CLAUDE_MODEL || 'claude-sonnet-4-6'

  log.info(`Claude API stream start`, { model, maxTokens })

  const stream = client.messages.stream({
    model,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  })

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      yield event.delta.text
    }
  }

  // Extract usage from final message
  const finalMessage = await stream.finalMessage()
  const usage: ApiUsage = {
    inputTokens: finalMessage.usage.input_tokens,
    outputTokens: finalMessage.usage.output_tokens,
    model,
    estimatedCost: calculateCost(model, finalMessage.usage.input_tokens, finalMessage.usage.output_tokens),
  }
  log.info(`Claude API stream done`, { inputTokens: usage.inputTokens, outputTokens: usage.outputTokens, cost: `$${usage.estimatedCost.toFixed(4)}` })
  yield `${USAGE_SENTINEL}${JSON.stringify(usage)}`
}
