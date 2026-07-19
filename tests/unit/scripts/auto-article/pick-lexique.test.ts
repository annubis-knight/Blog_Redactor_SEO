import { describe, it, expect } from 'vitest'
import { pickLexique } from '../../../../scripts/auto-article/heuristics/pick-lexique.js'

describe('auto:pick-lexique — sélection', () => {
  it('prend tous les obligatoires + différenciateurs ≥ médiane densité', () => {
    const out = pickLexique({
      obligatoire: [{ term: 'balise' }, { term: 'google' }],
      differenciateur: [
        { term: 'maillage', density: 1 },
        { term: 'ancrage', density: 3 },
        { term: 'backlink', density: 5 },
      ],
    })
    // médiane = 3 → garde ancrage (3) et backlink (5), exclut maillage (1)
    expect(out).toEqual(['balise', 'google', 'ancrage', 'backlink'])
  })

  it('sans différenciateurs, ne garde que les obligatoires', () => {
    expect(pickLexique({ obligatoire: [{ term: 'balise' }], differenciateur: [] })).toEqual(['balise'])
  })

  it('plafonne à 30 termes (obligatoire prioritaire)', () => {
    const obligatoire = Array.from({ length: 40 }, (_, i) => ({ term: `terme${i}` }))
    const out = pickLexique({ obligatoire, differenciateur: [] })
    expect(out).toHaveLength(30)
    expect(out[0]).toBe('terme0')
  })

  it('déduplique (obligatoire prioritaire, insensible aux accents)', () => {
    const out = pickLexique({
      obligatoire: [{ term: 'référencement' }],
      differenciateur: [{ term: 'Referencement', density: 10 }],
    })
    expect(out).toEqual(['référencement'])
  })
})

describe('auto:pick-lexique — filtrage bruit (régression run réel)', () => {
  it('écarte les mots vides français', () => {
    const out = pickLexique({
      obligatoire: [{ term: 'vos' }, { term: 'chaque' }, { term: 'comment' }, { term: 'être' }, { term: 'trafic' }],
      differenciateur: [],
    })
    expect(out).toEqual(['trafic'])
  })

  it('écarte les fragments « mots » / « clés » isolés', () => {
    const out = pickLexique({
      obligatoire: [{ term: 'mots' }, { term: 'clés' }, { term: 'requête' }],
      differenciateur: [],
    })
    expect(out).toEqual(['requête'])
  })

  it('écarte les tokens trop courts mais garde les sigles de 3 lettres', () => {
    const out = pickLexique({
      obligatoire: [{ term: 'a' }, { term: 'de' }, { term: 'seo' }, { term: 'ads' }],
      differenciateur: [],
    })
    expect(out).toEqual(['seo', 'ads'])
  })

  it('écarte les mots déjà portés par le Capitaine et les Lieutenants', () => {
    const out = pickLexique(
      {
        obligatoire: [{ term: 'seo' }, { term: 'leads' }, { term: 'contenu' }],
        differenciateur: [],
      },
      { exclude: ['mots-clés SEO', 'générer des leads PME'] },
    )
    expect(out).toEqual(['contenu'])
  })

  it('la médiane est calculée sur les différenciateurs déjà filtrés', () => {
    const out = pickLexique({
      obligatoire: [],
      differenciateur: [
        { term: 'vos', density: 100 }, // stopword — ne doit pas fausser la médiane
        { term: 'ancrage', density: 2 },
        { term: 'backlink', density: 4 },
      ],
    })
    // après filtrage : [2, 4] → médiane 3 → garde backlink seulement
    expect(out).toEqual(['backlink'])
  })
})
