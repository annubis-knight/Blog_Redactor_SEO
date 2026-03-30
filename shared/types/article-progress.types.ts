import type { ArticleType } from './article.types.js'

export interface ArticleProgress {
  phase: 'proposed' | 'moteur' | 'redaction' | 'published'
  completedChecks: string[]
}

export interface SemanticTerm {
  term: string
  source: 'competitor' | 'dataforseo' | 'autocomplete' | 'paa' | 'manual'
  occurrences: number
  targetCount: number
}

export interface SelectedArticle {
  slug: string
  title: string
  keyword: string
  type: ArticleType
  locked: boolean
  source: 'proposed' | 'published'
  painPoint?: string
}
