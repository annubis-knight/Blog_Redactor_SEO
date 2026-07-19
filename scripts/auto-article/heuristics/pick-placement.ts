/**
 * Heuristique PURE — présélection des emplacements candidats dans l'arbre SEO.
 *
 * Rôle : réduire l'arbre à 2-3 cocons plausibles, que l'IA tranchera ensuite en
 * justifiant (stratégie « hybride »).
 *
 * ⚠️ Correctif du biais *rich-get-richer* (2026-07-19, remonté par un run réel).
 * v1 mesurait l'affinité contre `nom + silo + TOUS les titres d'articles`. Un
 * cocon à 16 articles offrait des dizaines de tokens et raflait tout, tandis
 * qu'un cocon vide n'en avait que trois — **les cocons vides ne pouvaient
 * jamais gagner, donc l'arbre ne grandissait jamais là où l'utilisateur avait
 * prévu qu'il grandisse.** Le départage privilégiait en plus le cocon le plus
 * fourni, ce qui aggravait le phénomène.
 *
 * v2 :
 *   - l'affinité au **nom** du cocon (son identité) pèse 0,7 ; le contenu 0,3 ;
 *   - un cocon **vide dont le nom accroche** reçoit un bonus : le créer était
 *     une intention explicite de l'utilisateur, il attend sa fondation ;
 *   - plus aucun départage par densité.
 */

import { topicalAffinity } from '../text.js'
import {
  countByLevel,
  missingLevels,
  type ArticleLevel,
  type TreeCocoon,
  type TreeSilo,
} from '../tree.js'

export const NAME_WEIGHT = 0.7
export const CONTENT_WEIGHT = 0.3
/** Bonus d'un cocon vide *pertinent* — jamais accordé à un cocon hors-sujet. */
export const EMPTY_COCOON_BONUS = 0.15

export interface PlacementCandidate {
  siloName: string
  cocoonName: string
  /** Score composite 0-1 (nom pondéré + contenu + bonus cocon vide). */
  affinity: number
  /** Affinité au seul nom du cocon (+ silo) — l'identité du cocon. */
  nameAffinity: number
  /** Affinité aux titres déjà présents — 0 si le cocon est vide. */
  contentAffinity: number
  isEmpty: boolean
  counts: Record<ArticleLevel, number>
  missing: ArticleLevel[]
  /** Niveau conseillé par les trous du cocon (l'IA peut le corriger). */
  suggestedLevel: ArticleLevel
  sampleTitles: string[]
}

/**
 * Niveau conseillé par la forme du cocon :
 *   - pas de Pilier        → il manque la fondation
 *   - peu d'Intermédiaires → on étoffe le corps
 *   - sinon                → on creuse en Spécialisé
 */
export function suggestLevel(cocoon: TreeCocoon): ArticleLevel {
  const counts = countByLevel(cocoon)
  if (counts.pilier === 0) return 'pilier'
  if (counts.intermediaire < 3) return 'intermediaire'
  return 'specifique'
}

export function scoreCocoon(cocoon: TreeCocoon, idea: string): {
  affinity: number
  nameAffinity: number
  contentAffinity: number
} {
  // ⚠️ Sens de la mesure — les deux axes ne se mesurent PAS dans le même sens :
  //
  //  - **nom** : on veut « quelle part du NOM du cocon est couverte par l'idée ».
  //    L'inverse (part de l'idée couverte par le nom) est non discriminant : une
  //    idée de 20 mots face à un nom de 3 donne ~0,15 pour tous les cocons.
  //  - **contenu** : on veut « quelle part de l'IDÉE est couverte par le corpus
  //    de titres » — là, le corpus est vaste, la couverture est significative.
  const nameAffinity = topicalAffinity(cocoon.name, idea)
  const contentAffinity = cocoon.articles.length > 0
    ? topicalAffinity(idea, cocoon.articles.map((a) => a.title).join(' '))
    : 0

  let affinity = NAME_WEIGHT * nameAffinity + CONTENT_WEIGHT * contentAffinity
  if (cocoon.articles.length === 0 && nameAffinity > 0) {
    affinity += EMPTY_COCOON_BONUS
  }
  return { affinity, nameAffinity, contentAffinity }
}

export function preselectPlacements(
  tree: TreeSilo[],
  idea: string,
  limit = 3,
): PlacementCandidate[] {
  const candidates: PlacementCandidate[] = []

  for (const silo of tree) {
    for (const cocoon of silo.cocoons) {
      const scores = scoreCocoon(cocoon, idea)
      candidates.push({
        siloName: silo.name,
        cocoonName: cocoon.name,
        ...scores,
        isEmpty: cocoon.articles.length === 0,
        counts: countByLevel(cocoon),
        missing: missingLevels(cocoon),
        suggestedLevel: suggestLevel(cocoon),
        sampleTitles: cocoon.articles.slice(0, 5).map((a) => a.title),
      })
    }
  }

  return candidates
    .sort((a, b) => {
      if (b.affinity !== a.affinity) return b.affinity - a.affinity
      if (b.nameAffinity !== a.nameAffinity) return b.nameAffinity - a.nameAffinity
      // À égalité, on favorise la croissance de l'arbre plutôt que la densité.
      if (a.isEmpty !== b.isEmpty) return a.isEmpty ? -1 : 1
      return a.cocoonName.localeCompare(b.cocoonName)
    })
    .slice(0, limit)
}
