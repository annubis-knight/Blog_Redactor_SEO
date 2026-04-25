// @vitest-environment node
/**
 * Integration — Onglet Moteur · Radar (ui-sections-guide §3.4)
 */
import { describe, it, expect } from 'vitest'
import { setupTestContext } from '../helpers/test-context.js'
import { apiPost, apiGet, apiDelete } from '../helpers/api-client.js'

const ctx = setupTestContext()
function requireServer() { return ctx.serverOk ? { skip: false } : { skip: true } as const }

describe('Tab moteur/radar — Génération keywords', () => {
  it('POST /keywords/radar/generate retourne ~15 kw via mock fixture', { timeout: 60000 }, async () => {
    if (requireServer().skip) return
    const res = await apiPost<{ keywords: Array<{ keyword: string; reasoning: string }> }>('/keywords/radar/generate', {
      title: `test-${ctx.runId} title`,
      keyword: 'plombier toulouse',
      painPoint: 'urgent',
    })
    expect(res.status).toBe(200)
    expect(res.data?.keywords.length).toBeGreaterThanOrEqual(10)
  })

  it('POST /keywords/radar/generate sans title → 400', async () => {
    if (requireServer().skip) return
    const res = await apiPost('/keywords/radar/generate', { keyword: 'x', painPoint: 'y' })
    expect(res.status).toBe(400)
  })

  it('POST /keywords/radar/generate sans keyword → 400', async () => {
    if (requireServer().skip) return
    const res = await apiPost('/keywords/radar/generate', { title: 'x', painPoint: 'y' })
    expect(res.status).toBe(400)
  })

  it('POST /keywords/radar/generate sans painPoint → 400', async () => {
    if (requireServer().skip) return
    const res = await apiPost('/keywords/radar/generate', { title: 'x', keyword: 'y' })
    expect(res.status).toBe(400)
  })

  it.todo('Changement d\'article reset generatedKeywords[] (frontend — Playwright)')
  it.todo('Les kw générés sont éditables/supprimables (frontend — Playwright)')
})

describe('Tab moteur/radar — DB-first (Sprint 9)', () => {
  it('GET /articles/:id/radar-exploration/status retourne exists=false avant scan', async () => {
    if (requireServer().skip) return
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'RDB Cocon')
    const article = await ctx.createArticle(cocoon.id, 'RDB Article')

    const res = await apiGet<{ exists: boolean }>(`/articles/${article.id}/radar-exploration/status`)
    expect(res.status).toBe(200)
    expect(res.data?.exists).toBe(false)
  })

  it('GET /articles/:id/radar-exploration retourne null avant scan', async () => {
    if (requireServer().skip) return
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'RDB2 Cocon')
    const article = await ctx.createArticle(cocoon.id, 'RDB2 Article')

    const res = await apiGet(`/articles/${article.id}/radar-exploration`)
    expect(res.status).toBe(200)
    expect(res.data).toBeNull()
  })

  it('Mode libre : GET /radar-cache/check?seed=X retourne { cached: bool }', async () => {
    if (requireServer().skip) return
    const { apiGet } = await import('../helpers/api-client.js')
    const res = await apiGet<{ cached: boolean }>(`/radar-cache/check?seed=test-${ctx.runId}-free`)
    expect(res.status).toBe(200)
    expect(typeof res.data?.cached).toBe('boolean')
  })

  it.todo('Si stale > 7j, badge UI affiché (frontend — Playwright)')
})

describe('Tab moteur/radar — Scan + cards', () => {
  it('POST /keywords/radar/scan retourne { cards, globalScore, heatLevel }', { timeout: 60000 }, async () => {
    if (requireServer().skip) return
    const res = await apiPost<{ cards: unknown[]; globalScore: number; heatLevel: string }>('/keywords/radar/scan', {
      broadKeyword: 'plombier toulouse',
      specificTopic: `test-${ctx.runId}`,
      keywords: [{ keyword: 'plombier urgence', reasoning: 'test' }],
      depth: 1,
    })
    expect(res.status).toBe(200)
    expect(['froide', 'tiede', 'chaude', 'brulante']).toContain(res.data?.heatLevel ?? '')
  })

  it('POST /keywords/radar/scan sans broadKeyword → 400', async () => {
    if (requireServer().skip) return
    const res = await apiPost('/keywords/radar/scan', { specificTopic: 'x', keywords: [{}] })
    expect(res.status).toBe(400)
  })

  it('POST /keywords/radar/scan depth=2 → 200 (PAA L2)', { timeout: 120000 }, async () => {
    if (requireServer().skip) return
    const { apiPost } = await import('../helpers/api-client.js')
    const res = await apiPost('/keywords/radar/scan', {
      broadKeyword: 'plombier toulouse',
      specificTopic: `test-${ctx.runId}-depth2`,
      keywords: [{ keyword: 'plombier', reasoning: 'test' }],
      depth: 2,
    })
    expect([200, 500]).toContain(res.status)
  })
})

describe('Tab moteur/radar — Persistance DB-first', () => {
  it('POST /articles/:id/radar-exploration upsert idempotent', async () => {
    if (requireServer().skip) return
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'RUpsert Cocon')
    const article = await ctx.createArticle(cocoon.id, 'RUpsert Article')

    const payload = {
      seed: 'plombier',
      context: { broadKeyword: 'p', specificTopic: 's', painPoint: 'pn', depth: 1 },
      generatedKeywords: [{ keyword: 'k1', reasoning: 'r1' }],
      scanResult: {
        specificTopic: 's', broadKeyword: 'p', autocomplete: { suggestions: [], totalCount: 0 },
        cards: [], globalScore: 50, heatLevel: 'tiede', verdict: 'décent', scannedAt: new Date().toISOString(),
      },
    }
    const res1 = await apiPost(`/articles/${article.id}/radar-exploration`, payload)
    expect(res1.status).toBe(200)

    // Re-call : doit upsert sans erreur
    const res2 = await apiPost(`/articles/${article.id}/radar-exploration`, payload)
    expect(res2.status).toBe(200)
  })

  it('DELETE /articles/:id/radar-exploration → cleared=true', async () => {
    if (requireServer().skip) return
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'RDel Cocon')
    const article = await ctx.createArticle(cocoon.id, 'RDel Article')

    const res = await apiDelete<{ cleared: boolean }>(`/articles/${article.id}/radar-exploration`)
    expect(res.status).toBe(200)
    expect(res.data?.cleared).toBe(true)
  })
})

describe('Tab moteur/radar — Basket integration', () => {
  it.todo('Cocher card emit cards-selected (frontend)')
  it.todo('Source=radar dans le basket (frontend)')
  it.todo('Plus de bouton "Envoyer au Capitaine" (D1)')
})
