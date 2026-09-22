import { computed, type ComputedRef } from 'vue'
import type { RadarCard } from '@shared/types/intent.types'
import { averageScores, compareScores } from '@shared/score/index.js'

/**
 * Ranking local RadarCard proposer Capitaine (pas IA). Filtre NOGO × 2.
 * Score final = (market + relevance) / 2. Pas de fallback combinedScore.
 * Voir docs/scoring-kpi-vs-relevance.md.
 */
export interface RadarRankedCard {
  card: RadarCard
  keyword: string
  /** `null` = score absent (affiché « — »), jamais 0. */
  marketTotal: number | null
  relevanceTotal: number | null
  /** true si marketScore réellement présent (RadarAiPanel affiche "—" vs "0"). */
  marketTotalAvailable: boolean
  /** true si relevanceScore présent. */
  relevanceTotalAvailable: boolean
  /** Moyenne des scores disponibles ; `null` si aucun (carte en bas du classement). */
  finalScore: number | null
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
        // Pas de fallback combinedScore. Moyenne sur les seuls scores disponibles
        // (FR-INFRA-KPI-CONSISTENCY) : un score absent n'est plus compté comme 0.
        const marketTotal = card.marketScore?.total ?? null
        const relevanceTotal = card.relevanceScore?.total ?? null
        const marketTotalAvailable = marketTotal !== null
        const relevanceTotalAvailable = relevanceTotal !== null
        const finalScore = averageScores([marketTotal, relevanceTotal])
        return {
          card, keyword: card.keyword,
          marketTotal, relevanceTotal,
          marketTotalAvailable, relevanceTotalAvailable,
          finalScore,
        }
      })

    enriched.sort((a, b) => compareScores(a.finalScore, b.finalScore))
    return enriched.slice(0, topN)
  })

  return { ranked }
}
