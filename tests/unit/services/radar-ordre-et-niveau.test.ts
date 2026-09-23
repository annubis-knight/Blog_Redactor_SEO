/**
 * FR-RAD-MARKET-LEVEL-AWARE — une carte du Radar porte une seule note.
 *
 * La note d'un mot-clé dépend du niveau de l'article : à 150 recherches/mois
 * le volume vaut 0/100 pour un pilier, 50 pour un intermédiaire et 100 pour un
 * spécifique. Il pèse 30 % du total, soit 30 points d'écart pour la même donnée.
 *
 * Le scan serveur notait tout en « intermediaire », faute de recevoir le
 * niveau. La carte, elle, recalculait avec le vrai niveau de l'article : sur un
 * pilier, l'anneau affichait 42 quand le panneau IA affichait 58 juste à côté —
 * et c'est ce second chiffre qui classait les suggestions et partait dans les
 * prompts.
 */
import { describe, it, expect } from 'vitest'
import { computeMarketScore } from '../../../shared/scoring-kpi'
import { compareScores } from '../../../shared/score/index'
import type { RadarKeywordKpis } from '../../../shared/types/intent.types.js'

/** KPI d'un mot-clé de niche : 150 recherches/mois, difficulté moyenne. */
function kpisDeNiche(searchVolume: number): RadarKeywordKpis {
  return {
    searchVolume,
    difficulty: 35,
    cpc: 1.2,
    intentTypes: ['commercial'],
    intentProbability: 0.8,
    paaWeightedScore: 1.5,
    autocompleteMatchCount: 5,
  } as RadarKeywordKpis
}

describe('le niveau de l’article change la note, comme prévu', () => {
  it('note le même mot-clé différemment selon le niveau', () => {
    const kpis = kpisDeNiche(150)

    const pilier = computeMarketScore(kpis, 'pilier').total
    const intermediaire = computeMarketScore(kpis, 'intermediaire').total
    const specifique = computeMarketScore(kpis, 'specifique').total

    expect(pilier, 'un pilier vise large : 150 recherches, c’est peu').toBeLessThan(intermediaire!)
    expect(specifique, 'un spécifique vise précis : 150 recherches, c’est bien').toBeGreaterThan(intermediaire!)
  })

  it('l’écart est assez large pour changer une décision', () => {
    const kpis = kpisDeNiche(150)
    const pilier = computeMarketScore(kpis, 'pilier').total!
    const specifique = computeMarketScore(kpis, 'specifique').total!

    expect(specifique - pilier, 'le volume pèse 30 % du total').toBeGreaterThanOrEqual(25)
  })

  it('un gros volume reste bon à tous les niveaux', () => {
    const kpis = kpisDeNiche(5000)
    for (const niveau of ['pilier', 'intermediaire', 'specifique'] as const) {
      expect(computeMarketScore(kpis, niveau).total, niveau).toBeGreaterThan(50)
    }
  })
})

describe('l’ordre initial des cartes suit la note affichée', () => {
  /** Reproduit le tri appliqué à la sortie du scan. */
  function ranger(notes: Array<number | null>): Array<number | null> {
    return [...notes].sort((a, b) => compareScores(a, b))
  }

  it('range de la meilleure note à la moins bonne', () => {
    expect(ranger([42, 78, 12, 65])).toEqual([78, 65, 42, 12])
  })

  it('met les notes absentes en bas, jamais confondues avec un zéro', () => {
    expect(ranger([null, 55, null, 90])).toEqual([90, 55, null, null])
  })

  it('ne place pas un mot-clé mal renseigné devant un mauvais mot-clé', () => {
    // Un « — » n'est pas un 0 : il descend, mais il ne prend pas la place
    // d'une note réellement basse — c'est une absence, pas un verdict.
    const range = ranger([0, null, 10])
    expect(range[0]).toBe(10)
    expect(range[1]).toBe(0)
    expect(range[2]).toBeNull()
  })
})
