import type { KeywordAuditResult } from '@shared/types/index.js'
import type { ContentGapAnalysis } from '@shared/types/index.js'
import type { LocalNationalComparison } from '@shared/types/index.js'

export interface OpportunityScore {
  total: number
  keywordScore: number
  competitorWeakness: number
  localOpportunity: number
}

export function useOpportunityScore() {
  /**
   * Calculate opportunity score (0-100) from available data.
   * - 40% keyword composite average
   * - 30% competitor weakness (inverse of readability, freshness penalty)
   * - 30% local opportunity (from local/national comparison)
   */
  function calculate(
    auditResults?: KeywordAuditResult[],
    contentGap?: ContentGapAnalysis | null,
    localComparison?: LocalNationalComparison | null,
  ): OpportunityScore {
    // Keyword score: average composite from audit (0-100)
    let keywordScore = 50 // default if no audit
    if (auditResults && auditResults.length > 0) {
      keywordScore = Math.round(
        auditResults.reduce((sum, r) => sum + r.compositeScore.total, 0) / auditResults.length,
      )
    }

    // Competitor weakness (0-100): higher = weaker competitors
    let competitorWeakness = 50 // default
    if (contentGap && contentGap.competitors.length > 0) {
      const comps = contentGap.competitors
      // Factor 1: gaps found = more opportunity
      const gapRatio = contentGap.gaps.length / Math.max(contentGap.themes.length, 1)
      // Factor 2: low average word count = weak content
      const avgWords = contentGap.averageWordCount
      const wordWeakness = avgWords < 1000 ? 80 : avgWords < 1500 ? 60 : avgWords < 2000 ? 40 : 20
      // Factor 3: readability scores if available
      const readScores = comps
        .filter((c: any) => c.readabilityScore != null)
        .map((c: any) => c.readabilityScore as number)
      const avgReadability = readScores.length > 0
        ? readScores.reduce((s: number, v: number) => s + v, 0) / readScores.length
        : 50
      // Lower competitor readability = weaker content = more opportunity
      const readabilityWeakness = Math.max(0, Math.min(100, 100 - avgReadability))

      competitorWeakness = Math.round(
        gapRatio * 100 * 0.4 + wordWeakness * 0.3 + readabilityWeakness * 0.3,
      )
    }

    // Local opportunity (0-100)
    let localOpportunity = 50 // default
    if (localComparison) {
      const idx = localComparison.opportunityIndex ?? 0
      // Normalize opportunity index (typically 0-200 range) to 0-100
      localOpportunity = Math.min(100, Math.round(idx / 2))
    }

    const total = Math.round(
      keywordScore * 0.4 + competitorWeakness * 0.3 + localOpportunity * 0.3,
    )

    return { total, keywordScore, competitorWeakness, localOpportunity }
  }

  function getScoreColor(score: number): string {
    if (score >= 70) return '#16a34a'
    if (score >= 50) return '#d97706'
    if (score >= 30) return '#ea580c'
    return '#dc2626'
  }

  function getScoreLabel(score: number): string {
    if (score >= 70) return 'Forte'
    if (score >= 50) return 'Moyenne'
    if (score >= 30) return 'Faible'
    return 'Très faible'
  }

  return { calculate, getScoreColor, getScoreLabel }
}
