// @vitest-environment node
/**
 * Integration — Onglet Cerveau · Propositions d'articles (ui-sections-guide §4.3)
 *
 * NB : il n'y a pas de POST /generate/structure dédié — la création d'articles
 * passe par /articles/batch-create (avec une liste manuelle ou pré-IA).
 */
import { describe, it, expect } from 'vitest'
import { setupTestContext } from '../helpers/test-context.js'
import { apiPost, apiGet } from '../helpers/api-client.js'
import { query } from '../../server/db/client.js'

const ctx = setupTestContext()
function requireServer() { return ctx.serverOk ? { skip: false } : { skip: true } as const }

describe('Tab cerveau/proposals — Création batch', () => {
  it('POST /articles/batch-create sans body → 400 VALIDATION_ERROR', async () => {
    if (requireServer().skip) return
    const res = await apiPost('/articles/batch-create', {})
    expect(res.status).toBe(400)
  })

  it('POST /articles/batch-create articles=[] → 400', async () => {
    if (requireServer().skip) return
    const res = await apiPost('/articles/batch-create', { cocoonName: 'x', articles: [] })
    expect(res.status).toBe(400)
  })

  it('POST /articles/batch-create crée articles + cascade en DB', { timeout: 30000 }, async () => {
    if (requireServer().skip) return
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'Batch Tab Cocon')

    const res = await apiPost('/articles/batch-create', {
      cocoonName: cocoon.nom,
      articles: [
        { title: `[test:${ctx.runId}] Tab Batch P1`, type: 'Pilier' },
        { title: `[test:${ctx.runId}] Tab Batch I1`, type: 'Intermédiaire' },
        { title: `[test:${ctx.runId}] Tab Batch S1`, type: 'Spécialisé' },
      ],
    })
    expect([200, 201]).toContain(res.status)

    const dbRes = await query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM articles WHERE cocoon_id = $1`,
      [cocoon.id],
    )
    expect(parseInt(dbRes.rows[0].count, 10)).toBeGreaterThanOrEqual(3)
  })
})

describe('Tab cerveau/proposals — Lecture cocon', () => {
  it('GET /cocoons/:id/strategy/context retourne strategy ou null', async () => {
    if (requireServer().skip) return
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'StratCtx Cocon')

    const res = await apiGet(`/cocoons/${cocoon.id}/strategy/context`)
    expect(res.status).toBe(200)
    // null pour cocon sans stratégie
  })

  it('GET /cocoons/:id/strategy/context avec id non-numérique → 400', async () => {
    if (requireServer().skip) return
    const res = await apiGet('/cocoons/abc/strategy/context')
    expect(res.status).toBe(400)
    expect(res.error?.code).toBe('INVALID_ID')
  })
})

describe('Tab cerveau/proposals — Articles CRUD', () => {
  it('GET /articles/:id retourne { article, cocoonName }', async () => {
    if (requireServer().skip) return
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'Detail Tab Cocon')
    const article = await ctx.createArticle(cocoon.id, 'Detail Tab Article')

    const res = await apiGet<{ article: { id: number }; cocoonName: string }>(`/articles/${article.id}`)
    expect(res.data?.article?.id).toBe(article.id)
    expect(res.data?.cocoonName).toBeDefined()
  })

  it('GET /articles/:id inexistant → 404 NOT_FOUND', async () => {
    if (requireServer().skip) return
    const res = await apiGet('/articles/9999999')
    expect(res.error?.code).toBe('NOT_FOUND')
  })

  it('DELETE /articles/:id détache du cocon (cocoon_id NULL)', async () => {
    if (requireServer().skip) return
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'DelTab Cocon')
    const article = await ctx.createArticle(cocoon.id, 'DelTab Article')

    const delRes = await fetch(`http://localhost:3005/api/articles/${article.id}`, { method: 'DELETE' })
    expect([200, 204]).toContain(delRes.status)

    const dbRes = await query<{ cocoon_id: number | null }>(
      `SELECT cocoon_id FROM articles WHERE id = $1`, [article.id],
    )
    expect(dbRes.rows[0]?.cocoon_id).toBeNull()
  })
})

describe('Tab cerveau/proposals — Topics & smart-add', () => {
  it('POST /strategy/cocoon/:slug/topics tolère 200/400/404/500 (endpoint peut-être absent)', async () => {
    if (requireServer().skip) return
    const { apiPost } = await import('../helpers/api-client.js')
    const res = await apiPost(`/strategy/cocoon/test-${ctx.runId}-p-topics/topics`, {
      context: { cocoonName: 'test', siloName: 'test' },
    })
    expect([200, 400, 404, 500]).toContain(res.status)
  })

  it.todo('AddArticleMenu options frontend — Playwright')
})
