import { describe, it, expect } from 'vitest'
import {
  detectCannibalization,
  requiresConfirmation,
  CONFIRM_THRESHOLD,
} from '../../../../scripts/auto-article/heuristics/detect-cannibalization.js'

const existing = [
  { articleId: 10, keyword: 'référencement local PME' },
  { articleId: 11, keyword: 'création site vitrine' },
  { articleId: 12, keyword: 'referencement local pme' },
]

describe('auto:detect-cannibalization', () => {
  it('détecte un doublon quasi identique (accents/casse ignorés)', () => {
    const hits = detectCannibalization('Référencement Local PME', existing)
    expect(hits.length).toBeGreaterThan(0)
    expect(hits[0].similarity).toBe(1)
    expect(hits[0].similarityPercent).toBe(100)
  })

  it('ignore les mots-clés sans rapport', () => {
    const hits = detectCannibalization('recette de cassoulet', existing)
    expect(hits).toEqual([])
  })

  it('classe par similarité décroissante', () => {
    const hits = detectCannibalization('référencement local PME', existing)
    const sims = hits.map((h) => h.similarity)
    expect([...sims].sort((a, b) => b - a)).toEqual(sims)
  })

  it('n\'expose que les collisions au-dessus du seuil d\'affichage', () => {
    const hits = detectCannibalization('référencement local PME', existing, 0.99)
    expect(hits.every((h) => h.similarity >= 0.99)).toBe(true)
  })

  it('tolère un capitaine vide', () => {
    expect(detectCannibalization('', existing)).toEqual([])
  })
})

describe('auto:detect-cannibalization — requiresConfirmation', () => {
  it('vrai au-dessus du seuil de confirmation', () => {
    const hits = detectCannibalization('référencement local PME', existing)
    expect(requiresConfirmation(hits)).toBe(true)
  })

  it('faux en dessous', () => {
    expect(requiresConfirmation([
      { articleId: 1, keyword: 'x', similarity: CONFIRM_THRESHOLD - 0.1, similarityPercent: 75 },
    ])).toBe(false)
  })

  it('faux sur liste vide', () => {
    expect(requiresConfirmation([])).toBe(false)
  })
})
