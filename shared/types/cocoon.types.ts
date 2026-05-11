import type { Article } from './article.types.js'

/** Statistics breakdown by count */
export interface CountByType {
  pilier: number
  intermediaire: number
  specialise: number
}

export interface CountByStatus {
  aRediger: number
  brouillon: number
  publie: number
}

/** Cocoon statistics */
export interface CocoonStats {
  totalArticles: number
  byType: CountByType
  byStatus: CountByStatus
  completionPercent: number
}

/** Cocoon with articles and stats for API responses */
export interface Cocoon {
  id: number
  name: string
  siloName: string
  articles: Article[]
  /**
   * FR-MOT-RECAP-PUBLISHED — sous-ensemble de `articles` filtré sur
   * `phase IN ('redaction', 'published')`. Dérivé côté backend dans
   * `loadArticlesDb`. Consommé par la section récap "Articles publiés" du
   * `MoteurContextRecap` via `MoteurView`. Ne pas confondre avec les articles
   * suggérés (qui vivent dans `strategyStore.proposedArticles`, hors payload Cocoon).
   */
  publishedArticles: Article[]
  stats: CocoonStats
}
