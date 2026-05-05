import type { KeywordType, KeywordStatus } from './keyword.types.js'
import type { RelatedKeyword } from './dataforseo.types.js'

/**
 * Composite score for a single keyword (0-100).
 *
 * Composantes nullables (FR-INFRA-KPI-SCORING-NULLSAFE) : une composante
 * `null` signifie que le KPI source était absent (pas de signal DataForSEO),
 * pas qu'il valait 0. Le total est `null` quand toutes les composantes
 * effectives sont absentes — sinon il est renormalisé sur celles disponibles.
 */
export interface KeywordCompositeScore {
  volume: number | null
  difficultyInverse: number | null
  cpc: number | null
  competitionInverse: number | null
  total: number | null
}

/** Audit result for a single keyword */
export interface KeywordAuditResult {
  keyword: string
  type: KeywordType
  status: KeywordStatus
  cocoonName: string
  searchVolume: number | null
  difficulty: number | null
  cpc: number | null
  competition: number | null
  wordsCount?: number
  intent?: string
  intentProbability?: number
  compositeScore: KeywordCompositeScore
  relatedKeywords: RelatedKeyword[]
  fromCache: boolean
  cachedAt: string | null
  alerts: KeywordAlert[]
}

/**
 * Alert for a keyword issue.
 * `missing_metrics` (level `info`) signale l'absence de KPIs (DataForSEO sans
 * signal). C'est différent de `zero_volume` (level `danger`) qui signale un
 * vrai zéro mesuré. Voir FR-INFRA-KPI-SCORING-NULLSAFE AC5.
 */
export interface KeywordAlert {
  level: 'danger' | 'warning' | 'info'
  type: 'zero_volume' | 'low_volume' | 'high_difficulty' | 'redundant' | 'missing_metrics'
  message: string
  relatedKeyword?: string
}

/** Redundancy detection result */
export interface RedundancyPair {
  keyword1: string
  keyword2: string
  overlapPercent: number
  sharedRelatedKeywords: string[]
}

/** Aggregated score for a keyword type (Pilier/Moyenne/Longue) */
export interface TypeScore {
  type: KeywordType
  averageScore: number
  keywordCount: number
  alertCount: number
}

/** Cache status for a cocoon audit */
export interface AuditCacheStatus {
  cocoonName: string
  totalKeywords: number
  cachedKeywords: number
  lastAuditDate: string | null
}

/** Suggestion for a better alternative keyword */
export interface KeywordSuggestion {
  currentKeyword: string
  suggested: RelatedKeyword & { compositeScore: number }
  scoreDelta: number
}
