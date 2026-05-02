import { getCached, setCached, deleteCached } from '../db/cache-helpers.js'

/**
 * Sprint E (2026-05-02) — Wrapper unifié du cache `api_cache` dédié aux
 * Panels IA. Pré-configure `cache_type = 'ai-panel'` et un TTL par défaut.
 *
 * Pas de couche supplémentaire (passthrough vers `cache-helpers`). L'objectif
 * est qu'un futur sprint qui voudrait introduire du caching sur ces routes
 * passe par une seule API uniforme, sans dupliquer la sérialisation JSONB.
 */

const AI_PANEL_CACHE_TYPE = 'ai-panel'
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000 // 24h

/** Lecture du cache. Renvoie null si miss / expiré. */
export function getAiPanelCache<T>(cacheKey: string): Promise<T | null> {
  return getCached<T>(AI_PANEL_CACHE_TYPE, cacheKey)
}

/** Écriture du cache. TTL en ms (défaut 24h). */
export function setAiPanelCache<T>(cacheKey: string, data: T, ttlMs: number = DEFAULT_TTL_MS): Promise<void> {
  return setCached<T>(AI_PANEL_CACHE_TYPE, cacheKey, data, ttlMs)
}

/** Invalidation explicite (utile quand l'utilisateur force régénération). */
export function deleteAiPanelCache(cacheKey: string): Promise<void> {
  return deleteCached(AI_PANEL_CACHE_TYPE, cacheKey)
}

/**
 * Construit une clé de cache canonique pour un panel IA.
 * Pattern : `{tag}:{articleId|"none"}:{keyword}`.
 */
export function buildAiPanelCacheKey(tag: string, articleId: number | string | null | undefined, keyword: string): string {
  const articlePart = articleId == null ? 'none' : String(articleId)
  return `${tag}:${articlePart}:${keyword.toLowerCase()}`
}
