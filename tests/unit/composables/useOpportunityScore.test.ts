import { describe, it, expect } from 'vitest'
import { useOpportunityScore } from '../../../src/composables/useOpportunityScore'
import type {
  KeywordAuditResult,
  ContentGapAnalysis,
  LocalNationalComparison,
} from '../../../shared/types/index'

function makeKw(overrides: Partial<KeywordAuditResult> = {}): KeywordAuditResult {
  return {
    keyword: 'test',
    type: 'Pilier',
    status: 'suggested',
    cocoonName: 'Test',
    searchVolume: 100,
    difficulty: 30,
    cpc: 1.5,
    competition: 0.3,
    compositeScore: { volume: 50, difficultyInverse: 70, cpc: 40, competitionInverse: 70, total: 57 },
    relatedKeywords: [],
    fromCache: false,
    cachedAt: null,
    alerts: [],
    ...overrides,
  }
}

function makeContentGap(overrides: Partial<ContentGapAnalysis> = {}): ContentGapAnalysis {
  return {
    keyword: 'test',
    competitors: [
      { url: 'https://a.com', title: 'A', headings: [], wordCount: 1200, localEntities: [] },
      { url: 'https://b.com', title: 'B', headings: [], wordCount: 800, localEntities: [] },
    ],
    themes: [
      { theme: 'theme1', frequency: 3, presentInArticle: true },
      { theme: 'theme2', frequency: 4, presentInArticle: false },
      { theme: 'theme3', frequency: 2, presentInArticle: false },
    ],
    gaps: [
      { theme: 'theme2', frequency: 4, presentInArticle: false },
    ],
    averageWordCount: 1000,
    localEntitiesFromCompetitors: [],
    cachedAt: new Date().toISOString(),
    ...overrides,
  }
}

function makeLocalComparison(overrides: Partial<LocalNationalComparison> = {}): LocalNationalComparison {
  return {
    keyword: 'test',
    local: { searchVolume: 200, keywordDifficulty: 20, cpc: 2, competition: 0.3, monthlySearches: [] },
    national: { searchVolume: 5000, keywordDifficulty: 60, cpc: 3, competition: 0.6, monthlySearches: [] },
    opportunityIndex: 120,
    alert: { keyword: 'test', index: 120, message: 'Opportunité locale', type: 'opportunity' },
    cachedAt: new Date().toISOString(),
    ...overrides,
  }
}

describe('useOpportunityScore', () => {
  const { calculate, getScoreColor, getScoreLabel } = useOpportunityScore()

  describe('calculate', () => {
    it('returns default 50 for all dimensions when no data provided', () => {
      const score = calculate()
      expect(score.keywordScore).toBe(50)
      expect(score.competitorWeakness).toBe(50)
      expect(score.localOpportunity).toBe(50)
      expect(score.total).toBe(50) // 50*0.4 + 50*0.3 + 50*0.3 = 50
    })

    it('uses keyword composite average from audit results', () => {
      const results = [
        makeKw({ compositeScore: { volume: 50, difficultyInverse: 70, cpc: 40, competitionInverse: 70, total: 80 } }),
        makeKw({ compositeScore: { volume: 50, difficultyInverse: 70, cpc: 40, competitionInverse: 70, total: 60 } }),
      ]
      const score = calculate(results)
      expect(score.keywordScore).toBe(70) // (80+60)/2
    })

    it('calculates competitor weakness from content gap', () => {
      const gap = makeContentGap({
        averageWordCount: 800,
        themes: [
          { theme: 'a', frequency: 3, presentInArticle: true },
          { theme: 'b', frequency: 3, presentInArticle: false },
        ],
        gaps: [{ theme: 'b', frequency: 3, presentInArticle: false }],
      })
      const score = calculate(undefined, gap)
      expect(score.competitorWeakness).toBeGreaterThan(50) // Weak competitors
    })

    it('calculates local opportunity from comparison', () => {
      const comp = makeLocalComparison({ opportunityIndex: 160 })
      const score = calculate(undefined, undefined, comp)
      expect(score.localOpportunity).toBe(80) // 160/2 = 80
    })

    it('caps local opportunity at 100', () => {
      const comp = makeLocalComparison({ opportunityIndex: 300 })
      const score = calculate(undefined, undefined, comp)
      expect(score.localOpportunity).toBe(100) // min(100, 300/2) = 100
    })

    it('total is weighted sum of all three dimensions', () => {
      const results = [
        makeKw({ compositeScore: { volume: 50, difficultyInverse: 70, cpc: 40, competitionInverse: 70, total: 100 } }),
      ]
      const gap = makeContentGap({ averageWordCount: 500, gaps: [], themes: [] })
      const comp = makeLocalComparison({ opportunityIndex: 200 })

      const score = calculate(results, gap, comp)
      // keywordScore=100, localOpportunity=100
      // competitorWeakness depends on formula — let's just verify total
      const expectedTotal = Math.round(score.keywordScore * 0.4 + score.competitorWeakness * 0.3 + score.localOpportunity * 0.3)
      expect(score.total).toBe(expectedTotal)
    })

    it('handles empty audit results array', () => {
      const score = calculate([])
      expect(score.keywordScore).toBe(50) // default when empty
    })

    it('handles content gap with no competitors', () => {
      const gap = makeContentGap({ competitors: [] })
      const score = calculate(undefined, gap)
      expect(score.competitorWeakness).toBe(50) // default
    })

    it('factors in readability scores when available', () => {
      const gapLowReadability = makeContentGap({
        competitors: [
          { url: 'https://a.com', title: 'A', headings: [], wordCount: 1200, localEntities: [], readabilityScore: 20 },
          { url: 'https://b.com', title: 'B', headings: [], wordCount: 1200, localEntities: [], readabilityScore: 30 },
        ],
      })
      const gapHighReadability = makeContentGap({
        competitors: [
          { url: 'https://a.com', title: 'A', headings: [], wordCount: 1200, localEntities: [], readabilityScore: 90 },
          { url: 'https://b.com', title: 'B', headings: [], wordCount: 1200, localEntities: [], readabilityScore: 85 },
        ],
      })
      const scoreLow = calculate(undefined, gapLowReadability)
      const scoreHigh = calculate(undefined, gapHighReadability)
      // Low readability competitors = weaker = higher opportunity
      expect(scoreLow.competitorWeakness).toBeGreaterThan(scoreHigh.competitorWeakness)
    })
  })

  describe('getScoreColor', () => {
    it('returns green for >= 70', () => {
      expect(getScoreColor(70)).toBe('#16a34a')
      expect(getScoreColor(100)).toBe('#16a34a')
    })

    it('returns amber for >= 50', () => {
      expect(getScoreColor(50)).toBe('#d97706')
      expect(getScoreColor(69)).toBe('#d97706')
    })

    it('returns orange for >= 30', () => {
      expect(getScoreColor(30)).toBe('#ea580c')
      expect(getScoreColor(49)).toBe('#ea580c')
    })

    it('returns red for < 30', () => {
      expect(getScoreColor(0)).toBe('#dc2626')
      expect(getScoreColor(29)).toBe('#dc2626')
    })
  })

  describe('getScoreLabel', () => {
    it('returns correct labels for score ranges', () => {
      expect(getScoreLabel(70)).toBe('Forte')
      expect(getScoreLabel(50)).toBe('Moyenne')
      expect(getScoreLabel(30)).toBe('Faible')
      expect(getScoreLabel(10)).toBe('Très faible')
    })
  })
})
