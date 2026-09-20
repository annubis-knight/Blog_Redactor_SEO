import { describe, it, expect } from 'vitest'
import {
  checkContentBeforeExport,
  detectUnverifiableClaims,
} from '../../../../scripts/auto-article/heuristics/check-content-quality'

// ============================================================================
// checkContentBeforeExport — bloquant : refuse d'exporter un texte pollué
// ============================================================================

describe('checkContentBeforeExport', () => {
  it('laisse passer un article propre', () => {
    const result = checkContentBeforeExport(
      '<h2>Combien coûte un site vitrine ?</h2><p>Entre 2 000 et 8 000 euros à Toulouse.</p>',
    )

    expect(result.ok).toBe(true)
    expect(result.leaks).toEqual([])
    expect(result.report).toBe('')
  })

  it('bloque un article contenant le monologue de l’IA', () => {
    const result = checkContentBeforeExport(
      "<p>Intro.</p>Je vais d'abord faire une recherche pour vérifier ces chiffres.<h2>Titre</h2>",
    )

    expect(result.ok).toBe(false)
    expect(result.leaks).toHaveLength(1)
  })

  it('produit un rapport lisible, numéroté, avec l’extrait fautif', () => {
    const result = checkContentBeforeExport(
      "Je vais rechercher des données.<p>a</p>Parfait. J'ai mes sources.<p>b</p>",
    )

    expect(result.report).toContain('1.')
    expect(result.report).toContain('Je vais rechercher')
    expect(result.report).toContain('2.')
  })

  it('plafonne le rapport à 5 fuites et annonce le reste', () => {
    const many = Array(9).fill('Je vais faire une recherche.').join(' <p>x</p> ')
    const result = checkContentBeforeExport(many)

    expect(result.leaks).toHaveLength(5)
    expect(result.report).toContain('4 autre')
  })

  it('contenu vide → bloqué, car rien à exporter', () => {
    expect(checkContentBeforeExport('').ok).toBe(false)
    expect(checkContentBeforeExport('   ').ok).toBe(false)
  })
})

// ============================================================================
// detectUnverifiableClaims — non bloquant : signale les preuves à vérifier
// ============================================================================

describe('detectUnverifiableClaims', () => {
  it('repère une expérience client inventée', () => {
    const claims = detectUnverifiableClaims(
      '<p>Ce guide couvre les cinq étapes que nous avons testées auprès de plus de 50 PME toulousaines.</p>',
    )

    expect(claims.length).toBeGreaterThan(0)
  })

  it('repère un résultat client chiffré', () => {
    expect(
      detectUnverifiableClaims('<p>Nos clients ont augmenté leurs demandes de 40 %.</p>').length,
    ).toBeGreaterThan(0)
  })

  it('repère un accompagnement chiffré', () => {
    expect(
      detectUnverifiableClaims('<p>Nous avons accompagné plus de 120 artisans.</p>').length,
    ).toBeGreaterThan(0)
  })

  it('laisse passer une statistique externe sourcée', () => {
    expect(
      detectUnverifiableClaims(
        '<p>Selon une étude BrightLocal de 2024, 76 % des recherches locales aboutissent à une visite.</p>',
      ),
    ).toEqual([])
  })

  it('laisse passer un scénario ouvertement hypothétique', () => {
    expect(
      detectUnverifiableClaims('<p>Prenons un plombier de Blagnac qui reçoit deux devis par mois.</p>'),
    ).toEqual([])
  })

  it('texte vide → rien à signaler', () => {
    expect(detectUnverifiableClaims('')).toEqual([])
  })
})
