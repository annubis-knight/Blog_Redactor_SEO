import type { ArticleType } from './article.types.js'

/** A single internal link between two articles */
export interface InternalLink {
  sourceSlug: string
  targetSlug: string
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
  targetSlug: string
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
  slug: string
  title: string
  cocoonName: string
  type: ArticleType
}

/** Cross-cocoon link opportunity */
export interface CrossCocoonOpportunity {
  sourceSlug: string
  sourceTitle: string
  sourceCocoon: string
  targetSlug: string
  targetTitle: string
  targetCocoon: string
  suggestedAnchor: string
}
