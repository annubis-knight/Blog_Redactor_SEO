/**
 * Contrats d'affichage — famille « Découverte » (lot 6).
 *
 * Forme attendue par DiscoveryPanel (listes par source, groupes de mots,
 * filtre de pertinence), DiscoveryAnalysisResults (sélection IA et priorité)
 * et la recherche par site concurrent, après :
 *   - POST /keywords/suggest-all (Google Suggest, 4 stratégies) ;
 *   - POST /keywords/discover et /keywords/discover-from-site (DataForSEO) ;
 *   - POST /keywords/analyze-discovery (sélection IA) ;
 *   - POST /keywords/relevance-score (tri IA pertinent / hors sujet) ;
 *   - GET /discovery-cache/load (relecture du cache 30 jours) et /discovery-cache/check ;
 *   - POST /keywords/word-groups (groupes de mots, calcul local).
 *
 * KPI marché absents → `null` (« — »), jamais 0. Une priorité IA illisible
 * reste affichée comme « bonus » (vert), comme avant le contrat.
 *
 * AUTHORITY: DataForSEO Labs (suggestions, related, ideas, keywords_for_site),
 *            Google Suggest, PostgreSQL `keyword_discoveries` (cache)
 * READS FROM: POST /keywords/suggest-all, /keywords/discover, /keywords/discover-from-site,
 *             /keywords/analyze-discovery, /keywords/relevance-score, GET /discovery-cache/load
 * CONSUMERS: useDiscoveryPanel, useRelevanceScoring, useDiscoveryCache,
 *            keyword-discovery.store, DiscoveryAnalysisResults
 * RELATED FR: NFR-INT-DISPLAY-CONTRACTS, FR-INFRA-KPI-NULLABLE, FR-DIS-LONGTAIL-GENERATION
 */
import { z } from 'zod'
import { count, defineContract, kpiValue, oneOf, optionalObject, text, toKpiValue, tolerantArray, tolerantRecord, withFallback } from './core.js'
import type { ApiUsage } from '../types/api.types.js'
import type { DiscoveryCacheEntry, DiscoveryCacheStatus, DiscoveryContext } from '../types/discovery-cache.types.js'
import type {
  AnalysisResult,
  AnalyzeDiscoveryResponse,
  AnalyzedKeyword,
  DiscoveredKeyword,
  RelevanceScoreResponse,
  SuggestAllResult,
  SuggestStrategyResult,
  WordGroup,
} from '../types/discovery-tab.types.js'
import type { ClassifiedKeyword, DomainDiscoveryResult, KeywordDiscoveryResult } from '../types/keyword-discovery.types.js'
import type { KeywordCompositeScore } from '../types/keyword-audit.types.js'

const KEYWORD_TYPES = ['Pilier', 'Intermédiaire', 'Spécialisé', 'Moyenne traine', 'Longue traine'] as const
const CLASSIFIED_SOURCES = ['suggestions', 'related', 'ideas', 'competitor'] as const
const DISCOVERY_SOURCES = [
  'autocomplete', 'ai', 'dataforseo', 'suggest-alphabet', 'suggest-questions',
  'suggest-intents', 'suggest-prepositions', 'longtail-ai',
] as const
const PRIORITIES = ['high', 'medium', 'low'] as const

const nonBlank = z.string().refine(value => value.trim() !== '', 'texte vide')
const optionalString = (field: string) => withFallback(z.string().optional(), undefined, field)

/** KPI facultatif : non fourni → non fourni ; fourni mais illisible → absent (`null`). */
function optionalKpi(field: string) {
  return z.unknown().transform((value): number | null | undefined => (value === undefined ? undefined : toKpiValue(value, field)))
}

const usageSchema = withFallback(
  z.custom<ApiUsage>(value => typeof value === 'object' && value !== null && typeof (value as ApiUsage).model === 'string').optional(),
  undefined,
  'usage',
)

// ---------------------------------------------------------------------------
// Google Suggest
// ---------------------------------------------------------------------------

