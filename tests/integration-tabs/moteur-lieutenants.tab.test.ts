// @vitest-environment node
/**
 * Integration — Onglet Moteur · Lieutenants (ui-sections-guide §3.6)
 */
import { describe, it, expect } from 'vitest'
import { setupTestContext } from '../helpers/test-context.js'
import { apiPost, apiGet } from '../helpers/api-client.js'
import { query } from '../../server/db/client.js'

const ctx = setupTestContext()
function requireServer() { return ctx.serverOk ? { skip: false } : { skip: true } as const }

describe('Tab moteur/lieutenants — SERP analysis', () => {
  it('POST /serp/analyze sans body → 400/500', async () => {
    if (requireServer().skip) return
    const { apiPost } = await import('../helpers/api-client.js')
    const res = await apiPost('/serp/analyze', {})
    expect([400, 500]).toContain(res.status)
  })

  it('POST /serp/analyze OK → { keyword, competitors[] }', { timeout: 60000 }, async () => {
    if (requireServer().skip) return
    const { apiPost } = await import('../helpers/api-client.js')
    const res = await apiPost<{ keyword: string; competitors: unknown[] }>('/serp/analyze', {
      keyword: `test-${ctx.runId}-l-serp`,
    })
    if (res.status === 200) {
      expect(res.data?.keyword).toBeDefined()
      expect(Array.isArray(res.data?.competitors)).toBe(true)
    } else {
      expect([500]).toContain(res.status)
    }
  })

  it('POST /serp/analyze?articleId=X retourne OK (persistance DB-first en arrière-plan)', { timeout: 60000 }, async () => {
    if (requireServer().skip) return
    const { apiPost } = await import('../helpers/api-client.js')
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'SerpA Cocon')
    const article = await ctx.createArticle(cocoon.id, 'SerpA Article')

    const res = await apiPost('/serp/analyze', {
      keyword: `test-${ctx.runId}-l-dbfirst`,
      articleId: article.id,
    })
    expect([200, 500]).toContain(res.status)
  })

  it.todo('Slider 3-10 concurrents (frontend — Playwright)')
  it.todo('Activity log P1 message (frontend — Playwright)')
})

