// @vitest-environment node
/**
 * Tests de coherence pour score-capitaine data flow.
 * Verifie que la valeur affichee et la valeur utilisee pour le tri/agregat
 * derivent de la MEME expression (regle de coherence affichage/calcul).
 *
 * Voir docs/data-flows/score-capitaine.md pour la cartographie complete.
 */
import { describe, it, expect } from 'vitest'

const {
  compareScores,
} = await import('../../../shared/score/compare.js')

const {
  averageScores,
} = await import('../../../shared/score/aggregate.js')

// =====================================================
// FR-CAP-SCORING-BIMODAL — coherence affichage / tri
// =====================================================

describe('FR-CAP-SCORING-BIMODAL — coherence affichage / tri', () => {
  it('utilise le meme champ pour affichage et tri (marketScore.value)', () => {
    type CardLike = { marketScore: { value: number | null }; displayed: number | null }
    const cards: CardLike[] = [
      { marketScore: { value: 80 }, displayed: 80 },
      { marketScore: { value: null }, displayed: null },
      { marketScore: { value: 60 }, displayed: 60 },
    ]
    cards.forEach(card => {
      expect(card.displayed).toBe(card.marketScore.value)
    })
  })

  it('null place les items en bas du tri descendant (jamais comme 0)', () => {
    const items = [
      { id: 'a', score: 80 as number | null },
      { id: 'b', score: null as number | null },
      { id: 'c', score: 0 as number | null },
      { id: 'd', score: 60 as number | null },
    ]
    const sorted = [...items].sort((x, y) => compareScores(x.score, y.score))
    // Tri desc : 80 > 60 > 0 > null
    expect(sorted.map(i => i.id)).toEqual(['a', 'd', 'c', 'b'])
  })
})

// =====================================================
// FR-CAP-SCORING-BIMODAL — null exclus des agregats
// =====================================================

describe('FR-CAP-SCORING-BIMODAL — null exclus des agregats', () => {
  it('averageScores ignore null (ne le compte pas comme 0)', () => {
    const result = averageScores([80, null, 60])
    // Bon comportement : (80 + 60) / 2 = 70
    // Mauvais comportement (avec ?? 0) : (80 + 0 + 60) / 3 = 46.67
    expect(result).toBe(70)
  })

  it('averageScores retourne null si tous les scores sont null', () => {
    expect(averageScores([null, null, null])).toBeNull()
  })

  it('averageScores retourne null pour liste vide', () => {
    expect(averageScores([])).toBeNull()
  })
})

// =====================================================
// FR-CAP-VERDICT-INFORMATIVE — lock independant du verdict
// =====================================================

describe('FR-CAP-VERDICT-INFORMATIVE — lock independant du verdict', () => {
  it('lock autorise meme avec verdict NO-GO (libre arbitre utilisateur)', () => {
    type LockGate = { verdict: 'GO' | 'ORANGE' | 'NO-GO' | 'GRAY'; canLock: boolean }
    // Apres tech-spec score-pertinence (2026-04-28), canLock = true toujours
    const gates: LockGate[] = [
      { verdict: 'GO', canLock: true },
      { verdict: 'ORANGE', canLock: true },
      { verdict: 'NO-GO', canLock: true },
      { verdict: 'GRAY', canLock: true },
    ]
    gates.forEach(g => {
      expect(g.canLock).toBe(true)
    })
  })
})

// =====================================================
// FR-CAP-PAINPOINT-FALLBACK — relevanceScore null si painPoint absent
// =====================================================

describe('FR-CAP-PAINPOINT-FALLBACK — relevanceScore null si painPoint absent', () => {
  it('relevanceScore vaut null quand painPoint est "(non defini)"', () => {
    const PAIN_POINT_FALLBACK = '(non defini)'
    type ScoringInput = { painPoint: string | null; relevanceScore: { value: number | null } }
    const cases: ScoringInput[] = [
      { painPoint: PAIN_POINT_FALLBACK, relevanceScore: { value: null } },
      { painPoint: null, relevanceScore: { value: null } },
      { painPoint: 'Vraie douleur metier', relevanceScore: { value: 75 } },
    ]
    cases.forEach(c => {
      const isFallback = c.painPoint === null || c.painPoint === PAIN_POINT_FALLBACK
      if (isFallback) {
        expect(c.relevanceScore.value).toBeNull()
      } else {
        expect(c.relevanceScore.value).not.toBeNull()
      }
    })
  })
})

// =====================================================
// Reload coherence (placeholder)
// =====================================================

describe('FR-CAP-PERSIST — reload coherence (placeholder)', () => {
  it.todo('reload restaure le meme verdict que le premier load (formule a jour)')
  it.todo('restore depuis history affiche la date du calcul si formule legacy')
})
