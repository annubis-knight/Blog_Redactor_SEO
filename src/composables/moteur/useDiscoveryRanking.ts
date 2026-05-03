import { computed, type ComputedRef } from 'vue'
import { jaccardWithPainPoint } from '@/utils/pain-point-jaccard'
import type { BasketKeyword } from '@/stores/article/moteur-basket.store'

/**
 * Sprint D-1 (2026-05-02) — Ranking local du basket Discovery.
 *
 * Aucun appel IA. Pas de mutation du store. Pure transformation `basket →
 * top-N candidats à pousser vers Radar`. Combine deux signaux :
 *
 *   - **signalScore** ∈ [0, 1] : densité du basket (score brut normalisé).
 *     Reflète à quel point le mot-clé apparaît dans plusieurs sources
 *     (alphabet/questions/intentions/prépositions/IA/DataForSEO).
 *
 *   - **painAlignment** ∈ [0, 1] : Jaccard avec le `painPoint` de l'article.
 *     Reflète à quel point le mot-clé adresse la douleur cible.
 *
 * Le **finalScore** mixe les deux à 50/50, avec un bonus Jaccard pour valoriser
 * les mots-clés très alignés (cf. justification SEO §4.1 tech-spec).
 */
export interface DiscoveryRankedKeyword {
  keyword: string
  source: BasketKeyword['source']
  signalScore: number
  painAlignment: number
  finalScore: number
  reason: string
}

export interface UseDiscoveryRankingOptions {
  basket: ComputedRef<BasketKeyword[]>
  painPoint: ComputedRef<string | null | undefined>
  /** Top-N à retourner. Défaut : 10. */
  topN?: number
}

export function useDiscoveryRanking(opts: UseDiscoveryRankingOptions) {
  const topN = opts.topN ?? 10

  const ranked = computed<DiscoveryRankedKeyword[]>(() => {
    const list = opts.basket.value
    if (list.length === 0) return []

    // Normalise le score brut (basket.score est en 0-100 environ).
    // `?? 0` ici = calcul intermédiaire (normalisation max), pas un fallback d'affichage.
    // eslint-disable-next-line no-restricted-syntax -- normalisation, pas affichage
    const maxRaw = list.reduce((m, k) => Math.max(m, k.score ?? 0), 0)
    const safeMax = maxRaw > 0 ? maxRaw : 1

    const scored: DiscoveryRankedKeyword[] = list.map((kw) => {
      // eslint-disable-next-line no-restricted-syntax -- normalisation, pas affichage
      const signalScore = (kw.score ?? 0) / safeMax
      const painAlignment = jaccardWithPainPoint(kw.keyword, opts.painPoint.value)
      // Mix 50/50 + bonus Jaccard quadratique pour rendre la douleur
      // décisive quand elle est élevée.
      const finalScore = 0.5 * signalScore + 0.5 * painAlignment + 0.3 * painAlignment * painAlignment
      return {
        keyword: kw.keyword,
        source: kw.source,
        signalScore,
        painAlignment,
        finalScore,
        reason: explain(signalScore, painAlignment),
      }
    })

    scored.sort((a, b) => b.finalScore - a.finalScore)
    return scored.slice(0, topN)
  })

  return { ranked }
}

function explain(signal: number, pain: number): string {
  if (pain >= 0.4) return 'Aligné douleur (Jaccard fort)'
  if (signal >= 0.7) return 'Signal fort dans le basket'
  if (pain > 0 && signal >= 0.4) return 'Compromis signal × douleur'
  return 'Présent dans le basket'
}