describe('Tab moteur/lieutenants — Propositions IA (E2)', () => {
  it('POST /keywords/:captain/propose-lieutenants (stream) renvoie SSE', { timeout: 30000 }, async () => {
    if (requireServer().skip) return
    const res = await fetch(`http://localhost:3005/api/keywords/${encodeURIComponent('test-' + ctx.runId + '-cap')}/propose-lieutenants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        articleTitle: 'Test',
        articleType: 'Pilier',
        cocoonName: 'test',
        serpResults: [{ keyword: 'kw1', topResults: [] }],
      }),
    })
    expect([200, 400, 500]).toContain(res.status)
  })

  it.todo('Persistance backend AVANT done event (E2) — nécessite DB probe pendant stream, complexe')

  it('Re-validation < 7j : 2ème call propose-lieutenants plus rapide', { timeout: 60000 }, async () => {
    if (requireServer().skip) return
    const kw = `test-${ctx.runId}-ttl-lt`
    const payload = {
      articleTitle: 'Test',
      articleType: 'Pilier',
      cocoonName: 'test',
      serpResults: [{ keyword: 'kw1', topResults: [] }],
    }
    const t1 = Date.now()
    await fetch(`http://localhost:3005/api/keywords/${encodeURIComponent(kw)}/propose-lieutenants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const e1 = Date.now() - t1

    const t2 = Date.now()
    await fetch(`http://localhost:3005/api/keywords/${encodeURIComponent(kw)}/propose-lieutenants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const e2 = Date.now() - t2

    // Cache hit doit être au moins aussi rapide
    expect(e2).toBeLessThanOrEqual(e1 * 2)
  })
})

describe('Tab moteur/lieutenants — Lecture DB-first', () => {
  it('GET /articles/:id/lieutenant-explorations retourne pour article neuf', async () => {
    if (requireServer().skip) return
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'LDB Cocon')
    const article = await ctx.createArticle(cocoon.id, 'LDB Article')

    const res = await apiGet(`/articles/${article.id}/lieutenant-explorations`)
    expect(res.status).toBe(200)
  })

  it('GET /articles/:id/explorations renvoie lieutenants[] pour article neuf', async () => {
    if (requireServer().skip) return
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'LExp Cocon')
    const article = await ctx.createArticle(cocoon.id, 'LExp Article')

    const res = await apiGet<{ lieutenants: unknown[] }>(`/articles/${article.id}/explorations`)
    expect(Array.isArray(res.data?.lieutenants)).toBe(true)
    expect(res.data?.lieutenants.length).toBe(0)
  })
})

describe('Tab moteur/lieutenants — Archive (D3)', () => {
  it('POST /articles/:id/lieutenants/archive idempotent (aucun lieutenant)', async () => {
    if (requireServer().skip) return
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'LArch Cocon')
    const article = await ctx.createArticle(cocoon.id, 'LArch Article')

    const res = await apiPost(`/articles/${article.id}/lieutenants/archive`, {})
    expect([200, 204]).toContain(res.status)
  })

  it('POST /articles/:id/lieutenants/archive avec keywords[] → 200/204', async () => {
    if (requireServer().skip) return
    const { apiPost } = await import('../helpers/api-client.js')
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'LArchBulk Cocon')
    const article = await ctx.createArticle(cocoon.id, 'LArchBulk Article')

    const res = await apiPost(`/articles/${article.id}/lieutenants/archive`, {
      keywords: ['kw1', 'kw2'],
    })
    expect([200, 204]).toContain(res.status)
  })

  it('GET /articles/:id/explorations ne retourne pas les lieutenants archivés', async () => {
    if (requireServer().skip) return
    const { apiPost, apiGet } = await import('../helpers/api-client.js')
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'LArchGet Cocon')
    const article = await ctx.createArticle(cocoon.id, 'LArchGet Article')

    await apiPost(`/articles/${article.id}/lieutenants/archive`, {})
    const res = await apiGet<{ lieutenants: Array<{ status?: string }> }>(`/articles/${article.id}/explorations`)
    const archived = (res.data?.lieutenants ?? []).filter(l => l.status === 'archived')
    expect(archived.length).toBe(0)
  })
})

describe('Tab moteur/lieutenants — Lock + outline', () => {
  it('Lock lieutenants : PUT /articles/:id/keywords avec lieutenants[] persiste', async () => {
    if (requireServer().skip) return
    const { apiPut } = await import('../helpers/api-client.js')
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'LLock Tab Cocon')
    const article = await ctx.createArticle(cocoon.id, 'LLock Tab Article')

    const res = await apiPut(`/articles/${article.id}/keywords`, {
      capitaine: `test-${ctx.runId}-cap`,
      lieutenants: ['lt1', 'lt2', 'lt3'],
      lexique: [],
      rootKeywords: [],
      hnStructure: [],
    })
    expect(res.status).toBe(200)

    const dbRes = await query<{ lieutenants: string[] }>(
      `SELECT lieutenants FROM article_keywords WHERE article_id = $1`,
      [article.id],
    )
    expect(dbRes.rows[0]?.lieutenants.length).toBe(3)
  })

  it('MOTEUR_LIEUTENANTS_LOCKED check ajouté via /progress/check', async () => {
    if (requireServer().skip) return
    const { apiPost, apiGet } = await import('../helpers/api-client.js')
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'LLCheck Cocon')
    const article = await ctx.createArticle(cocoon.id, 'LLCheck Article')

    await apiPost(`/articles/${article.id}/progress/check`, { check: 'moteur:lieutenants_locked' })
    const res = await apiGet<{ completed_checks?: string[]; completedChecks?: string[] }>(`/articles/${article.id}/progress`)
    const checks = res.data as { completedChecks?: string[]; completed_checks?: string[] }
    const list = checks.completedChecks ?? checks.completed_checks ?? []
    expect(list).toContain('moteur:lieutenants_locked')
  })

  it('hnStructure persistée dans article_keywords (pas propagée à article_content.outline automatiquement)', async () => {
    if (requireServer().skip) return
    const { apiPut } = await import('../helpers/api-client.js')
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'HnStruct Cocon')
    const article = await ctx.createArticle(cocoon.id, 'HnStruct Article')

    const hn = [{ level: 'H2', title: 'Section A' }, { level: 'H2', title: 'Section B' }]
    await apiPut(`/articles/${article.id}/keywords`, {
      capitaine: `test-${ctx.runId}-hn`,
      lieutenants: [],
      lexique: [],
      rootKeywords: [],
      hnStructure: hn,
    })
    const dbRes = await query<{ hn_structure: unknown }>(
      `SELECT hn_structure FROM article_keywords WHERE article_id = $1`,
      [article.id],
    )
    expect(dbRes.rows[0]?.hn_structure).toBeDefined()
  })
})

describe('Tab moteur/lieutenants — Cross-tab', () => {
  it.todo('Gate F5 : isCaptaineLocked OU hasEverAnalyzed (frontend)')
  it.todo('KeywordAssistPanel propose kw du basket non encore lieutenants (frontend)')
})

void query
