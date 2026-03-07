export type ActionType =
  | 'reformulate'
  | 'simplify'
  | 'convert-list'
  | 'pme-example'
  | 'keyword-optimize'
  | 'add-statistic'
  | 'answer-capsule'
  | 'question-heading'
  | 'internal-link'

export interface ActionContext {
  articleSlug: string
  keyword?: string
  keywords?: string[]
}
