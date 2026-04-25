/**
 * OpenRouter client — API OpenAI-compatible, multi-modèles.
 * Utilisé par ai-provider.service.ts quand AI_PROVIDER=openrouter.
 *
 * IMPORTANT (contrainte utilisateur) : n'utiliser QUE des modèles gratuits
 * (suffixe `:free`). `OPENROUTER_MODEL` doit contenir `:free` dans le .env.
 *
 * Rate-limits free tier :
 *   - 20 req/min (tous modèles confondus)
 *   - 50 req/jour si crédit < $10, 1000 req/jour sinon
 *   - Modèles individuels peuvent imposer des limits plus stricts
 *
 * Docs : https://openrouter.ai/docs
 */
import { log } from '../../utils/logger.js'
import type { ApiUsage } from './claude.service.js'

const DEFAULT_MODEL = process.env.OPENROUTER_MODEL ?? 'meta-llama/llama-3.3-70b-instruct:free'
const API_URL = 'https://openrouter.ai/api/v1/chat/completions'

function assertFreeModel(model: string): void {
  if (!model.endsWith(':free')) {
    throw new Error(
      `OpenRouter model "${model}" is not free. Only models with suffix ":free" are allowed ` +
      `(set OPENROUTER_MODEL to something like "meta-llama/llama-3.3-70b-instruct:free").`,
    )
  }
}

function getHeaders(): Record<string, string> {
  const apiKey = process.env.OPEN_ROUTER_API_KEY
  if (!apiKey) {
    throw new Error('OPEN_ROUTER_API_KEY is missing — required when AI_PROVIDER=openrouter')
  }
  return {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    // Optional but recommended by OpenRouter for analytics/ranking
    'HTTP-Referer': 'http://localhost:3005',
    'X-Title': 'Blog Redactor SEO',
  }
}

// Pricing pour les modèles free = 0. On conserve la shape ApiUsage pour la pile d'activité.
export function calculateOpenRouterCost(_usage: ApiUsage): number {
  return 0
}

/**
 * Fait un appel non-streaming avec demande de JSON structuré.
 * OpenRouter supporte response_format: { type: 'json_object' } sur la plupart des modèles récents.
 */
export async function classifyJsonOpenRouter<T>(
  systemPrompt: string,
  userPrompt: string,
  model: string = DEFAULT_MODEL,
  maxTokens: number = 4096,
): Promise<{ data: T; usage: ApiUsage }> {
  assertFreeModel(model)
  const startedAt = Date.now()

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2,
      max_tokens: maxTokens,
      response_format: { type: 'json_object' },
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    const err = new Error(`[${res.status}] OpenRouter: ${body.slice(0, 300)}`) as Error & { status: number }
    err.status = res.status
    throw err
  }

  const json = await res.json() as {
    choices: Array<{ message: { content: string } }>
    usage: { prompt_tokens: number; completion_tokens: number }
  }
  const text = json.choices[0]?.message?.content ?? ''

  const usage: ApiUsage = {
    model,
    inputTokens: json.usage?.prompt_tokens ?? 0,
    outputTokens: json.usage?.completion_tokens ?? 0,
    cacheReadTokens: 0,
    cacheCreationTokens: 0,
    estimatedCost: 0,
  }

  log.debug(`OpenRouter classifyJson done`, {
    model,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    ms: Date.now() - startedAt,
  })

  try {
    return { data: JSON.parse(text) as T, usage }
  } catch (err) {
    log.error(`OpenRouter classifyJson parse failed`, { preview: text.slice(0, 200) })
    throw new Error(`OpenRouter returned invalid JSON: ${(err as Error).message}`)
  }
}

/**
 * Streaming SSE (équivalent de streamChatCompletion Claude).
 * OpenRouter renvoie des événements SSE au format OpenAI : `data: {...}\n\n`.
 * On parse chaque delta.content et on yield le texte.
 * À la fin on yield le sentinel __USAGE__{json}.
 */
export async function* streamChatCompletionOpenRouter(
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number = 8192,
  model: string = DEFAULT_MODEL,
): AsyncGenerator<string, void, unknown> {
  assertFreeModel(model)
  const startedAt = Date.now()

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: maxTokens,
      stream: true,
      usage: { include: true },
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    const err = new Error(`[${res.status}] OpenRouter: ${body.slice(0, 300)}`) as Error & { status: number }
    err.status = res.status
    throw err
  }
  if (!res.body) {
    throw new Error('OpenRouter: empty stream body')
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let inputTokens = 0
  let outputTokens = 0

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      // SSE events are separated by `\n\n`
      const events = buffer.split('\n\n')
      buffer = events.pop() ?? ''
      for (const evt of events) {
        const line = evt.trim()
        if (!line.startsWith('data:')) continue
        const data = line.slice(5).trim()
        if (data === '[DONE]') continue
        try {
          const parsed = JSON.parse(data) as {
            choices?: Array<{ delta?: { content?: string } }>
            usage?: { prompt_tokens?: number; completion_tokens?: number }
          }
          const chunkText = parsed.choices?.[0]?.delta?.content
          if (chunkText) yield chunkText
          if (parsed.usage?.prompt_tokens != null) inputTokens = parsed.usage.prompt_tokens
          if (parsed.usage?.completion_tokens != null) outputTokens = parsed.usage.completion_tokens
        } catch {
          // Ignore malformed SSE chunks
        }
      }
    }
  } finally {
    reader.releaseLock()
  }

  const usage: ApiUsage = {
    model,
    inputTokens,
    outputTokens,
    cacheReadTokens: 0,
    cacheCreationTokens: 0,
    estimatedCost: 0,
  }

  log.debug(`OpenRouter stream done`, {
    model,
    inputTokens,
    outputTokens,
    ms: Date.now() - startedAt,
  })

  yield `__USAGE__${JSON.stringify(usage)}`
}
