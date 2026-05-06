/**
 * AUTHORITY: Calcul à la volée du Score Pertinence pour l'onglet Capitaine.
 *            Le score n'est JAMAIS persisté (cf. FR-CAP-RELEVANCE-NO-DB-WRITE).
 * READS FROM: articles.pain_point (DB), captain_explorations.root_keywords (DB),
 *             keyword_metrics (DB) — paa_questions, autocomplete_suggestions, intent_raw
 * WRITES TO: rien (read-only par contrat)
 * CONSUMERS: data.service.ts → getCaptainExplorations (à adapter Sprint 3),
 *            futurs endpoints /articles/:id/relevance et /relevance/compute
 * RELATED FR: FR-CAP-RELEVANCE-COMPUTED-LIVE, FR-CAP-RELEVANCE-NO-DB-WRITE,
 *             FR-CAP-RELEVANCE-NO-CACHE, FR-CAP-RELEVANCE-ROOTS-FROM-DB,
 *             FR-CAP-RELEVANCE-MEMOIZATION, FR-CAP-RELEVANCE-UNAVAILABLE-REASON
 *
 * Architecture (cf. docs/data-flows/relevance-score-live-computation.md §2) :
 *   PHASE 1 — lecture DB (3 SQL parallèles : painPoint, captain_explorations, keyword_metrics)
 *   PHASE 2A — calcul des racines uniques avec mémoïsation Map<rootKeyword, score>
 *   PHASE 2B — calcul des cards complètes en lisant la Map mémoïsée
 *   PHASE 3 — réponse, Map garbage-collectée
 *
 * Décisions (cf. _bmad-output/implementation-artifacts/decision-log-relevance-live-computation.md) :
 *   - Pas de cache TTL : la Map est purement locale à la requête HTTP
 *   - Pas de récursion sur les racines (signal 4 neutralisé pour les racines elles-mêmes)
 *   - Calcul lexical rapide (matchResonanceDetailed via lexicalPainAlignment), pas d'embeddings
 *   - Tooltip honnête : `unavailableReason` typé renvoyé au front
 */

import type {
  RelevanceScoreLiveResult,
  RelevanceUnavailableReason,
  PainIntentExpected,
} from '../../../shared/types/scoring.types.js'
import { computeRelevanceScore } from '../../../shared/scoring.js'
import { getKeywordMetrics, type KeywordMetrics } from './keyword-metrics.service.js'
import { lexicalPainAlignment, avgLexicalPainAlignment } from './lexical-pain-alignment.js'
import { getArticlePainPoint, PAIN_POINT_FALLBACK } from '../queries/article-pain-point.service.js'
import { getArticlePainIntent } from '../queries/article-pain-intent.service.js'
import { log } from '../../utils/logger.js'

/** Longueur minimale du painPoint pour qu'un calcul Pertinence soit tenté. */
export const PAIN_POINT_MIN_LENGTH = 10

/**
 * Entrée d'une card Capitaine côté serveur — input du calcul.
 */
export interface CaptainKeywordInput {
  keyword: string
  /** Racines persistées dans captain_explorations.root_keywords. Vide si keyword < 3 mots. */
  rootKeywords: string[]
  /** True pour les longue-traîne IA dont les KPIs marché sont absents. */
  isLongTail?: boolean
}

/**
 * Résultat enrichi pour une card ou racine, prêt à être envoyé au front.
 */
export interface RelevanceLiveEntry extends RelevanceScoreLiveResult {
  keyword: string
}

/**
 * Résultat du calcul Pertinence pour tout un onglet Capitaine.
 */
export interface CaptainTabRelevanceResult {
  cards: Map<string, RelevanceLiveEntry>
  /** Racines uniques calculées (mémoïsées). Permet d'afficher les scores
   *  individuels des racines dans le side panel sans recalcul front. */
  roots: Map<string, RelevanceLiveEntry>
  /** Snapshot du painPoint utilisé pour ce calcul — pour invalidation côté front. */
  painPointSnapshot: string | null
  /** Horodatage du calcul. */
  computedAt: Date
}

/**
 * Tokenise un painPoint en mots significatifs pour les calculs lexicaux.
 * Utilise une logique simple (split + filter mots ≥ 3 chars).
 */
function painPointToWords(painPoint: string): string[] {
  return painPoint
    .toLowerCase()
    .split(/\s+/)
    .map(w => w.trim())
    .filter(w => w.length >= 3)
}

