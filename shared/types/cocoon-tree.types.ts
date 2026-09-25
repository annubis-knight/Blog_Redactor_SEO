/**
 * Arbre réel d'un cocon (C7, FR-CER-COCOON-PROGRESSIVE) : les articles en base,
 * chacun avec ses sections (H2) et l'enfant qui en est né. C'est lui — et non la
 * proposition de plan, devenue carte indicative — qui dit ce qu'on peut créer :
 * le pilier d'un cocon vide, puis un enfant par section libre d'un parent rédigé.
 */
import type { ArticleLevel } from './keyword-validate.types.js'

export interface CocoonTreeSection {
  /** Titre du H2 du parent. */
  title: string
  /** L'article né de cette section, s'il existe. */
  childId: number | null
  childTitle: string | null
}

export interface CocoonTreeNode {
  id: number
  title: string
  level: ArticleLevel
  parentId: number | null
  parentSection: string | null
  /** Mot-clé principal (capitaine verrouillé, sinon mot-clé suggéré). */
  keyword: string | null
  /** Premier jet accepté par sa porte : l'article peut donner naissance à ses enfants. */
  drafted: boolean
  /** Sections dont un enfant peut naître (texte, sinon structure validée). */
  sections: CocoonTreeSection[]
}
