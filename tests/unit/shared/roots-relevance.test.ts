/**
 * Tests pour `computeRootsRelevanceScore` — Sprint S4.
 *
 * Couvre les 3 cas explicites + edge cases :
 *  🟢 Cas 1 : racines diverses et fortes → moyenne brute
 *  🟡 Cas 2 : doublons détectés → on garde le meilleur de chaque cluster
 *  ⚫ Cas 3 : liste vide → null (fallback redistribution dans computeRelevanceScore)
 */
import { describe, it, expect } from 'vitest'
import {
  computeRootsRelevanceScore,
  ROOTS_DUPLICATE_THRESHOLD,
} from '../../../shared/scoring'

describe('computeRootsRelevanceScore — Sprint S4', () => {
  it('Cas 3 — liste vide → null', () => {
    expect(computeRootsRelevanceScore([])).toBeNull()
  })

  it('Cas 1 — racines diverses et fortes : moyenne des relevances', () => {
    const result = computeRootsRelevanceScore([
      { keyword: 'agence référencement naturel', relevance: 80 },
      { keyword: 'consultant local', relevance: 70 },
      { keyword: 'expert paris', relevance: 60 },
    ])
    expect(result).not.toBeNull()
    expect(result!.total).toBe(70) // (80+70+60)/3
    expect(result!.rootsCount).toBe(3)
    expect(result!.uniqueRootsCount).toBe(3)
    expect(result!.duplicates).toEqual([])
  })

  it('Cas 2 — doublons détectés : on garde le meilleur de chaque cluster', () => {
    // "agence référencement naturel" et "agence référencement" partagent 2 mots
    // significatifs sur 3 (≥4 chars : "agence", "referencement", "naturel")
    // → Jaccard = 2/3 ≈ 0.67. Pour passer le seuil 0.75, on prend des doublons
    // plus stricts.
    const result = computeRootsRelevanceScore([
      { keyword: 'agence referencement', relevance: 75 },
      { keyword: 'agence referencement', relevance: 80 }, // doublon strict du précédent
      { keyword: 'consultant paris', relevance: 60 },
    ])
    expect(result).not.toBeNull()
    expect(result!.rootsCount).toBe(3)
    expect(result!.uniqueRootsCount).toBe(2) // les 2 "agence referencement" sont fusionnés
    // Score = moyenne(80, 60) = 70 (on a gardé le meilleur du cluster)
    expect(result!.total).toBe(70)
    expect(result!.duplicates.length).toBeGreaterThanOrEqual(1)
  })

  it('seuil de doublon = 0.75 (constante exportée)', () => {
    expect(ROOTS_DUPLICATE_THRESHOLD).toBe(0.75)
  })

  it('racines presque identiques mais sous le seuil → comptées séparément', () => {
    // "agence" + "consultant" : 0 mot commun → diverses
    const result = computeRootsRelevanceScore([
      { keyword: 'agence webmarketing', relevance: 70 },
      { keyword: 'consultant marketing', relevance: 65 },
    ])
    expect(result).not.toBeNull()
    expect(result!.uniqueRootsCount).toBe(2)
    expect(result!.duplicates).toEqual([])
  })

  it('1 seule racine → uniqueRootsCount=1, score = relevance unique', () => {
    const result = computeRootsRelevanceScore([
      { keyword: 'agence seo', relevance: 85 },
    ])
    expect(result).not.toBeNull()
    expect(result!.total).toBe(85)
    expect(result!.uniqueRootsCount).toBe(1)
  })

  it('cluster de 3 doublons : on garde le meilleur, score = celui-là', () => {
    const result = computeRootsRelevanceScore([
      { keyword: 'agence seo', relevance: 60 },
      { keyword: 'agence seo', relevance: 75 },
      { keyword: 'agence seo', relevance: 90 },
    ])
    expect(result).not.toBeNull()
    expect(result!.uniqueRootsCount).toBe(1)
    expect(result!.total).toBe(90) // meilleur du cluster
  })

  it('expose la liste des duplicates avec leur score Jaccard', () => {
    const result = computeRootsRelevanceScore([
      { keyword: 'agence seo locale', relevance: 75 },
      { keyword: 'agence seo locale', relevance: 80 },
    ])
    expect(result).not.toBeNull()
    expect(result!.duplicates.length).toBe(1)
    expect(result!.duplicates[0].a).toBe('agence seo locale')
    expect(result!.duplicates[0].b).toBe('agence seo locale')
    expect(result!.duplicates[0].jaccard).toBeGreaterThanOrEqual(0.75)
  })
})
