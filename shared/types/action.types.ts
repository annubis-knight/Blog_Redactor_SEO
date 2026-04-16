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
  | 'sources-chiffrees'
  | 'exemples-reels'
  | 'ce-quil-faut-retenir'

export interface ActionContext {
  articleId: number
  keyword?: string
  keywords?: string[]
}
