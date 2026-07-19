import { describe, it, expect } from 'vitest'
import { norm, singularize, tokenize, topicalAffinity } from '../../../../scripts/auto-article/text.js'

describe('auto:text — norm / singularize', () => {
  it('normalise casse et accents', () => {
    expect(norm('  Référencement NATUREL ')).toBe('referencement naturel')
  })

  it('singularise les tokens longs uniquement', () => {
    expect(singularize('leads')).toBe('lead')
    expect(singularize('pages')).toBe('page')
    expect(singularize('vos')).toBe('vos') // trop court pour être singularisé
    expect(singularize('seo')).toBe('seo')
  })
})

describe('auto:text — tokenize', () => {
  it('retire les mots grammaticaux et les tokens courts', () => {
    expect(tokenize('générer des leads pour les PME')).toEqual(['generer', 'lead', 'pme'])
  })

  it('découpe sur la ponctuation', () => {
    expect(tokenize('mots-clés SEO')).toEqual(['mot', 'cle', 'seo'])
  })
})

describe('auto:text — topicalAffinity', () => {
  const topic = 'Générer des leads B2B à Toulouse avec le SEO naturel'

  it('1 quand tous les tokens du mot-clé sont dans le sujet', () => {
    expect(topicalAffinity('générer leads SEO', topic)).toBe(1)
  })

  it('fraction quand une partie seulement recoupe', () => {
    expect(topicalAffinity('mots-clés SEO', topic)).toBeCloseTo(1 / 3, 2)
  })

  it('0 quand rien ne recoupe', () => {
    expect(topicalAffinity('recette de cassoulet', topic)).toBe(0)
  })

  it('tolère le pluriel (leads ↔ lead)', () => {
    expect(topicalAffinity('lead', topic)).toBe(1)
  })

  it('0 sur mot-clé vide ou sujet vide', () => {
    expect(topicalAffinity('', topic)).toBe(0)
    expect(topicalAffinity('seo', '')).toBe(0)
  })
})
