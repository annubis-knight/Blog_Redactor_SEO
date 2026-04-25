import { query } from '../../db/client.js'
import { log } from '../../utils/logger.js'
import type { RadarKeyword, KeywordRadarScanResult } from '../../../shared/types/intent.types.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RadarExplorationContext {
  broadKeyword: string
  specificTopic: string
  painPoint: string
  depth: number
}

export interface RadarExploration {
  articleId: number
  seed: string
  context: RadarExplorationContext
  generatedKeywords: RadarKeyword[]
  scanResult: KeywordRadarScanResult
  scannedAt: string
}

export interface RadarExplorationStatus {
  exists: boolean
  scannedAt?: string
  keywordCount?: number
  globalScore?: number
  heatLevel?: string
  isFresh?: boolean
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FRESHNESS_DAYS = 7
const FRESHNESS_MS = FRESHNESS_DAYS * 24 * 60 * 60 * 1000

function computeFreshness(scannedAt: string | Date): boolean {
  const ts = typeof scannedAt === 'string' ? new Date(scannedAt).getTime() : scannedAt.getTime()
  return Date.now() - ts < FRESHNESS_MS
}

interface RadarExplorationRow {
  article_id: number
  seed: string
  broad_keyword: string | null
  specific_topic: string | null
  pain_point: string | null
  depth: number
  generated_keywords: RadarKeyword[]
  scan_result: KeywordRadarScanResult
  scanned_at: Date
}

function rowToExploration(row: RadarExplorationRow): RadarExploration {
  return {
    articleId: row.article_id,
    seed: row.seed,
    context: {
      broadKeyword: row.broad_keyword ?? '',
      specificTopic: row.specific_topic ?? '',
      painPoint: row.pain_point ?? '',
      depth: row.depth,
    },
    generatedKeywords: row.generated_keywords ?? [],
    scanResult: row.scan_result,
    scannedAt: row.scanned_at.toISOString(),
  }
}

// ---------------------------------------------------------------------------
// Public API — CRUD
// ---------------------------------------------------------------------------

export async function getRadarExploration(articleId: number): Promise<RadarExploration | null> {
  const res = await query<RadarExplorationRow>(
    `SELECT article_id, seed, broad_keyword, specific_topic, pain_point, depth,
            generated_keywords, scan_result, scanned_at
       FROM radar_explorations
      WHERE article_id = $1`,
    [articleId]
  )
  const row = res.rows[0]
  if (!row) return null
  return rowToExploration(row)
}

export async function getRadarExplorationStatus(articleId: number): Promise<RadarExplorationStatus> {
  const exploration = await getRadarExploration(articleId)
  if (!exploration) return { exists: false }
  return {
    exists: true,
    scannedAt: exploration.scannedAt,
    keywordCount: exploration.generatedKeywords.length,
    globalScore: exploration.scanResult?.globalScore,
    heatLevel: exploration.scanResult?.heatLevel,
    isFresh: computeFreshness(exploration.scannedAt),
  }
}

export async function saveRadarExploration(
  articleId: number,
  data: Omit<RadarExploration, 'articleId' | 'scannedAt'>,
): Promise<RadarExploration> {
  const res = await query<RadarExplorationRow>(
    `INSERT INTO radar_explorations
       (article_id, seed, broad_keyword, specific_topic, pain_point, depth, generated_keywords, scan_result, scanned_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, NOW())
     ON CONFLICT (article_id) DO UPDATE
       SET seed = EXCLUDED.seed,
           broad_keyword = EXCLUDED.broad_keyword,
           specific_topic = EXCLUDED.specific_topic,
           pain_point = EXCLUDED.pain_point,
           depth = EXCLUDED.depth,
           generated_keywords = EXCLUDED.generated_keywords,
           scan_result = EXCLUDED.scan_result,
           scanned_at = NOW()
     RETURNING article_id, seed, broad_keyword, specific_topic, pain_point, depth,
               generated_keywords, scan_result, scanned_at`,
    [
      articleId,
      data.seed,
      data.context.broadKeyword ?? null,
      data.context.specificTopic ?? null,
      data.context.painPoint ?? null,
      data.context.depth ?? 1,
      JSON.stringify(data.generatedKeywords ?? []),
      JSON.stringify(data.scanResult ?? {}),
    ]
  )
  log.info(`radar-exploration: saved article ${articleId} ("${data.seed}", ${data.generatedKeywords.length} keywords)`)
  return rowToExploration(res.rows[0])
}

export async function deleteRadarExploration(articleId: number): Promise<void> {
  await query(`DELETE FROM radar_explorations WHERE article_id = $1`, [articleId])
  log.info(`radar-exploration: cleared article ${articleId}`)
}

export function isRadarFresh(scannedAt: string | Date | null | undefined): boolean {
  if (!scannedAt) return false
  return computeFreshness(scannedAt)
}
