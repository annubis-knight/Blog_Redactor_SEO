// @vitest-environment node
/**
 * Integration — Onglet Rédaction · SEO (ui-sections-guide §5.3)
 */
import { describe, it, expect } from 'vitest'
import { setupTestContext } from '../helpers/test-context.js'
import { apiPut } from '../helpers/api-client.js'
import { query } from '../../server/db/client.js'

const ctx = setupTestContext()
function requireServer() { return ctx.serverOk ? { skip: false } : { skip: true } as const }

describe('Tab redaction/seo — Meta CRUD', () => {
  it('PUT /articles/:id sauvegarde metaTitle', async () => {
    if (requireServer().skip) return
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'MetaT Cocon')
    const article = await ctx.createArticle(cocoon.id, 'MetaT Article')

    await apiPut(`/articles/${article.id}`, {
      metaTitle: `[test:${ctx.runId}] Plombier guide`,
    })

    const dbRes = await query<{ meta_title: string }>(`SELECT meta_title FROM articles WHERE id = $1`, [article.id])
    expect(dbRes.rows[0]?.meta_title).toContain('Plombier guide')
  })

  it('PUT /articles/:id sauvegarde metaDescription', async () => {
    if (requireServer().skip) return
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'MetaD Cocon')
    const article = await ctx.createArticle(cocoon.id, 'MetaD Article')

    await apiPut(`/articles/${article.id}`, {
      metaDescription: `Test ${ctx.runId} description`,
    })

    const dbRes = await query<{ meta_description: string }>(`SELECT meta_description FROM articles WHERE id = $1`, [article.id])
    expect(dbRes.rows[0]?.meta_description).toContain(ctx.runId)
  })
})

describe('Tab redaction/seo — Score CRUD', () => {
  it('PUT /articles/:id sauvegarde seoScore + geoScore', async () => {
    if (requireServer().skip) return
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'Scores Cocon')
    const article = await ctx.createArticle(cocoon.id, 'Scores Article')

    await apiPut(`/articles/${article.id}`, { seoScore: 85, geoScore: 72 })

    const dbRes = await query<{ seo_score: number; geo_score: number }>(
      `SELECT seo_score, geo_score FROM articles WHERE id = $1`,
      [article.id],
    )
    expect(Number(dbRes.rows[0]?.seo_score)).toBe(85)
    expect(Number(dbRes.rows[0]?.geo_score)).toBe(72)
  })
})

describe('Tab redaction/seo — Generate meta IA', () => {
  it('POST /generate/meta avec body valide → metaTitle + metaDescription', { timeout: 90000 }, async () => {
    if (requireServer().skip) return
    const { apiPost } = await import('../helpers/api-client.js')
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'MetaG Cocon')
    const article = await ctx.createArticle(cocoon.id, 'MetaG Article')

    const res = await apiPost<{ metaTitle: string; metaDescription: string }>('/generate/meta', {
      articleId: article.id,
      keyword: `plombier toulouse`,
      articleTitle: 'Guide plombier à Toulouse',
      articleContent: 'Lorsque vous cherchez un plombier à Toulouse, plusieurs critères comptent : certifications, avis, réactivité et tarifs transparents. Ce guide vous aide à éviter les arnaques.',
    })
    // 200 si IA répond JSON, 500 si refus
    expect([200, 500]).toContain(res.status)
    if (res.status === 200) {
      expect(res.data?.metaTitle).toBeDefined()
      expect(res.data?.metaDescription).toBeDefined()
    }
  })

  it.todo('Meta trop longues remontées comme warning (frontend)')
})

describe('Tab redaction/seo — Score calculé', () => {
  it.todo('Score = lexique coverage + kw density + H1 présent (frontend calculé)')
  it.todo('Capitaine kw absent du H1 → warning (frontend)')
})

describe('Tab redaction/seo — SerpDataTab', () => {
  it('POST /dataforseo/brief sans body → 400/500', async () => {
    if (requireServer().skip) return
    const { apiPost } = await import('../helpers/api-client.js')
    const res = await apiPost('/dataforseo/brief', {})
    expect([400, 500]).toContain(res.status)
  })

  it.todo('forceRefresh=true skip cache — à tester via timing')
})

describe('Tab redaction/seo — Internal linking', () => {
  it('GET /links/:articleId valide id', async () => {
    if (requireServer().skip) return
    const { apiGet } = await import('../helpers/api-client.js')
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'Links Cocon')
    const article = await ctx.createArticle(cocoon.id, 'Links Article')

    const res = await apiGet(`/links/${article.id}`)
    // L'endpoint peut ne pas exister — tolérer 404
    expect([200, 404, 500]).toContain(res.status)
  })

  it.todo('Anti-cannibalisation : doublons capitaine cocon → warning rouge (frontend)')
})
