/**
 * Tests pour `computePaaPainAlignmentCumulative` — Sprint S3.
 *
 * Formule F1 (validée 2026-04-28) :
 *   score = (somme des points obtenus) / (nbPAA × 2.0) × 100
 *
 * Couvre :
 *  1. liste vide → 0
 *  2. tous parfaits (total+exact + aligned) → 100
 *  3. tous off → 0
 *  4. mix qualité — vérifie le calcul exact
 *  5. fallback topic-only (pas de painAlignment) — utilise barème topic seul
 *  6. plage stable indépendamment du nombre de PAA
 */
import { describe, it, expect } from 'vitest'
import {
  computePaaPainAlignmentCumulative,
  PAA_MAX_POINTS_PER_ITEM,
} from '../../../server/services/intent/intent-scan.service'

describe('computePaaPainAlignmentCumulative — formule F1', () => {
  it('retourne 0 sur liste vide', () => {
    expect(computePaaPainAlignmentCumulative([])).toBe(0)
  })

  it('retourne 100 quand tous les PAA sont parfaits (total+exact + aligned)', () => {
    const items = Array.from({ length: 5 }, () => ({
      match: 'total' as const,
      matchQuality: 'exact' as const,
      painAlignment: 'aligned' as const,
    }))
    expect(computePaaPainAlignmentCumulative(items)).toBe(100)
  })

  it('retourne 0 quand tous les PAA sont off (match=none + pain=off)', () => {
    const items = Array.from({ length: 5 }, () => ({
      match: 'none' as const,
      painAlignment: 'off' as const,
    }))
    expect(computePaaPainAlignmentCumulative(items)).toBe(0)
  })

  it('exemple chiffré : 8 PAA mix → score ≈ 61', () => {
    // 3 parfaits (2.0 chacun = 6) + 3 mix (total+exact + partial pain : 0.5*2 + 0.5*0.5 = 1.25 chacun = 3.75)
    // + 2 off (0 chacun = 0). Somme = 9.75. Max = 8 × 2.0 = 16. Score = 61.
    const items = [
      { match: 'total' as const, matchQuality: 'exact' as const, painAlignment: 'aligned' as const },
      { match: 'total' as const, matchQuality: 'exact' as const, painAlignment: 'aligned' as const },
      { match: 'total' as const, matchQuality: 'exact' as const, painAlignment: 'aligned' as const },
      { match: 'total' as const, matchQuality: 'exact' as const, painAlignment: 'partial' as const },
      { match: 'total' as const, matchQuality: 'exact' as const, painAlignment: 'partial' as const },
      { match: 'total' as const, matchQuality: 'exact' as const, painAlignment: 'partial' as const },
      { match: 'none' as const, painAlignment: 'off' as const },
      { match: 'none' as const, painAlignment: 'off' as const },
    ]
    expect(computePaaPainAlignmentCumulative(items)).toBe(61)
  })

  it('fallback topic-only quand aucun item n\'a de painAlignment', () => {
    // Sans painAlignment, le score utilise topicWeight seul.
    // 2 items total+exact (2.0 chacun = 4) sur max 4 (2 × 2.0) → 100.
    const items = [
      { match: 'total' as const, matchQuality: 'exact' as const },
      { match: 'total' as const, matchQuality: 'exact' as const },
    ]
    expect(computePaaPainAlignmentCumulative(items)).toBe(100)
  })

  it('plage stable 0-100 quel que soit N', () => {
    // 1 PAA parfait → 100
    // 100 PAA parfaits → 100 (pas d'effet de masse)
    const onePerfect = [{ match: 'total' as const, matchQuality: 'exact' as const, painAlignment: 'aligned' as const }]
    const hundredPerfect = Array.from({ length: 100 }, () => ({
      match: 'total' as const,
      matchQuality: 'exact' as const,
      painAlignment: 'aligned' as const,
    }))
    expect(computePaaPainAlignmentCumulative(onePerfect)).toBe(100)
    expect(computePaaPainAlignmentCumulative(hundredPerfect)).toBe(100)
  })

  it('PAA_MAX_POINTS_PER_ITEM exposé = 2.0', () => {
    expect(PAA_MAX_POINTS_PER_ITEM).toBe(2.0)
  })
})
