/**
 * Tests pour le malus intent mismatch.
 *
 * Spécification :
 *  - le malus de -10 points est INTÉGRÉ dans `intentPain.normalized`
 *    (pas une variable séparée du score)
 *  - il s'applique uniquement quand `painIntentExpected` est défini
 *    ET ne matche aucun des `intentTypes` détectés
 *  - le score `intentPain.normalized` reste clampé [0, 100]
 *  - sans `painIntentExpected` → comportement neutre 50, aucun malus
 */
import { describe, it, expect } from 'vitest'
import { computeRelevanceScore } from '../../../shared/scoring'
import { INTENT_MISMATCH_MALUS } from '../../../shared/types/scoring.types'

describe('Intent mismatch malus — Sprint S5', () => {
  it('expose la constante INTENT_MISMATCH_MALUS = 10', () => {
    expect(INTENT_MISMATCH_MALUS).toBe(10)
  })

  it('match parfait (commercial × commercial) → intentPain = 100, pas de malus', () => {
    const r = computeRelevanceScore({
      intentTypes: ['commercial'],
      painIntentExpected: 'commercial',
    })
    expect(r.breakdown.intentPain.normalized).toBe(100)
  })

  it('mismatch (commercial × informational) → matrice 30, MOINS malus 10 = 20', () => {
    const r = computeRelevanceScore({
      intentTypes: ['informational'],
      painIntentExpected: 'commercial',
    })
    // matrice[commercial][informational] = 30, malus appliqué → 20
    expect(r.breakdown.intentPain.normalized).toBe(20)
  })

  it('mismatch sur faible base (clamp 0) : matrice 20 - malus 10 = 10', () => {
    const r = computeRelevanceScore({
      intentTypes: ['navigational'],
      painIntentExpected: 'commercial',
    })
    // matrice[commercial][navigational] = 20, malus → 10
    expect(r.breakdown.intentPain.normalized).toBe(10)
  })

  it('intent multiple inclut l\'attendu → match, pas de malus', () => {
    const r = computeRelevanceScore({
      intentTypes: ['informational', 'commercial'],
      painIntentExpected: 'commercial',
    })
    // L'attendu (commercial) est dans la liste → max(matrice) = 100, pas de malus
    expect(r.breakdown.intentPain.normalized).toBe(100)
  })

  it('aucun painIntentExpected → composante neutre 50, pas de malus', () => {
    const r = computeRelevanceScore({
      intentTypes: ['commercial'],
    })
    expect(r.breakdown.intentPain.normalized).toBe(50)
  })

  it('mismatch impacte le total : score < celui sans mismatch', () => {
    const matched = computeRelevanceScore({
      painAlignmentScore: 80,
      paaPainAlignmentAvg: 70,
      autocompletePainAlignmentAvg: 60,
      rootsAverageScore: 50,
      intentTypes: ['commercial'],
      painIntentExpected: 'commercial',
    })
    const mismatched = computeRelevanceScore({
      painAlignmentScore: 80,
      paaPainAlignmentAvg: 70,
      autocompletePainAlignmentAvg: 60,
      rootsAverageScore: 50,
      intentTypes: ['informational'],
      painIntentExpected: 'commercial',
    })
    expect(mismatched.total).toBeLessThan(matched.total)
  })
})
