// @vitest-environment node
/**
 * FR-CER-COCOON-PROGRESSIVE / FR-CER-CHILD-FROM-PILLAR-H2 — le cocon se
 * construit à partir du pilier, un article à la fois, chaque enfant né d'une
 * section de son parent.
 *
 * Avant C7, la création en lot acceptait n'importe quel ordre : un
 * intermédiaire pouvait naître avant son pilier, sans parent ni section.
 */
import { describe, it, expect } from 'vitest'
import { verifyCocoonHierarchy, parentSectionsOf, type CocoonHierarchyInput } from '../../../shared/verifiers/cocoon-hierarchy'

const rules = (issues: Array<{ level: string; rule: string }>) => issues.map(i => `${i.level}:${i.rule}`)

const PILIER = { id: 10, title: 'Rénovation énergétique : le guide', level: 'pilier' as const, parentId: null, parentSection: null }
const INTER = { id: 11, title: 'L’isolation des combles', level: 'intermediaire' as const, parentId: 10, parentSection: 'Isoler les combles' }

const enfant = (extra: Partial<CocoonHierarchyInput> = {}): CocoonHierarchyInput => ({
  level: 'intermediaire',
  parentId: 10,
  parentSection: 'Changer les fenêtres',
  cocoonArticles: [PILIER, INTER],
  parentSections: ['Isoler les combles', 'Changer les fenêtres', 'Les aides de l’État'],
  ...extra,
})

describe('verifyCocoonHierarchy — un cocon commence par son pilier', () => {
  it('cocon vide : le pilier passe', () => {
    expect(verifyCocoonHierarchy({ level: 'pilier', parentId: null, parentSection: null, cocoonArticles: [], parentSections: null })).toEqual([])
  })

  it('cocon vide : un intermédiaire est refusé ⛔', () => {
    const issues = verifyCocoonHierarchy({ level: 'intermediaire', parentId: null, parentSection: null, cocoonArticles: [], parentSections: null })
    expect(rules(issues)).toEqual(['technique:hierarchy-pillar-first'])
  })

  it('un second pilier est refusé ⛔', () => {
    const issues = verifyCocoonHierarchy({ level: 'pilier', parentId: null, parentSection: null, cocoonArticles: [PILIER], parentSections: null })
    expect(rules(issues)).toEqual(['technique:hierarchy-one-pillar'])
    expect(issues[0]!.message).toContain('Rénovation énergétique')
  })

  it('un pilier n’a pas de parent ⛔', () => {
    const issues = verifyCocoonHierarchy({ level: 'pilier', parentId: 11, parentSection: 'x', cocoonArticles: [], parentSections: null })
    expect(rules(issues)).toContain('technique:hierarchy-pillar-has-parent')
  })
})

describe('verifyCocoonHierarchy — un enfant naît d’une section de son parent', () => {
  it('intermédiaire sous le pilier, depuis une section libre : passe', () => {
    expect(verifyCocoonHierarchy(enfant())).toEqual([])
  })

  it('spécialisé sous un intermédiaire : passe', () => {
    expect(verifyCocoonHierarchy(enfant({ level: 'specifique', parentId: 11, parentSection: 'Laine soufflée', parentSections: ['Laine soufflée', 'Laine de roche'] }))).toEqual([])
  })

  it('sans parent ⛔', () => {
    expect(rules(verifyCocoonHierarchy(enfant({ parentId: null })))).toEqual(['technique:hierarchy-parent-missing'])
  })

  it('parent hors du cocon ⛔', () => {
    expect(rules(verifyCocoonHierarchy(enfant({ parentId: 999 })))).toEqual(['technique:hierarchy-parent-elsewhere'])
  })

  it('mauvais niveau de parent ⛔ : un spécialisé sous le pilier, un intermédiaire sous un intermédiaire', () => {
    expect(rules(verifyCocoonHierarchy(enfant({ level: 'specifique', parentId: 10 })))).toEqual(['technique:hierarchy-parent-level'])
    expect(rules(verifyCocoonHierarchy(enfant({ level: 'intermediaire', parentId: 11, parentSections: ['Laine soufflée'], parentSection: 'Laine soufflée' })))).toEqual(['technique:hierarchy-parent-level'])
  })

  it('sans section ⛔', () => {
    expect(rules(verifyCocoonHierarchy(enfant({ parentSection: '  ' })))).toEqual(['technique:hierarchy-section-missing'])
  })

  it('section inconnue du parent ⛔', () => {
    const issues = verifyCocoonHierarchy(enfant({ parentSection: 'Le chauffage au bois' }))
    expect(rules(issues)).toEqual(['technique:hierarchy-section-unknown'])
  })

  it('sections pas encore vérifiées (null) : la section n’est pas jugée, la section prise l’est', () => {
    expect(verifyCocoonHierarchy(enfant({ parentSection: 'Le chauffage au bois', parentSections: null }))).toEqual([])
    expect(rules(verifyCocoonHierarchy(enfant({ parentSection: 'Isoler les combles', parentSections: null })))).toEqual(['technique:hierarchy-section-taken'])
  })

  it('la casse et la ponctuation finale ne comptent pas', () => {
    expect(verifyCocoonHierarchy(enfant({ parentSection: 'changer les fenêtres ?' }))).toEqual([])
  })

  it('section déjà prise par un autre enfant ⛔ : deux pages se disputeraient le même sujet', () => {
    const issues = verifyCocoonHierarchy(enfant({ parentSection: 'isoler les combles' }))
    expect(rules(issues)).toEqual(['technique:hierarchy-section-taken'])
    expect(issues[0]!.message).toContain('L’isolation des combles')
  })
})

describe('parentSectionsOf — les sections dont un enfant peut naître', () => {
  it('les H2 du texte, sans introduction, conclusion ni FAQ', () => {
    const html = '<h1>Guide</h1><p>Chapeau.</p><h2>Introduction</h2><p>a</p><h2>Isoler les combles</h2><p>b</p><h3>Détail</h3><h2>Changer les <em>fenêtres</em></h2><p>c</p><h2>Questions fréquentes</h2><h2>Conclusion</h2><p>d</p>'
    expect(parentSectionsOf(html, [])).toEqual(['Isoler les combles', 'Changer les fenêtres'])
  })

  it('sans texte, les H2 de la structure validée', () => {
    const structure = [{ level: 1, text: 'Guide' }, { level: 2, text: 'Isoler les combles', children: [{ level: 3, text: 'x' }] }, { level: 2, text: 'En conclusion' }]
    expect(parentSectionsOf('', structure)).toEqual(['Isoler les combles'])
  })
})
