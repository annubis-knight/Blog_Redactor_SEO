/**
 * KPI du Capitaine — une seule expression pour le premier clic (POST /scan) et
 * le rechargement (relecture de l'historique en base), CLAUDE.md §2.0.
 *
 * AUTHORITY: PostgreSQL `keyword_metrics` (KPI bruts, autocomplétion),
 *            `paa_explorations` (questions PAA de l'article)
 * READS FROM: lignes `keyword_metrics` jointes à `captain_explorations`
 * CONSUMERS: server/routes/keyword-scan.routes.ts (premier clic),
 *            server/services/infra/data.service.ts getCaptainExplorations (rechargement)
 * RELATED FR: FR-INFRA-KPI-NULLABLE, FR-INFRA-KPI-SCORING-NULLSAFE,
 *             NFR-INT-DISPLAY-CONTRACTS
 */
import { toKpiValue } from '../../../shared/contracts/core.js'
import type { KpiSummary } from '../../../shared/types/keyword.types.js'
import type { RadarMatchQuality, ResonanceMatch } from '../../../shared/types/intent.types.js'
import {
  bestMatch,
  computePaaWeightedScore,
  extractTopicWords,
  matchResonanceDetailed,
} from '../intent/intent-scan.service.js'

interface CaptainPaaMatch {
  match: ResonanceMatch
  /** Correspondance lexicale uniquement : jamais « semantic » au Capitaine. */
  matchQuality?: Exclude<RadarMatchQuality, 'semantic'>
}

/**
 * Note les questions PAA contre le sujet (mot-clé + titre de l'article) :
 * correspondance de chaque question et score pondéré du KPI PAA.
 */
export function scoreCaptainPaa(
  keyword: string,
  articleTitle: string | null | undefined,
  paaQuestions: Array<{ question: string; answer?: string | null }>,
): { matched: CaptainPaaMatch[]; weightedScore: number } {
  const topicWords = extractTopicWords(articleTitle ? `${keyword} ${articleTitle}` : keyword)
  const matched = paaQuestions.map((p): CaptainPaaMatch => {
    const qDetail = matchResonanceDetailed(p.question, topicWords)
    const aDetail = p.answer
      ? matchResonanceDetailed(p.answer, topicWords)
      : { match: 'none' as ResonanceMatch, quality: 'stem' as const }
    const match = bestMatch(qDetail.match, aDetail.match)
    const quality: Exclude<RadarMatchQuality, 'semantic'> =
      qDetail.match === aDetail.match
        ? (qDetail.quality === 'exact' || aDetail.quality === 'exact' ? 'exact' : 'stem')
        : (bestMatch(qDetail.match, aDetail.match) === qDetail.match ? qDetail.quality : aDetail.quality)
    return { match, matchQuality: match !== 'none' ? quality : undefined }
  })
  return { matched, weightedScore: computePaaWeightedScore(matched) }
}

/**
 * Position du mot-clé dans les suggestions Google :
 *   - trouvé → sa position (1 = première suggestion) ;
 *   - suggestions connues mais mot absent → 0 (« Non trouvé », un vrai signal) ;
 *   - suggestions jamais récupérées → `null` (inconnu, « — »).
 */
export function captainAutocompletePosition(
  keyword: string,
  suggestions: Array<{ text: string }>,
  fetched: boolean,
): number | null {
  const keywordLower = keyword.toLowerCase()
  const index = suggestions.findIndex(s => s.text.toLowerCase() === keywordLower)
  if (index >= 0) return index + 1
  return fetched || suggestions.length > 0 ? 0 : null
}

/**
 * KPI d'intention : probabilité DataForSEO ramenée entre 0 et 1.
 * Inconnue → `null` (« — »), et non plus la convention « 0.5 » qui
 * s'affichait comme une vraie mesure au premier clic.
 */
export function captainIntentValue(rawIntent: unknown): number | null {
  const value = toKpiValue(rawIntent, 'intent')
  return value === null ? null : Math.max(0, Math.min(1, value))
}

interface CaptainMetricsRow {
  keyword: string
  search_volume: unknown
  keyword_difficulty: unknown
  cpc: unknown
  intent_raw: unknown
  autocomplete_suggestions: unknown
  autocomplete_source: unknown
  metrics_fetched_at: unknown
  article_title?: string | null
}

/**
 * Recompose les 6 KPI d'une entrée d'historique, avec les mêmes règles qu'au
 * premier clic. Mot-clé jamais mesuré → aucun KPI (verdict GRAY à l'écran).
 */
export function captainKpisFromMetricsRow(
  row: CaptainMetricsRow,
  paaQuestions: Array<{ question: string; answer?: string | null }>,
): KpiSummary[] {
  if (!row.metrics_fetched_at) return []
  const suggestions = Array.isArray(row.autocomplete_suggestions)
    ? (row.autocomplete_suggestions as Array<{ text: string }>).filter(s => typeof s?.text === 'string')
    : []
  const autocompleteFetched = row.autocomplete_source !== null && row.autocomplete_source !== undefined
  return [
    { name: 'volume', rawValue: toKpiValue(row.search_volume, 'keyword_metrics.search_volume') },
    { name: 'kd', rawValue: toKpiValue(row.keyword_difficulty, 'keyword_metrics.keyword_difficulty') },
    { name: 'cpc', rawValue: toKpiValue(row.cpc, 'keyword_metrics.cpc') },
    { name: 'intent', rawValue: captainIntentValue(row.intent_raw) },
    { name: 'autocomplete', rawValue: captainAutocompletePosition(row.keyword, suggestions, autocompleteFetched) },
    { name: 'paa', rawValue: scoreCaptainPaa(row.keyword, row.article_title, paaQuestions).weightedScore },
  ]
}
