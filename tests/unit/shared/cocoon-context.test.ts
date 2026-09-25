// @vitest-environment node
/**
 * FR-INFRA-COCOON-CONTEXT — chaque génération reçoit le même état du cocon :
 * articles, niveaux, mots-clés, sections dont chacun est né, rédigé ou non ; et
 * pour l'article visé, la section du parent qui l'annonce et ses propres enfants.
 *
 * Le pilier 1013 a été écrit sans rien savoir de ses enfants : il a traité en
 * profondeur ce qu'ils devaient dire.
 */
import { describe, it, expect } from 'vitest'
import { renderCocoonContext } from '../../../shared/cocoon-context'
import type { CocoonTreeNode } from '../../../shared/types/cocoon-tree.types'

const node = (extra: Partial<CocoonTreeNode>): CocoonTreeNode => ({
  id: 1, title: 'x', level: 'pilier', parentId: null, parentSection: null, keyword: null, drafted: false, sections: [], ...extra,
})

const TREE: CocoonTreeNode[] = [
  node({
    id: 10, title: 'Rénovation énergétique : le guide', keyword: 'renovation energetique', drafted: true,
    sections: [
      { title: 'Isoler les combles', childId: 11, childTitle: 'Isoler ses combles' },
      { title: 'Changer les fenêtres', childId: null, childTitle: null },
    ],
  }),
  node({
    id: 11, title: 'Isoler ses combles', level: 'intermediaire', parentId: 10, parentSection: 'Isoler les combles', keyword: 'isolation combles',
    sections: [{ title: 'La laine soufflée', childId: 12, childTitle: 'Laine soufflée : le guide' }],
  }),
  node({ id: 12, title: 'Laine soufflée : le guide', level: 'specifique', parentId: 11, parentSection: 'La laine soufflée' }),
  node({ id: 13, title: 'Ancien article sans parent', level: 'intermediaire' }),
]

describe('renderCocoonContext — l’arbre', () => {
  const text = renderCocoonContext({ cocoonName: 'Rénovation', tree: TREE })

  it('le pilier, puis chaque section et l’article qui en est né, niveau par niveau', () => {
    expect(text).toContain('Cocon « Rénovation »')
    expect(text).toContain('Pilier « Rénovation énergétique : le guide » (mot-clé « renovation energetique ») — rédigé')
    expect(text).toContain('Section « Isoler les combles » → intermédiaire « Isoler ses combles » (mot-clé « isolation combles ») — à rédiger')
    expect(text).toContain('Section « Changer les fenêtres » → pas encore d’article')
    expect(text).toContain('Section « La laine soufflée » → spécialisé « Laine soufflée : le guide »')
    expect(text.indexOf('La laine soufflée')).toBeGreaterThan(text.indexOf('Isoler les combles'))
  })

  it('les articles d’avant l’arbre (sans parent) restent cités', () => {
    expect(text).toMatch(/sans parent[\s\S]*Ancien article sans parent/)
  })
})

describe('renderCocoonContext — l’article visé', () => {
  it('un enfant connaît la section qui l’annonce, et ce que son parent en dit déjà', () => {
    const text = renderCocoonContext({
      cocoonName: 'Rénovation', tree: TREE,
      focus: { articleId: 11, parentId: 10, parentSection: 'Isoler les combles' },
      parentSectionText: 'Les combles perdent 30 % de la chaleur. Isoler coûte moins qu’on le croit.',
    })
    expect(text).toContain('Il naît de la section « Isoler les combles » de « Rénovation énergétique : le guide »')
    expect(text).toContain('> Les combles perdent 30 % de la chaleur.')
    expect(text).toMatch(/ne la répète pas/)
    // Ses propres enfants : il les résume, ne les creuse pas.
    expect(text).toContain('« La laine soufflée » → « Laine soufflée : le guide »')
    expect(text).toMatch(/résume[\s\S]*renvoie/)
  })

  it('le pilier : ses enfants existants sont à résumer, pas à creuser', () => {
    const text = renderCocoonContext({ cocoonName: 'Rénovation', tree: TREE, focus: { articleId: 10, parentId: null, parentSection: null } })
    expect(text).toContain('« Isoler les combles » → « Isoler ses combles »')
    expect(text).not.toContain('Il naît de la section')
  })

  it('un article à naître (candidats du Cerveau) : la section qui l’annonce', () => {
    const text = renderCocoonContext({
      cocoonName: 'Rénovation', tree: TREE,
      focus: { parentId: 10, parentSection: 'Changer les fenêtres' },
      parentSectionText: 'Le double vitrage divise les pertes par deux.',
    })
    expect(text).toContain('Il naît de la section « Changer les fenêtres »')
    expect(text).toContain('> Le double vitrage divise les pertes par deux.')
  })

  it('cocon vide : l’article en sera le pilier', () => {
    const text = renderCocoonContext({ cocoonName: 'Rénovation', tree: [], focus: { parentId: null, parentSection: null } })
    expect(text).toMatch(/vide[\s\S]*pilier/)
  })

  it('le texte de la section du parent est borné', () => {
    const text = renderCocoonContext({
      cocoonName: 'Rénovation', tree: TREE,
      focus: { parentId: 10, parentSection: 'Changer les fenêtres' },
      parentSectionText: 'mot '.repeat(2000),
    })
    expect(text.length).toBeLessThan(4000)
  })
})
