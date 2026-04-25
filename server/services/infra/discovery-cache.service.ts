import { log } from '../../utils/logger.js'
import {
  getKeywordDiscovery,
  saveKeywordDiscoverySources,
  deleteKeywordDiscovery,
} from '../keyword/keyword-discovery-db.service.js'
import type { DiscoveryCacheEntry, DiscoveryCacheStatus } from '../../../shared/types/discovery-cache.types.js'

// Sprint 15.6 — storage moved from api_cache[discovery] to keyword_discoveries
// (seed, lang). TTL applicative 30 jours (au lieu de 7) via le champ fetched_at.
// Le UI affiche un badge "Dernière analyse du X. [Rafraîchir]".

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
  const row = await getKeywordDiscovery(seed)
  if (!row) return { cached: false }
  const entry = row.sources as unknown as DiscoveryCacheEntry | null
  if (!entry || !entry.seed) return { cached: false }
  return {
    cached: true,
    cachedAt: row.fetchedAt,
    keywordCount: countKeywords(entry),
    hasAnalysis: entry.analysisResult !== null && entry.analysisResult !== undefined,
  }
}

export async function loadCache(seed: string): Promise<DiscoveryCacheEntry | null> {
  const row = await getKeywordDiscovery(seed)
  if (!row) return null
  log.debug(`discovery-db: hit for "${seed}"`)
  // Rebuild entry + ensure cachedAt/expiresAt are set from row.fetchedAt
  const entry = row.sources as unknown as DiscoveryCacheEntry
  if (!entry.cachedAt) entry.cachedAt = row.fetchedAt
  return entry
}

export async function saveCache(
  entry: Omit<DiscoveryCacheEntry, 'cachedAt' | 'expiresAt'>,
): Promise<DiscoveryCacheEntry> {
  const now = new Date()
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000
  const full: DiscoveryCacheEntry = {
    ...entry,
    cachedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + THIRTY_DAYS_MS).toISOString(),
  }
  await saveKeywordDiscoverySources(entry.seed, full as unknown as Record<string, unknown>)
  log.info(`discovery-db: saved "${entry.seed}" (${countKeywords(full)} keywords)`)
  return full
}

export async function clearCache(seed: string): Promise<void> {
  await deleteKeywordDiscovery(seed)
  log.info(`discovery-db: cleared "${seed}"`)
}
