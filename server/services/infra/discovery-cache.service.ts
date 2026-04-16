import { join } from 'path'
import { unlink } from 'fs/promises'
import { readJson, writeJson } from '../../utils/json-storage.js'
import { log } from '../../utils/logger.js'
import type { DiscoveryCacheEntry, DiscoveryCacheStatus } from '../../../shared/types/discovery-cache.types.js'

const CACHE_DIR = join(process.cwd(), 'data', 'cache', 'discovery')
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

// In-memory cache
const memoryCache = new Map<string, DiscoveryCacheEntry>()

function isValid(entry: DiscoveryCacheEntry): boolean {
  return new Date(entry.expiresAt).getTime() > Date.now()
}

function countKeywords(entry: DiscoveryCacheEntry): number {
  const seen = new Set<string>()
  for (const list of [
    entry.suggestAlphabet, entry.suggestQuestions,
    entry.suggestIntents, entry.suggestPrepositions,
    entry.aiKeywords, entry.dataforseoKeywords,
  ]) {
    for (const kw of list) seen.add(kw.keyword.toLowerCase())
  }
  return seen.size
}

export async function checkCache(seed: string): Promise<DiscoveryCacheStatus> {
  const slug = slugify(seed)
  const mem = memoryCache.get(slug)
  if (mem && isValid(mem)) {
    return {
      cached: true,
      cachedAt: mem.cachedAt,
      keywordCount: countKeywords(mem),
      hasAnalysis: mem.analysisResult !== null,
    }
  }

  try {
    const entry = await readJson<DiscoveryCacheEntry>(getCachePath(seed))
    if (isValid(entry)) {
      memoryCache.set(slug, entry)
      return {
        cached: true,
        cachedAt: entry.cachedAt,
        keywordCount: countKeywords(entry),
        hasAnalysis: entry.analysisResult !== null,
      }
    }
    return { cached: false }
  } catch {
    return { cached: false }
  }
}

export async function loadCache(seed: string): Promise<DiscoveryCacheEntry | null> {
  const slug = slugify(seed)
  const mem = memoryCache.get(slug)
  if (mem && isValid(mem)) {
    log.debug(`discovery-cache: memory hit for "${seed}"`)
    return mem
  }

  try {
    const entry = await readJson<DiscoveryCacheEntry>(getCachePath(seed))
    if (isValid(entry)) {
      memoryCache.set(slug, entry)
      log.debug(`discovery-cache: disk hit for "${seed}"`)
      return entry
    }
    return null
  } catch {
    return null
  }
}

export async function saveCache(
  entry: Omit<DiscoveryCacheEntry, 'cachedAt' | 'expiresAt'>,
): Promise<DiscoveryCacheEntry> {
  const now = new Date()
  const full: DiscoveryCacheEntry = {
    ...entry,
    cachedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + CACHE_TTL_MS).toISOString(),
  }
  const slug = slugify(entry.seed)
  await writeJson(getCachePath(entry.seed), full)
  memoryCache.set(slug, full)
  log.info(`discovery-cache: saved "${entry.seed}" (${countKeywords(full)} keywords)`)
  return full
}

export async function clearCache(seed: string): Promise<void> {
  const slug = slugify(seed)
  memoryCache.delete(slug)
  try {
    await unlink(getCachePath(seed))
    log.info(`discovery-cache: cleared "${seed}"`)
  } catch {
    // File may not exist
  }
}
