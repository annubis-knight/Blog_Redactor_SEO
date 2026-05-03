import { getCached, setCached, slugify } from '../../../db/cache-helpers.js'
import type { DataForSeoCacheEntry } from '../../../../shared/types/index.js'
import { DEFAULT_MIN_REFRESH_HOURS } from '../../../../shared/constants/seo.constants.js'
import { CACHE_TYPE, DATAFORSEO_CACHE_TTL_MS } from './_client.js'

// --- Slugify (re-export for external consumers) ---

export { slugify } from '../../../db/cache-helpers.js'

// --- Cache ---

export async function readCache(keyword: string): Promise<DataForSeoCacheEntry | null> {
  return getCached<DataForSeoCacheEntry>(CACHE_TYPE, slugify(keyword))
}

export async function writeCache(data: DataForSeoCacheEntry): Promise<void> {
  await setCached(CACHE_TYPE, slugify(data.keyword), data, DATAFORSEO_CACHE_TTL_MS)
}

// --- Refresh policy ---

/** Get minimum refresh hours from env or default */
export function getMinRefreshHours(): number {
  const envVal = process.env.DATAFORSEO_MIN_REFRESH_HOURS
  if (envVal !== undefined) return Number(envVal)
  if (process.env.NODE_ENV === 'development') return 0
  return DEFAULT_MIN_REFRESH_HOURS
}

/** Check if cache is still fresh enough based on min refresh hours */
export function isCacheFresh(cachedAt: string): boolean {
  const minHours = getMinRefreshHours()
  return new Date(cachedAt).getTime() + minHours * 60 * 60 * 1000 > Date.now()
}
