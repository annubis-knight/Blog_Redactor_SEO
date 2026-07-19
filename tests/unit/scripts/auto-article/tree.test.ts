import { describe, it, expect } from 'vitest'
import {
  buildTree,
  countByLevel,
  missingLevels,
  renderTree,
  toLevel,
} from '../../../../scripts/auto-article/tree.js'

const RAW = [
  {
    nom: 'Stratégie & Visibilité',
    description: 'silo test',
    cocons: [
      {
        name: 'Croissance digitale Toulouse',
        articles: [
          { id: 1, title: 'Guide stratégie digitale', type: 'Pilier' },
          { id: 2, title: 'Choisir son agence', type: 'intermediaire' },
        ],
      },
      { name: 'Cocon vide', articles: [] },
    ],
  },
]

describe('auto:tree — toLevel', () => {
  it('normalise les formes DB et canoniques', () => {
    expect(toLevel('Pilier')).toBe('pilier')
    expect(toLevel('pilier')).toBe('pilier')
    expect(toLevel('Spécialisé')).toBe('specifique')
    expect(toLevel('specifique')).toBe('specifique')
    expect(toLevel('Intermédiaire')).toBe('intermediaire')
  })

  it('retombe sur intermediaire si inconnu ou absent', () => {
    expect(toLevel(undefined)).toBe('intermediaire')
    expect(toLevel('wat')).toBe('intermediaire')
  })
})

describe('auto:tree — buildTree', () => {
  it('normalise silos (nom/cocons) et cocons (name/articles)', () => {
    const tree = buildTree(RAW)
    expect(tree).toHaveLength(1)
    expect(tree[0].name).toBe('Stratégie & Visibilité')
    expect(tree[0].cocoons).toHaveLength(2)
    expect(tree[0].cocoons[0].siloName).toBe('Stratégie & Visibilité')
    expect(tree[0].cocoons[0].articles[0].level).toBe('pilier')
  })

  it('tolère un payload vide', () => {
    expect(buildTree([])).toEqual([])
  })
})

describe('auto:tree — comptage et trous', () => {
  const tree = buildTree(RAW)

  it('compte les articles par niveau', () => {
    expect(countByLevel(tree[0].cocoons[0])).toEqual({ pilier: 1, intermediaire: 1, specifique: 0 })
  })

  it('identifie les niveaux manquants', () => {
    expect(missingLevels(tree[0].cocoons[0])).toEqual(['specifique'])
    expect(missingLevels(tree[0].cocoons[1])).toEqual(['pilier', 'intermediaire', 'specifique'])
  })
})

describe('auto:tree — renderTree', () => {
  const tree = buildTree(RAW)

  it('affiche silos, cocons, composition et articles', () => {
    const out = renderTree(tree)
    expect(out).toContain('Stratégie & Visibilité')
    expect(out).toContain('Croissance digitale Toulouse')
    expect(out).toContain('P1')
    expect(out).toContain('I1')
    expect(out).toContain('S0')
    expect(out).toContain('Guide stratégie digitale')
  })

  it('distingue visuellement cocon peuplé (●) et vide (○)', () => {
    const out = renderTree(tree)
    expect(out).toContain('●')
    expect(out).toContain('○')
  })

  it('marque le cocon ciblé', () => {
    const out = renderTree(tree, { highlightCocoon: 'croissance digitale toulouse' })
    expect(out).toContain('◀ emplacement proposé')
  })

  it('présente un cocon vide comme une opportunité, pas une erreur', () => {
    const out = renderTree(tree)
    expect(out).toContain('vide, à peupler')
    expect(out).toContain('candidat naturel pour un Pilier')
  })

  it('replie au-delà de la limite d\'articles', () => {
    const out = renderTree(tree, { maxArticlesPerCocoon: 1 })
    expect(out).toContain('+1 autre')
  })

  it('tronque les titres à la frontière de mot', () => {
    const long = buildTree([
      {
        nom: 'S',
        cocons: [{
          name: 'C',
          articles: [{ id: 1, title: 'Un titre volontairement très long qui doit être coupé proprement ici', type: 'Pilier' }],
        }],
      },
    ])
    const out = renderTree(long, { titleWidth: 30 })
    expect(out).toContain('…')
    expect(out).not.toContain('volontairementt')
    // Pas de coupure en plein mot : le caractère avant l'ellipse n'est pas un fragment.
    const line = out.split('\n').find((l) => l.includes('…')) ?? ''
    expect(/\s…$|[a-zéèêà]…$/.test(line.trim())).toBe(true)
  })

  it('focusSilo n\'affiche que le silo demandé', () => {
    const multi = buildTree([
      { nom: 'Silo A', cocons: [{ name: 'Cocon A', articles: [] }] },
      { nom: 'Silo B', cocons: [{ name: 'Cocon B', articles: [] }] },
    ])
    const out = renderTree(multi, { focusSilo: 'silo b' })
    expect(out).toContain('Silo B')
    expect(out).not.toContain('Silo A')
  })

  it('compact masque l\'en-tête et la légende (évite la redite au Gate)', () => {
    const out = renderTree(tree, { compact: true })
    expect(out).not.toContain('🌳 Arbre SEO')
    expect(out).not.toContain('candidat naturel')
    expect(out).toContain('Croissance digitale Toulouse')
  })

  it('focusSilo sur un silo inexistant retourne le message de vacuité', () => {
    expect(renderTree(tree, { focusSilo: 'inexistant' })).toContain('arbre vide')
  })

  it('accepte un thème injecté (couleurs) sans altérer la structure', () => {
    const upper = (s: string): string => s.toUpperCase()
    const out = renderTree(tree, {
      theme: {
        silo: upper,
        cocoon: (s) => s,
        empty: (s) => s,
        level: (_l, s) => s,
        article: (s) => s,
        dim: (s) => s,
        marker: (s) => s,
      },
    })
    expect(out).toContain('STRATÉGIE & VISIBILITÉ')
  })

  it('gère un arbre vide', () => {
    expect(renderTree([])).toContain('arbre vide')
  })
})
