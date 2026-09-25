/**
 * Arbre réel d'un cocon (C7, FR-CER-COCOON-PROGRESSIVE) : les articles en base,
 * chacun avec ses sections (H2) et l'enfant qui en est né. C'est lui — et non la
 * proposition de plan, devenue carte indicative — qui dit ce qu'on peut créer :
 * le pilier d'un cocon vide, puis un enfant par section libre d'un parent rédigé.
 */
import type { ArticleLevel } from './keyword-validate.types.js'
import type { ApiUsage } from './api.types.js'
import type { PainIntentExpected } from './scoring.types.js'

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

/** Mesure réelle d'un mot-clé (FR-CER-KEYWORD-REAL-DATA) ; `metrics: null` si elle a échoué. */
export interface KeywordMeasure {
  metrics: {
    searchVolume: number | null
    keywordDifficulty: number | null
    cpc: number | null
    intent: PainIntentExpected | null
  } | null
  /** Les trois premiers résultats organiques. */
  serp: Array<{ position: number; title: string; domain: string; url: string }>
}

/** Un mot-clé candidat pour un nouvel article, proposé par l'IA puis mesuré. */
export interface ChildCandidate extends KeywordMeasure {
  keyword: string
  title: string
  rationale: string
  painPoint: string | null
}

/** Réponse de POST /api/cocoons/:cocoonId/child-candidates. */
export interface ChildCandidatesResult {
  level: ArticleLevel
  parentId: number | null
  parentSection: string | null
  candidates: ChildCandidate[]
  usage: ApiUsage | null
}
