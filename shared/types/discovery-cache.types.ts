import type { DiscoveredKeyword, WordGroup } from './discovery-tab.types.js'

export interface DiscoveryContext {
  cocoonName: string
  cocoonTheme?: string
  articleTitle?: string
  articleKeyword?: string
  articleType?: 'Pilier' | 'Intermédiaire' | 'Spécialisé'
  painPoint?: string
  seedKeyword: string
}

export interface CachedAnalyzedKeyword {
  keyword: string
  reasoning: string
  priority: 'high' | 'medium' | 'low'
}

export interface DiscoveryCacheEntry {
  seed: string
  context: DiscoveryContext
  suggestAlphabet: DiscoveredKeyword[]
  suggestQuestions: DiscoveredKeyword[]
  suggestIntents: DiscoveredKeyword[]
  suggestPrepositions: DiscoveredKeyword[]
  aiKeywords: DiscoveredKeyword[]
  dataforseoKeywords: DiscoveredKeyword[]
  relevanceScores: Record<string, number>
  wordGroups: WordGroup[]
  analysisResult: { keywords: CachedAnalyzedKeyword[]; summary: string } | null
  cachedAt: string
  expiresAt: string
}

export interface DiscoveryCacheStatus {
  cached: boolean
  cachedAt?: string
  keywordCount?: number
  hasAnalysis?: boolean
}