const suggestStrategySchema = (field: string): z.ZodType<SuggestStrategyResult, unknown> =>
  withFallback(
    z.looseObject({
      items: tolerantArray(z.looseObject({ query: nonBlank, source: text(`${field}.source`, '') }), `${field}.items`),
      count: count(`${field}.count`),
    }),
    { items: [], count: 0 },
    field,
  )

/** Réponse de POST /keywords/suggest-all : une suggestion vide est écartée, une stratégie absente devient vide. */
export const suggestAllContract = defineContract<SuggestAllResult>(
  'suggest-all',
  z.looseObject({
    alphabet: suggestStrategySchema('alphabet'),
    questions: suggestStrategySchema('questions'),
    intents: suggestStrategySchema('intents'),
    prepositions: suggestStrategySchema('prepositions'),
    totalUnique: count('totalUnique'),
  }),
)

// ---------------------------------------------------------------------------
// DataForSEO (graine ou site concurrent)
// ---------------------------------------------------------------------------

const EMPTY_COMPOSITE: KeywordCompositeScore = { volume: null, difficultyInverse: null, cpc: null, competitionInverse: null, total: null }

const compositeScoreSchema: z.ZodType<KeywordCompositeScore, unknown> = withFallback(
  z.looseObject({
    volume: kpiValue('compositeScore.volume'),
    difficultyInverse: kpiValue('compositeScore.difficultyInverse'),
    cpc: kpiValue('compositeScore.cpc'),
    competitionInverse: kpiValue('compositeScore.competitionInverse'),
    total: kpiValue('compositeScore.total'),
  }),
  EMPTY_COMPOSITE,
  'compositeScore',
)

const classifiedKeywordSchema: z.ZodType<ClassifiedKeyword, unknown> = z.looseObject({
  keyword: nonBlank,
  type: z.enum(KEYWORD_TYPES),
  searchVolume: kpiValue('keywords.searchVolume'),
  difficulty: kpiValue('keywords.difficulty'),
  cpc: kpiValue('keywords.cpc'),
  competition: kpiValue('keywords.competition'),
  wordsCount: count('keywords.wordsCount'),
  intent: optionalString('keywords.intent'),
  intentProbability: withFallback(z.number().optional(), undefined, 'keywords.intentProbability'),
  compositeScore: compositeScoreSchema,
  source: z.enum(CLASSIFIED_SOURCES),
  existsInCocoon: withFallback(z.boolean().optional(), undefined, 'keywords.existsInCocoon'),
})

/** Réponse de POST /keywords/discover. */
export const keywordDiscoveryContract = defineContract<KeywordDiscoveryResult>(
  'discover',
  z.looseObject({
    seed: text('seed', ''),
    keywords: tolerantArray(classifiedKeywordSchema, 'keywords'),
    totalBeforeDedup: count('totalBeforeDedup'),
    totalAfterDedup: count('totalAfterDedup'),
    apiCost: withFallback(z.number(), 0, 'apiCost'),
  }),
)

/** Réponse de POST /keywords/discover-from-site. */
export const domainDiscoveryContract = defineContract<DomainDiscoveryResult>(
  'discover-from-site',
  z.looseObject({
    domain: text('domain', ''),
    keywords: tolerantArray(classifiedKeywordSchema, 'keywords'),
    total: count('total'),
    apiCost: withFallback(z.number(), 0, 'apiCost'),
  }),
)

// ---------------------------------------------------------------------------
// IA : sélection et pertinence
// ---------------------------------------------------------------------------

const analyzedKeywordSchema: z.ZodType<AnalyzedKeyword, unknown> = z.looseObject({
  keyword: nonBlank,
  reasoning: text('analysis.reasoning', ''),
  // Illisible → « low » : l'écran l'affichait déjà en vert (bonus).
  priority: oneOf(PRIORITIES, 'low', 'analysis.priority'),
})

const analysisSchema: z.ZodType<AnalysisResult, unknown> = z.looseObject({
  keywords: tolerantArray(analyzedKeywordSchema, 'analysis.keywords'),
  summary: text('analysis.summary', ''),
})

/** Réponse de POST /keywords/analyze-discovery. */
export const discoveryAnalysisContract = defineContract<AnalyzeDiscoveryResponse>(
  'analyze-discovery',
  z.looseObject({
    keywords: tolerantArray(analyzedKeywordSchema, 'keywords'),
    summary: text('summary', ''),
    usage: usageSchema,
  }),
)

