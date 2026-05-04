import { query } from '../../db/client.js'
import { log } from '../../utils/logger.js'
import type { RadarKeyword, KeywordRadarScanResult } from '../../../shared/types/intent.types.js'
import type { LongTailSuggestion } from '../../../shared/schemas/long-tail-suggestions.schema.js'

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

// ---------------------------------------------------------------------------
// Long-tail suggestions (S2 — extension JSONB scan_result)
// ---------------------------------------------------------------------------

/**
 * Met à jour le champ `scan_result.longTailSuggestions[]` (et optionnellement
 * `scan_result.longTailSelectedKeywords[]`) sans toucher aux `cards[]`.
 *
 * Si la row n'existe pas encore (article sans scan), on créée une row
 * minimale pour porter les suggestions (les cards racines viendront plus
 * tard via `saveRadarExploration`).
 */
export async function persistLongTailSuggestions(
  articleId: number,
  suggestions: LongTailSuggestion[],
  selectedKeywords?: string[],
): Promise<void> {
  // 1) Lire la row existante (si présente) pour préserver cards[].
  const existing = await getRadarExploration(articleId)

  const merged: KeywordRadarScanResult & { longTailSuggestions: LongTailSuggestion[]; longTailSelectedKeywords?: string[] } = {
    // Defaults pour ne pas violer le schema KeywordRadarScanResult quand la row
    // n'existe pas (cas long-tail générée sans scan radar préalable — rare mais
    // possible si l'utilisateur arrive directement par une longue-traîne saisie).
    specificTopic: existing?.scanResult?.specificTopic ?? '',
    broadKeyword: existing?.scanResult?.broadKeyword ?? '',
    autocomplete: existing?.scanResult?.autocomplete ?? { suggestions: [], totalCount: 0 },
    cards: existing?.scanResult?.cards ?? [],
    // globalScore : merge JSONB defensive coding ; la valeur officielle vient du dernier
    // scan persiste, ce branche n'est atteinte que si scan_result est partiellement vide
    // (cas de migration de schema ou ecriture concurrente). 0 est ici un placeholder
    // qui sera ecrase au prochain scan complet.
     
    globalScore: existing?.scanResult?.globalScore ?? 0,
    heatLevel: existing?.scanResult?.heatLevel ?? 'froide',
    verdict: existing?.scanResult?.verdict ?? '',
    scannedAt: existing?.scanResult?.scannedAt ?? new Date().toISOString(),
    longTailSuggestions: suggestions,
    ...(selectedKeywords !== undefined ? { longTailSelectedKeywords: selectedKeywords } : {}),
  }

  // Conserver la sélection précédente si on ne la met pas à jour explicitement
  if (selectedKeywords === undefined && existing?.scanResult) {
    const prev = (existing.scanResult as KeywordRadarScanResult & { longTailSelectedKeywords?: string[] }).longTailSelectedKeywords
    if (prev) merged.longTailSelectedKeywords = prev
  }

  await query(
    `INSERT INTO radar_explorations
       (article_id, seed, broad_keyword, specific_topic, pain_point, depth, generated_keywords, scan_result, scanned_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, NOW())
     ON CONFLICT (article_id) DO UPDATE
       SET scan_result = EXCLUDED.scan_result,
           scanned_at = NOW()`,
    [
      articleId,
      existing?.seed ?? '',
      existing?.context.broadKeyword ?? null,
      existing?.context.specificTopic ?? null,
      existing?.context.painPoint ?? null,
      existing?.context.depth ?? 1,
      JSON.stringify(existing?.generatedKeywords ?? []),
      JSON.stringify(merged),
    ],
  )
  log.info(`radar-exploration: long-tail persisted article ${articleId} (${suggestions.length} suggestions)`)
}
