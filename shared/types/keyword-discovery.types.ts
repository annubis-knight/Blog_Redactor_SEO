import type { KeywordType } from './keyword.types.js'
import type { KeywordCompositeScore } from './keyword-audit.types.js'

/** A discovered keyword with full classification and metrics */
export interface ClassifiedKeyword {
  keyword: string
  type: KeywordType
  searchVolume: number
  difficulty: number
  cpc: number
  competition: number
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
