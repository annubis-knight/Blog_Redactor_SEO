/**
 * Contrats d'affichage — famille « Radar » (lot 2).
 *
 * Forme attendue par DouleurScannerResults, RadarKeywordCard (et ses parties
 * score et arbre PAA), RadarAiPanel, RadarThermometer, après :
 *   - POST /keywords/radar/scan (frontières serveur et client) ;
 *   - POST /keywords/radar/generate (sortie d'IA : idées de mots-clés) ;
 *   - GET /articles/:id/radar-exploration (relecture d'un instantané JSONB,
 *     anciens formats compris).
 *
 * AUTHORITY: PostgreSQL `radar_explorations.scan_result` (JSONB), `keyword_metrics`
 * READS FROM: POST /keywords/radar/scan, POST /keywords/radar/generate,
 *             GET /articles/:id/radar-exploration
 * CONSUMERS: useResonanceScore, radar-exploration.store, useCapitaineScan,
 *            useDiscoveryPanel, RadarPanel, useRadarRanking, RadarThermometer
 * RELATED FR: NFR-INT-DISPLAY-CONTRACTS, FR-INFRA-KPI-NULLABLE, FR-RAD-DB-FIRST
 */
import { z } from 'zod'
import {
  count,
  defineContract,
  kpiValue,
  oneOf,
  optionalObject,
  text,
  tolerantArray,
  withFallback,
} from './core.js'
import { UNAVAILABLE_REASONS, marketScoreSchema, relevanceScoreSchema } from './score-blocks.js'
import { longTailSuggestionSchema, type LongTailSuggestion } from '../schemas/long-tail-suggestions.schema.js'
import type {
  KeywordRadarGenerateResult,
  KeywordRadarScanResult,
  RadarCard,
  RadarCombinedScoreBreakdown,
  RadarExploration,
  RadarKeyword,
  RadarKeywordKpis,
  RadarPaaItem,
} from '../types/intent.types.js'

const INTENT_TYPES = ['informational', 'commercial', 'transactional', 'navigational'] as const
const MATCHES = ['total', 'partial', 'none'] as const
const MATCH_QUALITIES = ['exact', 'stem', 'semantic'] as const
const PAIN_ALIGNMENTS = ['aligned', 'partial', 'off'] as const
const HEAT_LEVELS = ['brulante', 'chaude', 'tiede', 'froide'] as const

const optionalNumber = (field: string) => withFallback(z.number().optional(), undefined, field)
const optionalString = (field: string) => withFallback(z.string().optional(), undefined, field)

/** KPI d'une carte : les 4 KPI marché et les signaux dérivés restent `null` quand absents. */
const keywordKpisSchema: z.ZodType<RadarKeywordKpis, unknown> = z.looseObject({
  searchVolume: kpiValue('kpis.searchVolume'),
  difficulty: kpiValue('kpis.difficulty'),
  cpc: kpiValue('kpis.cpc'),
  competition: kpiValue('kpis.competition'),
  intentTypes: tolerantArray(z.enum(INTENT_TYPES), 'kpis.intentTypes'),
  intentProbability: kpiValue('kpis.intentProbability'),
  autocompleteMatchCount: count('kpis.autocompleteMatchCount'),
  paaMatchCount: count('kpis.paaMatchCount'),
  paaWeightedScore: count('kpis.paaWeightedScore'),
  paaTotal: count('kpis.paaTotal'),
  avgSemanticScore: kpiValue('kpis.avgSemanticScore'),
  painAlignmentScore: optionalNumber('kpis.painAlignmentScore'),
})

const radarPaaItemSchema: z.ZodType<RadarPaaItem, unknown> = z.looseObject({
  question: z.string().min(1),
  answer: optionalString('paaItems.answer'),
  depth: count('paaItems.depth'),
  parentQuestion: optionalString('paaItems.parentQuestion'),
  match: oneOf(MATCHES, 'none', 'paaItems.match'),
  matchQuality: withFallback(z.enum(MATCH_QUALITIES).optional(), undefined, 'paaItems.matchQuality'),
  semanticScore: optionalNumber('paaItems.semanticScore'),
  painAlignment: withFallback(z.enum(PAIN_ALIGNMENTS).optional(), undefined, 'paaItems.painAlignment'),
})

/** Détail du score historique (déprécié, affiché seulement en repli d'info-bulle). */
const EMPTY_BREAKDOWN: RadarCombinedScoreBreakdown = {
  paaMatchScore: 0, resonanceBonus: 0, opportunityScore: 0,
  intentValueScore: 0, cpcScore: 0, painAlignmentScore: 0, total: 0,
}
const combinedBreakdownSchema: z.ZodType<RadarCombinedScoreBreakdown, unknown> = withFallback(
  z.looseObject({
    paaMatchScore: z.number(),
    resonanceBonus: z.number(),
    opportunityScore: z.number(),
    intentValueScore: z.number(),
    cpcScore: z.number(),
    painAlignmentScore: z.number(),
    total: z.number(),
  }),
  EMPTY_BREAKDOWN,
  'scoreBreakdown',
)

