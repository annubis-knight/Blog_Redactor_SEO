/**
 * AI Provider Dispatcher (2026-04-22)
 *
 * Point d'entrée unique pour tous les appels IA (Claude, Gemini).
 * - En production : AI_PROVIDER=claude → Anthropic.
 * - En dev : AI_PROVIDER=gemini → Google, gratuit mais rate-limited.
 *
 * Gestion intégrée :
 *   - Retry exponentiel sur 429 (quota) et 503 (surcharge).
 *   - AIProviderQuotaError / AIProviderOverloadedError pour l'UI (pile d'activité).
 *   - Sentinel USAGE_SENTINEL en fin de stream (parity Claude↔Gemini).
 */
import type Anthropic from '@anthropic-ai/sdk'
import { log } from '../../utils/logger.js'
import {
  streamChatCompletion as streamClaude,
  classifyWithTool as classifyClaude,
  calculateCost as calcCostClaude,
  USAGE_SENTINEL,
  WEB_SEARCH_TOOL,
  type ApiUsage,
} from './claude.service.js'
import {
  streamChatCompletionGemini,
  classifyJsonGemini,
  calculateGeminiCost,
} from './gemini.service.js'
import {
  streamChatCompletionOpenRouter,
  classifyJsonOpenRouter,
  calculateOpenRouterCost,
} from './openrouter.service.js'
import {
  streamChatCompletionMock,
  classifyJsonMock,
  calculateMockCost,
  ensureFixturesLoaded,
} from './mock.service.js'

export type AIProvider = 'claude' | 'gemini' | 'openrouter' | 'mock'

export { USAGE_SENTINEL, WEB_SEARCH_TOOL }
export type { ApiUsage }

/** Lit AI_PROVIDER à chaque appel — permet un switch à chaud en dev. */
export function getProvider(): AIProvider {
  const val = (process.env.AI_PROVIDER ?? 'claude').toLowerCase()
  if (val === 'gemini') return 'gemini'
  if (val === 'openrouter') return 'openrouter'
  if (val === 'mock') return 'mock'
  return 'claude'
}

/**
 * Chaîne de fallback. Le primary (AI_PROVIDER) passe en premier, puis les
 * autres dans l'ordre canonique claude → gemini → openrouter. Si un provider
 * échoue avec quota (429) ou overload (503), on retente avec le suivant.
 *
 * Peut être désactivé avec AI_PROVIDER_NO_FALLBACK=1 (utile pour tester un
 * provider spécifique sans masquer ses erreurs).
 */
const CANONICAL_ORDER: readonly AIProvider[] = ['claude', 'gemini', 'openrouter']

export function getProviderChain(): AIProvider[] {
  const primary = getProvider()
  // Mock provider : pas de fallback (c'est un provider explicite pour tests)
  if (primary === 'mock') return ['mock']
  if (process.env.AI_PROVIDER_NO_FALLBACK === '1') return [primary]
  const rest = CANONICAL_ORDER.filter(p => p !== primary)
  return [primary, ...rest]
}

// ---------------------------------------------------------------------------
// Erreurs connues
// ---------------------------------------------------------------------------

export class AIProviderQuotaError extends Error {
  public readonly provider: AIProvider
  constructor(provider: AIProvider, message = 'AI provider quota exceeded') {
    super(message)
    this.name = 'AIProviderQuotaError'
    this.provider = provider
  }
}

export class AIProviderOverloadedError extends Error {
  public readonly provider: AIProvider
  constructor(provider: AIProvider, message = 'AI provider is overloaded') {
    super(message)
    this.name = 'AIProviderOverloadedError'
    this.provider = provider
  }
}

// ---------------------------------------------------------------------------
// Retry policy (utilisé partout où on appelle le provider)
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

type ErrorWithStatus = Error & { status?: number; code?: string | number }

function extractStatus(err: unknown): number | null {
  const e = err as ErrorWithStatus
  if (typeof e?.status === 'number') return e.status
  // Gemini surface le code HTTP dans message: "[429] Resource exhausted"
  const match = (e?.message ?? '').match(/\[(\d{3})\]/)
  if (match && match[1]) return Number(match[1])
  return null
}

function isRetryable(status: number | null): boolean {
  return status === 429 || status === 500 || status === 503
}

