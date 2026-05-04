/**
 * Service de generation de longues-traines pour l'onglet Radar.
 *
 * Pipeline :
 *   1. Validation Zod du request
 *   2. Combinator local (deterministe) → pool de candidats
 *   3. Cache `api_cache` (key = sha256 des inputs sorted)
 *   4. Si miss : loadPrompt + ai-provider.classifyWithTool + Zod sortie
 *   5. Persistance dans radar_explorations.scan_result.longTailSuggestions
 *   6. Ecriture du cache (TTL 7j)
 *
 * Design notes :
 *   - AI_PROVIDER=mock par defaut en dev (pas de credit IA consomme).
 *   - Si l'IA retourne un payload invalide (Zod fail), on n'ecrit ni en
 *     cache ni en DB → l'utilisateur peut reessayer.
 */
import { createHash } from 'node:crypto'
import { classifyWithTool } from '../external/ai-provider.service.js'
import { loadPrompt } from '../../utils/prompt-loader.js'
import { log } from '../../utils/logger.js'
import { getCached, setCached } from '../../db/cache-helpers.js'
import { persistLongTailSuggestions } from '../infra/radar-exploration.service.js'
import {
  longTailSuggestionsResponseSchema,
  longTailSuggestRequestSchema,
  type LongTailSuggestion,
  type LongTailSuggestionsResponse,
  type LongTailSuggestRequest,
} from '../../../shared/schemas/long-tail-suggestions.schema.js'
import { combineRoots } from './long-tail-combinator.service.js'

// ---------------------------------------------------------------------------
// Erreurs
// ---------------------------------------------------------------------------

export class LongTailSuggestionsValidationError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message)
    this.name = 'LongTailSuggestionsValidationError'
  }
}

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const CACHE_TYPE = 'long-tail-suggest'
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7j

// ---------------------------------------------------------------------------
// API publique
// ---------------------------------------------------------------------------

export interface GenerateResult {
  suggestions: LongTailSuggestion[]
  fromCache: boolean
}

