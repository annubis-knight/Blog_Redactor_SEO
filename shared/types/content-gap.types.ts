// --- Content Gap Analysis (Epic 16) ---

export interface CompetitorContent {
  url: string
  title: string
  headings: string[]
  wordCount: number
  localEntities: string[]
  /** ISO date string of publication (extracted by Claude) */
  publishDate?: string
  /** Flesch-like readability score 0-100 */
  readabilityScore?: number
  /** PAA questions covered in the content */
  paasCovered?: string[]
}

export interface ThematicGap {
  theme: string
  frequency: number
  presentInArticle: boolean
}

export interface ContentGapAnalysis {
  keyword: string
  competitors: CompetitorContent[]
  themes: ThematicGap[]
  gaps: ThematicGap[]
  averageWordCount: number
  localEntitiesFromCompetitors: { entity: string; frequency: number }[]
  cachedAt: string
}
