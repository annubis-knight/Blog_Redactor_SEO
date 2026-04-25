/**
 * Gemini (Google AI) client — mirror minimal de claude.service.ts.
 * Utilisé par ai-provider.service.ts quand AI_PROVIDER=gemini.
 *
 * Notes :
 * - Les modèles Flash (free tier) sont limités à ~15 req/min + 1M tokens/jour.
 *   Les erreurs 429 RESOURCE_EXHAUSTED et 503 UNAVAILABLE sont retryable.
 * - Gemini n'a pas de notion d'ephemeral cache système : on envoie le prompt
 *   complet à chaque appel.
 * - Le format de sortie JSON structuré passe par `responseMimeType: 'application/json'`
 *   et éventuellement `responseSchema`.
 */
import { GoogleGenAI } from '@google/genai'
import { log } from '../../utils/logger.js'
import type { ApiUsage } from './claude.service.js'

const DEFAULT_MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash'

// Pricing Gemini 2.0 Flash (2026-04) — free tier, billed at $0 officiellement.
// On garde des valeurs symboliques pour que calculateCost reste cohérent avec
// ApiUsage côté UI (la pile d'activité affichera ~$0).
const PRICING: Record<string, { input: number; output: number }> = {
  'gemini-2.0-flash': { input: 0, output: 0 },
  'gemini-2.0-flash-001': { input: 0, output: 0 },
  'gemini-2.0-flash-lite': { input: 0, output: 0 },
  'gemini-2.0-flash-lite-001': { input: 0, output: 0 },
  'gemini-2.5-flash': { input: 0.10, output: 0.40 },   // $/M tokens (paid tier)
  'gemini-2.5-pro': { input: 1.25, output: 10.0 },     // $/M tokens (paid tier)
}

let _client: GoogleGenAI | null = null

function getClient(): GoogleGenAI {
  if (_client) return _client
  const apiKey = process.env.VITE_GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('VITE_GEMINI_API_KEY is missing — required when AI_PROVIDER=gemini')
  }
  _client = new GoogleGenAI({ apiKey })
  return _client
}

export function calculateGeminiCost(usage: ApiUsage): number {
  const pricing = PRICING[usage.model] ?? PRICING[DEFAULT_MODEL] ?? { input: 0, output: 0 }
  const inputCost = ((usage.inputTokens ?? 0) / 1_000_000) * pricing.input
  const outputCost = ((usage.outputTokens ?? 0) / 1_000_000) * pricing.output
  return inputCost + outputCost
}

/**
 * Non-streaming JSON response (équivalent de classifyWithTool Claude).
 * Gemini ne supporte pas bien le "tool use forcé" à la Claude pour du structured output :
 * on utilise responseMimeType='application/json' qui force le modèle à produire du JSON.
 */
export async function classifyJsonGemini<T>(
  systemPrompt: string,
  userPrompt: string,
  model: string = DEFAULT_MODEL,
  maxTokens: number = 4096,
): Promise<{ data: T; usage: ApiUsage }> {
  const client = getClient()
  const startedAt = Date.now()

  const result = await client.models.generateContent({
    model,
    contents: [
      { role: 'user', parts: [{ text: userPrompt }] },
    ],
    config: {
      systemInstruction: systemPrompt,
      temperature: 0.2,
      maxOutputTokens: maxTokens,
      responseMimeType: 'application/json',
    },
  })

  const text = result.text ?? ''
  const usageMeta = result.usageMetadata
  const usage: ApiUsage = {
    model,
    inputTokens: usageMeta?.promptTokenCount ?? 0,
    outputTokens: usageMeta?.candidatesTokenCount ?? 0,
    cacheReadTokens: 0,
    cacheCreationTokens: 0,
    estimatedCost: 0,
  }
  usage.estimatedCost = calculateGeminiCost(usage)

  log.debug(`Gemini classifyJson done`, {
    model,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    ms: Date.now() - startedAt,
  })

  try {
    const parsed = JSON.parse(text) as T
    return { data: parsed, usage }
  } catch (err) {
    log.error(`Gemini classifyJson JSON parse failed`, { preview: text.slice(0, 200) })
    throw new Error(`Gemini returned invalid JSON: ${(err as Error).message}`)
  }
}

/**
 * Streaming text generator (équivalent de streamChatCompletion Claude).
 * Yield chaque chunk texte, puis un dernier chunk `__USAGE__{json}` (sentinel).
 */
export async function* streamChatCompletionGemini(
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number = 8192,
  model: string = DEFAULT_MODEL,
  tools?: unknown[],
): AsyncGenerator<string, void, unknown> {
  const client = getClient()
  const startedAt = Date.now()
  let inputTokens = 0
  let outputTokens = 0

  const config: Record<string, unknown> = {
    systemInstruction: systemPrompt,
    temperature: 0.7,
    maxOutputTokens: maxTokens,
  }
  if (tools && tools.length > 0) {
    // tool_use partial parity — Gemini accepts { functionDeclarations: [] }
    config.tools = tools
  }

  const stream = await client.models.generateContentStream({
    model,
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    config,
  })

  for await (const chunk of stream) {
    // Each chunk may contain text + usage metadata on the last one.
    const chunkText = chunk.text ?? ''
    if (chunkText) yield chunkText
    const meta = chunk.usageMetadata
    if (meta) {
      if (meta.promptTokenCount != null) inputTokens = meta.promptTokenCount
      if (meta.candidatesTokenCount != null) outputTokens = meta.candidatesTokenCount
    }
  }

  const usage: ApiUsage = {
    model,
    inputTokens,
    outputTokens,
    cacheReadTokens: 0,
    cacheCreationTokens: 0,
    estimatedCost: 0,
  }
  usage.estimatedCost = calculateGeminiCost(usage)

  log.debug(`Gemini stream done`, {
    model,
    inputTokens,
    outputTokens,
    ms: Date.now() - startedAt,
  })

  // Sentinel for parity with Claude stream (ai-provider.service reads this)
  yield `__USAGE__${JSON.stringify(usage)}`
}
