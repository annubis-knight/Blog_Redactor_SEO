/**
 * AUTHORITY: PostgreSQL `keyword_metrics` (volume, difficulté, CPC, intention)
 *            et `keyword_serp_results` (premiers résultats de la SERP).
 * READS FROM: keyword_metrics, keyword_serp_results (base d'abord, 7 jours) ;
 *             DataForSEO pour ce qui manque (un appel groupé pour les KPI).
 * WRITES TO: keyword_metrics (upsertKeywordKpis), keyword_serp_results (upsertSerpResults).
 * CONSUMERS: child-candidates.service (candidats d'un nouvel article, Cerveau).
 * RELATED FR: FR-CER-KEYWORD-REAL-DATA
 *
 * « Aucun mot-clé n'est enregistré sans avoir été mesuré » : un candidat se
 * choisit sur son volume, sa difficulté, son intention et la nature de sa SERP.
 * Une mesure qui échoue reste absente — jamais un zéro inventé.
 */
import { getKeywordMetrics, isKeywordMetricsFresh, upsertKeywordKpis } from './keyword-metrics.service.js'
import { getSerpResultsFresh, upsertSerpResults } from './keyword-serp.service.js'
import { fetchKeywordOverviewBatch, fetchSearchIntentBatch, fetchSerp } from '../external/dataforseo.service.js'
import { PAIN_INTENT_EXPECTED_VALUES, type PainIntentExpected } from '../../../shared/types/scoring.types.js'
import { log } from '../../utils/logger.js'
import type { KeywordMeasure } from '../../../shared/types/cocoon-tree.types.js'

export type { KeywordMeasure }

const SERP_TOP = 3

function intentLabel(value: unknown): PainIntentExpected | null {
  return typeof value === 'string' && (PAIN_INTENT_EXPECTED_VALUES as readonly string[]).includes(value) ? (value as PainIntentExpected) : null
}

/** Mesure les KPI des mots-clés absents ou périmés, en un appel groupé. */
async function fetchMissingKpis(missing: string[]): Promise<void> {
  if (missing.length === 0) return
  const [overview, intents] = await Promise.all([
    fetchKeywordOverviewBatch(missing).catch((err: Error) => {
      log.warn('[keyword-measure] volumes indisponibles', { keywords: missing.length, error: err.message })
      return null
    }),
    fetchSearchIntentBatch(missing).catch(() => new Map<string, { intent: string; intentProbability: number }>()),
  ])
  if (!overview) return
  for (const keyword of missing) {
    const kpi = overview.get(keyword) ?? overview.get(keyword.toLowerCase())
    if (!kpi) continue
    const intent = intents.get(keyword.toLowerCase())
    await upsertKeywordKpis(keyword, {
      searchVolume: kpi.searchVolume,
      keywordDifficulty: kpi.difficulty,
      cpc: kpi.cpc,
      competition: kpi.competition,
      intentRaw: intent?.intentProbability ?? null,
      intentLabel: intentLabel(intent?.intent),
    })
  }
}

type SerpRow = { position: number; url: string; title?: string | null; domain?: string | null }

async function serpTop(keyword: string): Promise<KeywordMeasure['serp']> {
  let results: SerpRow[] | null = await getSerpResultsFresh(keyword)
  if (!results) {
    try {
      const fetched = await fetchSerp(keyword)
      await upsertSerpResults(keyword, fetched.map(r => ({ position: r.position, url: r.url, title: r.title, domain: r.domain })))
      results = fetched
    } catch (err) {
      log.warn('[keyword-measure] SERP indisponible', { keyword, error: (err as Error).message })
      return []
    }
  }
  return results
    .slice()
    .sort((a, b) => a.position - b.position)
    .slice(0, SERP_TOP)
    .map(r => ({ position: r.position, title: r.title ?? '', domain: r.domain ?? '', url: r.url }))
}

export async function measureKeywords(keywords: string[]): Promise<Map<string, KeywordMeasure>> {
  const unique = [...new Set(keywords.map(k => k.trim()).filter(Boolean))]
  const cached = await Promise.all(unique.map(k => getKeywordMetrics(k)))
  const missing = unique.filter((_, i) => !cached[i] || !isKeywordMetricsFresh(cached[i]!.fetchedAt))
  await fetchMissingKpis(missing)

  const out = new Map<string, KeywordMeasure>()
  await Promise.all(unique.map(async (keyword) => {
    const row = await getKeywordMetrics(keyword)
    out.set(keyword, {
      metrics: row
        ? { searchVolume: row.searchVolume, keywordDifficulty: row.keywordDifficulty, cpc: row.cpc, intent: row.intentLabel }
        : null,
      serp: await serpTop(keyword),
    })
  }))
  log.info('[keyword-measure] mesurés', { keywords: unique.length, fetched: missing.length })
  return out
}
