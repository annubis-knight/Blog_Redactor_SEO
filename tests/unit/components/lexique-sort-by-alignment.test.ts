/**
 * Tests pour le tri par alignement douleur du Lexique (Sprint S2).
 *
 * On teste l'utilitaire pur (`sortByPainAlignmentJaccard`) plutôt que le composant
 * complet — Pinia + apiPost rendraient le mount lourd pour un comportement déjà
 * pleinement contenu dans la fonction utilitaire.
 */
import { describe, it, expect } from 'vitest'
import {
  jaccardWithPainPoint,
  sortByPainAlignmentJaccard,
} from '../../../src/utils/pain-point-jaccard'

describe('jaccardWithPainPoint', () => {
  it('retourne 0 si painPoint absent ou vide', () => {
    expect(jaccardWithPainPoint('agence', null)).toBe(0)
    expect(jaccardWithPainPoint('agence', undefined)).toBe(0)
    expect(jaccardWithPainPoint('agence', '   ')).toBe(0)
  })

  it('retourne 0 si le terme n\'a aucun mot significatif (≥ 4 chars)', () => {
    expect(jaccardWithPainPoint('le', 'je veux personnalisation')).toBe(0)
    expect(jaccardWithPainPoint('a la', 'standardisation')).toBe(0)
  })

  it('détecte un mot commun (insensible aux accents et à la casse)', () => {
    // Le terme exact "personnalisée" partage 1 mot avec le painPoint après normalisation.
    const score = jaccardWithPainPoint(
      'personnalisée',
      'je veux une AGENCE PERSONNALISÉE et qui me comprenne',
    )
    expect(score).toBeGreaterThan(0)
  })

  it('retourne ~1 quand les deux ensembles sont identiques (ignorant accents/casse)', () => {
    // Mots ≥ 4 caractères pour passer le filtre stopwords.
    expect(jaccardWithPainPoint('referencement', 'REFERENCEMENT')).toBe(1)
  })

  it('Jaccard symétrique : intersection / union', () => {
    // term="agence locale", painPoint="agence personnalisee"
    // significants: { agence, locale } ∩ { agence, personnalisee } = { agence }
    // union = { agence, locale, personnalisee }, score = 1/3
    const s = jaccardWithPainPoint('agence locale', 'agence personnalisée')
    expect(s).toBeCloseTo(1 / 3, 5)
  })
})

describe('sortByPainAlignmentJaccard', () => {
  const baseTerms = [
    { term: 'standardisation' },
    { term: 'personnalisée' },
    { term: 'tarif' },
  ]

  it('renvoie le tableau original si enabled=false', () => {
    const out = sortByPainAlignmentJaccard(baseTerms, 'douleur personnalisée', false)
    expect(out).toBe(baseTerms) // référence identique = pas de copie
    expect(out.map(t => t.term)).toEqual(['standardisation', 'personnalisée', 'tarif'])
  })

  it('renvoie le tableau original si painPoint absent (pas de tri possible)', () => {
    const out = sortByPainAlignmentJaccard(baseTerms, null, true)
    expect(out).toBe(baseTerms)
  })

  it('trie par alignement décroissant si enabled=true et painPoint présent', () => {
    const out = sortByPainAlignmentJaccard(
      baseTerms,
      'je veux une agence personnalisée',
      true,
    )
    // "personnalisée" doit remonter en tête (match avec painPoint normalisé).
    expect(out[0].term).toBe('personnalisée')
    // L'ordre relatif des termes sans match (Jaccard 0) n'est pas garanti par stable-sort
    // mais tous deux doivent finir derrière le match.
    expect(out.slice(1).map(t => t.term).sort()).toEqual(['standardisation', 'tarif'])
  })

  it('ne mute pas le tableau d\'entrée', () => {
    const original = [...baseTerms]
    sortByPainAlignmentJaccard(baseTerms, 'douleur personnalisée', true)
    expect(baseTerms).toEqual(original)
  })
})
