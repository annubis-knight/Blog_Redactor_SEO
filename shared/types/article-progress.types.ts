import type { ArticleType } from './article.types.js'

export interface ArticleProgress {
  phase: 'proposed' | 'moteur' | 'redaction' | 'published'
  completedChecks: string[]
  checkTimestamps?: Record<string, string>  // { checkName: ISO timestamp }
}

export interface SemanticTerm {
  term: string
  source: 'competitor' | 'dataforseo' | 'autocomplete' | 'paa' | 'manual'
  occurrences: number
  targetCount: number
}

export interface SelectedArticle {
  id: number
  slug: string
  title: string
  keyword: string
  type: ArticleType
  locked: boolean
  source: 'proposed' | 'published'
  painPoint?: string
}
