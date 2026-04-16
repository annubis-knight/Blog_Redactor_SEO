import type { ArticleType } from './article.types.js'

/** A single internal link between two articles */
export interface InternalLink {
  sourceId: number
  targetId: number
  anchorText: string
  position: string
}

/** Full linking matrix stored in data/links/linking-matrix.json */
export interface LinkingMatrix {
  links: InternalLink[]
  updatedAt: string | null
}

/** Link suggestion returned by POST /api/links/suggest */
export interface LinkSuggestion {
  targetId: number
  targetTitle: string
  targetType: ArticleType
  suggestedAnchor: string
  reason: string
}

/** Anchor diversity alert */
export interface AnchorDiversityAlert {
  anchorText: string
  count: number
  targets: string[]
}

/** Orphan article (no incoming links) */
export interface OrphanArticle {
  id: number
  slug: string
  title: string
  cocoonName: string
  type: ArticleType
}

/** Cross-cocoon link opportunity */
export interface CrossCocoonOpportunity {
  sourceId: number
  sourceTitle: string
  sourceCocoon: string
  targetId: number
  targetTitle: string
  targetCocoon: string
  suggestedAnchor: string
}
