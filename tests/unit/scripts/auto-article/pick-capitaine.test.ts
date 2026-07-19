import { describe, it, expect } from 'vitest'
import { pickCapitaine, type CapitaineInput } from '../../../../scripts/auto-article/heuristics/pick-capitaine.js'

const c = (keyword: string, verdict: string, relevance: number | null, market: number | null): CapitaineInput =>
  ({ keyword, verdict, relevance, market })

const TOPIC = 'Générer des leads B2B à Toulouse avec le SEO naturel — référencement naturel pour PME'

describe('auto:pick-capitaine — affinité topique', () => {
  it('privilégie le mot-clé qui parle du sujet', () => {
    const choice = pickCapitaine(
      [c('backlinks SEO', 'GO', 10, 50), c('générer leads SEO', 'ORANGE', 10, 50)],
      TOPIC,
    )
    expect(choice?.keyword).toBe('générer leads SEO')
    expect(choice?.affinity).toBeGreaterThan(0.9)
  })

  it('expose l\'affinité retenue', () => {
    const choice = pickCapitaine([c('mots-clés SEO', 'GO', 10, 50)], TOPIC)
    // 1 token sur 3 (« seo ») couvert par le sujet
    expect(choice?.affinity).toBeCloseTo(1 / 3, 2)
  })

  it('garde anti-dérive : n\'élit jamais un hors-sujet total s\'il existe un on-topic', () => {
    const choice = pickCapitaine(
      [c('recette de cassoulet', 'GO', 90, 99), c('SEO naturel', 'NOGO', 0, 1)],
      TOPIC,
    )
    expect(choice?.keyword).toBe('SEO naturel')
  })
})

describe('auto:pick-capitaine — régression run réel 2026-07-18', () => {
  /**
   * Données observées : les 8 candidats scoraient TOUS relevance=6 (signal
   * produit non-discriminant), et le générique « mots-clés SEO » avait le
   * meilleur marché → il était élu, hors-sujet, pour un article sur la
   * génération de leads PME.
   */
  const candidates = [
    c('consultant SEO', 'ORANGE', 6, 60),
    c('SEO technique', 'ORANGE', 6, 55),
    c('agence SEO', 'ORANGE', 6, 70),
    c('générer leads SEO', 'ORANGE', 6, 20),
    c('lead generation', 'ORANGE', 6, 45),
    c('backlinks SEO', 'ORANGE', 6, 50),
    c('mots-clés SEO', 'GO', 6, 95), // meilleur marché, hors-sujet
    c('SEO on-page', 'ORANGE', 6, 40),
  ]

  it('n\'élit plus le générique à fort volume', () => {
    const choice = pickCapitaine(candidates, TOPIC)
    expect(choice?.keyword).not.toBe('mots-clés SEO')
  })

  it('élit un mot-clé on-topic, pas un générique à fort volume', () => {
    // Depuis le matching flou (préfixe ≥ 5), « lead generation » matche aussi
    // « générer » : les deux candidats on-topic sont à égalité d'affinité et le
    // marché les départage. L'invariant porte sur la pertinence, pas sur un
    // mot-clé figé.
    const choice = pickCapitaine(candidates, TOPIC)
    expect(['générer leads SEO', 'lead generation']).toContain(choice?.keyword)
    expect(choice?.affinity).toBe(1)
  })

  it('une pertinence uniforme n\'influence plus le classement (normalisation)', () => {
    const uniform = pickCapitaine(candidates, TOPIC)
    const shifted = pickCapitaine(candidates.map((x) => ({ ...x, relevance: 42 })), TOPIC)
    expect(shifted?.keyword).toBe(uniform?.keyword)
  })
})

describe('auto:pick-capitaine — drapeau forced & cas limites', () => {
  it('forced=false si le verdict retenu est GO', () => {
    expect(pickCapitaine([c('SEO naturel', 'GO', 50, 50)], TOPIC)?.forced).toBe(false)
  })

  it('forced=true si le verdict retenu n\'est pas GO', () => {
    expect(pickCapitaine([c('SEO naturel', 'ORANGE', 50, 50)], TOPIC)?.forced).toBe(true)
  })

  it('retourne null sur liste vide', () => {
    expect(pickCapitaine([], TOPIC)).toBeNull()
  })

  it('fonctionne sans sujet fourni (affinité 0 partout → marché décide)', () => {
    const choice = pickCapitaine([c('a', 'GO', 0, 10), c('b', 'GO', 0, 90)])
    expect(choice?.keyword).toBe('b')
  })
})
