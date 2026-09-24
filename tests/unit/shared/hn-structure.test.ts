// @vitest-environment node
/**
 * Structure Hn d'un article : lecture du format stocké et récurrence chez les
 * concurrents (épopée qualité SEO, checklist M6 et M9).
 *
 * M9 — `article_keywords.hn_structure` stocke `{ level: number, text, children }`.
 * La recommandation de longueur attendait `{ level: 'H2', title }` : elle ne
 * recevait jamais le sommaire, et conseillait une longueur à l'aveugle.
 *
 * M6 — le filtre « titre récurrent chez les concurrents » gardait tout titre
 * présent sur 10 % des pages. Avec 10 pages au plus, un titre vu une seule fois
 * (menu, pied de page d'une agence) passait : ce n'est pas une récurrence.
 */
import { describe, it, expect } from 'vitest'
import { flattenHnStructure, recurringHeadings, MIN_RECURRING_PAGES } from '../../../shared/utils/hn-structure.js'
import type { HnRecurrenceItem } from '../../../shared/types/serp-analysis.types.js'

describe('flattenHnStructure — lire le sommaire tel qu’il est stocké', () => {
  it('aplatit le format du Moteur { level: number, text, children }', () => {
    const stored = [
      { level: 1, text: 'Stratégie digitale pour PME à Toulouse' },
      { level: 2, text: 'Pourquoi mon site ne génère pas de clients', children: [{ level: 3, text: 'Problème 1' }] },
      { level: 2, text: 'Audit de site' },
    ]
    expect(flattenHnStructure(stored)).toEqual([
      { level: 1, text: 'Stratégie digitale pour PME à Toulouse' },
      { level: 2, text: 'Pourquoi mon site ne génère pas de clients' },
      { level: 3, text: 'Problème 1' },
      { level: 2, text: 'Audit de site' },
    ])
  })

  it('comprend aussi l’ancien format { level: "H2", title }', () => {
    expect(flattenHnStructure([{ level: 'H2', title: 'Ancien' }])).toEqual([{ level: 2, text: 'Ancien' }])
  })

  it('ignore ce qui n’est pas un titre lisible, sans planter', () => {
    expect(flattenHnStructure(null)).toEqual([])
    expect(flattenHnStructure('texte')).toEqual([])
    expect(flattenHnStructure([{ level: 2 }, { text: 'sans niveau' }, { level: 7, text: 'H7' }, { level: 2, text: '   ' }])).toEqual([])
  })
})

function item(text: string, count: number, total = 10): HnRecurrenceItem {
  return { level: 2, text, count, total, percent: Math.round((count / total) * 100) }
}

describe('recurringHeadings — un titre récurrent revient sur plusieurs pages', () => {
  it('écarte un titre vu sur une seule page, même s’il pèse 10 %', () => {
    const kept = recurringHeadings([item('Nos services', 1), item('Qu’est-ce qu’une stratégie digitale', 3)])
    expect(kept.map(h => h.text)).toEqual(['Qu’est-ce qu’une stratégie digitale'])
  })

  it(`garde un titre vu sur ${MIN_RECURRING_PAGES} pages`, () => {
    expect(recurringHeadings([item('Budget', MIN_RECURRING_PAGES)])).toHaveLength(1)
  })

  it('renvoie la forme attendue par le prompt, sans le total', () => {
    expect(recurringHeadings([item('Budget', 4)])).toEqual([{ level: 2, text: 'Budget', count: 4, percent: 40 }])
  })
})
