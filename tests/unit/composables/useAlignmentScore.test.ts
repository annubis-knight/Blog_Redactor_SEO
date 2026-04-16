// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { computeAlignmentScore, type AlignmentResult } from '../../../src/composables/keyword/useAlignmentScore'
import type { StrategyContextData } from '../../../shared/types/index'

function makeCtx(overrides: Partial<StrategyContextData> = {}): StrategyContextData {
  return {
    cocoonName: 'Test Cocoon',
    siloName: 'Test Silo',
    cible: null,
    douleur: null,
    angle: null,
    promesse: null,
    cta: null,
    ...overrides,
  }
}

describe('computeAlignmentScore', () => {
  describe('score fort', () => {
    it('returns fort when keyword fully matches cible', () => {
      const ctx = makeCtx({ cible: 'PME du BTP en Île-de-France' })
      const result = computeAlignmentScore('PME du BTP', ctx)

      expect(result.level).toBe('fort')
      expect(result.score).toBe(80)
    })

    it('returns fort when multiple tokens match across cible and douleur', () => {
      const ctx = makeCtx({
        cible: 'artisans du bâtiment',
        douleur: 'visibilité en ligne',
      })
      const result = computeAlignmentScore('artisans visibilité bâtiment', ctx)

      expect(result.level).toBe('fort')
      expect(result.score).toBeGreaterThanOrEqual(60)
      expect(result.matchedTerms.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('score moyen', () => {
    it('returns moyen when 1 token matches out of 3', () => {
      const ctx = makeCtx({ cible: 'artisans du bâtiment en France' })
      const result = computeAlignmentScore('formation artisans débutant', ctx)

      expect(result.level).toBe('moyen')
      expect(result.score).toBeGreaterThanOrEqual(30)
      expect(result.score).toBeLessThan(60)
      expect(result.matchedTerms).toContain('artisans')
    })
  })

  describe('aucun match', () => {
    it('returns aucun when no tokens match', () => {
      const ctx = makeCtx({ cible: 'artisans du bâtiment' })
      const result = computeAlignmentScore('marketing digital agence', ctx)

      expect(result.level).toBe('aucun')
      expect(result.score).toBe(0)
      expect(result.matchedTerms).toHaveLength(0)
    })

    it('returns aucun when no reference fields are set', () => {
      const ctx = makeCtx() // all null
      const result = computeAlignmentScore('renovation maison', ctx)

      expect(result.level).toBe('aucun')
      expect(result.score).toBe(0)
    })

    it('returns aucun when keyword has only short tokens', () => {
      const ctx = makeCtx({ cible: 'artisans du bâtiment' })
      const result = computeAlignmentScore('de en', ctx)

      expect(result.level).toBe('aucun')
      expect(result.score).toBe(0)
    })
  })

  describe('normalization', () => {
    it('normalizes accents and case for matching', () => {
      const ctx = makeCtx({ cible: 'Rénovation énergétique bâtiment' })
      const result = computeAlignmentScore('renovation energetique', ctx)

      expect(result.level).toBe('fort')
      expect(result.score).toBeGreaterThanOrEqual(60)
      // Full keyword match: normalized "renovation energetique" is contained in normalized cible
      expect(result.matchedTerms).toContain('renovation energetique')
    })

    it('is case-insensitive', () => {
      const ctx = makeCtx({ cible: 'PME du BTP' })
      const result = computeAlignmentScore('pme btp', ctx)

      expect(result.matchedTerms).toContain('pme')
      expect(result.matchedTerms).toContain('btp')
      expect(result.level).toBe('fort')
    })
  })

  describe('edge cases', () => {
    it('uses angle field for matching', () => {
      const ctx = makeCtx({ angle: 'SEO local pragmatique' })
      const result = computeAlignmentScore('SEO local', ctx)

      expect(result.score).toBeGreaterThan(0)
      expect(result.matchedTerms.length).toBeGreaterThanOrEqual(1)
    })

    it('ignores promesse and cta fields', () => {
      const ctx = makeCtx({ promesse: 'résultats rapides', cta: 'demandez un audit' })
      const result = computeAlignmentScore('résultats rapides audit', ctx)

      expect(result.level).toBe('aucun')
      expect(result.score).toBe(0)
    })

    it('handles empty keyword gracefully', () => {
      const ctx = makeCtx({ cible: 'artisans' })
      const result = computeAlignmentScore('', ctx)

      expect(result.level).toBe('aucun')
      expect(result.score).toBe(0)
    })
  })

  describe('rendering integration', () => {
    it('column visible when strategicContext provided — alignment data computed', () => {
      const ctx = makeCtx({
        cible: 'PME du BTP',
        douleur: 'pas de clients en ligne',
        angle: 'SEO local',
      })

      const keywords = ['PME BTP rénovation', 'marketing digital', 'SEO local artisan']
      const results = keywords.map(kw => computeAlignmentScore(kw, ctx))

      // First keyword should score higher (matches cible)
      expect(results[0].score).toBeGreaterThan(results[1].score)
      // Third keyword should also score well (matches angle)
      expect(results[2].score).toBeGreaterThan(0)
      // Second keyword should score 0
      expect(results[1].score).toBe(0)
    })

    it('column hidden when strategicContext null — no computation', () => {
      // When strategicContext is null, computeAlignmentScore is never called.
      // This is a rendering concern (v-if="props.strategicContext").
      // We verify the function handles null-like ctx gracefully.
      const ctx = makeCtx() // all null
      const result = computeAlignmentScore('test keyword', ctx)
      expect(result.score).toBe(0)
    })
  })
})