const radarCardSchema: z.ZodType<RadarCard, unknown> = z.looseObject({
  keyword: z.string().min(1),
  reasoning: text('reasoning', ''),
  // `null` = longue traîne sans KPI (explicite) ; bloc KPI illisible → `null` aussi.
  kpis: optionalObject(keywordKpisSchema, 'kpis').transform(value => value ?? null),
  paaItems: tolerantArray(radarPaaItemSchema, 'paaItems'),
  combinedScore: withFallback(z.number(), 0, 'combinedScore'),
  scoreBreakdown: combinedBreakdownSchema,
  cachedPaa: withFallback(z.boolean(), false, 'cachedPaa'),
  marketScore: optionalObject(marketScoreSchema, 'marketScore').transform(value => value ?? undefined),
  relevanceScore: optionalObject(relevanceScoreSchema, 'relevanceScore'),
  relevanceUnavailableReason: withFallback(z.enum(UNAVAILABLE_REASONS).nullable().optional(), null, 'relevanceUnavailableReason'),
  source: withFallback(z.enum(['radar', 'longtail']).optional(), undefined, 'source'),
  preferenceScore: optionalNumber('preferenceScore'),
  rationale: optionalString('rationale'),
  derivedFromRoots: tolerantArray(z.string(), 'derivedFromRoots').optional(),
})

const radarScanResultSchema: z.ZodType<KeywordRadarScanResult, unknown> = z.looseObject({
  specificTopic: text('specificTopic', ''),
  broadKeyword: text('broadKeyword', ''),
  autocomplete: withFallback(
    z.looseObject({
      suggestions: tolerantArray(
        z.looseObject({ text: z.string(), query: text('autocomplete.query', ''), position: count('autocomplete.position') }),
        'autocomplete.suggestions',
      ),
      totalCount: count('autocomplete.totalCount'),
    }),
    { suggestions: [], totalCount: 0 },
    'autocomplete',
  ),
  cards: tolerantArray(radarCardSchema, 'cards'),
  // Absent (aucune carte scannée) → le thermomètre affiche « En attente — ».
  globalScore: kpiValue('globalScore'),
  heatLevel: withFallback(z.enum(HEAT_LEVELS).nullable(), null, 'heatLevel'),
  verdict: text('verdict', ''),
  scannedAt: text('scannedAt', ''),
})

/** Réponse de POST /keywords/radar/scan. */
export const radarScanResultContract = defineContract<KeywordRadarScanResult>('radar-scan', radarScanResultSchema)

const radarKeywordSchema: z.ZodType<RadarKeyword, unknown> = z.looseObject({
  keyword: z.string().min(1),
  reasoning: text('keywords.reasoning', ''),
})

/** Réponse de POST /keywords/radar/generate (idées de mots-clés produites par l'IA). */
export const radarGenerateContract = defineContract<KeywordRadarGenerateResult>(
  'radar-generate',
  z.looseObject({
    articleTitle: text('articleTitle', ''),
    articleKeyword: text('articleKeyword', ''),
    painPoint: text('painPoint', ''),
    keywords: tolerantArray(radarKeywordSchema, 'keywords'),
    generatedAt: text('generatedAt', ''),
  }),
)

/** Réponse de GET /articles/:id/radar-exploration : `null` quand l'article n'a pas encore de scan. */
export const radarExplorationContract = defineContract<RadarExploration | null>(
  'radar-exploration',
  z
    .looseObject({
      articleId: z.number(),
      seed: text('seed', ''),
      context: withFallback(
        z.looseObject({
          broadKeyword: text('context.broadKeyword', ''),
          specificTopic: text('context.specificTopic', ''),
          painPoint: text('context.painPoint', ''),
          depth: count('context.depth'),
        }),
        { broadKeyword: '', specificTopic: '', painPoint: '', depth: 0 },
        'context',
      ),
      generatedKeywords: tolerantArray(radarKeywordSchema, 'generatedKeywords'),
      scanResult: radarScanResultSchema,
      scannedAt: text('scannedAt', ''),
    })
    .nullable(),
)

/**
 * Réponse de POST /articles/:id/radar-exploration/long-tail : suggestions de
 * l'IA déjà validées par `longTailSuggestionSchema` à la génération ; le
 * contrat garde les conformes (une suggestion abîmée en cache est écartée).
 */
interface LongTailSuggestionsResponseWithCache {
  suggestions: LongTailSuggestion[]
  fromCache: boolean
}

export const longTailSuggestionsContract = defineContract<LongTailSuggestionsResponseWithCache>(
  'long-tail-suggestions',
  z.looseObject({
    suggestions: tolerantArray(longTailSuggestionSchema, 'suggestions'),
    fromCache: withFallback(z.boolean(), false, 'fromCache'),
  }),
)
