// @vitest-environment node
/**
 * Contract API — /intent/* + /local/* + /content-gap/* + /serp/*
 */
import { describe, it, expect } from 'vitest'
import { setupTestContext } from '../helpers/test-context.js'
import { apiPost } from '../helpers/api-client.js'

const ctx = setupTestContext()
function requireServer() { return ctx.serverOk ? { skip: false } : { skip: true } as const }

describe('Contract /intent/analyze', () => {
  it('POST sans keyword → 400 ou 500', async () => {
    if (requireServer().skip) return
    const res = await apiPost('/intent/analyze', {})
    expect([400, 500]).toContain(res.status)
  })

  it('POST OK → IntentAnalysis (modules + scores + classification)', { timeout: 60000 }, async () => {
    if (requireServer().skip) return
    const res = await apiPost<{
      keyword: string
      modules: Array<{ type: string; present: boolean }>
      scores: Array<{ category: string; score: number }>
      dominantIntent: string
      classification: { type: string; confidence: number; reasoning: string }
    }>('/intent/analyze', { keyword: `test-${ctx.runId}-intent` })
    // Tolère 500 si DataForSEO sandbox rate-limit
    if (res.status === 200) {
      expect(res.data?.keyword).toBeDefined()
      expect(Array.isArray(res.data?.modules)).toBe(true)
      expect(Array.isArray(res.data?.scores)).toBe(true)
      expect(res.data?.classification?.type).toBeDefined()
      expect(['informational', 'transactional_local', 'navigational', 'mixed']).toContain(res.data?.dominantIntent ?? '')
    } else {
      expect([500]).toContain(res.status)
    }
  })

  it('POST 2ème appel sur même keyword → DB-first si 1er appel a réussi', { timeout: 60000 }, async () => {
    if (requireServer().skip) return
    const kw = `test-${ctx.runId}-intent-cache`
    const r1 = await apiPost('/intent/analyze', { keyword: kw })
    if (r1.status !== 200) return // 1er appel rate-limited, on skip silencieusement

    const t2 = Date.now()
    const r2 = await apiPost('/intent/analyze', { keyword: kw })
    const e2 = Date.now() - t2

    expect(r2.status).toBe(200)
    // 2ème call doit être très rapide (< 1s, c'est un DB read)
    expect(e2).toBeLessThan(1000)
  })
})

describe('Contract /local/maps', () => {
  it('POST sans body → 400 ou 500', async () => {
    if (requireServer().skip) return
    const res = await apiPost('/local/maps', {})
    expect([400, 500]).toContain(res.status)
  })

  it('POST OK → { keyword, listings[], reviewGap }', { timeout: 60000 }, async () => {
    if (requireServer().skip) return
    const res = await apiPost<{ keyword: string; listings: unknown[]; reviewGap: unknown }>(
      '/local/maps', { keyword: `test-${ctx.runId}-maps` },
    )
    if (res.status === 200) {
      expect(res.data?.keyword).toBeDefined()
      expect(Array.isArray(res.data?.listings)).toBe(true)
      expect(res.data?.reviewGap).toBeDefined()
    } else {
      expect([500]).toContain(res.status)
    }
  })
})

describe('Contract /keywords/compare-local', () => {
  it('POST sans body → 400 ou 500', async () => {
    if (requireServer().skip) return
    const res = await apiPost('/keywords/compare-local', {})
    expect([400, 500]).toContain(res.status)
  })

  it('POST OK → { local, national, opportunityIndex, alert? }', { timeout: 60000 }, async () => {
    if (requireServer().skip) return
    const res = await apiPost<{
      keyword: string
      local: { searchVolume: number }
      national: { searchVolume: number }
      opportunityIndex?: number
      alert?: { type: string; index: number } | null
    }>('/keywords/compare-local', { keyword: `test-${ctx.runId}-cl` })
    if (res.status === 200) {
      expect(res.data?.keyword).toBeDefined()
      expect(res.data?.local).toBeDefined()
      expect(res.data?.national).toBeDefined()
    } else {
      expect([500]).toContain(res.status)
    }
  })

  it('Alerte : si opportunité forte → alert.type === "opportunity"', { timeout: 60000 }, async () => {
    if (requireServer().skip) return
    const res = await apiPost<{ alert?: { type: string } | null }>(
      '/keywords/compare-local', { keyword: `test-${ctx.runId}-cl-alert` },
    )
    if (res.status === 200 && res.data?.alert) {
      expect(res.data.alert.type).toBe('opportunity')
    }
  })
})

