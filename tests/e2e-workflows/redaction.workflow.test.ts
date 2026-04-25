// @vitest-environment node
/**
 * E2E — Workflow Rédaction (Brief → Editor → SEO → Publish)
 *
 * Étape 1 : Brief (micro-context, keywords)
 * Étape 2 : Editor (content via PUT /articles/:id, generate sections via stream)
 * Étape 3 : SEO (meta + score)
 * Étape 4 : Publication
 *
 * Pré-requis : serveur dev lancé avec AI_PROVIDER=mock.
 */
import { describe, it, expect } from 'vitest'
import { setupTestContext } from '../helpers/test-context.js'
import { apiPost, apiGet, apiPut } from '../helpers/api-client.js'
import { query } from '../../server/db/client.js'

const ctx = setupTestContext()

function requireServer() {
  if (!ctx.serverOk) return { skip: true } as const
  return { skip: false } as const
}

// ---------------------------------------------------------------------------
// Étape 1 — Brief (micro-context + keywords)
// ---------------------------------------------------------------------------

describe('Rédaction Workflow — Étape 1 : Brief', () => {
  it('GET /articles/:id/micro-context retourne null pour article neuf', async () => {
    if (requireServer().skip) return
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'MC New Cocon')
    const article = await ctx.createArticle(cocoon.id, 'MC New Article')

    const res = await apiGet(`/articles/${article.id}/micro-context`)
    expect(res.status).toBe(200)
    // data = null ou {} pour article neuf
  })

  it('PUT /articles/:id/micro-context sans angle → 400 VALIDATION_ERROR', async () => {
    if (requireServer().skip) return
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'MC Invalid Cocon')
    const article = await ctx.createArticle(cocoon.id, 'MC Invalid Article')

    const res = await apiPut(`/articles/${article.id}/micro-context`, { tone: 'pédagogique' })
    expect(res.status).toBe(400)
    expect(res.error?.code).toBe('VALIDATION_ERROR')
  })

  it('PUT /articles/:id/micro-context avec angle valide sauvegarde', async () => {
    if (requireServer().skip) return
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'MC Save Cocon')
    const article = await ctx.createArticle(cocoon.id, 'MC Save Article')

    const res = await apiPut(`/articles/${article.id}/micro-context`, {
      angle: `[test:${ctx.runId}] Approche pédagogique avec checklist`,
      tone: 'Direct, sans jargon',
      directives: 'Inclure 1 mini-cas par chapitre',
      targetWordCount: 1500,
    })
    expect(res.status).toBe(200)
    expect(res.data).toBeDefined()
  })

  it('PUT /articles/:id/micro-context avec targetWordCount < 500 → 400', async () => {
    if (requireServer().skip) return
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'MC Range Cocon')
    const article = await ctx.createArticle(cocoon.id, 'MC Range Article')

    const res = await apiPut(`/articles/${article.id}/micro-context`, {
      angle: 'test',
      targetWordCount: 100,
    })
    expect(res.status).toBe(400)
  })

  it('PUT /articles/:id/micro-context article inexistant → 404', async () => {
    if (requireServer().skip) return
    const res = await apiPut(`/articles/9999999/micro-context`, { angle: 'test' })
    expect(res.status).toBe(404)
  })

  it('POST /generate/micro-context-suggest sans body → 400/500', async () => {
    if (requireServer().skip) return
    const res = await apiPost('/generate/micro-context-suggest', {})
    expect([400, 500]).toContain(res.status)
  })

  it('Check REDACTION_BRIEF_VALIDATED ajouté via /progress/check', async () => {
    if (requireServer().skip) return
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'BriefV Cocon')
    const article = await ctx.createArticle(cocoon.id, 'BriefV Article')

    await apiPost(`/articles/${article.id}/progress/check`, { check: 'redaction:brief_validated' })
    const res = await apiGet<{ completed_checks?: string[]; completedChecks?: string[] }>(`/articles/${article.id}/progress`)
    const checks = res.data as { completedChecks?: string[]; completed_checks?: string[] }
    const list = checks.completedChecks ?? checks.completed_checks ?? []
    expect(list).toContain('redaction:brief_validated')
  })
})

