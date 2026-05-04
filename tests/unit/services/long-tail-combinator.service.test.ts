import { describe, it, expect } from 'vitest'
import {
  combineRoots,
  type CandidateCombination,
} from '../../../server/services/keyword/long-tail-combinator.service'

describe('moteur:radar long-tail-combinator', () => {
  describe('edge cases', () => {
    it('returns [] for empty input', () => {
      expect(combineRoots([])).toEqual([])
    })

    it('returns [] when only 1 keyword (need >= 2 to combine)', () => {
      expect(combineRoots(['copywriting'])).toEqual([])
    })

    it('returns [] when keywords array contains only blanks', () => {
      expect(combineRoots(['', '   ', '\t'])).toEqual([])
    })
  })

  describe('pair generation', () => {
    it('produces pairs from 2 keywords', () => {
      const out = combineRoots(['copywriting email', 'pme industriel'])
      expect(out.length).toBeGreaterThanOrEqual(1)
      // each candidate keyword should be a non-empty string
      for (const c of out) {
        expect(c.keyword.length).toBeGreaterThan(0)
        expect(c.derivedFromRoots.length).toBeGreaterThanOrEqual(2)
      }
    })

    it('candidate keyword combines significant words from at least 2 distinct roots', () => {
      const out = combineRoots(['copywriting email', 'pme industriel'])
      const first = out[0]!
      // it must reference both roots in derivedFromRoots
      expect(first.derivedFromRoots).toContain('copywriting email')
      expect(first.derivedFromRoots).toContain('pme industriel')
    })
  })

  describe('normalization & dedup', () => {
    it('treats casing and trailing spaces as the same input keyword', () => {
      const a = combineRoots(['Copywriting Email', 'PME Industriel'])
      const b = combineRoots(['copywriting email  ', '  pme industriel'])
      expect(a.length).toBe(b.length)
    })

    it('deduplicates candidate combinations that normalize to the same keyword', () => {
      // Inputs that would naively produce the same combined keyword twice
      const out = combineRoots([
        'copywriting email',
        'COPYWRITING EMAIL',
        'pme industriel',
      ])
      const keywords = out.map(c => c.keyword.toLowerCase())
      const unique = new Set(keywords)
      expect(unique.size).toBe(keywords.length)
    })
  })

  describe('stopwords handling', () => {
    it('ignores french stopwords when scoring word frequency', () => {
      // "le", "de", "à" are stopwords; should not inflate frequency
      const out = combineRoots([
        'le copywriting de email',
        'à propos de copywriting',
      ])
      // candidates should still be produced (they share "copywriting") and not be polluted by stopwords
      expect(out.length).toBeGreaterThanOrEqual(1)
      const first = out[0]!
      expect(first.keyword.toLowerCase()).toContain('copywriting')
    })
  })

  describe('triple generation', () => {
    it('does NOT generate triples when fewer than 4 input keywords', () => {
      const out = combineRoots(['copywriting email', 'pme industriel', 'taux conversion'])
      // all candidates derive from <= 2 roots
      for (const c of out) {
        expect(c.derivedFromRoots.length).toBeLessThanOrEqual(2)
      }
    })

    it('generates triples (3 roots) when 4+ input keywords', () => {
      const out = combineRoots([
        'copywriting email',
        'pme industriel',
        'taux conversion',
        'b2b saas',
      ])
      const tripleCandidates = out.filter(c => c.derivedFromRoots.length === 3)
      expect(tripleCandidates.length).toBeGreaterThan(0)
    })
  })

  describe('hard limit', () => {
    it('returns at most 30 candidates even with many input keywords', () => {
      const many = Array.from({ length: 12 }, (_, i) => `keyword${i} variant${i}`)
      const out = combineRoots(many)
      expect(out.length).toBeLessThanOrEqual(30)
    })
  })

  describe('determinism', () => {
    it('returns identical output across two calls with the same input', () => {
      const input = ['copywriting email', 'pme industriel', 'taux conversion']
      const a = combineRoots(input)
      const b = combineRoots(input)
      expect(a).toEqual(b)
    })

    it('output is independent of input order (results are sorted deterministically)', () => {
      const a = combineRoots(['copywriting email', 'pme industriel', 'taux conversion'])
      const b = combineRoots(['taux conversion', 'copywriting email', 'pme industriel'])
      // we don't assert strict equality of order across input permutations,
      // but the SET of candidate keywords must be identical
      const setA = new Set(a.map(c => c.keyword.toLowerCase()))
      const setB = new Set(b.map(c => c.keyword.toLowerCase()))
      expect(setA).toEqual(setB)
    })
  })

  describe('shape contract', () => {
    it('each candidate has keyword + derivedFromRoots[]', () => {
      const out: CandidateCombination[] = combineRoots(['copywriting email', 'pme industriel'])
      for (const c of out) {
        expect(typeof c.keyword).toBe('string')
        expect(Array.isArray(c.derivedFromRoots)).toBe(true)
        expect(c.derivedFromRoots.length).toBeGreaterThanOrEqual(2)
      }
    })
  })
})
