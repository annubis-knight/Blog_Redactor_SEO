import type { ArticleType } from './article.types.js'

export interface ArticleProgress {
  phase: 'proposed' | 'moteur' | 'redaction' | 'published'
  completedChecks: string[]
  checkTimestamps?: Record<string, string>  // { checkName: ISO timestamp }
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