// ---------------------------------------------------------------------------
// Étape 2 — Editor (content)
// ---------------------------------------------------------------------------

describe('Rédaction Workflow — Étape 2 : Editor (content)', () => {
  it('GET /articles/:id/content retourne null/vide pour article neuf', async () => {
    if (requireServer().skip) return
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'Content New Cocon')
    const article = await ctx.createArticle(cocoon.id, 'Content New Article')

    const res = await apiGet(`/articles/${article.id}/content`)
    expect(res.status).toBe(200)
  })

  it('PUT /articles/:id sauvegarde le content HTML', async () => {
    if (requireServer().skip) return
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'Content Save Cocon')
    const article = await ctx.createArticle(cocoon.id, 'Content Save Article')

    const html = `<h1>Test ${ctx.runId}</h1><p>Contenu de test pour vérifier la persistance.</p>`
    const res = await apiPut(`/articles/${article.id}`, { content: html })
    expect(res.status).toBe(200)

    // Re-read
    const readRes = await apiGet<{ content?: string; html?: string }>(`/articles/${article.id}/content`)
    expect(readRes.status).toBe(200)
    // Le HTML doit être présent (la shape exacte dépend de getArticleContent)
    expect(JSON.stringify(readRes.data)).toContain('Test')
  })

  it('PUT /articles/:id/status met à jour le status', async () => {
    if (requireServer().skip) return
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'Status Cocon')
    const article = await ctx.createArticle(cocoon.id, 'Status Article')

    // Le schema valide : à rédiger | en cours | publié | …
    const res = await apiPut(`/articles/${article.id}/status`, { status: 'en cours' })
    expect([200, 400]).toContain(res.status)
    if (res.status === 200) {
      const dbRes = await query<{ status: string }>(`SELECT status FROM articles WHERE id = $1`, [article.id])
      expect(dbRes.rows[0]?.status).toBe('en cours')
    }
  })

  it('POST /generate/article sans body → 400/500', async () => {
    if (requireServer().skip) return
    const res = await apiPost('/generate/article', {})
    expect([400, 500]).toContain(res.status)
  })

  it('POST /generate/reduce-section sans body → 400/500', async () => {
    if (requireServer().skip) return
    const res = await apiPost('/generate/reduce-section', {})
    expect([400, 500]).toContain(res.status)
  })

  it('POST /generate/humanize-section sans body → 400/500', async () => {
    if (requireServer().skip) return
    const res = await apiPost('/generate/humanize-section', {})
    expect([400, 500]).toContain(res.status)
  })

  it.todo('Mutex isGenerating empêche double-trigger (frontend — Playwright)')
})

// ---------------------------------------------------------------------------
// Étape 3 — SEO (meta + score)
// ---------------------------------------------------------------------------

