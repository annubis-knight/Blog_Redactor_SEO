/**
 * AUTHORITY: PostgreSQL `articles` (création : `parent_id`, `parent_section`) ;
 *            `articles.completed_checks` du parent (`redaction:draft_accepted`).
 * READS FROM: articles du cocon (getArticlesByCocoon), texte et structure du
 *             parent (article_content.content, article_keywords.hn_structure),
 *             keyword_metrics (mot-clé mesuré), porte `draft` du parent.
 * WRITES TO: articles (insertCocoonArticle ; setArticleParent pour un rattachement,
 *            K8) ; étape `redaction:draft_accepted` du parent quand sa porte passe.
 * CONSUMERS: POST /api/cocoons/:cocoonId/articles, PUT .../articles/:articleId/parent
 *            et GET /api/cocoons/:cocoonId/tree (cocoons.routes.ts) — écran du
 *            Cerveau, mode automatique.
 * RELATED FR: FR-CER-COCOON-PROGRESSIVE, FR-CER-PARENT-WRITTEN-GATE,
 *             FR-CER-CHILD-FROM-PILLAR-H2, FR-CER-KEYWORD-REAL-DATA
 *
 * Seul chemin de création d'un article (la création en lot a disparu, K6) :
 * pilier d'abord, puis chaque enfant depuis une section de son parent, une fois
 * le parent rédigé ; un mot-clé fourni doit avoir été mesuré.
 */
import { getArticlesByCocoon, getArticleKeywords, insertCocoonArticle, addArticleCheck, setArticleParent } from '../infra/data.service.js'
import { getArticleContent } from './article-content.service.js'
import { evaluateArticleGate } from '../gates/gate.service.js'
import { getKeywordMetrics } from '../keyword/keyword-metrics.service.js'
import { verifyCocoonHierarchy, parentSectionsOf, sectionKey } from '../../../shared/verifiers/cocoon-hierarchy.js'
import { REDACTION_DRAFT_ACCEPTED } from '../../../shared/constants/workflow-checks.constants.js'
import { log } from '../../utils/logger.js'
import type { Article } from '../../../shared/types/index.js'
import type { ArticleLevel } from '../../../shared/types/keyword-validate.types.js'
import type { PainIntentExpected } from '../../../shared/types/scoring.types.js'
import type { CocoonTreeNode, CocoonTreeSection } from '../../../shared/types/cocoon-tree.types.js'

interface CreateCocoonArticleInput {
  title: string
  type: ArticleLevel
  parentId?: number | null
  parentSection?: string | null
  slug?: string
  suggestedKeyword?: string | null
  painPoint?: string | null
  painIntentExpected?: PainIntentExpected | null
}

/** Refus lisible : l'écran le montre tel quel (alarme pour `GATE_BLOCKED`). */
export class CocoonArticleError extends Error {
  constructor(
    readonly status: number,
    readonly code: 'COCOON_NOT_FOUND' | 'ARTICLE_NOT_FOUND' | 'HIERARCHY_VIOLATION' | 'GATE_BLOCKED' | 'KEYWORD_NOT_MEASURED' | 'SLUG_TAKEN',
    message: string,
    readonly details?: unknown,
  ) {
    super(message)
    this.name = 'CocoonArticleError'
  }
}

/**
 * L'arbre réel du cocon : chaque article, s'il est rédigé, et ses sections avec
 * l'enfant qui en est né. `null` si le cocon n'existe pas.
 */
export async function getCocoonTree(cocoonId: number): Promise<CocoonTreeNode[] | null> {
  const articles = await getArticlesByCocoon(cocoonId)
  if (!articles) return null
  return Promise.all(articles.map(async (a): Promise<CocoonTreeNode> => {
    const children = articles.filter(c => c.parentId === a.id)
    let sections: CocoonTreeSection[] = []
    // Un spécialisé n'a pas d'enfant : inutile de lire son texte.
    if (a.type !== 'specifique') {
      const [content, { data: kw }] = await Promise.all([getArticleContent(a.id), getArticleKeywords(a.id)])
      sections = parentSectionsOf(content.content, kw?.hnStructure ?? []).map((title) => {
        const child = children.find(c => c.parentSection && sectionKey(c.parentSection) === sectionKey(title))
        return { title, childId: child?.id ?? null, childTitle: child?.title ?? null }
      })
      // Un enfant dont la section a disparu du parent (parent réécrit) reste visible.
      for (const child of children) {
        if (!sections.some(s => s.childId === child.id)) {
          sections.push({ title: child.parentSection ?? '', childId: child.id, childTitle: child.title })
        }
      }
    }
    return {
      id: a.id,
      title: a.title,
      level: a.type,
      parentId: a.parentId ?? null,
      parentSection: a.parentSection ?? null,
      keyword: a.captainKeywordLocked ?? a.suggestedKeyword ?? null,
      drafted: a.completedChecks.includes(REDACTION_DRAFT_ACCEPTED),
      sections,
    }
  }))
}

function slugFromTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

type CocoonArticles = NonNullable<Awaited<ReturnType<typeof getArticlesByCocoon>>>

interface Placement {
  level: ArticleLevel
  parentId: number | null
  parentSection: string | null
  /** L'article qu'on déplace : sa propre section ne compte pas comme prise. */
  movingId?: number
}

function hierarchyInput(articles: CocoonArticles, p: Placement) {
  return {
    level: p.level,
    parentId: p.parentId,
    parentSection: p.parentSection,
    cocoonArticles: articles
      .filter(a => a.id !== p.movingId)
      .map(a => ({ id: a.id, title: a.title, level: a.type, parentId: a.parentId ?? null, parentSection: a.parentSection ?? null })),
  }
}