export async function generateLongTailSuggestions(
  rawInput: LongTailSuggestRequest & { articleId: number },
): Promise<GenerateResult> {
  // 1. Validation request
  const inputParse = longTailSuggestRequestSchema.safeParse(rawInput)
  if (!inputParse.success) {
    throw new Error(
      `Invalid long-tail-suggest input: ${inputParse.error.issues.map(i => i.message).join(', ')}`,
    )
  }
  const input = inputParse.data
  const articleId = (rawInput as { articleId: number }).articleId

  // 2. Combinator deterministe (toujours execute, sert au prompt)
  const candidates = combineRoots(input.radarKeywords.map(k => k.keyword))

  // 3. Cache lookup
  const cacheKey = computeCacheKey(input)
  const cached = await getCached<LongTailSuggestionsResponse>(CACHE_TYPE, cacheKey)
  if (cached) {
    // Verifier que le cache est encore conforme au schema (defense en
    // profondeur — un schema-bump rendrait le cache obsolete).
    const cachedParse = longTailSuggestionsResponseSchema.safeParse(cached)
    if (cachedParse.success) {
      log.debug(`[long-tail-suggest] cache HIT articleId=${articleId} key=${cacheKey.slice(0, 12)}…`)
      // Persistance idempotente : meme apres un cache HIT, on s'assure que
      // les suggestions sont en DB (ex: regen avec les memes inputs apres un
      // changement d'article).
      await persistLongTailSuggestions(articleId, cachedParse.data.suggestions)
      return { suggestions: cachedParse.data.suggestions, fromCache: true }
    }
    log.warn(`[long-tail-suggest] cache hit but invalid schema, falling back to IA`)
  }

  // 4. Load prompt + IA call
  const radarKeywordsBlock = input.radarKeywords
    .map(k => `- "${k.keyword}"`)
    .join('\n')
  const candidatesBlock = candidates.length > 0
    ? candidates.map(c => `- ${c.keyword}  (${c.derivedFromRoots.join(' + ')})`).join('\n')
    : 'Aucune combinaison candidate calculee.'

  const systemPrompt = await loadPrompt('radar-long-tail-suggest', {
    article_title: input.articleTitle || '(non defini)',
    article_pain_point: input.articlePainPoint || '(non defini)',
    radar_keywords_with_kpis: radarKeywordsBlock,
    candidate_combinations: candidatesBlock,
  }, input.strategyContext ? { /* strategy context already in vars */ } : undefined)

  const userPrompt = `Genere les suggestions longue-traine pour l'article "${input.articleTitle}".`

  const { result } = await classifyWithTool<LongTailSuggestionsResponse>(
    systemPrompt,
    userPrompt,
    {
      name: 'suggest_long_tail',
      description: 'Genere jusqu\'a 10 longues-traines a partir des mots-cles racines.',
      input_schema: {
        type: 'object' as const,
        properties: {
          suggestions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                keyword: { type: 'string' },
                rationale: { type: 'string' },
                preferenceScore: { type: 'integer', minimum: 1, maximum: 10 },
                derivedFromRoots: { type: 'array', items: { type: 'string' } },
              },
              required: ['keyword', 'rationale', 'preferenceScore', 'derivedFromRoots'],
            },
          },
        },
        required: ['suggestions'],
      },
    },
    { maxTokens: 2048 },
  )

  // 5. Validate IA output (Zod strict)
  const parsed = longTailSuggestionsResponseSchema.safeParse(result)
  if (!parsed.success) {
    log.warn(`[long-tail-suggest] AI output failed Zod validation`, {
      articleId,
      issues: parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`),
    })
    throw new LongTailSuggestionsValidationError(
      `AI returned invalid long-tail suggestions: ${parsed.error.issues[0]?.message}`,
      parsed.error,
    )
  }

  // 6. Persist + cache (idempotence)
  await persistLongTailSuggestions(articleId, parsed.data.suggestions)
  await setCached(CACHE_TYPE, cacheKey, parsed.data, CACHE_TTL_MS)
  log.info(`[long-tail-suggest] generated articleId=${articleId} count=${parsed.data.suggestions.length} fromCache=false`)

  return { suggestions: parsed.data.suggestions, fromCache: false }
}

/**
 * Met a jour les `selectedKeywords` (sans toucher aux suggestions). Sert au
 * PATCH /selection — l'utilisateur coche/decoche les suggestions et le front
 * persiste son etat avec un debounce.
 */
export async function persistLongTailSelection(
  articleId: number,
  selectedKeywords: string[],
): Promise<void> {
  // Recuperer les suggestions existantes pour conserver les autres champs du JSONB.
  // persistLongTailSuggestions reutilise le scan_result existant, donc on peut
  // appeler directement avec un array vide pour les suggestions (mais ca les
  // ecraserait). Mieux : on lit puis ecrit explicitement.
  const { getRadarExploration } = await import('../infra/radar-exploration.service.js')
  const existing = await getRadarExploration(articleId)
  const existingSuggestions =
    (existing?.scanResult as { longTailSuggestions?: LongTailSuggestion[] } | undefined)?.longTailSuggestions ?? []
  await persistLongTailSuggestions(articleId, existingSuggestions, selectedKeywords)
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function computeCacheKey(input: LongTailSuggestRequest): string {
  // Normalisation : trim + lowercase + sort des keywords pour rendre la cle
  // independante de l'ordre.
  const sorted = [...input.radarKeywords]
    .map(k => k.keyword.trim().toLowerCase())
    .sort()
    .join('|')
  const payload = [
    input.articleTitle.trim().toLowerCase(),
    input.articlePainPoint.trim().toLowerCase(),
    input.strategyContext.trim().toLowerCase(),
    sorted,
  ].join('::')
  return createHash('sha256').update(payload).digest('hex')
}
