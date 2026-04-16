import { describe, it, expect } from 'vitest'
import {
  normalizeDataForSeoSignal,
  normalizeCommunitySignal,
  normalizeAutocompleteSignal,
  computeCompositeScore,
  detectSpecialCase,
  classifyVerdict,
  computeConfidence,
  computeConsensus,
  generateExplanation,
  isLongTail,
} from '../../../src/composables/intent/useMultiSourceVerdict'
import type { CommunitySignal, AutocompleteSignal } from '../../../shared/types/intent.types'

// --- Helper factories ---

function makeCommunitySignal(overrides: Partial<CommunitySignal> = {}): CommunitySignal {
  return {
    discussionsCount: 5,
    uniqueDomains: ['reddit.com', 'quora.com'],
    domainDiversity: 2,
    avgVotesCount: 15,
    freshness: 'recent',
    serpPosition: 4,
    topDiscussions: [],
    ...overrides,
  }
}

function makeAutocompleteSignal(overrides: Partial<AutocompleteSignal> = {}): AutocompleteSignal {
  return {
    suggestionsCount: 5,
    suggestions: ['a', 'b', 'c', 'd', 'e'],
    hasKeyword: false,
    position: null,
    ...overrides,
  }
}

describe('useMultiSourceVerdict — normalization', () => {
  it('normalizeDataForSeoSignal with typical data returns score between 0 and 1', () => {
    const score = normalizeDataForSeoSignal({
      searchVolume: 500,
      cpc: 4.5,
      difficulty: 30,
      relatedCount: 10,
    })
    expect(score).toBeGreaterThan(0)
    expect(score).toBeLessThanOrEqual(1)
  })

  it('normalizeDataForSeoSignal with null returns 0', () => {
    expect(normalizeDataForSeoSignal(null)).toBe(0)
  })

  it('normalizeDataForSeoSignal with zero data returns near 0', () => {
    const score = normalizeDataForSeoSignal({
      searchVolume: 0,
      cpc: 0,
      difficulty: 100,
      relatedCount: 0,
    })
    expect(score).toBeLessThan(0.1)
  })

  it('normalizeCommunitySignal with 0 discussions returns 0', () => {
    const signal = makeCommunitySignal({ discussionsCount: 0 })
    expect(normalizeCommunitySignal(signal)).toBe(0)
  })

  it('normalizeCommunitySignal with null returns 0', () => {
    expect(normalizeCommunitySignal(null)).toBe(0)
  })

  it('normalizeCommunitySignal with rich data returns high score', () => {
    const signal = makeCommunitySignal({
      discussionsCount: 20,
      domainDiversity: 5,
      avgVotesCount: 50,
      freshness: 'recent',
    })
    const score = normalizeCommunitySignal(signal)
    expect(score).toBeGreaterThan(0.5)
  })

  it('normalizeAutocompleteSignal with hasKeyword=true applies bonus', () => {
    const withKeyword = normalizeAutocompleteSignal(makeAutocompleteSignal({ hasKeyword: true, position: 1 }))
    const withoutKeyword = normalizeAutocompleteSignal(makeAutocompleteSignal({ hasKeyword: false }))
    expect(withKeyword).toBeGreaterThan(withoutKeyword)
  })

  it('normalizeAutocompleteSignal with null returns 0', () => {
    expect(normalizeAutocompleteSignal(null)).toBe(0)
  })
})

describe('useMultiSourceVerdict — special cases', () => {
  it('detects Latente: volume=0, discussions=15', () => {
    const result = detectSpecialCase(
      { searchVolume: 0, relatedCount: 2 },
      makeCommunitySignal({ discussionsCount: 15 }),
    )
    expect(result).toBe('latente')
  })

  it('detects Émergente: volume=50, discussions=8', () => {
    const result = detectSpecialCase(
      { searchVolume: 50, relatedCount: 2 },
      makeCommunitySignal({ discussionsCount: 8 }),
    )
    expect(result).toBe('emergente')
  })

  it('detects Émergente via relatedCount > 5', () => {
    const result = detectSpecialCase(
      { searchVolume: 100, relatedCount: 10 },
      makeCommunitySignal({ discussionsCount: 2 }),
    )
    expect(result).toBe('emergente')
  })

  it('returns null for standard case', () => {
    const result = detectSpecialCase(
      { searchVolume: 500, relatedCount: 3 },
      makeCommunitySignal({ discussionsCount: 3 }),
    )
    expect(result).toBeNull()
  })
})

describe('useMultiSourceVerdict — verdict classification', () => {
  it('Brûlante: score=0.85, consensus=0.90', () => {
    expect(classifyVerdict(0.85, 0.90)).toBe('brulante')
  })

  it('Confirmée: score=0.60, consensus=0.75', () => {
    expect(classifyVerdict(0.60, 0.75)).toBe('confirmee')
  })

  it('Froide: score=0.10, consensus=0.90', () => {
    expect(classifyVerdict(0.10, 0.90)).toBe('froide')
  })

  it('Incertaine: low consensus=0.40', () => {
    expect(classifyVerdict(0.60, 0.40)).toBe('incertaine')
  })

  it('Émergente: mid score, mid consensus', () => {
    expect(classifyVerdict(0.40, 0.55)).toBe('emergente')
  })

  it('Incertaine: score between froide and emergente thresholds', () => {
    expect(classifyVerdict(0.25, 0.55)).toBe('incertaine')
  })
})

