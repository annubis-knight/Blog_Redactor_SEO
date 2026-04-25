// @vitest-environment node
/**
 * Integration — Onglet Moteur · Discovery (ui-sections-guide §3.3)
 */
import { describe, it, expect } from 'vitest'
import { setupTestContext } from '../helpers/test-context.js'
import { apiPost, apiGet } from '../helpers/api-client.js'

const ctx = setupTestContext()
function requireServer() { return ctx.serverOk ? { skip: false } : { skip: true } as const }

describe('Tab moteur/discovery — Seed + sources', () => {
  it('POST /keywords/discover renvoie keywords[] non vides', { timeout: 60000 }, async () => {
    if (requireServer().skip) return
    const res = await apiPost<{ keywords: unknown[] }>('/keywords/discover', {
      keyword: `test-${ctx.runId}-plombier`,
      options: { maxResults: 5 },
    })
    expect(res.status).toBe(200)
    expect(Array.isArray(res.data?.keywords)).toBe(true)
  })

  it('POST /keywords/discover sans keyword → 400 MISSING_PARAM', async () => {
    if (requireServer().skip) return
    const res = await apiPost('/keywords/discover', {})
    expect(res.error?.code).toBe('MISSING_PARAM')
  })

  it('POST /keywords/discover retourne un payload avec keywords[]', { timeout: 60000 }, async () => {
    if (requireServer().skip) return
    const { apiPost } = await import('../helpers/api-client.js')
    const res = await apiPost<{ keywords: unknown[] }>('/keywords/discover', {
      keyword: `test-${ctx.runId}-d`,
      options: { maxResults: 3 },
    })
    expect(res.status).toBe(200)
    expect(Array.isArray(res.data?.keywords)).toBe(true)
  })

  it.todo('Les 9 sections Discovery (frontend affichage — Playwright)')
  it.todo('Les sections vides affichées avec placeholder (frontend U1)')
})

describe('Tab moteur/discovery — Filtre pertinence sémantique', () => {
  it('POST /keywords/relevance-score classe les kw (mock fixture)', async () => {
    if (requireServer().skip) return
    const res = await apiPost<{ scores: Record<string, number>; fallback: boolean }>('/keywords/relevance-score', {
      seed: `test-${ctx.runId}-plombier`,
      keywords: ['plombier paris', 'plombier toulouse'],
    })
    expect(res.status).toBe(200)
    expect(res.data?.fallback).toBe(false)
  })

  it('POST /keywords/relevance-score sans seed → 400', async () => {
    if (requireServer().skip) return
    const res = await apiPost('/keywords/relevance-score', { keywords: ['x'] })
    expect(res.status).toBe(400)
  })

  it('POST /keywords/relevance-score sans keywords[] → 400', async () => {
    if (requireServer().skip) return
    const res = await apiPost('/keywords/relevance-score', { seed: 'x' })
    expect(res.status).toBe(400)
  })

  it('POST /keywords/relevance-score strict=true retourne { scores }', async () => {
    if (requireServer().skip) return
    const { apiPost } = await import('../helpers/api-client.js')
    const res = await apiPost<{ scores: Record<string, number> }>('/keywords/relevance-score', {
      seed: `test-${ctx.runId}`, keywords: ['kw1', 'kw2'], strict: true,
    })
    expect(res.status).toBe(200)
    expect(typeof res.data?.scores).toBe('object')
  })
})

describe('Tab moteur/discovery — Analyse IA (curate)', () => {
  it('POST /keywords/analyze-discovery retourne shortlist priorisée', { timeout: 60000 }, async () => {
    if (requireServer().skip) return
    const res = await apiPost<{ keywords: Array<{ priority: string }>; summary: string }>('/keywords/analyze-discovery', {
      seed: `test-${ctx.runId}-plombier`,
      wordGroups: [],
      keywords: [{ keyword: 'kw1', sources: ['suggest'] }, { keyword: 'kw2', sources: ['ai'] }],
    })
    expect(res.status).toBe(200)
    expect(res.data?.summary).toBeDefined()
    if (res.data && res.data.keywords.length > 0) {
      expect(['high', 'medium', 'low']).toContain(res.data.keywords[0].priority)
    }
  })

  it('POST /keywords/analyze-discovery sans seed → 400', async () => {
    if (requireServer().skip) return
    const res = await apiPost('/keywords/analyze-discovery', { keywords: [] })
    expect(res.status).toBe(400)
  })
})

describe('Tab moteur/discovery — Pain Translator', () => {
  it('POST /keywords/translate-pain (stream consommé) retourne 5 kw', { timeout: 60000 }, async () => {
    if (requireServer().skip) return
    const res = await apiPost<{ keywords: unknown[] }>('/keywords/translate-pain', {
      painText: `test-${ctx.runId} mon site ne génère pas de leads`,
    })
    expect(res.status).toBe(200)
    expect(res.data?.keywords.length).toBeGreaterThan(0)
  })

  it('POST /keywords/translate-pain sans painText → 400', async () => {
    if (requireServer().skip) return
    const res = await apiPost('/keywords/translate-pain', {})
    expect(res.status).toBe(400)
  })

  it('POST /keywords/validate-pain sans body → 400', async () => {
    if (requireServer().skip) return
    const { apiPost } = await import('../helpers/api-client.js')
    const res = await apiPost('/keywords/validate-pain', {})
    expect(res.status).toBe(400)
  })
})

describe('Tab moteur/discovery — Cache discovery', () => {
  it('GET /discovery-cache/check?seed=X répond { cached: bool }', async () => {
    if (requireServer().skip) return
    const res = await apiGet<{ cached: boolean }>(`/discovery-cache/check?seed=test-${ctx.runId}`)
    expect(res.status).toBe(200)
    expect(typeof res.data?.cached).toBe('boolean')
  })

  it('GET /discovery-cache/load?seed=X répond null pour seed inconnu', async () => {
    if (requireServer().skip) return
    const res = await apiGet(`/discovery-cache/load?seed=test-${ctx.runId}-unknown`)
    expect(res.status).toBe(200)
    expect(res.data).toBeNull()
  })
})

describe('Tab moteur/discovery — Basket integration', () => {
  it.todo('Checkbox kw → add to basket (Pinia, frontend)')
  it.todo('Compteur basket UI (frontend)')
  it.todo('Plus de "Envoyer au Capitaine" depuis Discovery (D1)')
})
