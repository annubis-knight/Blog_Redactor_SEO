import { query } from '../../db/client.js'
import { log } from '../../utils/logger.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface KeywordDiscovery {
  seed: string
  lang: string
  sources: Record<string, unknown>      // { az: [...], questions: [...], ... }
  aiAnalysis: Record<string, unknown> | null
  fetchedAt: string
}

interface KeywordDiscoveryRow {
  seed: string
  lang: string
  sources_json: Record<string, unknown>
  ai_analysis_json: Record<string, unknown> | null
  fetched_at: Date
}

function rowToDiscovery(row: KeywordDiscoveryRow): KeywordDiscovery {
  return {
    seed: row.seed,
    lang: row.lang,
    sources: row.sources_json ?? {},
    aiAnalysis: row.ai_analysis_json,
    fetchedAt: row.fetched_at.toISOString(),
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function getKeywordDiscovery(
  seed: string,
  lang: string = 'fr',
): Promise<KeywordDiscovery | null> {
  const res = await query<KeywordDiscoveryRow>(
    `SELECT seed, lang, sources_json, ai_analysis_json, fetched_at
       FROM keyword_discoveries
      WHERE seed = $1 AND lang = $2`,
    [seed, lang],
  )
  return res.rows[0] ? rowToDiscovery(res.rows[0]) : null
}

export async function saveKeywordDiscoverySources(
  seed: string,
  sources: Record<string, unknown>,
  lang: string = 'fr',
): Promise<void> {
  await query(
    `INSERT INTO keyword_discoveries (seed, lang, sources_json, fetched_at)
     VALUES ($1, $2, $3::jsonb, NOW())
     ON CONFLICT (seed, lang) DO UPDATE
       SET sources_json = EXCLUDED.sources_json,
           fetched_at = NOW()`,
    [seed, lang, JSON.stringify(sources)],
  )
  log.info(`keyword-discovery: saved sources for "${seed}" (lang=${lang})`)
}

export async function saveKeywordDiscoveryAiAnalysis(
  seed: string,
  aiAnalysis: Record<string, unknown>,
  lang: string = 'fr',
): Promise<void> {
  await query(
    `INSERT INTO keyword_discoveries (seed, lang, ai_analysis_json, fetched_at)
     VALUES ($1, $2, $3::jsonb, NOW())
     ON CONFLICT (seed, lang) DO UPDATE
       SET ai_analysis_json = EXCLUDED.ai_analysis_json,
           fetched_at = NOW()`,
    [seed, lang, JSON.stringify(aiAnalysis)],
  )
  log.info(`keyword-discovery: saved ai_analysis for "${seed}"`)
}

export function isKeywordDiscoveryFresh(fetchedAt: string | Date | null | undefined, ttlDays: number = 30): boolean {
  if (!fetchedAt) return false
  const ts = typeof fetchedAt === 'string' ? new Date(fetchedAt).getTime() : fetchedAt.getTime()
  return Date.now() - ts < ttlDays * 24 * 60 * 60 * 1000
}

export async function deleteKeywordDiscovery(seed: string, lang: string = 'fr'): Promise<void> {
  await query(`DELETE FROM keyword_discoveries WHERE seed = $1 AND lang = $2`, [seed, lang])
}