/**
 * Calcule un Score Pertinence pour un keyword unique (racine ou card complète).
 *
 * Pour les racines : on passe `rootsAverageScore: null` (pas de récursion).
 * Pour les cards : on passe la moyenne des scores de leurs racines, lue
 * dans la Map mémoïsée par l'appelant.
 *
 * `painIntentExpected` (FR-CAP-RELEVANCE-INTENT-SIGNAL) provient d'un lookup
 * unique sur `articles.pain_intent_expected` réalisé par l'appelant
 * (`computeRelevanceForCaptainTab`). Si `null`, le 5e signal reste neutralisé
 * à 50/100 — c'est le comportement de dégradation gracieuse documenté.
 */
function computeRelevanceForSingleKeyword(
  keyword: string,
  painPoint: string,
  metrics: KeywordMetrics | null,
  rootsAverageScore: number | null,
  isLongTail: boolean,
  painIntentExpected: PainIntentExpected | null,
): RelevanceScoreLiveResult {
  // Cas 1 — Pas de painPoint utilisable
  if (!painPoint || painPoint === PAIN_POINT_FALLBACK || painPoint.length < PAIN_POINT_MIN_LENGTH) {
    log.info('[Capitaine] relevanceScore null', { keyword, reason: 'no-pain' })
    return makeUnavailableResult('no-pain')
  }

  // Cas 2 — Longue-traîne (kpis === null par construction côté Radar)
  if (isLongTail) {
    log.info('[Capitaine] relevanceScore null', { keyword, reason: 'long-tail' })
    return makeUnavailableResult('long-tail')
  }

  // Cas 3 — Métriques absentes en DB → cause précise selon ce qui manque
  if (!metrics) {
    log.info('[Capitaine] relevanceScore null', { keyword, reason: 'missing-paa' })
    return makeUnavailableResult('missing-paa')
  }
  if (!metrics.paaQuestions || metrics.paaQuestions.length === 0) {
    log.info('[Capitaine] relevanceScore null', { keyword, reason: 'missing-paa' })
    return makeUnavailableResult('missing-paa')
  }
  if (!metrics.autocompleteSuggestions || metrics.autocompleteSuggestions.length === 0) {
    log.info('[Capitaine] relevanceScore null', { keyword, reason: 'missing-autocomplete' })
    return makeUnavailableResult('missing-autocomplete')
  }

  // Cas nominal — calcul des 5 signaux via fonctions lexicales rapides
  const painWords = painPointToWords(painPoint)

  // Signal 1 — Pain × Mot-clé (alignement lexical keyword ↔ painPoint)
  const painAlignmentScore = lexicalPainAlignment(keyword, painWords)

  // Signal 2 — PAA × Douleur (moyenne d'alignement de chaque PAA avec le painPoint)
  const paaTexts = metrics.paaQuestions
    .map(p => `${p.question}${p.answer ? ` ${p.answer}` : ''}`)
    .filter(t => t.length > 0)
  const paaPainAlignmentAvg = avgLexicalPainAlignment(paaTexts, painWords)

  // Signal 3 — Autocomplete × Douleur
  const acTexts = metrics.autocompleteSuggestions.map(a => a.text).filter(Boolean)
  const autocompletePainAlignmentAvg = avgLexicalPainAlignment(acTexts, painWords)

  // Signal 5 — Intent × Douleur (FR-CAP-RELEVANCE-INTENT-SIGNAL).
  // Croise le label SERP de DataForSEO (`metrics.intentLabel`) avec l'intent
  // éditorial attendu de l'article (`painIntentExpected`). Si l'un des deux
  // manque, `computeRelevanceScore` neutralise le signal à 50/100 — pas de
  // pénalité injustifiée. Si mismatch, malus -10 appliqué directement sur la
  // composante `intentPain.normalized` (cf. INTENT_MISMATCH_MALUS).
  const intentTypes = metrics.intentLabel ? [metrics.intentLabel] : undefined

  const result = computeRelevanceScore({
    painAlignmentScore,
    paaPainAlignmentAvg: paaPainAlignmentAvg ?? undefined,
    autocompletePainAlignmentAvg: autocompletePainAlignmentAvg ?? undefined,
    rootsAverageScore: rootsAverageScore ?? undefined,
    intentTypes,
    painIntentExpected: painIntentExpected ?? undefined,
  })

  return {
    total: result.total,
    verdict: result.verdict,
    breakdown: result.breakdown,
    rootsContext: result.rootsContext,
    unavailableReason: null,
  }
}