function mapToKnownError(err: unknown, provider: AIProvider): Error {
  const status = extractStatus(err)
  const msg = (err as Error).message ?? ''
  // Quota / rate limit / credit balance — tous considérés comme "quota exhaustion"
  // pour déclencher le fallback sur le provider suivant.
  if (
    status === 429 ||
    /quota|rate.?limit|RESOURCE_EXHAUSTED|credit balance.*too low|insufficient.*credit/i.test(msg)
  ) {
    const msgByProvider: Record<AIProvider, string> = {
      gemini: 'Quota Gemini atteint (requêtes/minute ou tokens/jour). Attendez quelques secondes ou basculez provider (AI_PROVIDER=claude|openrouter).',
      openrouter: 'Quota OpenRouter atteint (20 req/min ou 50 req/jour sur free tier). Attendez ou basculez provider.',
      claude: 'Quota Claude atteint ou crédits Anthropic insuffisants. Rechargez vos crédits.',
      mock: 'Mock provider erreur — ne devrait pas arriver (pas de quota côté mock).',
    }
    return new AIProviderQuotaError(provider, msgByProvider[provider])
  }
  if (status === 503 || /overload|UNAVAILABLE/i.test(msg)) {
    return new AIProviderOverloadedError(provider)
  }
  return err as Error
}

async function withRetry<T>(
  fn: () => Promise<T>,
  ctx: string,
  provider: AIProvider,
  maxAttempts = 3,
): Promise<T> {
  let lastErr: unknown
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      const status = extractStatus(err)
      const retryable = isRetryable(status)
      const lastAttempt = attempt === maxAttempts
      if (!retryable || lastAttempt) break
      const backoffMs = Math.min(1000 * 2 ** (attempt - 1), 8000)
      log.warn(`${ctx}: retry ${attempt}/${maxAttempts} after ${backoffMs}ms (status=${status})`)
      await sleep(backoffMs)
    }
  }
  throw mapToKnownError(lastErr, provider)
}

/**
 * Enchaîne les providers sur la chaîne de fallback. Si le primary échoue avec
 * QuotaError/OverloadedError, on retente avec le suivant. Toute autre erreur
 * remonte immédiatement (on ne masque pas un bug derrière un fallback).
 */
async function withFallbackChain<T>(
  runOnProvider: (provider: AIProvider) => Promise<T>,
  ctx: string,
): Promise<T> {
  const chain = getProviderChain()
  let lastErr: unknown
  for (let i = 0; i < chain.length; i++) {
    const provider = chain[i]
    try {
      if (i > 0) log.warn(`${ctx}: fallback to ${provider} (primary exhausted)`)
      return await withRetry(() => runOnProvider(provider), ctx, provider)
    } catch (err) {
      lastErr = err
      const isRecoverable = err instanceof AIProviderQuotaError || err instanceof AIProviderOverloadedError
      if (!isRecoverable) throw err
      // Continue to next provider
    }
  }
  throw lastErr
}

// ---------------------------------------------------------------------------
// Public API (stable, appelée par les routes)
// ---------------------------------------------------------------------------

/**
 * Streaming chat completion (SSE-friendly).
 * - Claude : on utilise `streamChatCompletion` existant.
 * - Gemini : on wrappe `streamChatCompletionGemini`.
 *
 * Retour : AsyncGenerator<string>. Chaque yield est soit un chunk texte, soit
 * le sentinel final `__USAGE__{json}` pour le calcul de coût côté appelant.
 *
 * Retry : si l'erreur initiale survient avant le premier yield, on retry avec
 * backoff. Si l'erreur survient en cours de stream, on laisse remonter (pas
 * de retry partiel, trop risqué pour l'UX SSE).
 */
export async function* streamChatCompletion(
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number = 4096,
  tools?: Anthropic.Messages.ToolUnion[],
): AsyncGenerator<string> {
  // On essaie d'obtenir un iterator via la chaîne de fallback. Si le primary
  // échoue (quota/overload) avant le premier chunk, on bascule sur le suivant.
  // Une fois qu'on a commencé à yielder des chunks, une interruption réseau
  // remonte telle quelle (pas de retry partiel — trop risqué pour l'UX SSE).
  const { provider, iterator } = await withFallbackChain(
    async (p) => {
      log.debug(`streamChatCompletion via ${p}`)
      const it = p === 'mock'
        ? (await ensureFixturesLoaded(), streamChatCompletionMock(systemPrompt, userPrompt, maxTokens))
        : p === 'gemini'
          ? streamChatCompletionGemini(systemPrompt, userPrompt, maxTokens)
          : p === 'openrouter'
            ? streamChatCompletionOpenRouter(systemPrompt, userPrompt, maxTokens)
            : streamClaude(systemPrompt, userPrompt, maxTokens, tools)
      // Probe le premier chunk pour déclencher une erreur quota/overload *avant*
      // de rendre l'iterator à l'appelant (sinon le fallback ne peut plus agir).
      const first = await it.next()
      return { provider: p, iterator: it, firstChunk: first }
    },
    'streamChatCompletion',
  ).then(async (res) => {
    // Reconstruit un iterator qui re-yield le premier chunk déjà consommé.
    const { provider, iterator, firstChunk } = res as { provider: AIProvider; iterator: AsyncGenerator<string>; firstChunk: IteratorResult<string> }
    async function* merged(): AsyncGenerator<string> {
      if (!firstChunk.done) yield firstChunk.value as string
      for await (const chunk of iterator) yield chunk
    }
    return { provider, iterator: merged() }
  })

  try {
    for await (const chunk of iterator) {
      yield chunk
    }
  } catch (err) {
    log.error(`streamChatCompletion interrupted via ${provider}: ${(err as Error).message}`)
    throw mapToKnownError(err, provider)
  }
}

