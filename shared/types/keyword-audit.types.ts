import type { KeywordType, KeywordStatus } from './keyword.types.js'
import type { RelatedKeyword, KeywordOverview } from './dataforseo.types.js'

/** Composite score for a single keyword (0-100) */
export interface KeywordCompositeScore {
  volume: number
  difficultyInverse: number
  cpc: number
  competitionInverse: number
  total: number
}

/** Audit result for a single keyword */
export interface KeywordAuditResult {
  keyword: string
  type: KeywordType
  status: KeywordStatus
  cocoonName: string
  searchVolume: number
  difficulty: number
  cpc: number
  competition: number
  wordsCount?: number
  intent?: string
  intentProbability?: number
  compositeScore: KeywordCompositeScore
  relatedKeywords: RelatedKeyword[]
  fromCache: boolean
  cachedAt: string | null
  alerts: KeywordAlert[]
}

/** Alert for a keyword issue */
export interface KeywordAlert {
  level: 'danger' | 'warning' | 'info'
  type: 'zero_volume' | 'low_volume' | 'high_difficulty' | 'redundant'
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
