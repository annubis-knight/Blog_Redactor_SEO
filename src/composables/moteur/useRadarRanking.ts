import { computed, type ComputedRef } from 'vue'
import type { RadarCard } from '@shared/types/intent.types'

/**
 * Sprint D-2 (2026-05-02) — Ranking local des RadarCard pour proposer
 * les meilleurs candidats Capitaine. **Aucun appel IA**. Cf. tech-spec §4.2,
 * décision D3.
 *
 * Logique :
 *   - filtre toute carte dont les DEUX verdicts (market + relevance) sont
 *     NOGO (sans potentiel à la fois marché et pertinence) ;
 *   - score final = (marketScore + relevanceScore) / 2.
 *
 * 2026-05-02 (cleanup pertinence) : fallback `combinedScore` retiré. Les
 * scores doivent venir explicitement du backend via marketScore /
 * relevanceScore. Si une donnée est absente, on traite la composante comme 0
 * (la card sera mécaniquement tirée vers le bas du ranking).
 *
 * Voir docs/scoring-kpi-vs-relevance.md.
 */
export interface RadarRankedCard {
  card: RadarCard
  keyword: string
  marketTotal: number
  relevanceTotal: number
  finalScore: number
}

export interface UseRadarRankingOptions {
  cards: ComputedRef<RadarCard[]>
  /** Top-N à retourner. Défaut : 5. */
  topN?: number
}

function isNogoBoth(card: RadarCard): boolean {
  const m = card.marketScore?.verdict
  const r = card.relevanceScore?.verdict
  // Si aucun n'est défini, on ne filtre pas (rétro-compat).
  if (!m && !r) return false
  const mNogo = !m || m === 'NOGO'
  const rNogo = !r || r === 'NOGO'
  return mNogo && rNogo
}

export function useRadarRanking(opts: UseRadarRankingOptions) {
  const topN = opts.topN ?? 5

  const ranked = computed<RadarRankedCard[]>(() => {
    const list = opts.cards.value
    if (list.length === 0) return []

    const enriched = list
      .filter(c => !isNogoBoth(c))
      .map<RadarRankedCard>((card) => {
        // 2026-05-02 — Plus de fallback combinedScore (legacy hybride).
        // Si un score est absent, la card est mécaniquement défavorisée.
        const marketTotal = card.marketScore?.total ?? 0
        const relevanceTotal = card.relevanceScore?.total ?? 0
        const finalScore = (marketTotal + relevanceTotal) / 2
        return { card, keyword: card.keyword, marketTotal, relevanceTotal, finalScore }
      })

    enriched.sort((a, b) => b.finalScore - a.finalScore)
    return enriched.slice(0, topN)
  })

  return { ranked }
}