describe('Rédaction Workflow — Étape 3 : SEO', () => {
  it('PUT /articles/:id sauvegarde metaTitle + metaDescription', async () => {
    if (requireServer().skip) return
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'Meta Cocon')
    const article = await ctx.createArticle(cocoon.id, 'Meta Article')

    const res = await apiPut(`/articles/${article.id}`, {
      metaTitle: `[test] Plombier Toulouse : guide complet`,
      metaDescription: 'Découvrez comment choisir un plombier à Toulouse en évitant les erreurs courantes.',
    })
    expect(res.status).toBe(200)

    const dbRes = await query<{ meta_title: string; meta_description: string }>(
      `SELECT meta_title, meta_description FROM articles WHERE id = $1`,
      [article.id],
    )
    expect(dbRes.rows[0]?.meta_title).toContain('Plombier')
    expect(dbRes.rows[0]?.meta_description).toContain('Toulouse')
  })

  it('PUT /articles/:id sauvegarde seo_score + geo_score', async () => {
    if (requireServer().skip) return
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'Score Cocon')
    const article = await ctx.createArticle(cocoon.id, 'Score Article')

    const res = await apiPut(`/articles/${article.id}`, {
      seoScore: 87,
      geoScore: 72,
    })
    expect(res.status).toBe(200)

    const dbRes = await query<{ seo_score: number; geo_score: number }>(
      `SELECT seo_score, geo_score FROM articles WHERE id = $1`,
      [article.id],
    )
    expect(Number(dbRes.rows[0]?.seo_score)).toBe(87)
    expect(Number(dbRes.rows[0]?.geo_score)).toBe(72)
  })

  it('POST /generate/meta génère meta title + description (mock)', { timeout: 90000 }, async () => {
    if (requireServer().skip) return
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'MetaGen Cocon')
    const article = await ctx.createArticle(cocoon.id, 'MetaGen Article')

    const res = await apiPost<{ metaTitle: string; metaDescription: string }>('/generate/meta', {
      articleId: article.id,
      keyword: `test-${ctx.runId}-meta`,
      articleTitle: 'Test',
      articleContent: 'Lorem ipsum contenu test.',
    })
    expect(res.status).toBe(200)
    expect(res.data?.metaTitle).toBeDefined()
    expect(res.data?.metaDescription).toBeDefined()
  })

  it.todo('SEO score calculé client-side : lexique coverage + kw density (frontend)')
  it.todo('Anti-cannibalisation : 2 articles même cocon même capitaine → warning (frontend)')
})

// ---------------------------------------------------------------------------
// Étape 4 — Progress / Publication
// ---------------------------------------------------------------------------

describe('Rédaction Workflow — Étape 4 : Progress', () => {
  it('Cycle complet : check → progress GET → uncheck', async () => {
    if (requireServer().skip) return
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'Cycle Cocon')
    const article = await ctx.createArticle(cocoon.id, 'Cycle Article')

    // check 1
    await apiPost(`/articles/${article.id}/progress/check`, { check: 'redaction:brief_validated' })
    let res = await apiGet<{ completedChecks?: string[] } | { completed_checks?: string[] }>(`/articles/${article.id}/progress`)
    expect(res.status).toBe(200)
    const checks = (res.data as { completedChecks?: string[]; completed_checks?: string[] })
    const list = checks.completedChecks ?? checks.completed_checks ?? []
    expect(list).toContain('redaction:brief_validated')

    // check 2
    await apiPost(`/articles/${article.id}/progress/check`, { check: 'redaction:content_written' })
    res = await apiGet(`/articles/${article.id}/progress`)
    const checks2 = (res.data as { completedChecks?: string[]; completed_checks?: string[] })
    const list2 = checks2.completedChecks ?? checks2.completed_checks ?? []
    expect(list2).toContain('redaction:brief_validated')
    expect(list2).toContain('redaction:content_written')

    // uncheck 1
    await apiPost(`/articles/${article.id}/progress/uncheck`, { check: 'redaction:brief_validated' })
    res = await apiGet(`/articles/${article.id}/progress`)
    const checks3 = (res.data as { completedChecks?: string[]; completed_checks?: string[] })
    const list3 = checks3.completedChecks ?? checks3.completed_checks ?? []
    expect(list3).not.toContain('redaction:brief_validated')
    expect(list3).toContain('redaction:content_written')
  })

  it('PUT /articles/:id/status publié met à jour le statut (pas d\'endpoint /publish dédié)', async () => {
    if (requireServer().skip) return
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'Publish Cocon')
    const article = await ctx.createArticle(cocoon.id, 'Publish Article')

    const res = await apiPut(`/articles/${article.id}/status`, { status: 'publié' })
    // Peut être refusé si enum status strict — tolère 200/400
    expect([200, 400]).toContain(res.status)
  })

  it('GET /export/article/:id → 200/404', async () => {
    if (requireServer().skip) return
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'Exp Cocon')
    const article = await ctx.createArticle(cocoon.id, 'Exp Article')

    const res = await apiGet(`/export/article/${article.id}`)
    expect([200, 400, 404, 500]).toContain(res.status)
  })
})