/**
 * Non-streaming structured output (JSON).
 * - Claude : `classifyWithTool` avec forced tool_use.
 * - Gemini : `classifyJsonGemini` avec responseMimeType=application/json.
 *
 * Le `tool` est utilisé comme description du schéma attendu. Pour Gemini on
 * ne l'envoie pas directement au modèle mais on utilise sa `description` +
 * `input_schema` comme contexte dans le userPrompt pour cadrer le JSON.
 */
export async function classifyWithTool<T>(
  systemPrompt: string,
  userPrompt: string,
  tool: { name: string; description: string; input_schema: Anthropic.Tool['input_schema'] },
  modelOrOptions?: string | { model?: string; maxTokens?: number },
  maxTokensArg?: number,
): Promise<{ result: T; usage: ApiUsage }> {
  // Support both call styles (legacy positional + new options object).
  const options: { model?: string; maxTokens?: number } = typeof modelOrOptions === 'string'
    ? { model: modelOrOptions, maxTokens: maxTokensArg }
    : (modelOrOptions ?? {})
  const maxTokens = options.maxTokens ?? 4096

  const schemaHint = [
    `\n\nFORMAT DE SORTIE OBLIGATOIRE : JSON valide qui respecte ce schéma :`,
    JSON.stringify(tool.input_schema, null, 2),
    `Description : ${tool.description}`,
    `Commence ta réponse directement par '{' — pas de préambule, pas de texte hors JSON.`,
  ].join('\n')

  return withFallbackChain(
    async (provider) => {
      if (provider === 'mock') {
        await ensureFixturesLoaded()
        // On passe aussi le tool dans le userPrompt via la schemaHint (qui
        // contient déjà description+schema) pour que le mock trouve la fixture.
        const { data, usage } = await classifyJsonMock<T>(
          systemPrompt,
          userPrompt + schemaHint + `\nTool : ${tool.name}`,
          undefined,
          maxTokens,
        )
        return { result: data, usage }
      }

      // Le model override est pensé pour Claude ('claude-haiku-4-5-…', 'claude-sonnet-4-6').
      // Quand on dispatch vers Gemini/OpenRouter (primary ou via fallback), on ignore
      // le model override et on laisse chaque service utiliser son GEMINI_MODEL / OPENROUTER_MODEL env var.
      const crossProviderModel = provider === 'claude' ? options.model : undefined

      if (provider === 'gemini') {
        const { data, usage } = await classifyJsonGemini<T>(
          systemPrompt,
          userPrompt + schemaHint,
          crossProviderModel,
          maxTokens,
        )
        return { result: data, usage }
      }
      if (provider === 'openrouter') {
        const { data, usage } = await classifyJsonOpenRouter<T>(
          systemPrompt,
          userPrompt + schemaHint,
          crossProviderModel,
          maxTokens,
        )
        return { result: data, usage }
      }
      const { result, usage } = await classifyClaude<T>(systemPrompt, userPrompt, tool, options.model, maxTokens)
      return { result, usage }
    },
    `classifyWithTool[${tool.name}]`,
  )
}

/** Calcul unifié du coût — dispatch selon le modèle référencé dans ApiUsage. */
export function calculateCost(usage: ApiUsage): number
export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
  cacheReadTokens?: number,
  cacheCreationTokens?: number,
): number
export function calculateCost(
  modelOrUsage: string | ApiUsage,
  inputTokens = 0,
  outputTokens = 0,
  cacheReadTokens = 0,
  cacheCreationTokens = 0,
): number {
  if (typeof modelOrUsage === 'object') {
    const u = modelOrUsage
    if (u.model.startsWith('mock')) return calculateMockCost(u)
    if (u.model.startsWith('gemini')) return calculateGeminiCost(u)
    if (u.model.includes(':free') || u.model.includes('/')) return calculateOpenRouterCost(u)
    return calcCostClaude(u.model, u.inputTokens, u.outputTokens, u.cacheReadTokens, u.cacheCreationTokens)
  }
  const model = modelOrUsage
  if (model.startsWith('mock')) return 0
  if (model.startsWith('gemini')) {
    return calculateGeminiCost({ model, inputTokens, outputTokens, cacheReadTokens, cacheCreationTokens, estimatedCost: 0 })
  }
  if (model.includes(':free') || model.includes('/')) {
    return calculateOpenRouterCost({ model, inputTokens, outputTokens, cacheReadTokens, cacheCreationTokens, estimatedCost: 0 })
  }
  return calcCostClaude(model, inputTokens, outputTokens, cacheReadTokens, cacheCreationTokens)
}
