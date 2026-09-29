// @vitest-environment node
/**
 * Contract API — /intent/* + /local/* + /content-gap/* + /serp/*
 */
import { describe, it, expect } from 'vitest'
import { setupTestContext } from '../helpers/test-context.js'
import { apiPost, expectSuccessOrKnownError } from '../helpers/api-client.js'
import { dataForSeoConfigured } from '../helpers/external-sources.js'
import { query } from '../../server/db/client.js'

const ctx = setupTestContext()
function requireServer() { return ctx.serverOk ? { skip: false } : { skip: true } as const }

describe('Contract /content-gap/analyze', () => {
  it('POST sans keyword → 400 ou 500', async ({ skip }) => {
    if (requireServer().skip) skip()
    const res = await apiPost('/content-gap/analyze', {})
    expect([400, 500]).toContain(res.status)
  })

  it('POST OK → { keyword, competitors[], themes[], gaps[] }', { timeout: 60000 }, async ({ skip }) => {
    if (requireServer().skip) skip()
    const res = await apiPost<{
      keyword: string
      competitors: unknown[]
      themes: unknown[]
      gaps: unknown[]
      averageWordCount: number
    }>('/content-gap/analyze', { keyword: `test-${ctx.runId}-cg` })
    // Tavily peut être absent → code d'erreur env connu : test ignoré (pas vert)
    if (!expectSuccessOrKnownError(res)) skip()
    expect(res.data?.keyword).toBeDefined()
    expect(Array.isArray(res.data?.competitors)).toBe(true)
    expect(Array.isArray(res.data?.themes)).toBe(true)
    expect(Array.isArray(res.data?.gaps)).toBe(true)
    expect(typeof res.data?.averageWordCount).toBe('number')
  })

  // 2026-09-25 (épopée qualité SEO, C2 · T3) : l'assertion ne tournait que si
  // la réponse était 200 ET contenait un thème « tarif » — sinon le test sortait
  // vert sans rien vérifier (et, sur la fixture simulée, elle aurait échoué :
  // « tarifs et devis » n'apparaît pas mot pour mot dans le texte). Le thème est
  // marqué présent quand son libellé figure tel quel dans l'article.
  it('POST avec currentContent → calcule presentInArticle', { timeout: 60000 }, async ({ skip }) => {
    if (requireServer().skip) skip()
    if (ctx.modeReel) skip() // thèmes de la fixture simulée (mock-fixtures/content-gap.ts)
    const res = await apiPost<{
      themes: Array<{ presentInArticle?: boolean; theme: string }>
    }>('/content-gap/analyze', {
      keyword: `test-${ctx.runId}-cg-content`,
      currentContent: 'Article qui parle de tarifs et certifications professionnelles.',
    })
    if (!expectSuccessOrKnownError(res)) skip()
    const present = Object.fromEntries(res.data!.themes.map(t => [t.theme, t.presentInArticle]))
    expect(present['certifications professionnelles'], 'libellé cité tel quel').toBe(true)
    expect(present['intervention urgence 24/7'], 'thème absent du texte').toBe(false)
  })
})

describe('Contract /serp/analyze', () => {
  it('POST sans keyword → 400 ou 500', async ({ skip }) => {
    if (requireServer().skip) skip()
    const res = await apiPost('/serp/analyze', {})
    expect([400, 500]).toContain(res.status)
  })

  it('POST OK → { keyword, competitors[] }', { timeout: 60000 }, async ({ skip }) => {
    if (requireServer().skip) skip()
    if (!dataForSeoConfigured()) skip()
    const res = await apiPost<{ keyword: string; competitors: unknown[] }>(
      '/serp/analyze', { keyword: `test-${ctx.runId}-serp` },
    )
    if (!expectSuccessOrKnownError(res)) skip()
    expect(res.data?.keyword).toBeDefined()
    expect(Array.isArray(res.data?.competitors)).toBe(true)
  })

  // 2026-09-25 (épopée qualité SEO, C2 · T3) : le test sortait vert dès que le
  // 1er appel (DataForSEO) échouait, et jugeait le cache au chronomètre. Il
  // pose lui-même une analyse SERP fraîche en base (nettoyée avec les fixtures
  // via keyword_metrics) : le serveur doit la relire, sans appel externe.
  it('POST sur un mot-clé analysé il y a moins de 7 j → relu en base (DB-first)', { timeout: 60000 }, async ({ skip }) => {
    if (requireServer().skip) skip()
    const kw = `test-${ctx.runId}-serp-cache`
    const pages = [
      { url: 'https://t3-serp.example/1', text: 'plombier toulouse urgence' },
      { url: 'https://t3-serp.example/2', text: 'plombier toulouse devis' },
    ]
    await query(`INSERT INTO keyword_metrics (keyword) VALUES ($1)`, [kw])
    for (const [i, p] of pages.entries()) {
      await query(`INSERT INTO keyword_serp_results (keyword, position, url) VALUES ($1, $2, $3)`, [kw, i + 1, p.url])
      await query(
        `INSERT INTO keyword_serp_scrapes (keyword, position, url, text_content) VALUES ($1, $2, $3, $4)`,
        [kw, i + 1, p.url, p.text],
      )
    }

    const res = await apiPost<{ fromCache: boolean; competitors: Array<{ url: string; textContent: string }> }>(
      '/serp/analyze', { keyword: kw },
    )
    expect(res.status).toBe(200)
    expect(res.data?.fromCache).toBe(true)
    expect(res.data?.competitors.map(c => [c.url, c.textContent])).toEqual(pages.map(p => [p.url, p.text]))
  })
})

describe('Contract /serp/tfidf', () => {
  it('POST sans body → 400 ou 500', async ({ skip }) => {
    if (requireServer().skip) skip()
    const res = await apiPost('/serp/tfidf', {})
    expect([400, 500]).toContain(res.status)
  })

  it('POST sans body valide → 400/404/500', { timeout: 60000 }, async ({ skip }) => {
    if (requireServer().skip) skip()
    const res = await apiPost<{ keyword?: string; terms?: unknown[]; tfidf?: unknown }>(
      '/serp/tfidf', { keyword: `test-${ctx.runId}-tfidf` },
    )
    // 200 (cache hit), 404 (article introuvable si articleId attendu), 500 (SERP fail)
    expect([200, 404, 500]).toContain(res.status)
  })
})
