/**
 * Phase 3 — Rédaction : outline → article → meta → save → export.
 *
 *   1. Sommaire : la structure validée au Moteur (FR-HN-TAB), sinon
 *      POST /generate/outline (SSE) ; persisté via PUT /articles/:id
 *   2. POST /generate/article-draft (SSE) → premier jet en un appel (FR-RED-DRAFT-SINGLE-PASS)
 *      2 bis. chapitre hors budget → POST /generate/section-rewrite (redaction-passes.ts)
 *   3. POST /generate/meta               → metaTitle + metaDescription
 *   4. PUT  /articles/:id                → save content + meta, puis étape « premier
 *      jet accepté » ; 4 ter. passe « sources » → POST /generate/enrich/sources
 *   5. PUT  /articles/:id/status         → brouillon
 *   6. POST /export/:id                  → HTML PropulSite, écrit sur disque
 */

import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { PhaseFn } from '../orchestrator.js'
import type { PhaseDeps } from '../deps.js'
import type { ApiUsageLike, AutoRunContext } from '../types.js'
import { collectSse } from '../collect-sse.js'
import { structureToOutline } from '../../../shared/structure-outline.js'
import { toCanonicalType } from '../canonical.js'
import { slugify } from '../slug.js'
import { runInternalLinking, unlinkUnpublished } from './linking.js'
import { fitChapterBudgets, sourcePassages, rephraseUnsourceable, chaptersToSource } from './redaction-passes.js'
import { markUnsourcedFigures } from '../../../shared/text-quality.js'
import { emitCheck } from '../checks.js'
import { REDACTION_DRAFT_ACCEPTED } from '../../../shared/constants/workflow-checks.constants.js'
import {
  checkContentBeforeExport,
  detectUnverifiableClaims,
} from '../heuristics/check-content-quality.js'

const OUTPUT_DIR = '_auto-output'

/**
 * Garde-fou qualité avant export (audit 2026-09-19).
 *
 * Bloquant : le monologue de l'IA (« Je vais d'abord faire une recherche… »).
 * Le contenu reste en base — seul le fichier n'est pas écrit, pour qu'aucun
 * article pollué ne parte en publication par inadvertance.
 *
 * Non bloquant : les preuves invérifiables, simplement listées à relire.
 *
 * @returns `true` si l'export peut avoir lieu
 */
function guardContent(deps: PhaseDeps, ctx: AutoRunContext): boolean {
  const { logger, report } = deps
  const content = ctx.articleContent ?? ''

  const claims = detectUnverifiableClaims(content)
  if (claims.length > 0) {
    logger.warn(`${claims.length} affirmation(s) invérifiable(s) à relire avant publication :`)
    for (const claim of claims.slice(0, 5)) logger.dim(`  • …${claim.excerpt}…`)
    report.addStep(`Rédaction · ${claims.length} preuve(s) à vérifier`)
  }

  const verdict = checkContentBeforeExport(content)
  if (verdict.ok) return true

  logger.error('Export refusé — le texte contient des défauts de génération :')
  logger.info(verdict.report)
  logger.info('  → L\'article est enregistré en base : corrige-le dans l\'éditeur,')
  logger.info('    ou lance « npm run content:clean -- --id=' + String(ctx.articleId) + ' ».')
  report.addStep(`Rédaction · EXPORT REFUSÉ (${verdict.errors.length} défaut(s) au sens de npm run verify)`)
  return false
}

/**
 * Après l'acceptation du premier jet : la passe « sources » cherche une source à
 * chaque passage à sourcer ; ce qui n'en a pas est reformulé sans chiffre
 * (recette C8). Le texte n'est enregistré que s'il a changé.
 */
async function finishPassages(
  deps: PhaseDeps,
  ctx: AutoRunContext,
  passes: { articleId: number; keyword: string; keywords: string[] },
): Promise<void> {
  if (chaptersToSource(ctx.articleContent ?? '').length === 0) return
  const sourced = await sourcePassages(deps, passes, ctx.articleContent ?? '')
  const finished = await rephraseUnsourceable(deps, passes, sourced)
  if (finished !== ctx.articleContent) {
    ctx.articleContent = finished
    await deps.client.apiPut(`/articles/${passes.articleId}`, { content: finished })
  }
}