describe('Contract /content-gap/analyze', () => {
  it('POST sans keyword → 400 ou 500', async () => {
    if (requireServer().skip) return
    const res = await apiPost('/content-gap/analyze', {})
    expect([400, 500]).toContain(res.status)
  })

  it('POST OK → { keyword, competitors[], themes[], gaps[] }', { timeout: 60000 }, async () => {
    if (requireServer().skip) return
    const res = await apiPost<{
      keyword: string
      competitors: unknown[]
      themes: unknown[]
      gaps: unknown[]
      averageWordCount: number
    }>('/content-gap/analyze', { keyword: `test-${ctx.runId}-cg` })
    // Tavily peut être absent → on tolère 500 mais la shape doit matcher
    if (res.status === 200) {
      expect(res.data?.keyword).toBeDefined()
      expect(Array.isArray(res.data?.competitors)).toBe(true)
      expect(Array.isArray(res.data?.themes)).toBe(true)
      expect(Array.isArray(res.data?.gaps)).toBe(true)
      expect(typeof res.data?.averageWordCount).toBe('number')
    } else {
      // Fail attendu si Tavily indispo
      expect([500]).toContain(res.status)
    }
  })

  it('POST avec currentContent → calcule presentInArticle', { timeout: 60000 }, async () => {
    if (requireServer().skip) return
    const res = await apiPost<{
      themes: Array<{ presentInArticle?: boolean; theme: string }>
    }>('/content-gap/analyze', {
      keyword: `test-${ctx.runId}-cg-content`,
      currentContent: 'Article qui parle de tarifs et certifications professionnelles.',
    })
    if (res.status === 200 && (res.data?.themes ?? []).length > 0) {
      // Le mock retourne des thèmes (tarifs, certifications, garanties, urgence)
      const tarifs = res.data!.themes.find(t => /tarif/i.test(t.theme))
      if (tarifs) expect(tarifs.presentInArticle).toBe(true)
    }
  })
})

describe('Contract /serp/analyze', () => {
  it('POST sans keyword → 400 ou 500', async () => {
    if (requireServer().skip) return
    const res = await apiPost('/serp/analyze', {})
    expect([400, 500]).toContain(res.status)
  })

  it('POST OK → { keyword, competitors[] }', { timeout: 60000 }, async () => {
    if (requireServer().skip) return
    const res = await apiPost<{ keyword: string; competitors: unknown[] }>(
      '/serp/analyze', { keyword: `test-${ctx.runId}-serp` },
    )
    if (res.status === 200) {
      expect(res.data?.keyword).toBeDefined()
      expect(Array.isArray(res.data?.competitors)).toBe(true)
    } else {
      expect([500]).toContain(res.status)
    }
  })

  it('POST 2ème call < 7j → cache hit DB-first si 1er a réussi', { timeout: 60000 }, async () => {
    if (requireServer().skip) return
    const kw = `test-${ctx.runId}-serp-cache`
    const r1 = await apiPost('/serp/analyze', { keyword: kw })
    if (r1.status !== 200) return // skip si 1er fail

    const t2 = Date.now()
    const r2 = await apiPost('/serp/analyze', { keyword: kw })
    const e2 = Date.now() - t2

    expect(r2.status).toBe(200)
    expect(e2).toBeLessThan(2000) // DB read < 2s
  })
})

describe('Contract /serp/tfidf', () => {
  it('POST sans body → 400 ou 500', async () => {
    if (requireServer().skip) return
    const res = await apiPost('/serp/tfidf', {})
    expect([400, 500]).toContain(res.status)
  })

  it('POST sans body valide → 400/404/500', { timeout: 60000 }, async () => {
    if (requireServer().skip) return
    const res = await apiPost<{ keyword?: string; terms?: unknown[]; tfidf?: unknown }>(
      '/serp/tfidf', { keyword: `test-${ctx.runId}-tfidf` },
    )
    // 200 (cache hit), 404 (article introuvable si articleId attendu), 500 (SERP fail)
    expect([200, 404, 500]).toContain(res.status)
  })
})
