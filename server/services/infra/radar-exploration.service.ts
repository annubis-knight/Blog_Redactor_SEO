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
// Public API — Unitary keyword mutations (FR-RAD-DB-FIRST, FR-RAD-MANUAL-ADD)
// ---------------------------------------------------------------------------

function normalizeKeywordForDedup(keyword: string): string {
  return keyword.trim().toLowerCase()
}

/**
 * Persiste la liste `generatedKeywords` mise à jour sans toucher à
 * `scan_result`. Crée une row minimale si elle n'existe pas.
 */
async function persistGeneratedKeywords(
  articleId: number,
  existing: RadarExploration | null,
  generatedKeywords: RadarKeyword[],
): Promise<RadarExploration> {
  const res = await query<RadarExplorationRow>(
    `INSERT INTO radar_explorations
       (article_id, seed, broad_keyword, specific_topic, pain_point, depth, generated_keywords, scan_result, scanned_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, NOW())
     ON CONFLICT (article_id) DO UPDATE
       SET generated_keywords = EXCLUDED.generated_keywords,
           scanned_at = NOW()
     RETURNING article_id, seed, broad_keyword, specific_topic, pain_point, depth,
               generated_keywords, scan_result, scanned_at`,
    [
      articleId,
      existing?.seed ?? '',
      existing?.context.broadKeyword ?? null,
      existing?.context.specificTopic ?? null,
      existing?.context.painPoint ?? null,
      existing?.context.depth ?? 1,
      JSON.stringify(generatedKeywords),
      JSON.stringify(existing?.scanResult ?? {}),
    ],
  )
  return rowToExploration(res.rows[0])
}

export interface AddKeywordResult {
  entry: RadarExploration
  added: boolean
}

export async function addKeywordToRadarExploration(
  articleId: number,
  keyword: string,
  reasoning?: string,
): Promise<AddKeywordResult> {
  const trimmed = keyword.trim()
  if (!trimmed) {
    throw new Error('keyword cannot be empty')
  }
  const existing = await getRadarExploration(articleId)
  const current = existing?.generatedKeywords ?? []
  const normalized = normalizeKeywordForDedup(trimmed)
  const alreadyPresent = current.some(k => normalizeKeywordForDedup(k.keyword) === normalized)
  if (alreadyPresent) {
    log.debug(`radar-exploration: keyword "${trimmed}" already present for article ${articleId} (no-op)`)
    return { entry: existing!, added: false }
  }
  const updated: RadarKeyword[] = [...current, { keyword: trimmed, reasoning: reasoning ?? '' }]
  const entry = await persistGeneratedKeywords(articleId, existing, updated)
  log.info(`radar-exploration: added "${trimmed}" to article ${articleId} (${updated.length} keywords total)`)
  return { entry, added: true }
}

export async function removeKeywordFromRadarExploration(
  articleId: number,
  keyword: string,
): Promise<RadarExploration | null> {
  const existing = await getRadarExploration(articleId)
  if (!existing) return null
  const normalized = normalizeKeywordForDedup(keyword)
  const updated = existing.generatedKeywords.filter(
    k => normalizeKeywordForDedup(k.keyword) !== normalized,
  )
  if (updated.length === existing.generatedKeywords.length) {
    log.debug(`radar-exploration: keyword "${keyword}" not found for article ${articleId} (no-op)`)
    return existing
  }
  const entry = await persistGeneratedKeywords(articleId, existing, updated)
  log.info(`radar-exploration: removed "${keyword}" from article ${articleId} (${updated.length} keywords remaining)`)
  return entry
}

export interface AddKeywordsBatchResult {
  entry: RadarExploration
  added: number
}

export async function addKeywordsBatchToRadarExploration(
  articleId: number,
  keywords: Array<{ keyword: string; reasoning?: string }>,
): Promise<AddKeywordsBatchResult> {
  if (keywords.length === 0) {
    const existing = await getRadarExploration(articleId)
    return { entry: existing ?? await persistGeneratedKeywords(articleId, null, []), added: 0 }
  }
  const existing = await getRadarExploration(articleId)
  const current = existing?.generatedKeywords ?? []
  const seenNormalized = new Set(current.map(k => normalizeKeywordForDedup(k.keyword)))
  const toAdd: RadarKeyword[] = []
  for (const kw of keywords) {
    const trimmed = kw.keyword.trim()
    if (!trimmed) continue
    const normalized = normalizeKeywordForDedup(trimmed)
    if (seenNormalized.has(normalized)) continue
    seenNormalized.add(normalized)
    toAdd.push({ keyword: trimmed, reasoning: kw.reasoning ?? '' })
  }
  if (toAdd.length === 0) {
    log.debug(`radar-exploration: batch add no-op for article ${articleId} (all duplicates)`)
    return { entry: existing!, added: 0 }
  }
  const updated: RadarKeyword[] = [...current, ...toAdd]
  const entry = await persistGeneratedKeywords(articleId, existing, updated)
  log.info(`radar-exploration: batch added ${toAdd.length} keywords to article ${articleId} (${updated.length} total)`)
  return { entry, added: toAdd.length }
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