/** Export HTML PropulSite → écriture disque. Réutilisé par le run normal et la reprise. */
async function exportArticle(deps: PhaseDeps, ctx: AutoRunContext): Promise<void> {
  const { client, logger, report } = deps

  // En reprise (`--resume`), le contenu n'a pas transité par ce process : on le
  // relit pour que le garde-fou ait bien un texte à inspecter.
  if (!ctx.articleContent) {
    const stored = await client
      .apiGet<{ content?: string | null }>(`/articles/${ctx.articleId}/content`)
      .catch(() => null)
    ctx.articleContent = stored?.content ?? ''
  }

  if (!guardContent(deps, ctx)) return
  logger.step('Export — HTML PropulSite…')
  const exported = await client.apiPost<{ html: string }>(`/export/${ctx.articleId}`, {})
  await mkdir(OUTPUT_DIR, { recursive: true })
  const file = join(OUTPUT_DIR, `${slugify(ctx.articleTitle)}-${ctx.articleId}.html`)
  await writeFile(file, exported.html, 'utf8')
  ctx.exportPath = file
  report.addStep('Rédaction · Export HTML')
  logger.success(`Article exporté : ${file}`)
}

export function makeRedactionPhase(deps: PhaseDeps): PhaseFn {
  const { client, logger, report } = deps

  return async (ctx) => {
    logger.phase('Phase 3 — Rédaction')
    if (ctx.articleId == null) throw new Error('Rédaction : articleId manquant')
    if (ctx.resume.skipRedaction) {
      // Premier jet déjà accepté : restent les finitions qu'un run interrompu
      // n'aurait pas faites (passages à sourcer, liens vers un non-publié).
      logger.dim('reprise : premier jet déjà accepté — finitions puis export')
      if (ctx.capitaine) {
        const stored = await client.apiGet<{ content?: string | null }>(`/articles/${ctx.articleId}/content`)
        ctx.articleContent = stored.content ?? ''
        await finishPassages(deps, ctx, { articleId: ctx.articleId, keyword: ctx.capitaine, keywords: [...new Set([ctx.capitaine, ...ctx.lieutenants])] })
      }
      await unlinkUnpublished(deps, ctx.articleId)
      ctx.articleContent = ''
      await exportArticle(deps, ctx)
      return
    }
    if (!ctx.capitaine) throw new Error('Rédaction : Capitaine manquant (phase Moteur requise)')

    const articleType = toCanonicalType(ctx.articleType)
    const keywords = [...new Set([ctx.capitaine, ...ctx.lieutenants])]
    const base = {
      articleId: ctx.articleId,
      keyword: ctx.capitaine,
      keywords,
      // PAA issues du SERP déjà payé en phase Moteur. On envoyait `[]` et le
      // prompt répondait « Aucune question PAA disponible » (audit défaut n°18).
      paa: ctx.serpPaa,
      articleType,
      articleTitle: ctx.articleTitle,
      cocoonName: ctx.cocoonName,
      topic: null as string | null,
    }

    if (ctx.resume.skipDraft) {
      // Reprise d'un premier jet déjà écrit mais pas accepté (recette C8) : il
      // est gardé — pas de nouvel appel payant — et passe par le même filet que
      // la route du premier jet (chiffre sans source → « à sourcer »).
      logger.dim('reprise : premier jet déjà écrit — corrections, acceptation et sources seulement')
      const stored = await client.apiGet<{ content?: string | null }>(`/articles/${ctx.articleId}/content`)
      ctx.articleContent = markUnsourcedFigures(stored.content ?? '')
    } else {
      // 1. Sommaire — la structure validée au Moteur, comme à l'écran (FR-HN-TAB) ;
      //    à défaut, un sommaire généré, ancré sur la structure des concurrents.
      let outline: unknown
      if (ctx.articleStructure.length > 0) {
        logger.step('Sommaire — tiré de la structure validée au Moteur')
        outline = structureToOutline(ctx.articleStructure, ctx.articleTitle)
      } else {
        logger.step(
          `Sommaire — génération…${ctx.serpPaa.length > 0 ? ` (${ctx.serpPaa.length} PAA)` : ''}${ctx.hnStructure.length > 0 ? ` (${ctx.hnStructure.length} chapitres concurrents)` : ''}`,
        )
        const outlineDone = await collectSse(deps, '/generate/outline', {
          ...base,
          competitorStructure: ctx.hnStructureBrief,
        })
        outline = outlineDone.outline
        report.addUsage(outlineDone.usage as ApiUsageLike | null)
      }
      await client.apiPut(`/articles/${ctx.articleId}`, { outline })
      const sectionCount = Array.isArray((outline as { sections?: unknown[] })?.sections)
        ? (outline as { sections: unknown[] }).sections.length
        : 0
      report.addStep(`Rédaction · Sommaire (${sectionCount} sections)`)

      // 2. Premier jet, en un appel et sans recherche web : un chiffre à sourcer
      //    est posé dans un marqueur, la passe « sources » le traitera.
      logger.step('Article — premier jet en un appel…')
      const { paa: _paa, topic: _topic, ...draftBase } = base
      const articleDone = await collectSse(
        deps,
        '/generate/article-draft',
        { ...draftBase, outline },
        (ev) => {
          if (ev.event === 'section-start') {
            const d = ev.data as { index: number; total: number; title: string }
            logger.dim(`  chapitre ${d.index + 1}/${d.total} — ${d.title}`)
          } else if (ev.event === 'continuation') {
            const d = ev.data as { fromIndex: number; attempt: number }
            logger.dim(`  coupé au plafond : reprise au chapitre ${d.fromIndex + 1} (${d.attempt}/2)`)
          }
        },
      )
      ctx.articleContent = String(articleDone.content ?? '')
      report.addUsage(articleDone.usage as ApiUsageLike | null)
      report.addStep(`Rédaction · Article (${ctx.articleContent.length} caractères)`)
    }

    // 2 bis. Un chapitre hors de son budget est réécrit à sa longueur, comme
    //        l'utilisateur le ferait avant d'accepter le premier jet (recette C8).
    //        La porte juge la base : le texte y est d'abord enregistré.
    const passes = { articleId: ctx.articleId, keyword: ctx.capitaine, keywords }
    await client.apiPut(`/articles/${ctx.articleId}`, { content: ctx.articleContent })
    ctx.articleContent = await fitChapterBudgets(deps, passes, ctx.articleContent)

    // 3. Meta
    logger.step('Meta — title + description…')
    const meta = await client.apiPost<{ metaTitle: string; metaDescription: string; usage?: ApiUsageLike | null }>(
      '/generate/meta',
      { articleId: ctx.articleId, keyword: ctx.capitaine, articleTitle: ctx.articleTitle, articleContent: ctx.articleContent },
    )
    ctx.metaTitle = meta.metaTitle
    ctx.metaDescription = meta.metaDescription
    report.addUsage(meta.usage ?? null)

    // 4. Save content + meta
    await client.apiPut(`/articles/${ctx.articleId}`, {
      content: ctx.articleContent,
      metaTitle: ctx.metaTitle,
      metaDescription: ctx.metaDescription,
    })
    // 4 bis. Premier jet accepté par sa porte (C7, FR-CER-PARENT-WRITTEN-GATE) :
    // c'est cette étape qui fait de l'article un parent rédigé. Un refus arrête
    // le run — le script ne déroge jamais à la place d'un humain.
    await emitCheck(client, ctx.articleId, REDACTION_DRAFT_ACCEPTED)
    report.addStep('Rédaction · premier jet accepté par sa porte')
    // 4 ter. Passe « sources », puis ce qui n'a pas de source se dit sans chiffre.
    await finishPassages(deps, ctx, passes)
    // 5. Maillage interne — avant l'export, pour que le HTML exporté porte les liens ;
    //    jamais vers un article pas encore publié.
    await runInternalLinking(deps, ctx.articleId)
    await unlinkUnpublished(deps, ctx.articleId)

    // 6. Statut brouillon
    await client.apiPut(`/articles/${ctx.articleId}/status`, { status: 'brouillon' })

    // 7. Export HTML sur disque (recharge le contenu, liens compris)
    await exportArticle(deps, ctx)
  }
}