/** Réponse de POST /keywords/relevance-score : un score hors de 0-1 est écarté (mot-clé « non évalué »). */
export const relevanceScoreContract = defineContract<RelevanceScoreResponse>(
  'relevance-score',
  z.looseObject({
    scores: tolerantRecord(z.number().min(0).max(1), 'scores'),
    fallback: withFallback(z.boolean(), false, 'fallback'),
    usage: usageSchema,
  }),
)

// ---------------------------------------------------------------------------
// Cache de découverte relu en base
// ---------------------------------------------------------------------------

const discoveredKeywordSchema: z.ZodType<DiscoveredKeyword, unknown> = z.looseObject({
  keyword: nonBlank,
  source: z.enum(DISCOVERY_SOURCES),
  reasoning: optionalString('cache.reasoning'),
  sourceDetail: optionalString('cache.sourceDetail'),
  searchVolume: optionalKpi('cache.searchVolume'),
  difficulty: optionalKpi('cache.difficulty'),
  cpc: optionalKpi('cache.cpc'),
  intent: optionalString('cache.intent'),
  type: withFallback(z.enum(KEYWORD_TYPES).optional(), undefined, 'cache.type'),
})

const wordGroupSchema: z.ZodType<WordGroup, unknown> = z.looseObject({
  word: nonBlank,
  count: count('wordGroups.count'),
  normalized: text('wordGroups.normalized', ''),
})

/** Réponse de POST /keywords/word-groups (colonne « Groupes de mots »). */
export const wordGroupsContract = defineContract<{ groups: WordGroup[] }>(
  'word-groups',
  z.looseObject({ groups: tolerantArray(wordGroupSchema, 'groups') }),
)

/** Réponse de GET /discovery-cache/check (barre de cache : date, nombre de mots-clés). */
export const discoveryCacheStatusContract = defineContract<DiscoveryCacheStatus>(
  'discovery-cache-status',
  z.looseObject({
    cached: withFallback(z.boolean(), false, 'cached'),
    cachedAt: optionalString('cachedAt'),
    keywordCount: withFallback(z.number().int().min(0).optional(), undefined, 'keywordCount'),
    hasAnalysis: withFallback(z.boolean().optional(), undefined, 'hasAnalysis'),
  }),
)

const discoveryContextSchema: z.ZodType<DiscoveryContext, unknown> = z.looseObject({
  cocoonName: text('context.cocoonName', ''),
  cocoonTheme: optionalString('context.cocoonTheme'),
  articleTitle: optionalString('context.articleTitle'),
  articleKeyword: optionalString('context.articleKeyword'),
  articleType: withFallback(z.enum(['pilier', 'intermediaire', 'specifique']).optional(), undefined, 'context.articleType'),
  painPoint: optionalString('context.painPoint'),
  seedKeyword: text('context.seedKeyword', ''),
})

const keywordList = (field: string) => tolerantArray(discoveredKeywordSchema, field)

/** Réponse de GET /discovery-cache/load : `null` quand la graine n'a pas de cache. */
export const discoveryCacheEntryContract = defineContract<DiscoveryCacheEntry | null>(
  'discovery-cache',
  z
    .looseObject({
      seed: nonBlank,
      context: discoveryContextSchema,
      suggestAlphabet: keywordList('suggestAlphabet'),
      suggestQuestions: keywordList('suggestQuestions'),
      suggestIntents: keywordList('suggestIntents'),
      suggestPrepositions: keywordList('suggestPrepositions'),
      aiKeywords: keywordList('aiKeywords'),
      dataforseoKeywords: keywordList('dataforseoKeywords'),
      relevanceScores: tolerantRecord(z.number().min(0).max(1), 'relevanceScores'),
      wordGroups: tolerantArray(wordGroupSchema, 'wordGroups'),
      analysisResult: optionalObject(analysisSchema, 'analysisResult').transform(value => value ?? null),
      cachedAt: text('cachedAt', ''),
      expiresAt: text('expiresAt', ''),
    })
    .nullable(),
)
