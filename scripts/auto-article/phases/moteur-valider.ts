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
import { extractHnStructure, formatHnStructure } from '../heuristics/extract-hn-structure.js'
import { mapLimit, DEFAULT_CONCURRENCY } from '../concurrency.js'
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

interface SerpResp {
  competitors?: { headings?: { level: number; text: string }[] }[]
  paaQuestions?: { question: string; answer?: string | null }[]
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

    // 1. Capitaine — scan des candidats, en parallèle borné (latence ÷ ~3,
    //    couverture inchangée : tous les candidats restent scannés).
    logger.step(`Capitaine — scan de ${ctx.radarCandidates.length} candidats (parallèle)…`)
    const scanned: CapitaineInput[] = await mapLimit(
      ctx.radarCandidates,
      DEFAULT_CONCURRENCY,
      async (cand) => {
        const r = await client.apiPost<ScanResp>(
          `/keywords/${encodeURIComponent(cand.keyword)}/scan`,
          { level, articleTitle: ctx.articleTitle, articleId: ctx.articleId, painPoint: ctx.painPoint },
        )
        return {
          keyword: cand.keyword,
          verdict: r.verdict.level,
          relevance: r.relevanceScore?.total ?? null,
          market: r.marketScore?.total ?? null,
        }
      },
    )

    // Le sujet sert à calculer l'affinité topique (le relevanceScore produit
    // s'étant révélé non-discriminant en run réel).
    const topic = `${ctx.articleTitle} ${ctx.pilierKeyword} ${ctx.painPoint}`
    const choice = pickCapitaine(scanned, topic, level)
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

    // 2. SERP — une seule analyse, exploitée trois fois : Lieutenants ancrés,
    //    structure Hn persistée, PAA transmises au sommaire (défauts 14/16/18).
    logger.step('Lieutenants — analyse SERP du Capitaine…')
    const serp = await client.apiPost<SerpResp>('/serp/analyze', {
      keyword: ctx.capitaine,
      topN: 10,
      articleLevel: level,
    })

    const competitors = serp.competitors ?? []
    const headings = competitors.flatMap((c) => (c.headings ?? []).map((h) => h.text))
    ctx.serpPaa = (serp.paaQuestions ?? []).map((p) => ({
      question: p.question,
      answer: p.answer ?? null,
    }))

    const hn = extractHnStructure(competitors)
    ctx.hnStructure = hn.map((h) => ({ level: h.level, text: h.text }))
    ctx.hnStructureBrief = formatHnStructure(hn)
    if (hn.length > 0) {
      logger.dim(`structure concurrents : ${hn.length} chapitres récurrents (top ${Math.round(hn[0].recurrence * 100)} %)`)
    }
    if (ctx.serpPaa.length > 0) logger.dim(`PAA récupérées : ${ctx.serpPaa.length}`)

    ctx.lieutenants = pickLieutenants(ctx.radarCandidates, ctx.capitaine, level, {
      competitorHeadings: headings,
    })
    await emitCheck(client, ctx.articleId, MOTEUR_LIEUTENANTS_LOCKED)
    report.addStep(
      `Moteur · Lieutenants (${ctx.lieutenants.length}${headings.length > 0 ? ', ancrés SERP' : ''})`,
    )
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

    // 4. Persistance des décisions (lu par la Rédaction via getArticleKeywords).
    //    `hnStructure` alimente aussi le brief IA et la recommandation de
    //    longueur côté app — elle n'est plus vide (défaut n°16).
    await client.apiPut(`/articles/${ctx.articleId}/keywords`, {
      capitaine: ctx.capitaine,
      lieutenants: ctx.lieutenants,
      lexique: ctx.lexique,
      hnStructure: ctx.hnStructure,
    })
    logger.success('Décisions Moteur persistées (article_keywords).')
  }
}
