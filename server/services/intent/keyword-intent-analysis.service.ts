import { query } from '../../db/client.js'
import { log } from '../../utils/logger.js'
import type { IntentAnalysis } from '../../../shared/types/intent.types.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface KeywordIntentAnalysis extends IntentAnalysis {
  locationCode: number
  fetchedAt: string
}

interface KeywordIntentRow {
  keyword: string
  location_code: number
  classification: string | null
  modules: IntentAnalysis['modules']
  scores: IntentAnalysis['scores']
  dominant_intent: string | null
  recommendations: IntentAnalysis['recommendations']
  top_organic_results: IntentAnalysis['topOrganicResults']
  paa_questions: string[]
  fetched_at: Date
}

function rowToAnalysis(row: KeywordIntentRow): KeywordIntentAnalysis {
  return {
    keyword: row.keyword,
    locationCode: row.location_code,
    modules: row.modules ?? [],
    scores: row.scores ?? [],
    dominantIntent: (row.dominant_intent ?? 'mixed') as IntentAnalysis['dominantIntent'],
    classification: {
      type: (row.dominant_intent ?? 'mixed') as IntentAnalysis['dominantIntent'],
      confidence: 0,
      reasoning: row.classification ?? '',
    },
    recommendations: row.recommendations ?? [],
    topOrganicResults: row.top_organic_results ?? [],
    paaQuestions: row.paa_questions ?? [],
    cachedAt: row.fetched_at.toISOString(),
    fetchedAt: row.fetched_at.toISOString(),
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function getKeywordIntentAnalysis(
  keyword: string,
  locationCode: number = 2250,
): Promise<KeywordIntentAnalysis | null> {
  const res = await query<KeywordIntentRow>(
    `SELECT keyword, location_code, classification, modules, scores, dominant_intent,
            recommendations, top_organic_results, paa_questions, fetched_at
       FROM keyword_intent_analyses
      WHERE keyword = $1 AND location_code = $2`,
    [keyword, locationCode],
  )
  return res.rows[0] ? rowToAnalysis(res.rows[0]) : null
}

export async function saveKeywordIntentAnalysis(
  data: IntentAnalysis,
  locationCode: number = 2250,
): Promise<void> {
  await query(
    `INSERT INTO keyword_intent_analyses
       (keyword, location_code, classification, modules, scores, dominant_intent,
        recommendations, top_organic_results, paa_questions, fetched_at)
     VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6, $7::jsonb, $8::jsonb, $9::jsonb, NOW())
     ON CONFLICT (keyword, location_code) DO UPDATE
       SET classification = EXCLUDED.classification,
           modules = EXCLUDED.modules,
           scores = EXCLUDED.scores,
           dominant_intent = EXCLUDED.dominant_intent,
           recommendations = EXCLUDED.recommendations,
           top_organic_results = EXCLUDED.top_organic_results,
           paa_questions = EXCLUDED.paa_questions,
           fetched_at = NOW()`,
    [
      data.keyword, locationCode,
      data.classification?.reasoning ?? null,
      JSON.stringify(data.modules ?? []),
      JSON.stringify(data.scores ?? []),
      data.dominantIntent ?? null,
      JSON.stringify(data.recommendations ?? []),
      JSON.stringify(data.topOrganicResults ?? []),
      JSON.stringify(data.paaQuestions ?? []),
    ],
  )
  log.info(`keyword-intent: saved "${data.keyword}" (loc=${locationCode})`)
}

export function isKeywordIntentFresh(fetchedAt: string | Date | null | undefined, ttlDays: number = 7): boolean {
  if (!fetchedAt) return false
  const ts = typeof fetchedAt === 'string' ? new Date(fetchedAt).getTime() : fetchedAt.getTime()
  return Date.now() - ts < ttlDays * 24 * 60 * 60 * 1000
}
