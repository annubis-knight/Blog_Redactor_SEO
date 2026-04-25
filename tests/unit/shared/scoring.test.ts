import { describe, it, expect } from 'vitest'
import { computeCombinedScore } from '../../../shared/scoring'

const baseInput = {
  searchVolume: 500,
  difficulty: 30,
  cpc: 1.5,
  paaWeightedScore: 2.5,
  autocompleteMatchCount: 3,
  avgSemanticScore: 0.5,
  intentTypes: ['commercial' as const],
  painAlignmentScore: 60,
}

describe('computeCombinedScore — mode fallback (sans douleur enrichie)', () => {
  it('calcule un total 0-100', () => {
    const r = computeCombinedScore(baseInput)
    expect(r.total).toBeGreaterThanOrEqual(0)
    expect(r.total).toBeLessThanOrEqual(100)
  })

  it('respecte la formule historique (fallback)', () => {
    const r = computeCombinedScore(baseInput)
    // Avec painAlignmentScore 60 et pas de champs "pertinence" → mode fallback
    expect(r.paaMatchScore).toBe(Math.min(100, 2.5 * 10))
    expect(r.painAlignmentScore).toBe(60)
  })

  it('pain = 50 si absent (neutre)', () => {
    const { painAlignmentScore: _, ...rest } = baseInput
    const r = computeCombinedScore(rest)
    expect(r.painAlignmentScore).toBe(50)
  })
})

describe('computeCombinedScore — mode "pertinence article"', () => {
  it('active le mode quand paaPainAlignmentAvg + autocompletePainAlignmentAvg fournis', () => {
    const r = computeCombinedScore({
      ...baseInput,
      paaPainAlignmentAvg: 80,
      autocompletePainAlignmentAvg: 70,
    })
    // paaMatchScore et resonanceBonus sont remplacés par les valeurs pain
    expect(r.paaMatchScore).toBe(80)
    expect(r.resonanceBonus).toBe(70)
  })

  it('ajoute la composante racines si fournie (pondération 15 %)', () => {
    const withoutRoots = computeCombinedScore({
      ...baseInput,
      paaPainAlignmentAvg: 80,
      autocompletePainAlignmentAvg: 70,
    })
    const withRoots = computeCombinedScore({
      ...baseInput,
      paaPainAlignmentAvg: 80,
      autocompletePainAlignmentAvg: 70,
      rootsAverageScore: 100,
    })
    // Avec racines à 100, le total doit monter (ou au moins changer)
    expect(withRoots.total).toBeGreaterThanOrEqual(withoutRoots.total)
  })

  it('article très pertinent (tout à 100) → total proche de 100', () => {
    const r = computeCombinedScore({
      searchVolume: 5000,
      difficulty: 20,
      cpc: 2,
      paaWeightedScore: 5,
      autocompleteMatchCount: 5,
      intentTypes: ['commercial'],
      painAlignmentScore: 100,
      paaPainAlignmentAvg: 100,
      autocompletePainAlignmentAvg: 100,
      rootsAverageScore: 100,
    })
    expect(r.total).toBeGreaterThanOrEqual(85)
  })

  it('article hors sujet (tout pertinence à 0) → total bas', () => {
    const r = computeCombinedScore({
      searchVolume: 5000,
      difficulty: 20,
      cpc: 2,
      paaWeightedScore: 5,
      autocompleteMatchCount: 5,
      intentTypes: ['commercial'],
      painAlignmentScore: 0,
      paaPainAlignmentAvg: 0,
      autocompletePainAlignmentAvg: 0,
      rootsAverageScore: 0,
    })
    // Seuls 10 % intent + 10 % opportunité comptent → max ~20 points
    expect(r.total).toBeLessThanOrEqual(30)
  })
})
