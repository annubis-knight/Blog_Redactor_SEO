import { computed } from 'vue'
import { useKeywordAuditStore } from '@/stores/keyword/keyword-audit.store'
import type { KeywordAuditResult, KeywordSuggestion } from '@shared/types/index.js'
import { KEYWORD_SCORE_WEIGHTS } from '@shared/constants/seo.constants.js'

/** Compute composite score for a related keyword (same formula as backend) */
function computeRelatedScore(searchVolume: number, competition: number, cpc: number): number {
  const volumeNorm = searchVolume > 0
    ? Math.min(100, (Math.log10(searchVolume) / Math.log10(10000)) * 100)
    : 0
  // For related keywords, we don't have difficulty, assume medium (50)
  const difficultyInverse = 50
  const cpcNorm = cpc > 0
    ? Math.min(100, (Math.log10(cpc + 1) / Math.log10(6)) * 100)
    : 0
  const competitionInverse = 100 - Math.min(100, competition * 100)

  return Math.round(
    volumeNorm * KEYWORD_SCORE_WEIGHTS.volume +
    difficultyInverse * KEYWORD_SCORE_WEIGHTS.difficultyInverse +
    cpcNorm * KEYWORD_SCORE_WEIGHTS.cpc +
    competitionInverse * KEYWORD_SCORE_WEIGHTS.competitionInverse
  )
}

export function useKeywordScoring() {
  const store = useKeywordAuditStore()

  const suggestions = computed<KeywordSuggestion[]>(() => {
    const result: KeywordSuggestion[] = []
    for (const kw of store.results) {
      const currentScore = kw.compositeScore.total
      const betterAlternatives = kw.relatedKeywords
        .map(rk => ({
          ...rk,
          compositeScore: computeRelatedScore(rk.searchVolume, rk.competition, rk.cpc),
        }))
        .filter(rk => rk.compositeScore > currentScore)
        .sort((a, b) => b.compositeScore - a.compositeScore)
        .slice(0, 3)

      for (const alt of betterAlternatives) {
        result.push({
          currentKeyword: kw.keyword,
          suggested: alt,
          scoreDelta: alt.compositeScore - currentScore,
        })
      }
    }
    return result
  })

  function getSuggestionsForKeyword(keyword: string): KeywordSuggestion[] {
    return suggestions.value.filter(s => s.currentKeyword === keyword)
  }

  function getScoreColor(score: number): string {
    if (score >= 70) return 'var(--color-success)'
    if (score >= 40) return 'var(--color-warning)'
    return 'var(--color-danger)'
  }

  function getScoreLabel(score: number): string {
    if (score >= 70) return 'Bon'
    if (score >= 40) return 'Moyen'
    return 'Faible'
  }

  return {
    suggestions,
    getSuggestionsForKeyword,
    getScoreColor,
    getScoreLabel,
  }
}
