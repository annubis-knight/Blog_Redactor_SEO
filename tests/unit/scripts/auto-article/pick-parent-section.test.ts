// @vitest-environment node
/**
 * C7 — le mode automatique rattache un nouvel article à la section libre de son
 * parent qui parle le plus du sujet (avant, il créait un intermédiaire ou un
 * spécialisé sans aucun parent).
 */
import { describe, it, expect } from 'vitest'
import { pickParentSection } from '../../../../scripts/auto-article/heuristics/pick-parent-section.js'
import type { CocoonTreeNode } from '../../../../shared/types/cocoon-tree.types.js'

const node = (extra: Partial<CocoonTreeNode>): CocoonTreeNode => ({
  id: 1, title: 'Pilier', level: 'pilier', parentId: null, parentSection: null, keyword: null, drafted: true, sections: [], ...extra,
})

const TREE: CocoonTreeNode[] = [
  node({
    id: 10, title: 'Rénovation énergétique : le guide',
    sections: [
      { title: 'Isoler les combles', childId: 11, childTitle: 'Isoler ses combles' },
      { title: 'Changer les fenêtres', childId: null, childTitle: null },
      { title: 'Les aides de l’État', childId: null, childTitle: null },
    ],
  }),
  node({ id: 11, title: 'Isoler ses combles', level: 'intermediaire', parentId: 10, parentSection: 'Isoler les combles', drafted: false, sections: [{ title: 'La laine soufflée', childId: null, childTitle: null }] }),
]

describe('pickParentSection', () => {
  it('un pilier n’a pas de parent', () => {
    expect(pickParentSection(TREE, 'pilier', 'rénovation')).toBeNull()
  })

  it('un intermédiaire : la section libre du pilier la plus proche du sujet', () => {
    expect(pickParentSection(TREE, 'intermediaire', 'quelles aides de l’État pour rénover')).toEqual({
      ok: true, parentId: 10, parentTitle: 'Rénovation énergétique : le guide', parentSection: 'Les aides de l’État', drafted: true,
    })
  })

  it('une section déjà prise n’est jamais choisie', () => {
    const choice = pickParentSection(TREE, 'intermediaire', 'isoler les combles perdus')
    expect(choice).toMatchObject({ ok: true })
    expect((choice as { parentSection: string }).parentSection).not.toBe('Isoler les combles')
  })

  it('un spécialisé : une section d’un intermédiaire (même pas rédigé : le serveur le dira)', () => {
    expect(pickParentSection(TREE, 'specifique', 'laine soufflée')).toMatchObject({ ok: true, parentId: 11, parentSection: 'La laine soufflée', drafted: false })
  })

  it('pas de parent du bon niveau : la raison est dite', () => {
    const choice = pickParentSection([], 'intermediaire', 'x')
    expect(choice).toMatchObject({ ok: false })
    expect((choice as { reason: string }).reason).toMatch(/Aucun pilier/)
  })

  it('plus aucune section libre : la raison est dite', () => {
    const plein = [node({ id: 10, sections: [{ title: 'Isoler', childId: 11, childTitle: 'x' }] })]
    expect(pickParentSection(plein, 'intermediaire', 'isoler')).toMatchObject({ ok: false, reason: expect.stringMatching(/section libre/) })
  })
})
