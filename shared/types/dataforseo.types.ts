export interface SerpResult {
  position: number
  title: string
  url: string
  description: string
  domain: string
}

export interface PaaQuestion {
  question: string
  answer: string | null
}

export interface RelatedKeyword {
  keyword: string
  searchVolume: number
  competition: number
  cpc: number
}

export interface KeywordOverview {
  searchVolume: number
  difficulty: number
  cpc: number
  competition: number
  monthlySearches: number[]
  wordsCount?: number
  coreKeyword?: string
}

export interface DataForSeoCacheEntry {
  keyword: string
  serp: SerpResult[]
  paa: PaaQuestion[]
  relatedKeywords: RelatedKeyword[]
  keywordData: KeywordOverview
  cachedAt: string
}

import type { Article } from './article.types.js'
import type { Keyword } from './keyword.types.js'

export interface BriefData {
  article: Article & { cocoonName: string }
  keywords: Keyword[]
  dataForSeo: DataForSeoCacheEntry | null
  contentLengthRecommendation: number | null
}
