import { describe, it, expect } from 'vitest'
import { preselectPlacements, suggestLevel } from '../../../../scripts/auto-article/heuristics/pick-placement.js'
import { buildTree } from '../../../../scripts/auto-article/tree.js'

const tree = buildTree([
  {
    nom: 'Visibilité locale',
    cocons: [
      {
        name: 'Référencement local artisans',
        articles: [{ id: 1, title: 'Guide du référencement local', type: 'Pilier' }],
      },
      {
        name: 'Création de site vitrine',
        articles: [
          { id: 2, title: 'Combien coûte un site vitrine', type: 'Pilier' },
          { id: 3, title: 'Choisir son hébergeur', type: 'intermediaire' },
          { id: 4, title: 'Rédiger ses pages', type: 'intermediaire' },
          { id: 5, title: 'Optimiser ses images', type: 'intermediaire' },
        ],
      },
      { name: 'Cocon neuf', articles: [] },
    ],
  },
])

describe('auto:pick-placement — suggestLevel', () => {
  it('propose pilier quand le cocon n\'en a pas', () => {
    expect(suggestLevel(tree[0].cocoons[2])).toBe('pilier')
  })

  it('propose intermediaire quand le corps est maigre', () => {
    expect(suggestLevel(tree[0].cocoons[0])).toBe('intermediaire')
  })

  it('propose specifique quand le cocon est déjà étoffé', () => {
    expect(suggestLevel(tree[0].cocoons[1])).toBe('specifique')
  })
})

describe('auto:pick-placement — preselectPlacements', () => {
  it('classe en tête le cocon thématiquement le plus proche', () => {
    const out = preselectPlacements(tree, 'référencement local pour artisans du bâtiment')
    expect(out[0].cocoonName).toBe('Référencement local artisans')
    expect(out[0].affinity).toBeGreaterThan(0)
  })

  it('remonte le niveau conseillé et la composition', () => {
    const out = preselectPlacements(tree, 'référencement local artisans')
    expect(out[0].suggestedLevel).toBe('intermediaire')
    expect(out[0].counts).toEqual({ pilier: 1, intermediaire: 0, specifique: 0 })
    expect(out[0].missing).toContain('specifique')
  })

  it('limite le nombre de candidats', () => {
    expect(preselectPlacements(tree, 'site vitrine', 2)).toHaveLength(2)
  })

  it('reste déterministe quand aucune affinité ne ressort', () => {
    const a = preselectPlacements(tree, 'zzzz inconnu')
    const b = preselectPlacements(tree, 'zzzz inconnu')
    expect(a.map((c) => c.cocoonName)).toEqual(b.map((c) => c.cocoonName))
  })

  it('retourne une liste vide sur un arbre sans cocon', () => {
    expect(preselectPlacements([], 'quoi que ce soit')).toEqual([])
  })
})

describe('auto:pick-placement — biais de densité (régression run réel 2026-07-19)', () => {
  /**
   * Cas réel : un cocon vide « Stratégie de croissance » (nom qui colle au
   * sujet) perdait systématiquement face à « Croissance digitale Toulouse »
   * (16 articles), parce que l'affinité se mesurait aussi sur tous les titres.
   * Conséquence : les cocons vides ne se peuplaient jamais.
   */
  const biasTree = buildTree([
    {
      nom: 'Stratégie & Visibilité',
      cocons: [
        {
          name: 'Croissance digitale Toulouse',
          articles: Array.from({ length: 16 }, (_, i) => ({
            id: i,
            title: `Article ${i} croissance digitale site web conversion entreprise Toulouse`,
            type: i === 0 ? 'Pilier' : 'intermediaire',
          })),
        },
        { name: 'Stratégie de croissance', articles: [] },
      ],
    },
  ])

  const idea = 'un article important sur comment booster une stratégie de croissance'

  it('le cocon vide dont le nom colle passe devant le cocon dense', () => {
    const out = preselectPlacements(biasTree, idea)
    expect(out[0].cocoonName).toBe('Stratégie de croissance')
    expect(out[0].isEmpty).toBe(true)
  })

  it('propose le Pilier pour ce cocon vide (sa fondation manque)', () => {
    const out = preselectPlacements(biasTree, idea)
    expect(out[0].suggestedLevel).toBe('pilier')
  })

  it('expose le détail du score (nom vs contenu) pour la transparence', () => {
    const out = preselectPlacements(biasTree, idea)
    expect(out[0].nameAffinity).toBeGreaterThan(0)
    expect(out[0].contentAffinity).toBe(0)
  })

  it('n\'accorde AUCUN bonus à un cocon vide hors-sujet', () => {
    const tree2 = buildTree([
      {
        nom: 'Silo',
        cocons: [
          { name: 'Recettes de cuisine', articles: [] },
          { name: 'Croissance digitale', articles: [{ id: 1, title: 'Croissance digitale', type: 'Pilier' }] },
        ],
      },
    ])
    const out = preselectPlacements(tree2, 'croissance digitale')
    expect(out[0].cocoonName).toBe('Croissance digitale')
  })

  it('mesure le nom dans le bon sens : part du NOM couverte par l\'idée', () => {
    // Sens inverse (part de l'idée couverte par le nom) → ~0,15 partout, aucune
    // discrimination. Constaté sur données réelles le 2026-07-19.
    const t = buildTree([
      {
        nom: 'Silo',
        cocons: [
          { name: 'Croissance digitale', articles: [] },
          { name: 'Recettes de cuisine', articles: [] },
        ],
      },
    ])
    const longIdea =
      'un article assez long qui parle de croissance digitale et de beaucoup d autres choses encore'
    const out = preselectPlacements(t, longIdea)
    expect(out[0].cocoonName).toBe('Croissance digitale')
    expect(out[0].nameAffinity).toBe(1)
    expect(out[1].nameAffinity).toBe(0)
  })

  it('ne privilégie plus le cocon le plus fourni à affinité égale', () => {
    const tree3 = buildTree([
      {
        nom: 'Silo',
        cocons: [
          { name: 'Zeta', articles: [{ id: 1, title: 'x', type: 'Pilier' }, { id: 2, title: 'y', type: 'intermediaire' }] },
          { name: 'Alpha', articles: [{ id: 3, title: 'z', type: 'Pilier' }] },
        ],
      },
    ])
    // Aucune affinité des deux côtés → départage alphabétique, pas par densité.
    const out = preselectPlacements(tree3, 'sujet totalement etranger')
    expect(out[0].cocoonName).toBe('Alpha')
  })
})
