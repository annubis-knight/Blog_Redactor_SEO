import type { CaptainScanEntry, RichLieutenant } from './keyword.types.js'
import type { RadarExploration } from './intent.types.js'
import type { LexiqueExploration } from './serp-analysis.types.js'

/** Analyse relue pour le Capitaine et pour tous les mots-clés de l'article. */
export interface ExplorationGroup<T = unknown> {
  capitaine: T | null
  all: unknown[]
}

/** Analyse locale relue en base (Local Pack, avis, comparaison). */
export interface LocalExplorationSnapshot {
  hasLocalPack?: boolean
  listings?: unknown[]
  reviewGap?: unknown
  comparison?: unknown
}

/** Réponse de GET /articles/:id/explorations : tout ce que l'article a déjà exploré, relu en base. */
export interface ArticleExplorations {
  capitaineKeyword: string | null
  radar: RadarExploration | null
  captain: CaptainScanEntry[]
  lieutenants: RichLieutenant[]
  intent: ExplorationGroup
  local: ExplorationGroup<LocalExplorationSnapshot>
  contentGap: ExplorationGroup
  lexique: LexiqueExploration[]
}
