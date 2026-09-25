/**
 * Hiérarchie du cocon (FR-CER-COCOON-PROGRESSIVE, FR-CER-CHILD-FROM-PILLAR-H2).
 *
 * Un cocon se construit à partir de son pilier, un article à la fois : chaque
 * enfant naît d'une section (H2) de son parent, qui le résume et y renvoie.
 * Avant C7, la création en lot acceptait n'importe quel ordre — un
 * intermédiaire naissait avant son pilier, sans parent ni section, et le pilier
 * 1013 a fini par traiter en profondeur ce que ses enfants devaient dire.
 *
 * Tout est ⛔ : ce sont des règles de structure, sans dérogation possible.
 *   - pilier d'abord (un enfant dans un cocon sans pilier) ;
 *   - un seul pilier ; un pilier n'a pas de parent ;
 *   - parent obligatoire, dans le même cocon, du niveau juste au-dessus
 *     (intermédiaire ← pilier, spécialisé ← intermédiaire) ;
 *   - section obligatoire, connue du parent, pas déjà prise par un autre enfant.
 *
 * « Le parent est rédigé » n'est pas jugé ici : c'est la porte du premier jet
 * du parent (étape `redaction:draft_accepted`), jouée par le serveur.
 */
import type { ArticleLevel } from '../types/keyword-validate.types.js'
import type { GateIssue } from './gate.js'
import { isIntroOrConclusion, structureHeadings } from './structure.js'

export interface HierarchyArticleRef {
  id: number
  title: string
  level: ArticleLevel
  parentId: number | null
  parentSection: string | null
}

export interface CocoonHierarchyInput {
  /** Niveau de l'article à créer. */
  level: ArticleLevel
  parentId: number | null
  parentSection: string | null
  /** Les articles déjà dans le cocon. */
  cocoonArticles: HierarchyArticleRef[]
  /**
   * Sections du parent dont un enfant peut naître (`parentSectionsOf`). `null` :
   * pas encore vérifiées — le serveur joue d'abord la porte du parent (un parent
   * sans texte n'a pas de section, et « rédigez-le d'abord » est la vraie cause).
   */
  parentSections: string[] | null
}

/** Niveau attendu du parent, par niveau d'enfant. */
const PARENT_LEVEL: Record<ArticleLevel, ArticleLevel | null> = {
  pilier: null,
  intermediaire: 'pilier',
  specifique: 'intermediaire',
}

const LEVEL_LABEL: Record<ArticleLevel, string> = { pilier: 'pilier', intermediaire: 'intermédiaire', specifique: 'spécialisé' }

const FAQ_TITLE = /questions fr[ée]quentes|\bfaq\b/i

/** Titre comparable : casse, espaces et ponctuation finale ignorés. */
export function sectionKey(title: string): string {
  return title.normalize('NFC').toLowerCase().replace(/\s+/g, ' ').replace(/[\s?!.:;…]+$/u, '').trim()
}

function plain(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&apos;/g, '’')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Les sections d'un parent dont un enfant peut naître : les H2 de son texte
 * (sans introduction, conclusion ni FAQ) ; sans texte, ceux de sa structure.
 */
export function parentSectionsOf(content: string | null | undefined, structure: unknown): string[] {
  const fromContent = [...(content ?? '').matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi)].map(m => plain(m[1] ?? ''))
  const titles = fromContent.length > 0
    ? fromContent
    : structureHeadings(structure).filter(h => h.level === 2).map(h => h.text)
  return titles.filter(t => t && !isIntroOrConclusion(t) && !FAQ_TITLE.test(t))
}

export function verifyCocoonHierarchy(input: CocoonHierarchyInput): GateIssue[] {
  const pillar = input.cocoonArticles.find(a => a.level === 'pilier')

  if (input.level === 'pilier') {
    const issues: GateIssue[] = []
    if (pillar) {
      issues.push({
        rule: 'hierarchy-one-pillar',
        level: 'technique',
        message: `Ce cocon a déjà son pilier : « ${pillar.title} ».`,
        risk: 'Deux piliers se disputeraient la même recherche principale : Google n’en retiendrait qu’un.',
      })
    }
    if (input.parentId !== null) {
      issues.push({ rule: 'hierarchy-pillar-has-parent', level: 'technique', message: 'Un pilier n’a pas d’article parent : il est la tête du cocon.' })
    }
    return issues
  }

  if (!pillar) {
    return [{
      rule: 'hierarchy-pillar-first',
      level: 'technique',
      message: 'Un cocon commence par son pilier : créez-le d’abord.',
      risk: 'Sans pilier, un article n’a pas de page qui le présente et le relie au reste du cocon.',
    }]
  }

  if (input.parentId === null) {
    return [{ rule: 'hierarchy-parent-missing', level: 'technique', message: `Un article ${LEVEL_LABEL[input.level]} naît d’une section de son parent : choisissez-la.` }]
  }

  const parent = input.cocoonArticles.find(a => a.id === input.parentId)
  if (!parent) {
    return [{ rule: 'hierarchy-parent-elsewhere', level: 'technique', message: 'Le parent choisi n’est pas dans ce cocon.' }]
  }

  const expected = PARENT_LEVEL[input.level]
  if (parent.level !== expected) {
    return [{
      rule: 'hierarchy-parent-level',
      level: 'technique',
      message: `Un article ${LEVEL_LABEL[input.level]} naît d’un ${expected ? LEVEL_LABEL[expected] : 'parent'}, pas d’un ${LEVEL_LABEL[parent.level]} (« ${parent.title} »).`,
    }]
  }

  const section = input.parentSection?.trim() ?? ''
  if (!section) {
    return [{ rule: 'hierarchy-section-missing', level: 'technique', message: `Choisissez la section de « ${parent.title} » dont naît cet article.` }]
  }

  const key = sectionKey(section)
  if (input.parentSections !== null && !input.parentSections.some(s => sectionKey(s) === key)) {
    return [{
      rule: 'hierarchy-section-unknown',
      level: 'technique',
      message: `« ${section} » n’est pas une section de « ${parent.title} ».`,
      risk: 'Le parent ne pourrait ni résumer cet article ni y renvoyer.',
    }]
  }

  const sibling = input.cocoonArticles.find(a => a.parentId === parent.id && a.parentSection && sectionKey(a.parentSection) === key)
  if (sibling) {
    return [{
      rule: 'hierarchy-section-taken',
      level: 'technique',
      message: `La section « ${section} » a déjà donné l’article « ${sibling.title} ».`,
      risk: 'Deux pages sur le même sujet se feraient concurrence dans Google (cannibalisation).',
    }]
  }

  return []
}