describe('useMultiSourceVerdict — confidence', () => {
  it('4/4 sources → coverageFactor=1.0', () => {
    const { confidence } = computeConfidence(0.80, 4, 4, 1.0)
    expect(confidence).toBeCloseTo(0.80, 1)
  })

  it('3/4 sources → coverageFactor=0.85', () => {
    const { confidence } = computeConfidence(0.80, 3, 4, 1.0)
    expect(confidence).toBeCloseTo(0.68, 1)
  })

  it('2/4 sources → coverageFactor=0.65', () => {
    const { confidence } = computeConfidence(0.80, 2, 4, 1.0)
    expect(confidence).toBeCloseTo(0.52, 1)
  })

  it('confidence < 0.40 → forceUncertain', () => {
    const { forceUncertain } = computeConfidence(0.30, 2, 4, 0.50)
    expect(forceUncertain).toBe(true)
  })

  it('1 source → forceUncertain', () => {
    const { forceUncertain } = computeConfidence(0.80, 1, 4, 1.0)
    expect(forceUncertain).toBe(true)
  })
})

describe('useMultiSourceVerdict — consensus', () => {
  it('all sources strong → consensus 1.0', () => {
    const result = computeConsensus({ a: 0.8, b: 0.9, c: 0.7 })
    expect(result).toBe(1.0)
  })

  it('mixed directions → lower consensus', () => {
    const result = computeConsensus({ a: 0.9, b: 0.1, c: 0.8 })
    expect(result).toBeLessThan(1.0)
  })

  it('single source → consensus 1.0', () => {
    expect(computeConsensus({ a: 0.5 })).toBe(1.0)
  })
})

describe('useMultiSourceVerdict — explanation', () => {
  it('confidence=0.80 → null', () => {
    const result = generateExplanation(0.80, {
      nlpAvailable: true,
      freshness: 'recent',
      sourcesActive: 3,
      consensus: 0.90,
    })
    expect(result).toBeNull()
  })

  it('confidence=0.55, NLP disabled → explanation with reasons', () => {
    const result = generateExplanation(0.55, {
      nlpAvailable: false,
      freshness: 'old',
      sourcesActive: 2,
      consensus: 0.60,
    })
    expect(result).not.toBeNull()
    expect(result).toContain('NLP désactivé')
    expect(result).toContain('Discussions anciennes')
  })

  it('confidence=0.20 → includes "vérification manuelle"', () => {
    const result = generateExplanation(0.20, {
      nlpAvailable: false,
      freshness: 'old',
      sourcesActive: 2,
      consensus: 0.40,
    })
    expect(result).toContain('Vérification manuelle recommandée')
  })
})

describe('useMultiSourceVerdict — composite score', () => {
  it('returns 0 when all scores are 0', () => {
    const score = computeCompositeScore({ dataforseo: 0, community: 0, autocomplete: 0 }, false)
    expect(score).toBe(0)
  })

  it('returns weighted average without NLP', () => {
    const score = computeCompositeScore({ dataforseo: 1, community: 1, autocomplete: 1 }, false)
    expect(score).toBeCloseTo(1.0, 1)
  })

  it('returns weighted average with NLP', () => {
    const score = computeCompositeScore({ dataforseo: 1, community: 1, autocomplete: 1, nlp: 1 }, true)
    // 0.30 + 0.25 + 0.15 + 0.20 = 0.90
    expect(score).toBeCloseTo(0.90, 1)
  })
})

describe('useMultiSourceVerdict — long-tail detection', () => {
  it('short keyword is not long-tail', () => {
    expect(isLongTail('seo toulouse')).toBe(false)
  })

  it('3+ meaningful words is long-tail', () => {
    expect(isLongTail('référencement local PME')).toBe(true)
  })

  it('ignores French stopwords in word count', () => {
    // "comment améliorer le référencement" → meaningful words: "améliorer", "référencement" = 2 → not long-tail
    expect(isLongTail('comment améliorer le référencement')).toBe(false)
  })

  it('question with enough meaningful words is long-tail', () => {
    // "comment apparaître google maps entreprise" → meaningful: "apparaître", "google", "maps", "entreprise" = 4
    expect(isLongTail('comment apparaître google maps entreprise')).toBe(true)
  })
})

describe('useMultiSourceVerdict — long-tail scoring', () => {
  it('long-tail composite gives more weight to autocomplete', () => {
    const scores = { dataforseo: 0, community: 0, autocomplete: 0.7 }
    const shortTailScore = computeCompositeScore(scores, false, false)
    const longTailScore = computeCompositeScore(scores, false, true)
    // Long-tail should score higher because autocomplete has 60% weight vs 18.75%
    expect(longTailScore).toBeGreaterThan(shortTailScore)
  })

  it('long-tail confidence does not force uncertain for single source', () => {
    // baseScore=0.80, 1 source, coverage=0.40 → confidence=0.32 (above 0.25 threshold)
    const { forceUncertain } = computeConfidence(0.80, 1, 3, 1.0, true)
    // Long-tail with 1 source: should NOT force uncertain (DFS returning 0 is expected)
    expect(forceUncertain).toBe(false)
  })

  it('short-tail confidence forces uncertain for single source', () => {
    const { forceUncertain } = computeConfidence(0.50, 1, 3, 1.0, false)
    expect(forceUncertain).toBe(true)
  })
})
