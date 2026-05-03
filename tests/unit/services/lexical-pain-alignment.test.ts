import { describe, it, expect } from 'vitest'
import {
  lexicalPainAlignment,
  avgLexicalPainAlignment,
} from '../../../server/services/keyword/lexical-pain-alignment'

/**
 * Tests du fallback lexical d'alignement texte vs painPoint (Bloc 5).
 *
 * Garantit que le calcul est :
 *   - déterministe (pas d'embeddings, pas de RNG)
 *   - mock-friendly (exécution < 1 ms, pas d'I/O)
 *   - safe sur les inputs limites (vides, casse, accents)
 *
 * Si la sémantique de matchResonanceDetailed change, ces tests le détectent.
 */
describe('lexicalPainAlignment — Bloc 5 (fallback /validate sans cache Radar)', () => {
  it('returns 0 sur texte vide', () => {
    expect(lexicalPainAlignment('', ['douleur', 'mots'])).toBe(0)
  })

  it('returns 0 sur painWords vide', () => {
    expect(lexicalPainAlignment('mon mot-clé', [])).toBe(0)
  })

  it('returns 0 quand texte et painPoint n\'ont aucun mot commun', () => {
    const painWords = ['voiture', 'rouge']
    expect(lexicalPainAlignment('cuisine italienne', painWords)).toBe(0)
  })

  it('returns 100 quand chevauchement total (mots identiques)', () => {
    const painWords = ['perdre', 'poids', 'rapidement']
    expect(lexicalPainAlignment('perdre du poids rapidement', painWords)).toBe(100)
  })

  it('returns 60 quand chevauchement partiel exact', () => {
    // 1 mot commun sur 3 → partial exact
    const painWords = ['gestion', 'temps', 'productivite']
    expect(lexicalPainAlignment('outil de gestion', painWords)).toBe(60)
  })

  it('insensible à la casse', () => {
    const painWords = ['marketing', 'digital']
    expect(lexicalPainAlignment('MARKETING DIGITAL', painWords)).toBe(100)
  })
})

describe('avgLexicalPainAlignment — Bloc 5', () => {
  it('returns null si tableau de textes vide', () => {
    expect(avgLexicalPainAlignment([], ['douleur'])).toBeNull()
  })

  it('returns null si painWords vide', () => {
    expect(avgLexicalPainAlignment(['un texte'], [])).toBeNull()
  })

  it('moyenne arrondie sur plusieurs textes', () => {
    const painWords = ['perdre', 'poids']
    // text1: 100 (match total), text2: 0 (aucun match)
    const result = avgLexicalPainAlignment(['perdre du poids', 'voiture rouge'], painWords)
    expect(result).toBe(50)
  })

  it('mock-friendly : exécution synchrone, pas d\'I/O', () => {
    // Garantit que l'appel est rapide même sur 30 textes (cas Capitaine
    // chargeant 30 cards). Si on introduit un appel asynchrone par accident,
    // ce test ne suffit pas mais le type-check le bloquera.
    const painWords = ['marketing', 'seo']
    const texts = Array.from({ length: 30 }, (_, i) => `texte ${i} marketing`)
    const start = Date.now()
    const result = avgLexicalPainAlignment(texts, painWords)
    const elapsed = Date.now() - start
    expect(result).toBeGreaterThan(0)
    expect(elapsed).toBeLessThan(50)
  })
})