function makeUnavailableResult(reason: RelevanceUnavailableReason): RelevanceScoreLiveResult {
  return {
    total: null,
    verdict: null,
    breakdown: null,
    rootsContext: null,
    unavailableReason: reason,
  }
}

/**
 * Calcule le Score Pertinence pour TOUS les keywords Capitaine d'un article,
 * à la volée, avec mémoïsation des racines partagées.
 *
 * Cf. docs/data-flows/relevance-score-live-computation.md §2 pour le schéma complet.
 *
 * Garanties :
 *   - Aucune écriture DB pendant le calcul (FR-CAP-RELEVANCE-NO-DB-WRITE)
 *   - Aucune mise en cache TTL (FR-CAP-RELEVANCE-NO-CACHE)
 *   - Map mémoïsation libérée à la sortie de la fonction (scope local)
 *   - Chaque racine partagée est calculée une seule fois (FR-CAP-RELEVANCE-MEMOIZATION)
 */
export async function computeRelevanceForCaptainTab(
  articleId: number,
  keywords: CaptainKeywordInput[],
): Promise<CaptainTabRelevanceResult> {
  const tTotal = Date.now()
  log.debug('[captain-relevance] PHASE 1 — démarrage', {
    articleId,
    keywordsCount: keywords.length,
    keywords: keywords.map(k => k.keyword),
  })

  // ---- PHASE 1 : Lecture DB (parallèle painPoint + painIntent) ----
  const [painPoint, painIntentExpected] = await Promise.all([
    getArticlePainPoint(articleId),
    getArticlePainIntent(articleId),
  ])
  const painPointSnapshot = painPoint === PAIN_POINT_FALLBACK ? null : painPoint
  log.debug('[captain-relevance] PHASE 1 — article lu', {
    articleId,
    painPointAvailable: painPoint !== PAIN_POINT_FALLBACK,
    painPointLength: painPoint !== PAIN_POINT_FALLBACK ? painPoint.length : 0,
    painPointPreview: painPoint !== PAIN_POINT_FALLBACK ? painPoint.slice(0, 60) : '(fallback)',
    painIntentExpected,
  })

  // Collecter toutes les racines uniques (Set dédoublonne)
  const allRootsSet = new Set<string>()
  for (const kw of keywords) {
    for (const root of kw.rootKeywords) allRootsSet.add(root)
  }
  log.debug('[captain-relevance] PHASE 1 — racines collectées', {
    articleId,
    rootsCount: allRootsSet.size,
    roots: [...allRootsSet],
  })

  // Charger les métriques pour tous les keywords + racines en parallèle
  const allKeywordsToFetch = [
    ...new Set([...keywords.map(k => k.keyword), ...allRootsSet]),
  ]
  const tMetrics = Date.now()
  const metricsByKeyword = await loadMetricsBatch(allKeywordsToFetch)
  const metricsHits = [...allKeywordsToFetch].filter(k => metricsByKeyword.has(k))
  const metricsMisses = [...allKeywordsToFetch].filter(k => !metricsByKeyword.has(k))
  log.debug('[captain-relevance] PHASE 1 — métriques chargées', {
    articleId,
    total: allKeywordsToFetch.length,
    hits: metricsHits.length,
    misses: metricsMisses.length,
    missingKeywords: metricsMisses,
    ms: Date.now() - tMetrics,
  })

  // ---- PHASE 2A : Calcul des racines uniques (mémoïsation locale) ----
  const rootScores = new Map<string, RelevanceLiveEntry>()
  for (const root of allRootsSet) {
    const metrics = metricsByKeyword.get(root) ?? null
    const result = computeRelevanceForSingleKeyword(
      root,
      painPoint,
      metrics,
      null,
      false,
      painIntentExpected,
    )
    rootScores.set(root, { keyword: root, ...result })
    log.debug('[captain-relevance] PHASE 2A — racine calculée', {
      root,
      score: result.total,
      unavailableReason: result.unavailableReason,
      hasPaa: (metrics?.paaQuestions?.length ?? 0) > 0,
      hasAc: (metrics?.autocompleteSuggestions?.length ?? 0) > 0,
    })
  }

  // ---- PHASE 2B : Calcul des cards complètes en lisant la Map ----
  const cardScores = new Map<string, RelevanceLiveEntry>()
  for (const kw of keywords) {
    const metrics = metricsByKeyword.get(kw.keyword) ?? null
    const myRootScores = kw.rootKeywords
      .map(r => rootScores.get(r)?.total)
      .filter((v): v is number => typeof v === 'number')
    const rootsAverage = myRootScores.length > 0
      ? Math.round(myRootScores.reduce((a, b) => a + b, 0) / myRootScores.length)
      : null

    const result = computeRelevanceForSingleKeyword(
      kw.keyword,
      painPoint,
      metrics,
      rootsAverage,
      kw.isLongTail ?? false,
      painIntentExpected,
    )
    cardScores.set(kw.keyword, { keyword: kw.keyword, ...result })
    log.debug('[captain-relevance] PHASE 2B — card calculée', {
      keyword: kw.keyword,
      score: result.total,
      verdict: result.verdict,
      unavailableReason: result.unavailableReason,
      rootsUsed: kw.rootKeywords.length,
      rootsAverage,
      breakdown: result.breakdown,
    })
  }

  const totalMs = Date.now() - tTotal
  log.debug('[captain-relevance] PHASE 3 — résumé final', {
    articleId,
    cardsComputed: cardScores.size,
    rootsComputed: rootScores.size,
    scored: [...cardScores.values()].filter(c => c.total !== null).length,
    unavailable: [...cardScores.values()].filter(c => c.total === null).length,
    totalMs,
  })

  // ---- PHASE 3 : Réponse — la Map est garbage-collectée à la sortie ----
  return {
    cards: cardScores,
    roots: rootScores,
    painPointSnapshot,
    computedAt: new Date(),
  }
}

