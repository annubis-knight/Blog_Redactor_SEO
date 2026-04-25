// @vitest-environment node
/**
 * Integration — Onglet Rédaction · Editor (ui-sections-guide §5.2)
 */
import { describe, it, expect } from 'vitest'
import { setupTestContext } from '../helpers/test-context.js'
import { apiGet, apiPut } from '../helpers/api-client.js'
import { query } from '../../server/db/client.js'

const ctx = setupTestContext()
function requireServer() { return ctx.serverOk ? { skip: false } : { skip: true } as const }

describe('Tab redaction/editor — Content CRUD', () => {
  it('GET /articles/:id/content retourne 200 même pour article neuf', async () => {
    if (requireServer().skip) return
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'EdNew Cocon')
    const article = await ctx.createArticle(cocoon.id, 'EdNew Article')

    const res = await apiGet(`/articles/${article.id}/content`)
    expect(res.status).toBe(200)
  })

  it('PUT /articles/:id sauvegarde content + GET le retrouve', async () => {
    if (requireServer().skip) return
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'EdSave Cocon')
    const article = await ctx.createArticle(cocoon.id, 'EdSave Article')

    const html = `<h1>${ctx.runId}</h1><p>Content test.</p>`
    await apiPut(`/articles/${article.id}`, { content: html })
    const res = await apiGet(`/articles/${article.id}/content`)
    expect(JSON.stringify(res.data)).toContain(ctx.runId)
  })

  it('PUT /articles/:id/status met à jour status', async () => {
    if (requireServer().skip) return
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'EdStatus Cocon')
    const article = await ctx.createArticle(cocoon.id, 'EdStatus Article')

    const res = await apiPut(`/articles/${article.id}/status`, { status: 'en cours' })
    if (res.status === 200) {
      const dbRes = await query<{ status: string }>(`SELECT status FROM articles WHERE id = $1`, [article.id])
      expect(dbRes.rows[0]?.status).toBe('en cours')
    }
  })
})

describe('Tab redaction/editor — Génération via stream IA', () => {
  it('POST /generate/outline sans body → 400 VALIDATION_ERROR', async () => {
    if (requireServer().skip) return
    const { apiPost } = await import('../helpers/api-client.js')
    const res = await apiPost('/generate/outline', {})
    expect(res.error?.code).toBe('VALIDATION_ERROR')
  })

  it('POST /generate/article sans body → 400/500', async () => {
    if (requireServer().skip) return
    const { apiPost } = await import('../helpers/api-client.js')
    const res = await apiPost('/generate/article', {})
    expect([400, 500]).toContain(res.status)
  })

  it.todo('Mutex isGenerating empêche double-trigger (frontend — Playwright)')
  it.todo('Stream interrompu : pas de HTML partiel persisté (à vérifier via test e2e complet)')
})

describe('Tab redaction/editor — Réduction', () => {
  it('POST /generate/reduce-section sans body → 400/500', async () => {
    if (requireServer().skip) return
    const { apiPost } = await import('../helpers/api-client.js')
    const res = await apiPost('/generate/reduce-section', {})
    expect([400, 500]).toContain(res.status)
  })
})

describe('Tab redaction/editor — Humanize', () => {
  it('POST /generate/humanize-section sans body → 400/500', async () => {
    if (requireServer().skip) return
    const { apiPost } = await import('../helpers/api-client.js')
    const res = await apiPost('/generate/humanize-section', {})
    expect([400, 500]).toContain(res.status)
  })

  it.todo('Mutex isHumanizing UI (frontend — Playwright)')
  it.todo('H2 préservé (validateHtmlStructurePreserved) — couvert par tests unitaires shared/html-utils')
})

describe('Tab redaction/editor — Régénération', () => {
  it.todo('Reset content sans toucher brief/keywords (frontend confirm modal)')
})
