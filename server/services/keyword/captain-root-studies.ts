/**
 * AUTHORITY: aucune — relecture seule des mesures `keyword_metrics` déjà lues
 *            par `computeRelevanceForCaptainTab` (aucune requête ni appel de plus).
 * READS FROM: `CaptainTabRelevanceResult.metrics` et `.roots` ;
 *             `captain_explorations.root_keywords` (lignes de l'article).
 * WRITES TO: rien.
 * CONSUMERS: data.service.ts → getCaptainExplorations (`rootStudies`) →
 *            getArticleKeywords (`richRootKeywords`) → restoreFromHistory
 *            (useExploredKeywords) → CaptainRootsSidebar.
 * RELATED FR: FR-CAP-ROOTS, FR-CAP-RELEVANCE-LIVE, FR-MOT-NO-AUTO-ACTION.
 *
 * À la réouverture, une racine sans étude à elle pour l'article revenait « — »
 * (sans indicateurs ni Score Pertinence, plus de « Moyenne »), alors que ses
 * mesures communes venaient d'être lues pour noter les cartes (recette du
 * 2026-09-30, CAP-15). Mêmes règles que pour un candidat relu :
 * `captainKpisFromMetricsRow`, et le score de la racine déjà calculé. Une racine
 * jamais mesurée reste sans indicateurs : l'écran l'étudie au clic.
 */
import type { RichRootKeyword } from '../../../shared/types/keyword.types.js'
import type { CaptainTabRelevanceResult } from './captain-relevance.service.js'
import { captainKpisFromMetricsRow, scoreCaptainPaa } from './captain-kpis.js'

/** Ce que la relecture sait d'une racine sans étude enregistrée pour l'article. */
export type RootStudyFromMetrics = Pick<RichRootKeyword, 'kpis' | 'paaQuestions' | 'relevanceScore' | 'relevanceUnavailableReason'>

interface ExplorationRow {
  keyword: string
  root_keywords?: string[] | null
  article_title?: string | null
}

export function rootStudiesFromMetrics(
  rows: ExplorationRow[],
  relevance: Pick<CaptainTabRelevanceResult, 'metrics' | 'roots'>,
): Map<string, RootStudyFromMetrics> {
  const norm = (keyword: string) => keyword.trim().toLowerCase()
  const ownStudies = new Set(rows.map(r => norm(r.keyword)))
  const studies = new Map<string, RootStudyFromMetrics>()
  for (const row of rows) {
    for (const root of row.root_keywords ?? []) {
      if (ownStudies.has(norm(root)) || studies.has(root)) continue
      const metrics = relevance.metrics.get(root)
      if (!metrics) continue
      const paa = metrics.paaQuestions.map(p => ({ question: p.question, answer: p.answer ?? null }))
      const kpis = captainKpisFromMetricsRow({
        keyword: root,
        search_volume: metrics.searchVolume,
        keyword_difficulty: metrics.keywordDifficulty,
        cpc: metrics.cpc,
        intent_raw: metrics.intentRaw,
        autocomplete_suggestions: metrics.autocompleteSuggestions,
        autocomplete_source: metrics.autocompleteSource,
        metrics_fetched_at: metrics.fetchedAt,
        article_title: row.article_title,
      }, paa)
      const { matched } = scoreCaptainPaa(root, row.article_title, paa)
      const live = relevance.roots.get(root) ?? null
      studies.set(root, {
        kpis,
        paaQuestions: paa.map((p, idx) => ({ ...p, match: matched[idx]?.match ?? 'none', matchQuality: matched[idx]?.matchQuality })),
        relevanceScore: live && live.total !== null
          ? { total: live.total, verdict: live.verdict, breakdown: live.breakdown, rootsContext: live.rootsContext } as RichRootKeyword['relevanceScore']
          : null,
        relevanceUnavailableReason: live?.unavailableReason ?? null,
      })
    }
  }
  return studies
}
