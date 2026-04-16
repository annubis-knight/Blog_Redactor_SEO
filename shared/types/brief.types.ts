import type { Article } from './article.types.js'
import type { Keyword } from './keyword.types.js'
import type { DataForSeoCacheEntry } from './dataforseo.types.js'

/**
 * Aggregated brief assembled on the front before article generation.
 * Lives outside dataforseo.types.ts to avoid a circular dependency
 * (keyword → serp-analysis → dataforseo → keyword).
 */
export interface BriefData {
  article: Article & { cocoonName: string }
  keywords: Keyword[]
  dataForSeo: DataForSeoCacheEntry | null
  contentLengthRecommendation: number | null
}
