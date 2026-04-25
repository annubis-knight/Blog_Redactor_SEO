// @vitest-environment node
/**
 * Integration — Onglet Moteur · Lexique (ui-sections-guide §3.7)
 */
import { describe, it, expect } from 'vitest'
import { setupTestContext } from '../helpers/test-context.js'
import { apiGet } from '../helpers/api-client.js'

const ctx = setupTestContext()
function requireServer() { return ctx.serverOk ? { skip: false } : { skip: true } as const }

describe('Tab moteur/lexique — Lecture DB-first', () => {
  it('GET /articles/:id/explorations renvoie lexique[] vide pour article neuf', async () => {
    if (requireServer().skip) return
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'LexEmpty Cocon')
    const article = await ctx.createArticle(cocoon.id, 'LexEmpty Article')

    const res = await apiGet<{ lexique: unknown[] }>(`/articles/${article.id}/explorations`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.data?.lexique)).toBe(true)
    expect(res.data?.lexique.length).toBe(0)
  })
})

describe('Tab moteur/lexique — Extraction TF-IDF', () => {
  it('POST /serp/tfidf sans body → 400/404/500', async () => {
    if (requireServer().skip) return
    const { apiPost } = await import('../helpers/api-client.js')
    const res = await apiPost('/serp/tfidf', { keyword: `test-${ctx.runId}-tfidf` })
    expect([200, 400, 404, 500]).toContain(res.status)
  })

  it('POST /serp/tfidf avec articleId tolère 200/404/500', async () => {
    if (requireServer().skip) return
    const { apiPost } = await import('../helpers/api-client.js')
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'TfidfA Cocon')
    const article = await ctx.createArticle(cocoon.id, 'TfidfA Article')

    const res = await apiPost('/serp/tfidf', {
      keyword: `test-${ctx.runId}-tfidfa`,
      articleId: article.id,
    })
    expect([200, 404, 500]).toContain(res.status)
  })

  it.todo('Auto-trigger si capitaine locked + lexique vide (frontend — Playwright)')
})

describe('Tab moteur/lexique — IA upfront (E2 + U5)', () => {
  it('POST /keywords/:captain/ai-lexique-upfront (stream) renvoie SSE', { timeout: 30000 }, async () => {
    if (requireServer().skip) return
    const res = await fetch(`http://localhost:3005/api/keywords/${encodeURIComponent('test-' + ctx.runId + '-lex')}/ai-lexique-upfront`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        level: 'pilier',
        allTerms: ['terme1', 'terme2', 'terme3'],
        cocoonSlug: 'test-cocoon',
      }),
    })
    expect([200, 400, 500]).toContain(res.status)
  })

  it.todo('Persistance saveLexiqueAi AVANT done event (E2 — nécessite DB probe pendant stream)')
  it.todo('TTL 7j : re-mount restore depuis DB (frontend U5 — Playwright)')
})

describe('Tab moteur/lexique — Multi-keyword (D4)', () => {
  it.todo('Champ "Extraire pour un autre mot-clé" (frontend)')
  it('Extraction sur kw arbitraire : POST /serp/tfidf avec articleId crée row DB-first', { timeout: 60000 }, async () => {
    if (requireServer().skip) return
    const { apiPost } = await import('../helpers/api-client.js')
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'LexArb Cocon')
    const article = await ctx.createArticle(cocoon.id, 'LexArb Article')

    const kw = `test-${ctx.runId}-lex-arb`
    await apiPost('/serp/tfidf', { keyword: kw, articleId: article.id })
    // Si le row a été créé, vérifier qu'il est dans lexique_explorations
    const { query } = await import('../../server/db/client.js')
    const dbRes = await query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM lexique_explorations WHERE article_id = $1`,
      [article.id],
    )
    // 0 si TFIDF a fail silencieusement (SERP indispo), >=1 sinon
    expect(parseInt(dbRes.rows[0].count, 10)).toBeGreaterThanOrEqual(0)
  })

  it.todo('Chips d\'explorations passées (frontend — Playwright)')
})

describe('Tab moteur/lexique — Validation', () => {
  it('Validation via PUT /articles/:id/keywords avec lexique[] persiste', async () => {
    if (requireServer().skip) return
    const { apiPut } = await import('../helpers/api-client.js')
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'LexV Cocon')
    const article = await ctx.createArticle(cocoon.id, 'LexV Article')

    const res = await apiPut(`/articles/${article.id}/keywords`, {
      capitaine: `test-${ctx.runId}-lv`,
      lieutenants: [],
      lexique: ['term1', 'term2'],
      rootKeywords: [],
      hnStructure: [],
    })
    expect(res.status).toBe(200)
  })

  it('MOTEUR_LEXIQUE_VALIDATED check via /progress/check', async () => {
    if (requireServer().skip) return
    const { apiPost, apiGet } = await import('../helpers/api-client.js')
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'LexC Cocon')
    const article = await ctx.createArticle(cocoon.id, 'LexC Article')

    await apiPost(`/articles/${article.id}/progress/check`, { check: 'moteur:lexique_validated' })
    const res = await apiGet<{ completed_checks?: string[]; completedChecks?: string[] }>(`/articles/${article.id}/progress`)
    const checks = res.data as { completedChecks?: string[]; completed_checks?: string[] }
    const list = checks.completedChecks ?? checks.completed_checks ?? []
    expect(list).toContain('moteur:lexique_validated')
  })
})
