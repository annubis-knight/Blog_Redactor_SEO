import { log } from '../../utils/logger.js'
import { getCached, setCached, deleteCached, slugify } from '../../db/cache-helpers.js'
import type { RadarKeyword, KeywordRadarScanResult } from '../../../shared/types/intent.types.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RadarCacheData {
  seed: string
  context: {
    broadKeyword: string
    specificTopic: string
    painPoint: string
    depth: number
  }
  generatedKeywords: RadarKeyword[]
  scanResult: KeywordRadarScanResult
  cachedAt: string
  expiresAt: string
}

export interface RadarCacheStatus {
  cached: boolean
  cachedAt?: string
  keywordCount?: number
  globalScore?: number
  heatLevel?: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function checkRadarCache(seed: string): Promise<RadarCacheStatus> {
  const entry = await getCached<RadarCacheData>('radar', slugify(seed))
  if (!entry) return { cached: false }
  return {
    cached: true,
    cachedAt: entry.cachedAt,
    keywordCount: entry.generatedKeywords.length,
    globalScore: entry.scanResult.globalScore,
    heatLevel: entry.scanResult.heatLevel,
  }
}

export async function loadRadarCache(seed: string): Promise<RadarCacheData | null> {
  const entry = await getCached<RadarCacheData>('radar', slugify(seed))
  if (entry) log.debug(`radar-cache: PG hit for "${seed}"`)
  return entry
}

export async function saveRadarCache(
  data: Omit<RadarCacheData, 'cachedAt' | 'expiresAt'>,
): Promise<RadarCacheData> {
  const now = new Date()
  const full: RadarCacheData = {
    ...data,
    cachedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + CACHE_TTL_MS).toISOString(),
  }
  await setCached('radar', slugify(data.seed), full, CACHE_TTL_MS)
  log.info(`radar-cache: saved "${data.seed}" (${data.generatedKeywords.length} keywords, score=${data.scanResult.globalScore})`)
  return full
}

export async function clearRadarCache(seed: string): Promise<void> {
  await deleteCached('radar', slugify(seed))
  log.info(`radar-cache: cleared "${seed}"`)
}
