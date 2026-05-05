import type { KeywordType } from './keyword.types.js'
import type { KeywordCompositeScore } from './keyword-audit.types.js'

/**
 * A discovered keyword with full classification and metrics.
 *
 * Les 4 KPIs marché sont `number | null` (FR-INFRA-KPI-NULLABLE) — propagés
 * depuis KeywordOverview sans fallback `?? 0`.
 */
export interface ClassifiedKeyword {
  keyword: string
  type: KeywordType
  searchVolume: number | null
  difficulty: number | null
  cpc: number | null
  competition: number | null
  wordsCount: number
  intent?: string
  intentProbability?: number
  compositeScore: KeywordCompositeScore
  source: 'suggestions' | 'related' | 'ideas' | 'competitor'
  existsInCocoon?: boolean
}

/** Discovery response from seed keyword */
export interface KeywordDiscoveryResult {
  seed: string
  keywords: ClassifiedKeyword[]
  totalBeforeDedup: number
  totalAfterDedup: number
  apiCost: number
}

/** Discovery response from competitor domain */
export interface DomainDiscoveryResult {
  domain: string
  keywords: ClassifiedKeyword[]
  total: number
  apiCost: number
}
