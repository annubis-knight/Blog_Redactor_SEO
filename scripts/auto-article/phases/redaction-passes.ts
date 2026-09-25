/**
 * Rédaction automatique — ce que ferait l'utilisateur entre le premier jet et
 * la publication (recette réelle C8 du 2026-09-25, où le pilier s'arrêtait sur
 * un chapitre trop long et des passages à sourcer jamais traités) :
 *
 *   1. un chapitre hors de son budget, d'après la porte du premier jet, est
 *      réécrit à sa longueur (POST /generate/section-rewrite) ;
 *   2. une fois le premier jet accepté, la passe « sources » traite chaque
 *      chapitre qui porte un passage « à sourcer » (POST /generate/enrich/sources).
 *
 * Une proposition n'est retenue que sans alerte ⛔ ni 🔴 : comme à l'écran, le
 * script ne déroge jamais à la place de l'utilisateur ; ce qu'il ne sait pas
 * corriger, la porte suivante le dira.
 */
import type { PhaseDeps } from '../deps.js'
import { collectSse } from '../collect-sse.js'
import { listChapters, replaceChapter, sectionKey, type Chapter } from '../../../shared/chapters.js'

interface IssueLite {
  rule: string
  level: string
  message: string
  excerpt?: string
}

interface ProposalLite {
  html: string
  blocked: boolean
  issues: IssueLite[]
  usage?: unknown
}

export interface OffBudgetChapter {
  index: number
  title: string
  words: number
  budget: number
}

/** Chapitres que la porte du premier jet juge hors de leur budget, avec leurs longueurs. */
export function offBudgetChapters(issues: IssueLite[], html: string): OffBudgetChapter[] {
  const chapters = listChapters(html)
  return issues.flatMap((issue) => {
    // La règle porte le chapitre en suffixe : `draft-section-off-budget:<chapitre>`.
    if (!issue.rule.startsWith('draft-section-off-budget') || !issue.excerpt) return []
    const counts = /fait (\d+) mots pour environ (\d+)/.exec(issue.message)
    const chapter = chapters.find(c => c.index >= 0 && sectionKey(c.title) === sectionKey(issue.excerpt!))
    if (!counts || !chapter) return []
    return [{ index: chapter.index, title: chapter.title, words: Number(counts[1]), budget: Number(counts[2]) }]
  })
}

/** La consigne de réécriture d'un chapitre hors budget. */
export function budgetInstruction(c: OffBudgetChapter): string {
  return c.words > c.budget
    ? `Ramène ce chapitre à environ ${c.budget} mots (il en fait ${c.words}) : garde ses idées essentielles, ses titres H2 et H3 et ses passages « à sourcer » ; retire les redites et les détails secondaires.`
    : `Développe ce chapitre jusqu'à environ ${c.budget} mots (il en fait ${c.words}) avec des explications et des exemples concrets ; aucun chiffre inventé : un chiffre utile devient un passage « à sourcer ».`
}

/** Chapitres qui portent au moins un passage « à sourcer ». */
export function chaptersToSource(html: string): Chapter[] {
  return listChapters(html).filter(c => /data-a-sourcer|\[à sourcer/i.test(c.html))
}

/** Une proposition se retient seulement sans alerte ⛔ ni 🔴. */
export function isAcceptable(p: ProposalLite): boolean {
  return !p.blocked && !p.issues.some(i => i.level === 'risque' || i.level === 'technique')
}

interface PassContext {
  articleId: number
  keyword: string
  keywords: string[]
}

async function propose(deps: PhaseDeps, path: string, ctx: PassContext, html: string, chapter: Chapter, extra: Record<string, unknown> = {}): Promise<ProposalLite> {
  return collectSse(deps, path, {
    articleId: ctx.articleId,
    chapterIndex: chapter.index,
    chapterHtml: chapter.html,
    articleHtml: html,
    keyword: ctx.keyword,
    keywords: ctx.keywords,
    ...extra,
  }) as unknown as Promise<ProposalLite>
}

/**
 * Réécrit chaque chapitre que la porte du premier jet juge hors budget. Le
 * texte doit être enregistré avant l'appel : la porte juge la base.
 */
export async function fitChapterBudgets(deps: PhaseDeps, ctx: PassContext, html: string): Promise<string> {
  const { client, logger, report } = deps
  const evaluation = await client.apiGet<{ issues: IssueLite[] }>(`/articles/${ctx.articleId}/gates/draft`)
  const targets = offBudgetChapters(evaluation.issues, html)
  let current = html
  for (const target of targets) {
    const chapter = listChapters(current).find(c => c.index === target.index)
    if (!chapter) continue
    logger.step(`Chapitre « ${target.title} » — ${target.words} mots pour ~${target.budget} : réécriture à sa longueur…`)
    try {
      const proposal = await propose(deps, '/generate/section-rewrite', ctx, current, chapter, { instruction: budgetInstruction(target) })
      report.addUsage(proposal.usage as never)
      if (isAcceptable(proposal)) {
        current = replaceChapter(current, chapter.index, proposal.html)
        report.addStep(`Rédaction · chapitre « ${target.title} » ramené à son budget`)
      } else {
        logger.warn(`Réécriture de « ${target.title} » écartée : ${proposal.issues.map(i => i.message).join(' ; ')}`)
      }
    } catch (err) {
      logger.warn(`Réécriture de « ${target.title} » impossible : ${(err as Error).message}`)
    }
  }
  return current
}

/** Passe « sources » sur chaque chapitre qui porte un passage à sourcer (recherche web réelle). */
export async function sourcePassages(deps: PhaseDeps, ctx: PassContext, html: string): Promise<string> {
  const { logger, report } = deps
  let current = html
  for (const chapter of chaptersToSource(html)) {
    logger.step(`Sources — chapitre « ${chapter.title} »…`)
    try {
      const latest = listChapters(current).find(c => c.index === chapter.index)
      if (!latest) continue
      const proposal = await propose(deps, '/generate/enrich/sources', ctx, current, latest)
      report.addUsage(proposal.usage as never)
      if (isAcceptable(proposal)) {
        current = replaceChapter(current, chapter.index, proposal.html)
        report.addStep(`Rédaction · sources du chapitre « ${chapter.title} »`)
      } else {
        logger.warn(`Sources de « ${chapter.title} » écartées : ${proposal.issues.map(i => i.message).join(' ; ')}`)
      }
    } catch (err) {
      logger.warn(`Sources de « ${chapter.title} » impossibles : ${(err as Error).message}`)
    }
  }
  return current
}
