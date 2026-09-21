/**
 * Phase 3 — Rédaction : outline → article → meta → save → export.
 *
 *   1. POST /generate/outline (SSE)      → outline, persisté via PUT /articles/:id
 *   2. POST /generate/article (SSE)      → contenu HTML section par section
 *   3. POST /generate/meta               → metaTitle + metaDescription
 *   4. PUT  /articles/:id                → save content + meta
 *   5. PUT  /articles/:id/status         → brouillon
 *   6. POST /export/:id                  → HTML PropulSite, écrit sur disque
 */

import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { PhaseFn } from '../orchestrator.js'
import type { PhaseDeps } from '../deps.js'
import type { ApiUsageLike, AutoRunContext, SseEvent } from '../types.js'
import { toCanonicalType } from '../canonical.js'
import { slugify } from '../slug.js'
import { runInternalLinking } from './linking.js'
import {
  checkContentBeforeExport,
  detectUnverifiableClaims,
} from '../heuristics/check-content-quality.js'

const OUTPUT_DIR = '_auto-output'

async function collectSse(
  deps: PhaseDeps,
  path: string,
  body: unknown,
  onEvent?: (ev: SseEvent) => void,
): Promise<Record<string, unknown>> {
  let donePayload: Record<string, unknown> | null = null
  let errorMsg: string | null = null

  await deps.client.consumeSse(path, body, (ev) => {
    if (ev.event === 'done') donePayload = ev.data as Record<string, unknown>
    else if (ev.event === 'error') errorMsg = (ev.data as { message?: string })?.message ?? 'Erreur SSE'
    else onEvent?.(ev)
  })

  if (errorMsg) throw new Error(errorMsg)
  if (!donePayload) throw new Error(`SSE ${path} : aucun événement "done" reçu`)
  return donePayload
}

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
  report.addStep(
    `Rédaction · EXPORT REFUSÉ (${verdict.leaks.length} fuite(s) IA, ${verdict.orphans.length} texte(s) hors paragraphe)`,
  )
  return false
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
      logger.dim('reprise : contenu déjà présent — export seul')
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

    // 1. Outline — ancré sur la structure des concurrents quand elle existe
    logger.step(
      `Sommaire — génération…${ctx.serpPaa.length > 0 ? ` (${ctx.serpPaa.length} PAA)` : ''}${ctx.hnStructure.length > 0 ? ` (${ctx.hnStructure.length} chapitres concurrents)` : ''}`,
    )
    const outlineDone = await collectSse(deps, '/generate/outline', {
      ...base,
      competitorStructure: ctx.hnStructureBrief,
    })
    const outline = outlineDone.outline
    report.addUsage(outlineDone.usage as ApiUsageLike | null)
    await client.apiPut(`/articles/${ctx.articleId}`, { outline })
    const sectionCount = Array.isArray((outline as { sections?: unknown[] })?.sections)
      ? (outline as { sections: unknown[] }).sections.length
      : 0
    report.addStep(`Rédaction · Sommaire (${sectionCount} sections)`)

    // 2. Article (streaming section par section)
    logger.step('Article — rédaction section par section…')
    const articleDone = await collectSse(
      deps,
      '/generate/article',
      // Recherche web activée en réel seulement : elle ancre factuellement les
      // sections (chiffres, sources) mais coûte et rallonge — inutile en mock.
      { ...base, outline, webSearchEnabled: ctx.config.mode === 'real' },
      (ev) => {
        if (ev.event === 'section-start') {
          const d = ev.data as { index: number; total: number; title: string }
          logger.dim(`  section ${d.index + 1}/${d.total} — ${d.title}`)
        }
      },
    )
    ctx.articleContent = String(articleDone.content ?? '')
    report.addUsage(articleDone.usage as ApiUsageLike | null)
    report.addStep(`Rédaction · Article (${ctx.articleContent.length} caractères)`)

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
    // 5. Maillage interne — avant l'export, pour que le HTML exporté porte les liens.
    await runInternalLinking(deps, ctx.articleId)

    // 6. Statut brouillon
    await client.apiPut(`/articles/${ctx.articleId}/status`, { status: 'brouillon' })

    // 7. Export HTML sur disque (recharge le contenu, liens compris)
    await exportArticle(deps, ctx)
  }
}
