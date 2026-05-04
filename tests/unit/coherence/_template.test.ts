/**
 * Template de test de cohérence affichage / calcul.
 *
 * À cloner pour chaque donnée partagée critique cartographiée dans
 * docs/data-flows/<nom>.md.
 *
 * Le test vérifie que la valeur AFFICHÉE à l'utilisateur et la valeur
 * UTILISÉE pour le tri / filtre / agrégat dérivent de la MÊME expression.
 *
 * Pourquoi : c'est le bug le plus pénible à débuguer — l'utilisateur clique
 * sur "trier par score" et la liste ne change pas, parce que le tri lit
 * `valeurA` pendant que la card affiche `valeurB`. Sans ce test, le drift
 * arrive en silence, parfois plusieurs semaines avant d'être signalé.
 *
 * Convention : préfixer le `describe()` par l'ID de l'exigence du PRD
 * (`_bmad-output/planning-artifacts/prd.md`). Cela crée la traçabilité
 * tests ↔ exigences (cf. CLAUDE.md §2.1).
 */

import { describe, it } from 'vitest'

describe('FR-XXX — cohérence affichage / calcul pour <nom-de-la-donnée>', () => {
  it('affichage et tri utilisent la même expression', () => {
    // 1. Préparer un échantillon représentatif (incluant des null)
    const items = [
      // makeMockItem({ score: 80 }),
      // makeMockItem({ score: null }),
      // makeMockItem({ score: 60 }),
    ]

    // 2. Trier
    // const sorted = sortByScore(items)

    // 3. Vérifier que la valeur affichée est exactement celle utilisée pour le tri
    items.forEach(_item => {
      // expect(item.displayedScore).toBe(item.scoreUsedForSort)
    })
  })

  it('valeur null est affichée et triée de la même façon (en bas, pas comme 0)', () => {
    // const items = [
    //   makeMockItem({ score: 80 }),
    //   makeMockItem({ score: null }),
    //   makeMockItem({ score: 0 }),
    // ]
    // const sorted = sortByScore(items)
    // // null doit être après 0 (donc en dernier en tri desc)
    // expect(sorted[sorted.length - 1].score).toBeNull()
  })

  it('agrégats (moyenne) excluent les null au lieu de les compter comme 0', () => {
    // import { meanScore } from '@/shared/score'
    // const items = [
    //   makeMockItem({ score: 80 }),
    //   makeMockItem({ score: null }),
    //   makeMockItem({ score: 60 }),
    // ]
    // expect(meanScore(items.map(i => i.score))).toBe(70) // pas (80 + 0 + 60)/3
  })

  it.todo('reload restaure la même valeur que le premier load')
  it.todo('switch d\'onglet ne réinitialise pas la valeur')
})
