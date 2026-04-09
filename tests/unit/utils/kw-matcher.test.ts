import { describe, it, expect } from 'vitest'
import { matchKeyword, prepareText, matchKeywordPrepared, normalizeFrench } from '../../../src/utils/keyword-matcher'

describe('keyword-matcher', () => {
  it('normalizeFrench strips plural and feminine correctly', () => {
    expect(normalizeFrench('professionnelle')).toBe('professionnel')
    expect(normalizeFrench('étapes')).toBe('étap')
    expect(normalizeFrench('seo')).toBe('seo')
  })

  it('normalizeFrench derivational stemming — verb/noun pairs converge', () => {
    // créer / création / créé → cré
    expect(normalizeFrench('créer')).toBe('cré')
    expect(normalizeFrench('création')).toBe('cré')
    expect(normalizeFrench('créé')).toBe('créé') // length ≤ 4 after inflectional, stays
    expect(normalizeFrench('créations')).toBe('cré')

    // développement / développer → développ
    expect(normalizeFrench('développement')).toBe('développ')
    expect(normalizeFrench('développer')).toBe('développ')

    // optimisation / optimiser → optim
    expect(normalizeFrench('optimisation')).toBe('optim')
    expect(normalizeFrench('optimiser')).toBe('optim')

    // réseaux → réseau (plural strip only, no derivational suffix matches)
    expect(normalizeFrench('réseaux')).toBe('réseau')
  })

  it('exact match detects keyword and semantic match detects long-tail French', () => {
    const exact = matchKeyword('Le seo est important pour votre site', 'seo')
    expect(exact.detected).toBe(true)
    expect(exact.method).toBe('exact')
    expect(exact.score).toBe(1.0)
    const semantic = matchKeyword('Les étapes clés de la création de site web professionnel réussie', 'étapes création site web professionnel')
    expect(semantic.detected).toBe(true)
    expect(semantic.method).toBe('semantic')
    expect(semantic.score).toBeGreaterThan(0.6)
  })

  it('edge cases and prepareText reuse', () => {
    expect(matchKeyword('', 'seo').detected).toBe(false)
    expect(matchKeyword('some text', '').detected).toBe(false)
    expect(matchKeyword('Apprenez le design graphique', 'étapes création site web professionnel').detected).toBe(false)
    const prepared = prepareText('créer un site web professionnel avec référencement naturel')
    expect(matchKeywordPrepared(prepared, 'site web professionnel').detected).toBe(true)
    expect(matchKeywordPrepared(prepared, 'marketing digital').detected).toBe(false)
  })
})
