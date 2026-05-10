// @vitest-environment node
/**
 * Contract API — /intent/* + /local/* + /content-gap/* + /serp/*
 */
import { describe, it, expect } from 'vitest'
import { setupTestContext } from '../helpers/test-context.js'
import { apiPost, expectSuccessOrKnownError } from '../helpers/api-client.js'

const ctx = setupTestContext()
function requireServer() { return ctx.serverOk ? { skip: false } : { skip: true } as const }

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
    // Tavily peut être absent → tolère un code d'erreur env connu, sinon échoue
    if (!expectSuccessOrKnownError(res)) return
    expect(res.data?.keyword).toBeDefined()
    expect(Array.isArray(res.data?.competitors)).toBe(true)
    expect(Array.isArray(res.data?.themes)).toBe(true)
    expect(Array.isArray(res.data?.gaps)).toBe(true)
    expect(typeof res.data?.averageWordCount).toBe('number')
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
    if (!expectSuccessOrKnownError(res)) return
    expect(res.data?.keyword).toBeDefined()
    expect(Array.isArray(res.data?.competitors)).toBe(true)
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
