import type { ArticleLevel } from './keyword-validate.types.js'

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
  type: ArticleLevel
  locked: boolean
  source: 'proposed' | 'published'
  painPoint?: string
}
