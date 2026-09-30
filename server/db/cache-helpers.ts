/**
 * AUTHORITY: PostgreSQL `external_api_cache` (cache_type, cache_key), rangé par
 *            mode effectif (runtime-mode.service) : une clé écrite en simulé
 *            porte le préfixe `mock:`.
 * READS FROM: getCached / getOrFetch.
 * WRITES TO: setCached / getOrFetch ; deleteCached.
 * CONSUMERS: dataforseo/cache (brief), keyword-measure (serp-top), radar-cache,
 *            long-tail-suggest, keyword-discovery, community-discussions,
 *            keywords.routes (validation), gsc, suggest ; keyword-discovery-db
 *            (modeScopedKey pour keyword_discoveries).
 * RELATED FR: FR-INFRA-EXTERNAL-API-CACHE, FR-INFRA-GET-OR-FETCH,
 *             FR-EXT-DATAFORSEO-SANDBOX.
 */
import { query } from './client.js'
import { log } from '../utils/logger.js'
import { getEffectiveMode } from '../services/infra/runtime-mode.service.js'

// Source unique de slugify — tous les services cache l'importent ici
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Range une clé de cache sous le mode qui l'a produite (FR-EXT-DATAFORSEO-SANDBOX).
 *
 * En simulé, DataForSEO répond depuis son bac à sable et l'IA depuis ses jeux
 * d'exemples : des données factices. Gardées sous la même clé qu'en réel, elles
 * étaient resservies comme vraies après le passage en réel (recette du
 * 2026-09-30 : longues traînes, mots-clés de Discovery). Une clé simulée porte
 * donc le préfixe `mock:` ; une clé réelle reste inchangée, pour que les entrées
 * réelles déjà gardées restent valables.
 */
export function modeScopedKey(key: string): string {
  return getEffectiveMode() === 'mock' ? `mock:${key}` : key
}

/**
 * Types dont la source ne passe pas par l'interrupteur simulé / réel : Search
 * Console et suggestions Google répondent pareil dans les deux modes. Leur
 * cache reste partagé (une même demande le même jour ne repart pas chez Google).
 */
const MODE_INDEPENDENT_CACHE_TYPES = new Set(['gsc', 'suggest'])

function storedKey(cacheType: string, cacheKey: string): string {
  return MODE_INDEPENDENT_CACHE_TYPES.has(cacheType) ? cacheKey : modeScopedKey(cacheKey)
}

export async function getCached<T>(
  cacheType: string,
  cacheKey: string
): Promise<T | null> {
  const res = await query<{ data: T }>(
    `SELECT data FROM external_api_cache
     WHERE cache_type = $1 AND cache_key = $2 AND expires_at > NOW()`,
    [cacheType, storedKey(cacheType, cacheKey)]
  )
  return res.rows[0]?.data ?? null
}

export async function setCached<T>(
  cacheType: string,
  cacheKey: string,
  data: T,
  ttlMs: number
): Promise<void> {
  const expiresAt = new Date(Date.now() + ttlMs)
  // Passer l'objet JS directement — pg sérialise en JSONB
  await query(
    `INSERT INTO external_api_cache (cache_type, cache_key, data, expires_at)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (cache_key, cache_type) DO UPDATE
     SET data = EXCLUDED.data, cached_at = NOW(), expires_at = EXCLUDED.expires_at`,
    [cacheType, storedKey(cacheType, cacheKey), JSON.stringify(data), expiresAt]
  )
}

export async function deleteCached(
  cacheType: string,
  cacheKey: string
): Promise<void> {
  await query(
    `DELETE FROM external_api_cache WHERE cache_type = $1 AND cache_key = $2`,
    [cacheType, storedKey(cacheType, cacheKey)]
  )
}

/**
 * Pattern composite « regarde dans le cache, sinon appelle le fournisseur et
 * écris le résultat ». Mutualise le combo `getCached` + `setCached` que les
 * services keyword (community-discussions, keyword-discovery, suggest)
 * réimplémentaient à l'identique avant 2026-05-13 (TD-DRIFT-009).
 *
 * Cf. NFR-MAIN-NO-SCORE-FALLBACK / cache cascade `cache-helpers.ts:42` doc
 * pour le rationale métier (DataForSEO TTL court, keyword_metrics permanent).
 */
export async function getOrFetch<T>(
  cacheType: string,
  cacheKey: string,
  ttlMs: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  const cached = await getCached<T>(cacheType, cacheKey)
  if (cached) {
    log.debug(`Cache HIT: ${cacheKey}`)
    return cached
  }
  log.debug(`Cache MISS: ${cacheKey}`)
  const data = await fetcher()
  await setCached(cacheType, cacheKey, data, ttlMs)
  return data
}
