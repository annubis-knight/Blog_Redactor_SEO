import { join } from 'path'
import { unlink } from 'fs/promises'
import { readJson, writeJson } from '../utils/json-storage.js'
import { log } from '../utils/logger.js'
import type { RadarKeyword, KeywordRadarScanResult } from '../../shared/types/intent.types.js'

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

const CACHE_DIR = join(process.cwd(), 'data', 'cache', 'radar')
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

function slugify(seed: string): string {
  return seed
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function getCachePath(seed: string): string {
  return join(CACHE_DIR, `${slugify(seed)}.json`)
}

// ---------------------------------------------------------------------------
// In-memory cache
// ---------------------------------------------------------------------------

const memoryCache = new Map<string, RadarCacheData>()

function isValid(entry: RadarCacheData): boolean {
  return new Date(entry.expiresAt).getTime() > Date.now()
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function checkRadarCache(seed: string): Promise<RadarCacheStatus> {
  const slug = slugify(seed)
  const mem = memoryCache.get(slug)
  if (mem && isValid(mem)) {
    return {
      cached: true,
      cachedAt: mem.cachedAt,
      keywordCount: mem.generatedKeywords.length,
      globalScore: mem.scanResult.globalScore,
      heatLevel: mem.scanResult.heatLevel,
    }
  }

  try {
    const entry = await readJson<RadarCacheData>(getCachePath(seed))
    if (isValid(entry)) {
      memoryCache.set(slug, entry)
      return {
        cached: true,
        cachedAt: entry.cachedAt,
        keywordCount: entry.generatedKeywords.length,
        globalScore: entry.scanResult.globalScore,
        heatLevel: entry.scanResult.heatLevel,
      }
    }
    return { cached: false }
  } catch {
    return { cached: false }
  }
}

export async function loadRadarCache(seed: string): Promise<RadarCacheData | null> {
  const slug = slugify(seed)
  const mem = memoryCache.get(slug)
  if (mem && isValid(mem)) {
    log.debug(`radar-cache: memory hit for "${seed}"`)
    return mem
  }

  try {
    const entry = await readJson<RadarCacheData>(getCachePath(seed))
    if (isValid(entry)) {
      memoryCache.set(slug, entry)
      log.debug(`radar-cache: disk hit for "${seed}"`)
      return entry
    }
    return null
  } catch {
    return null
  }
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
  const slug = slugify(data.seed)
  await writeJson(getCachePath(data.seed), full)
  memoryCache.set(slug, full)
  log.info(`radar-cache: saved "${data.seed}" (${data.generatedKeywords.length} keywords, score=${data.scanResult.globalScore})`)
  return full
}

export async function clearRadarCache(seed: string): Promise<void> {
  const slug = slugify(seed)
  memoryCache.delete(slug)
  try {
    await unlink(getCachePath(seed))
    log.info(`radar-cache: cleared "${seed}"`)
  } catch {
    // File may not exist
  }
}
