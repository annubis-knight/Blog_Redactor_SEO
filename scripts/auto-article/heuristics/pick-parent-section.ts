/**
 * Où rattacher un nouvel article dans le cocon (C7, FR-CER-CHILD-FROM-PILLAR-H2).
 *
 * Un enfant naît d'une section (H2) libre de son parent : un intermédiaire,
 * d'une section du pilier ; un spécialisé, d'une section d'un intermédiaire.
 * On retient la section libre dont le titre parle le plus du sujet, et, à
 * égalité, un parent déjà rédigé (un parent pas rédigé refusera l'enfant).
 */
import type { CocoonTreeNode } from '../../../shared/types/cocoon-tree.types.js'
import type { ArticleLevel } from '../../../shared/types/keyword-validate.types.js'
import { topicalAffinity } from '../text.js'

export type ParentChoice =
  | { ok: true; parentId: number; parentTitle: string; parentSection: string; drafted: boolean }
  | { ok: false; reason: string }

const PARENT_LEVEL: Record<ArticleLevel, ArticleLevel | null> = {
  pilier: null,
  intermediaire: 'pilier',
  specifique: 'intermediaire',
}

const LEVEL_LABEL: Record<ArticleLevel, string> = { pilier: 'pilier', intermediaire: 'intermédiaire', specifique: 'spécialisé' }

export function pickParentSection(tree: CocoonTreeNode[], level: ArticleLevel, topic: string): ParentChoice | null {
  const parentLevel = PARENT_LEVEL[level]
  if (!parentLevel) return null

  const parents = tree.filter(n => n.level === parentLevel)
  if (parents.length === 0) {
    return { ok: false, reason: `Aucun ${LEVEL_LABEL[parentLevel]} dans ce cocon : un ${LEVEL_LABEL[level]} naît d’une section d’un ${LEVEL_LABEL[parentLevel]}. Créez-le d’abord.` }
  }

  const options = parents.flatMap(p => p.sections
    .filter(s => s.childId === null && s.title)
    .map(s => ({ parent: p, section: s.title, score: topicalAffinity(s.title, topic) })))
  if (options.length === 0) {
    return { ok: false, reason: `Aucune section libre dans les ${LEVEL_LABEL[parentLevel]}s du cocon : chacune a déjà donné son article.` }
  }

  options.sort((a, b) => b.score - a.score || Number(b.parent.drafted) - Number(a.parent.drafted))
  const best = options[0]!
  return { ok: true, parentId: best.parent.id, parentTitle: best.parent.title, parentSection: best.section, drafted: best.parent.drafted }
}
