// @vitest-environment node
/**
 * FR-EXT-DATAFORSEO-SANDBOX — une réponse obtenue en simulé n'est jamais
 * resservie en réel (ni l'inverse).
 *
 * Recette du 2026-09-30 : l'utilisateur prépare en mode simulé (gratuit), puis
 * passe en réel ; les caches lui resservaient alors les réponses factices du
 * bac à sable DataForSEO et de l'IA simulée comme de vraies réponses
 * (longues traînes du Radar, mots-clés de Discovery, brief, SERP…).
 *
 * Le cache court (`external_api_cache`) et la sauvegarde Discovery
 * (`keyword_discoveries`) rangent désormais ce qu'ils gardent sous le mode qui
 * l'a produit. La base est simulée par une petite table en mémoire qui applique
 * les mêmes clés que PostgreSQL.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const db = vi.hoisted(() => {
  const rows = new Map<string, unknown>()
  const query = async (sql: string, params: unknown[] = []) => {
    if (/SELECT data FROM external_api_cache/i.test(sql)) {
      const data = rows.get(`cache|${params[0]}|${params[1]}`)
      return { rows: data === undefined ? [] : [{ data }], rowCount: data === undefined ? 0 : 1 }
    }
    if (/INSERT INTO external_api_cache/i.test(sql)) {
      rows.set(`cache|${params[0]}|${params[1]}`, JSON.parse(params[2] as string))
      return { rows: [], rowCount: 1 }
    }
    if (/DELETE FROM external_api_cache/i.test(sql)) {
      const existed = rows.delete(`cache|${params[0]}|${params[1]}`)
      return { rows: [], rowCount: existed ? 1 : 0 }
    }
    if (/FROM keyword_discoveries/i.test(sql) && /SELECT/i.test(sql)) {
      const sources = rows.get(`discovery|${params[0]}|${params[1]}`)
      if (sources === undefined) return { rows: [], rowCount: 0 }
      return {
        rows: [{ seed: params[0], lang: params[1], sources_json: sources, ai_analysis_json: null, fetched_at: new Date() }],
        rowCount: 1,
      }
    }
    if (/INSERT INTO keyword_discoveries/i.test(sql)) {
      rows.set(`discovery|${params[0]}|${params[1]}`, JSON.parse(params[2] as string))
      return { rows: [], rowCount: 1 }
    }
    if (/DELETE FROM keyword_discoveries/i.test(sql)) {
      const existed = rows.delete(`discovery|${params[0]}|${params[1]}`)
      return { rows: [], rowCount: existed ? 1 : 0 }
    }
    throw new Error(`requête inattendue : ${sql}`)
  }
  return { rows, query }
})

vi.mock('../../../server/db/client', () => ({ query: db.query, pool: { query: db.query } }))
vi.mock('../../../server/utils/logger', () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { setRuntimeMode } from '../../../server/services/infra/runtime-mode.service'
import { getCached, setCached, deleteCached, getOrFetch } from '../../../server/db/cache-helpers'
import { loadCache, saveCache, checkCache, clearCache } from '../../../server/services/infra/discovery-cache.service'
import type { DiscoveryCacheEntry } from '../../../shared/types/discovery-cache.types'

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

function discoveryEntry(seed: string, keyword: string): Omit<DiscoveryCacheEntry, 'cachedAt' | 'expiresAt'> {
  return {
    seed,
    suggestAlphabet: [],
    suggestQuestions: [],
    suggestIntents: [],
    suggestPrepositions: [],
    aiKeywords: [],
    dataforseoKeywords: [{ keyword } as DiscoveryCacheEntry['dataforseoKeywords'][number]],
    analysisResult: null,
  } as unknown as Omit<DiscoveryCacheEntry, 'cachedAt' | 'expiresAt'>
}

beforeEach(() => {
  db.rows.clear()
  setRuntimeMode(null)
  vi.unstubAllEnvs()
})

afterEach(() => {
  setRuntimeMode(null)
  vi.unstubAllEnvs()
})

describe('FR-EXT-DATAFORSEO-SANDBOX — cache court des sources externes rangé par mode', () => {
  it('une réponse gardée en simulé n\'est pas resservie en réel (longues traînes, Radar…)', async () => {
    setRuntimeMode('mock')
    await setCached('long-tail-suggest', 'cle-des-entrees', { suggestions: ['pizza london'] }, WEEK_MS)
    expect(await getCached('long-tail-suggest', 'cle-des-entrees')).toEqual({ suggestions: ['pizza london'] })

    setRuntimeMode('real')
    expect(await getCached('long-tail-suggest', 'cle-des-entrees')).toBeNull()
  })

  it('une réponse gardée en réel n\'est pas resservie en simulé (l\'inverse)', async () => {
    setRuntimeMode('real')
    await setCached('radar', 'plombier-toulouse', { score: 72 }, WEEK_MS)

    setRuntimeMode('mock')
    expect(await getCached('radar', 'plombier-toulouse')).toBeNull()

    setRuntimeMode('real')
    expect(await getCached('radar', 'plombier-toulouse')).toEqual({ score: 72 })
  })

  it('getOrFetch rappelle la vraie source en réel après un passage en simulé', async () => {
    setRuntimeMode('mock')
    const sandbox = vi.fn(async () => ({ volume: 673000 }))
    await getOrFetch('serp-top', 'laine-de-roche', WEEK_MS, sandbox)
    await getOrFetch('serp-top', 'laine-de-roche', WEEK_MS, sandbox)
    expect(sandbox).toHaveBeenCalledTimes(1)

    setRuntimeMode('real')
    const production = vi.fn(async () => ({ volume: 1900 }))
    expect(await getOrFetch('serp-top', 'laine-de-roche', WEEK_MS, production)).toEqual({ volume: 1900 })
    expect(production).toHaveBeenCalledTimes(1)
  })

  it('vider une entrée en simulé ne touche pas l\'entrée réelle', async () => {
    setRuntimeMode('real')
    await setCached('radar', 'plombier-toulouse', { score: 72 }, WEEK_MS)
    setRuntimeMode('mock')
    await setCached('radar', 'plombier-toulouse', { score: 10 }, WEEK_MS)
    await deleteCached('radar', 'plombier-toulouse')
    expect(await getCached('radar', 'plombier-toulouse')).toBeNull()

    setRuntimeMode('real')
    expect(await getCached('radar', 'plombier-toulouse')).toEqual({ score: 72 })
  })

  it('le mode suit la configuration quand personne n\'a cliqué (IA simulée)', async () => {
    vi.stubEnv('AI_PROVIDER', 'mock')
    vi.stubEnv('DATAFORSEO_SANDBOX', '')
    await setCached('dataforseo', 'plombier-toulouse', { searchVolume: 673000 }, WEEK_MS)

    vi.stubEnv('AI_PROVIDER', 'claude')
    expect(await getCached('dataforseo', 'plombier-toulouse')).toBeNull()
  })

  it('les sources que le mode ne simule pas (Search Console, suggestions Google) restent partagées', async () => {
    setRuntimeMode('mock')
    await setCached('gsc', 'site-2026-09-01-2026-09-30', { rows: [] }, WEEK_MS)
    await setCached('suggest', 'alphabet-plombier', [{ keyword: 'plombier toulouse' }], WEEK_MS)

    setRuntimeMode('real')
    expect(await getCached('gsc', 'site-2026-09-01-2026-09-30')).toEqual({ rows: [] })
    expect(await getCached('suggest', 'alphabet-plombier')).toEqual([{ keyword: 'plombier toulouse' }])
  })
})

describe('FR-EXT-DATAFORSEO-SANDBOX — sauvegarde Discovery rangée par mode', () => {
  it('des mots-clés découverts en simulé ne sont pas resservis en réel', async () => {
    setRuntimeMode('mock')
    await saveCache(discoveryEntry('plombier', 'pizza london'))
    expect((await checkCache('plombier')).cached).toBe(true)
    expect((await loadCache('plombier'))?.dataforseoKeywords[0].keyword).toBe('pizza london')

    setRuntimeMode('real')
    expect(await checkCache('plombier')).toEqual({ cached: false })
    expect(await loadCache('plombier')).toBeNull()
  })

  it('une découverte réelle reste servie en réel, et « Rafraîchir » en simulé ne l\'efface pas', async () => {
    setRuntimeMode('real')
    await saveCache(discoveryEntry('plombier', 'plombier toulouse'))

    setRuntimeMode('mock')
    expect(await loadCache('plombier')).toBeNull()
    await clearCache('plombier')

    setRuntimeMode('real')
    const entry = await loadCache('plombier')
    expect(entry?.seed).toBe('plombier')
    expect(entry?.dataforseoKeywords[0].keyword).toBe('plombier toulouse')
  })
})