/**
 * Charge les métriques de plusieurs keywords en parallèle.
 * Lecture seule, aucune écriture.
 */
async function loadMetricsBatch(keywords: string[]): Promise<Map<string, KeywordMetrics>> {
  const result = new Map<string, KeywordMetrics>()
  if (keywords.length === 0) return result
  // TODO [chantier:metrics-batch-sql-in] — optimisation N+1 sur loadMetricsBatch
  //
  // POURQUOI N appels parallèles aujourd'hui :
  //   On délègue à `getKeywordMetrics(kw)` une fois par keyword pour réutiliser
  //   sa logique (fr/fr par défaut, mappage de la row DB vers le type
  //   `KeywordMetrics`, gestion des fallbacks). C'est rapide tant que N reste
  //   petit (~5 keywords par article Capitaine + leurs racines, donc ~10-15
  //   requêtes parallèles). Postgres absorbe ça sans broncher en local.
  //
  // QUAND s'y attaquer :
  //   Si on observe une latence anormale sur `[captain-relevance] PHASE 1 —
  //   métriques chargées` (log debug avec `ms`), ou si un article a 50+ cards
  //   Capitaine. Refactor :
  //     SELECT * FROM keyword_metrics WHERE keyword = ANY($1) AND lang='fr' AND country='fr'
  //   puis hydrater un Map<string, KeywordMetrics> en une seule passe.
  //   Attention : il faut conserver le même mapping que `getKeywordMetrics`
  //   (mêmes types, mêmes fallbacks) — extraire un helper `rowToKeywordMetrics`.
  //
  // FR/NFR concernés :
  //   - NFR-PERF-* (performance) — pas de FR fonctionnel impacté, c'est purement
  //     une optim non-bloquante.
  //
  // TESTS à mettre à jour :
  //   - tests/unit/coherence/relevance-live-computation.test.ts : le test
  //     `loadMetricsBatch` (via `__test__`) doit rester vert avec le même
  //     contrat (Map<keyword, KeywordMetrics>, valeurs absentes non-incluses).
  const settled = await Promise.allSettled(keywords.map(kw => getKeywordMetrics(kw)))
  for (let i = 0; i < settled.length; i++) {
    const s = settled[i]
    if (s.status === 'fulfilled' && s.value) {
      result.set(keywords[i]!, s.value)
    }
  }
  return result
}

/**
 * Helper de test — exposé pour les tests unitaires uniquement.
 * Ne pas utiliser en production.
 *
 * @internal
 */
export const __test__ = {
  computeRelevanceForSingleKeyword,
  painPointToWords,
  loadMetricsBatch,
}
