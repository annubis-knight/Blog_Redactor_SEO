import type { RadarKeyword } from './intent.types.js'
import type { KeywordType } from './keyword.types.js'

export type DiscoverySource =
  | 'autocomplete'
  | 'ai'
  | 'dataforseo'
  | 'suggest-alphabet'
  | 'suggest-questions'
  | 'suggest-intents'
  | 'suggest-prepositions'

export interface DiscoveredKeyword {
  keyword: string
  source: DiscoverySource
  reasoning?: string
  sourceDetail?: string // e.g. "question:comment", "intent:prix", "alphabet:a"
  searchVolume?: number
  difficulty?: number
  cpc?: number
  intent?: string
  type?: KeywordType
}

export interface WordGroup {
  word: string
  count: number
  normalized: string
}

export interface SuggestStrategyResult {
  items: Array<{ query: string; source: string }>
  count: number
}

export interface SuggestAllResult {
  alphabet: SuggestStrategyResult
  questions: SuggestStrategyResult
  intents: SuggestStrategyResult
  prepositions: SuggestStrategyResult
  totalUnique: number
}

export interface AnalyzedKeyword {
  keyword: string
  reasoning: string
  priority: 'high' | 'medium' | 'low'
}

export interface AnalysisResult {
  keywords: AnalyzedKeyword[]
  summary: string
}

/** Convert checked DiscoveredKeywords to RadarKeyword[] for DouleurIntentScanner */
export function toRadarKeywords(keywords: DiscoveredKeyword[]): RadarKeyword[] {
  const seen = new Set<string>()
  const result: RadarKeyword[] = []
  for (const k of keywords) {
    const key = k.keyword.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push({
      keyword: k.keyword,
      reasoning: k.reasoning ?? `Discovered via ${k.source}`,
    })
  }
  return result
}