/**
 * Pilier d'abord, parent du bon niveau, section pas déjà prise. La section,
 * elle, n'est jugée qu'après la porte du parent (`assertParentReady`) : un
 * parent sans texte n'a pas de section, et la vraie cause est qu'il n'est pas
 * rédigé.
 */
function assertHierarchy(articles: CocoonArticles, p: Placement): void {
  const issues = verifyCocoonHierarchy({ ...hierarchyInput(articles, p), parentSections: null })
  if (issues.length > 0) {
    throw new CocoonArticleError(409, 'HIERARCHY_VIOLATION', issues.map(i => i.message).join(' '), { issues })
  }
}

/**
 * Un article ne rejoint que la section d'un parent rédigé (premier jet accepté
 * par sa porte), et une section qui existe dans son texte (sinon sa structure).
 */
async function assertParentReady(articles: CocoonArticles, p: Placement): Promise<void> {
  const parent = p.parentId !== null ? articles.find(a => a.id === p.parentId) ?? null : null
  if (!parent) return
  if (!parent.completedChecks.includes(REDACTION_DRAFT_ACCEPTED)) {
    const evaluation = await evaluateArticleGate(parent.id, 'draft')
    if (!evaluation.passed) {
      throw new CocoonArticleError(
        409,
        'GATE_BLOCKED',
        `« ${parent.title} » n’est pas encore rédigé : son premier jet doit passer sa porte avant de donner naissance à un article.`,
        evaluation,
      )
    }
    await addArticleCheck(parent.id, REDACTION_DRAFT_ACCEPTED)
    log.info('[cocoon-article] premier jet du parent accepté', { parentId: parent.id })
  }
  const [content, { data: kw }] = await Promise.all([getArticleContent(parent.id), getArticleKeywords(parent.id)])
  const sectionIssues = verifyCocoonHierarchy({ ...hierarchyInput(articles, p), parentSections: parentSectionsOf(content.content, kw?.hnStructure ?? []) })
  if (sectionIssues.length > 0) {
    throw new CocoonArticleError(409, 'HIERARCHY_VIOLATION', sectionIssues.map(i => i.message).join(' '), { issues: sectionIssues })
  }
}

export async function createCocoonArticle(cocoonId: number, input: CreateCocoonArticleInput): Promise<Article> {
  const articles = await getArticlesByCocoon(cocoonId)
  if (!articles) throw new CocoonArticleError(404, 'COCOON_NOT_FOUND', `Cocon ${cocoonId} introuvable.`)

  const parentId = input.parentId ?? null
  const parentSection = input.parentSection?.trim() || null
  const placement: Placement = { level: input.type, parentId, parentSection }

  // 1. La hiérarchie.
  assertHierarchy(articles, placement)

  // 2. Aucun mot-clé enregistré sans avoir été mesuré (FR-CER-KEYWORD-REAL-DATA).
  const keyword = input.suggestedKeyword?.trim() || null
  if (keyword && !(await getKeywordMetrics(keyword))) {
    throw new CocoonArticleError(422, 'KEYWORD_NOT_MEASURED', `Le mot-clé « ${keyword} » n’a jamais été mesuré : choisissez-le parmi les candidats mesurés.`)
  }

  // 3. Un enfant ne naît que d'un parent rédigé, dans une section qui existe.
  await assertParentReady(articles, placement)

  const slug = input.slug?.trim() || slugFromTitle(input.title)
  const created = await insertCocoonArticle(cocoonId, {
    title: input.title.trim(),
    type: input.type,
    slug,
    parentId,
    parentSection,
    suggestedKeyword: keyword,
    painPoint: input.painPoint?.trim() || null,
    painIntentExpected: input.painIntentExpected ?? null,
  })
  if (created === 'slug-taken') {
    throw new CocoonArticleError(409, 'SLUG_TAKEN', `L’adresse /${slug} est déjà prise par un autre article : changez le titre ou l’adresse.`)
  }
  log.info('[cocoon-article] article créé', { cocoonId, articleId: created.id, type: input.type, parentId })
  return created
}

/**
 * Rattache un article existant à la section d'un parent (K8) : un article
 * d'avant l'arbre, ou mal placé. Mêmes règles qu'une création — hiérarchie,
 * parent rédigé, section connue et libre.
 */
export async function attachCocoonArticle(
  cocoonId: number,
  articleId: number,
  target: { parentId: number; parentSection: string },
): Promise<{ id: number; parentId: number; parentSection: string }> {
  const articles = await getArticlesByCocoon(cocoonId)
  if (!articles) throw new CocoonArticleError(404, 'COCOON_NOT_FOUND', `Cocon ${cocoonId} introuvable.`)
  const article = articles.find(a => a.id === articleId)
  if (!article) throw new CocoonArticleError(404, 'ARTICLE_NOT_FOUND', `L’article ${articleId} n’est pas dans ce cocon.`)

  const parentSection = target.parentSection.trim()
  const placement: Placement = { level: article.type, parentId: target.parentId, parentSection, movingId: articleId }
  assertHierarchy(articles, placement)
  await assertParentReady(articles, placement)

  await setArticleParent(articleId, target.parentId, parentSection)
  log.info('[cocoon-article] article rattaché', { cocoonId, articleId, parentId: target.parentId, parentSection })
  return { id: articleId, parentId: target.parentId, parentSection }
}
