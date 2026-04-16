import { describe, it, expect } from 'vitest'
import { usePainVerdict } from '../../../src/composables/intent/usePainVerdict'
import type { KeywordAuditResult } from '../../../shared/types/index'

function makeKw(overrides: Partial<KeywordAuditResult> = {}): KeywordAuditResult {
  return {
    keyword: 'test keyword',
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

describe('usePainVerdict', () => {
  const { getVerdict, getVerdictInfo, getVerdictSummary } = usePainVerdict()

  describe('getVerdict', () => {
    it('returns "brulante" for high volume + high CPC', () => {
      const kw = makeKw({ searchVolume: 500, cpc: 5 })
      expect(getVerdict(kw)).toBe('brulante')
    })

    it('returns "brulante" at boundary (vol=201, cpc=3.01)', () => {
      const kw = makeKw({ searchVolume: 201, cpc: 3.01 })
      expect(getVerdict(kw)).toBe('brulante')
    })

    it('returns "froide" for zero volume + zero CPC', () => {
      const kw = makeKw({ searchVolume: 0, cpc: 0 })
      expect(getVerdict(kw)).toBe('froide')
    })

    it('returns "emergente" for low volume + many related keywords', () => {
      const related = Array.from({ length: 6 }, (_, i) => ({
        keyword: `related-${i}`,
        searchVolume: 10,
        cpc: 0.5,
        competition: 0.1,
      }))
      const kw = makeKw({ searchVolume: 50, relatedKeywords: related })
      expect(getVerdict(kw)).toBe('emergente')
    })

    it('returns "neutre" for moderate metrics without triggers', () => {
      const kw = makeKw({ searchVolume: 100, cpc: 1.5 })
      expect(getVerdict(kw)).toBe('neutre')
    })

    it('returns "neutre" when volume is high but CPC is low (not brulante)', () => {
      const kw = makeKw({ searchVolume: 500, cpc: 1 })
      expect(getVerdict(kw)).toBe('neutre')
    })

    it('returns "froide" over "emergente" when volume=0 and cpc=0 even with related kws', () => {
      const related = Array.from({ length: 10 }, (_, i) => ({
        keyword: `related-${i}`,
        searchVolume: 10,
        cpc: 0.5,
        competition: 0.1,
      }))
      const kw = makeKw({ searchVolume: 0, cpc: 0, relatedKeywords: related })
      // froide check comes before emergente
      expect(getVerdict(kw)).toBe('froide')
    })

    it('returns "brulante" over "emergente" when both conditions met', () => {
      const related = Array.from({ length: 10 }, (_, i) => ({
        keyword: `related-${i}`,
        searchVolume: 10,
        cpc: 0.5,
        competition: 0.1,
      }))
      // vol>200, cpc>3, AND many related kws — brulante wins (checked first)
      const kw = makeKw({ searchVolume: 300, cpc: 5, relatedKeywords: related })
      expect(getVerdict(kw)).toBe('brulante')
    })

    it('returns "neutre" for exactly vol=200, cpc=3 (boundary not included)', () => {
      const kw = makeKw({ searchVolume: 200, cpc: 3 })
      expect(getVerdict(kw)).toBe('neutre')
    })
  })

  describe('getVerdictInfo', () => {
    it('returns correct label and colors for brulante', () => {
      const kw = makeKw({ searchVolume: 500, cpc: 5 })
      const info = getVerdictInfo(kw)
      expect(info.verdict).toBe('brulante')
      expect(info.label).toBe('Brûlante')
      expect(info.color).toBe('#dc2626')
      expect(info.bgColor).toBe('#fef2f2')
    })

    it('returns correct label for emergente', () => {
      const related = Array.from({ length: 6 }, (_, i) => ({
        keyword: `r-${i}`, searchVolume: 10, cpc: 0.5, competition: 0.1,
      }))
      const kw = makeKw({ searchVolume: 50, relatedKeywords: related })
      const info = getVerdictInfo(kw)
      expect(info.verdict).toBe('emergente')
      expect(info.label).toBe('Émergente')
    })

    it('returns correct label for froide', () => {
      const kw = makeKw({ searchVolume: 0, cpc: 0 })
      const info = getVerdictInfo(kw)
      expect(info.verdict).toBe('froide')
      expect(info.label).toBe('Froide')
    })

    it('returns correct label for neutre', () => {
      const kw = makeKw({ searchVolume: 100, cpc: 1 })
      const info = getVerdictInfo(kw)
      expect(info.verdict).toBe('neutre')
      expect(info.label).toBe('Neutre')
    })
  })

  describe('getVerdictSummary', () => {
    it('returns correct counts for mixed keywords', () => {
      const results = [
        makeKw({ searchVolume: 500, cpc: 5 }),   // brulante
        makeKw({ searchVolume: 300, cpc: 4 }),   // brulante
        makeKw({ searchVolume: 0, cpc: 0 }),     // froide
        makeKw({ searchVolume: 100, cpc: 1 }),   // neutre
      ]
      const summary = getVerdictSummary(results)
      expect(summary.brulante).toBe(2)
      expect(summary.froide).toBe(1)
      expect(summary.neutre).toBe(1)
      expect(summary.emergente).toBe(0)
    })

    it('returns all zeros for empty array', () => {
      const summary = getVerdictSummary([])
      expect(summary).toEqual({ brulante: 0, emergente: 0, froide: 0, neutre: 0 })
    })
  })
})
