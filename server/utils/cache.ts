import { join } from 'path'
import { readJson, writeJson } from './json-storage.js'
import { log } from './logger.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CacheEntry<T> {
  data: T
  cachedAt: string
}

// ---------------------------------------------------------------------------
// Slugify — shared cache-key normaliser
// ---------------------------------------------------------------------------

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

// ---------------------------------------------------------------------------
// Freshness check
// ---------------------------------------------------------------------------

export function isFresh(cachedAt: string, ttlMs: number): boolean {
  if (ttlMs <= 0) return false
  return Date.now() - new Date(cachedAt).getTime() < ttlMs
}

// ---------------------------------------------------------------------------
// Low-level helpers (for services that need manual cache control)
// ---------------------------------------------------------------------------

export async function readCached<T>(
  cacheDir: string,
  key: string,
): Promise<CacheEntry<T> | null> {
  const filePath = join(cacheDir, `${key}.json`)
  try {
    const entry = await readJson<CacheEntry<T>>(filePath)
    if (entry.data !== undefined && entry.cachedAt) {
      return entry
    }
    return null // Old format or corrupt — treat as miss
  } catch {
    return null
  }
}

export async function writeCached<T>(
  cacheDir: string,
  key: string,
  data: T,
): Promise<void> {
  const filePath = join(cacheDir, `${key}.json`)
  const entry: CacheEntry<T> = { data, cachedAt: new Date().toISOString() }
  await writeJson(filePath, entry)
}

// ---------------------------------------------------------------------------
// getOrFetch — unified cache pattern
// ---------------------------------------------------------------------------

export async function getOrFetch<T>(
  cacheDir: string,
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  // Try reading cache
  const cached = await readCached<T>(cacheDir, key)
  if (cached && isFresh(cached.cachedAt, ttlMs)) {
    log.debug(`Cache HIT: ${key}`)
    return cached.data
  }
  log.debug(cached ? `Cache STALE: ${key}` : `Cache MISS: ${key}`)

  // Fetch fresh data
  const data = await fetcher()

  // Write to cache
  await writeCached(cacheDir, key, data)
  log.debug(`Cache WRITE: ${key}`)

  return data
}
