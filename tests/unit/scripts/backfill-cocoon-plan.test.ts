// @vitest-environment node
/**
 * C7 — rattrapage des cocons d'avant l'arbre : chaque article sans parent est
 * rapproché de son parent (d'après la carte de stratégie, `parentTitle`) et de
 * la section de ce parent qui parle de son sujet. Ce qui ne se rapproche pas
 * sûrement est listé, jamais deviné.
 */
import { describe, it, expect } from 'vitest'
import { planCocoonBackfill, type PlanArticle } from '../../../scripts/backfill-cocoon-plan'

const a = (over: Partial<PlanArticle>): PlanArticle => ({ id: 0, title: '', level: 'intermediaire', parentId: null, parentSection: null, keyword: null, ...over })

const PILIER = a({ id: 10, title: 'Rénovation énergétique : le guide', level: 'pilier' })
const COMBLES = a({ id: 11, title: 'Isoler ses combles perdus', keyword: 'isolation combles' })
const FENETRES = a({ id: 12, title: 'Changer ses fenêtres', keyword: 'changer fenetres' })
const LAINE = a({ id: 13, title: 'La laine soufflée', level: 'specifique', keyword: 'laine soufflee' })
const SECTIONS: Record<number, string[]> = {
  10: ['Isoler les combles', 'Changer les fenêtres', 'Les aides de l’État'],
  11: ['La laine soufflée', 'La laine de roche'],
}
const sectionsOf = (id: number) => SECTIONS[id] ?? []

describe('planCocoonBackfill', () => {
  it('chaque enfant rejoint son parent (carte de stratégie) et la section qui parle de lui', () => {
    const plan = planCocoonBackfill(
      [PILIER, COMBLES, FENETRES, LAINE],
      [
        { title: 'Isoler ses combles perdus', parentTitle: 'Rénovation énergétique : le guide' },
        { title: 'changer ses fenêtres', parentTitle: 'rénovation énergétique : le guide' },
        { title: 'La laine soufflée', parentTitle: 'Isoler ses combles perdus' },
      ],
      sectionsOf,
    )
    expect(plan.links).toEqual([
      { childId: 11, parentId: 10, section: 'Isoler les combles' },
      { childId: 12, parentId: 10, section: 'Changer les fenêtres' },
      { childId: 13, parentId: 11, section: 'La laine soufflée' },
    ])
    expect(plan.unmatched).toEqual([])
  })

  it('un intermédiaire sans parent sur la carte rejoint le pilier unique du cocon', () => {
    const plan = planCocoonBackfill([PILIER, COMBLES], [], sectionsOf)
    expect(plan.links).toEqual([{ childId: 11, parentId: 10, section: 'Isoler les combles' }])
  })

  it('aucune section du parent ne parle du sujet : listé, pas deviné', () => {
    const hors = a({ id: 14, title: 'Le chauffage au bois', keyword: 'chauffage bois' })
    const plan = planCocoonBackfill([PILIER, hors], [{ title: 'Le chauffage au bois', parentTitle: 'Rénovation énergétique : le guide' }], sectionsOf)
    expect(plan.links).toEqual([])
    expect(plan.unmatched).toEqual([{ childId: 14, title: 'Le chauffage au bois', reason: expect.stringMatching(/aucune section/i) }])
  })

  it('une section ne donne qu’un article ; un spécialisé sans parent connu est listé', () => {
    const doublon = a({ id: 15, title: 'Isoler les combles aménagés', keyword: 'isolation combles' })
    const plan = planCocoonBackfill([PILIER, COMBLES, doublon, LAINE], [], sectionsOf)
    expect(plan.links.map(l => l.childId)).toEqual([11])
    expect(plan.unmatched.map(u => u.childId).sort()).toEqual([13, 15])
  })

  // Cas réel du cocon 1013 : l'ordre des identifiants donnait la section d'audit
  // au premier article venu, au lieu de celui qui en parle vraiment.
  it('une section va à l’article qui en parle le plus, pas au premier venu', () => {
    const pilier = a({ id: 20, title: 'Croissance digitale : le guide', level: 'pilier' })
    const conversion = a({ id: 21, title: 'Transformer un site vitrine en machine de conversion', keyword: 'conversion site web' })
    const audit = a({ id: 22, title: 'Auditer son site web : les freins', keyword: 'audit site web' })
    const plan = planCocoonBackfill([pilier, conversion, audit], [], () => ['Audit site web : par où commencer pour améliorer la conversion', 'Les aides de l’État'])
    expect(plan.links).toEqual([{ childId: 22, parentId: 20, section: 'Audit site web : par où commencer pour améliorer la conversion' }])
    expect(plan.unmatched.map(u => u.childId)).toEqual([21])
  })

  // Cas réel du cocon 1012 : « créer un site web » est le sujet de tout le cocon,
  // pas celui de la section « Pourquoi créer un site web à Toulouse ? ».
  it('les mots du sujet du parent ne suffisent pas à rattacher', () => {
    const pilier = a({ id: 30, title: 'Création de site web à Toulouse : le guide', level: 'pilier', keyword: 'création site web toulouse' })
    const agence = a({ id: 31, title: 'Agence, freelance ou soi-même : qui choisir pour créer son site ?', keyword: 'agence web ou freelance' })
    const plan = planCocoonBackfill([pilier, agence], [], () => ['Pourquoi créer un site web à Toulouse ?'])
    expect(plan.links).toEqual([])
    expect(plan.unmatched.map(u => u.childId)).toEqual([31])
  })

  // Cas réel du cocon 1013 : « site » répété dans la section comptait deux fois.
  it('un mot répété dans la section ne compte qu’une fois', () => {
    const pilier = a({ id: 40, title: 'Croissance digitale des entreprises', level: 'pilier' })
    const vitrine = a({ id: 41, title: 'Transformer un site vitrine en machine de conversion' })
    const plan = planCocoonBackfill([pilier, vitrine], [], () => ['Site vitrine vs site marchand : quelle différence pour mon entreprise'])
    expect(plan.links).toEqual([])
  })

  it('un article déjà rattaché n’est pas touché, et sa section compte comme prise', () => {
    const rattache = a({ ...COMBLES, parentId: 10, parentSection: 'Isoler les combles' })
    const autre = a({ id: 16, title: 'Isolation des combles : les aides', keyword: 'isolation combles aides' })
    const plan = planCocoonBackfill([PILIER, rattache, autre], [], sectionsOf)
    expect(plan.links.find(l => l.childId === 11)).toBeUndefined()
    expect(plan.links.find(l => l.childId === 16)?.section).not.toBe('Isoler les combles')
  })
})
