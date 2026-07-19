/**
 * Phase 2 — Moteur · Valider (Capitaine + Lieutenants + Lexique).
 *
 *   1. scan de chaque candidat Radar → pickCapitaine (GO préféré, sinon forcé)
 *   2. SERP analyze sur le Capitaine (peuple le scrape pour le Lexique)
 *   3. pickLieutenants (dérivés des candidats)
 *   4. TF-IDF → pickLexique
 *   5. PUT /articles/:id/keywords (capitaine + lieutenants + lexique)
 *   6. émet capitaine_locked / lieutenants_locked / lexique_validated
 */

import type { PhaseDeps } from '../deps.js'
import type { AutoRunContext } from '../types.js'
import { toCanonicalType } from '../canonical.js'
import { emitCheck } from '../checks.js'
import { pickCapitaine, type CapitaineInput } from '../heuristics/pick-capitaine.js'
import { pickLieutenants } from '../heuristics/pick-lieutenants.js'
import { pickLexique, type TfidfResultLite } from '../heuristics/pick-lexique.js'
import { detectCannibalization, requiresConfirmation, type ExistingCapitaine } from '../heuristics/detect-cannibalization.js'
import {
  MOTEUR_CAPITAINE_LOCKED,
  MOTEUR_LIEUTENANTS_LOCKED,
  MOTEUR_LEXIQUE_VALIDATED,
} from '../../../shared/constants/workflow-checks.constants.js'

interface ScanResp {
  verdict: { level: string }
  relevanceScore: { total: number } | null
  marketScore: { total: number } | null
}

interface CocoonWithArticles {
  articles?: {
    id: number
    captainKeywordLocked?: string | null
    suggestedKeyword?: string | null
  }[]
}

export function makeMoteurValider(deps: PhaseDeps): (ctx: AutoRunContext) => Promise<void> {
  const { client, logger, report } = deps

  return async (ctx) => {
    if (ctx.articleId == null) throw new Error('Moteur : articleId manquant (phase Explorer requise)')
    if (ctx.radarCandidates.length === 0) throw new Error('Moteur : aucun candidat Radar à valider')

    const level = toCanonicalType(ctx.articleType)

    // 1. Capitaine — scan de chaque candidat
    logger.step(`Capitaine — scan de ${ctx.radarCandidates.length} candidats…`)
    const scanned: CapitaineInput[] = []
    for (const cand of ctx.radarCandidates) {
      const r = await client.apiPost<ScanResp>(
        `/keywords/${encodeURIComponent(cand.keyword)}/scan`,
        { level, articleTitle: ctx.articleTitle, articleId: ctx.articleId, painPoint: ctx.painPoint },
      )
      scanned.push({
        keyword: cand.keyword,
        verdict: r.verdict.level,
        relevance: r.relevanceScore?.total ?? null,
        market: r.marketScore?.total ?? null,
      })
    }

    // Le sujet sert à calculer l'affinité topique (le relevanceScore produit
    // s'étant révélé non-discriminant en run réel).
    const topic = `${ctx.articleTitle} ${ctx.pilierKeyword} ${ctx.painPoint}`
    const choice = pickCapitaine(scanned, topic)
    if (!choice) throw new Error('Moteur : aucun Capitaine sélectionnable')
    ctx.capitaine = choice.keyword
    const scores = `affinité ${(choice.affinity * 100).toFixed(0)}%, pertinence ${choice.relevance ?? '—'}, marché ${choice.market ?? '—'}`
    if (choice.forced) {
      logger.warn(`Capitaine « ${choice.keyword} » — verdict ${choice.verdict} forcé (${scores})`)
    } else {
      logger.success(`Capitaine : « ${choice.keyword} » (GO, ${scores})`)
    }
    await emitCheck(client, ctx.articleId, MOTEUR_CAPITAINE_LOCKED)
    report.addStep(`Moteur · Capitaine (${choice.keyword}${choice.forced ? ' — forcé' : ''})`)

    // 1bis. Cannibalisation — compare aux Capitaines des autres articles du thème.
    // Un seul appel : le payload /cocoons porte déjà les mots-clés de chaque article.
    const cocoons = await client.apiGet<CocoonWithArticles[]>('/cocoons')
    const existing: ExistingCapitaine[] = cocoons
      .flatMap((c) => c.articles ?? [])
      .filter((a) => a.id !== ctx.articleId)
      .map((a) => ({ articleId: a.id, keyword: a.captainKeywordLocked ?? a.suggestedKeyword ?? '' }))
      .filter((e) => e.keyword.trim().length > 0)

    ctx.cannibalization = detectCannibalization(choice.keyword, existing)
    if (ctx.cannibalization.length > 0) {
      const strong = requiresConfirmation(ctx.cannibalization)
      const list = ctx.cannibalization
        .map((h) => `« ${h.keyword} » (#${h.articleId}, ${h.similarityPercent} %)`)
        .join(' · ')
      if (strong) {
        logger.warn(`Cannibalisation FORTE détectée — ${list}`)
      } else {
        logger.warn(`Proximité de mots-clés — ${list}`)
      }
      report.addStep(`Moteur · cannibalisation (${ctx.cannibalization.length} proche(s)${strong ? ', dont forte' : ''})`)
    }

    // 2. Lieutenants — SERP analyze (peuple le scrape) puis sélection
    logger.step('Lieutenants — analyse SERP du Capitaine…')
    await client.apiPost('/serp/analyze', { keyword: ctx.capitaine, topN: 10, articleLevel: level })
    ctx.lieutenants = pickLieutenants(ctx.radarCandidates, ctx.capitaine, level)
    await emitCheck(client, ctx.articleId, MOTEUR_LIEUTENANTS_LOCKED)
    report.addStep(`Moteur · Lieutenants (${ctx.lieutenants.length})`)
    logger.success(`Lieutenants : ${ctx.lieutenants.length} retenus.`)

    // 3. Lexique — TF-IDF (lit le scrape SERP hérité)
    logger.step('Lexique — extraction TF-IDF…')
    const tf = await client.apiPost<TfidfResultLite>('/serp/tfidf', {
      keyword: ctx.capitaine,
      articleId: ctx.articleId,
      triggerScrapeIfMissing: true,
    })
    // Exclut les mots déjà portés par le Capitaine/Lieutenants → lexique complémentaire.
    ctx.lexique = pickLexique(tf, { exclude: [choice.keyword, ...ctx.lieutenants] })
    await emitCheck(client, ctx.articleId, MOTEUR_LEXIQUE_VALIDATED)
    report.addStep(`Moteur · Lexique (${ctx.lexique.length} termes)`)
    logger.success(`Lexique : ${ctx.lexique.length} termes.`)

    // 4. Persistance des décisions (lu par la Rédaction via getArticleKeywords)
    await client.apiPut(`/articles/${ctx.articleId}/keywords`, {
      capitaine: ctx.capitaine,
      lieutenants: ctx.lieutenants,
      lexique: ctx.lexique,
      hnStructure: [],
    })
    logger.success('Décisions Moteur persistées (article_keywords).')
  }
}
