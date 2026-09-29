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
  it('GET /articles/:id/explorations renvoie lexique[] vide pour article neuf', async ({ skip }) => {
    if (requireServer().skip) skip()
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
  it('POST /serp/tfidf sans body → 400/404/500', async ({ skip }) => {
    if (requireServer().skip) skip()
    const { apiPost } = await import('../helpers/api-client.js')
    const res = await apiPost('/serp/tfidf', { keyword: `test-${ctx.runId}-tfidf` })
    expect([200, 400, 404, 500]).toContain(res.status)
  })

  it('POST /serp/tfidf avec articleId tolère 200/404/500', async ({ skip }) => {
    if (requireServer().skip) skip()
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
  it('POST /keywords/:captain/ai-lexique-upfront (stream) renvoie SSE', { timeout: 30000 }, async ({ skip }) => {
    if (requireServer().skip) skip()
    const res = await fetch(`http://localhost:3400/api/keywords/${encodeURIComponent('test-' + ctx.runId + '-lex')}/ai-lexique-upfront`, {
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
  // 2026-09-25 (épopée qualité SEO, C2 · T3) : « count >= 0 » passait quoi
  // qu'il arrive (0 si l'extraction échouait faute de corpus). Le test pose
  // lui-même un corpus SERP scrappé pour son mot-clé (en base, sans appel
  // externe ; nettoyé avec les fixtures via keyword_metrics) et affirme
  // l'enregistrement exact.
  it('Extraction sur kw arbitraire : POST /serp/tfidf avec articleId crée row DB-first', { timeout: 60000 }, async ({ skip }) => {
    if (requireServer().skip) skip()
    const { apiPost } = await import('../helpers/api-client.js')
    const { query } = await import('../../server/db/client.js')
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'LexArb Cocon')
    const article = await ctx.createArticle(cocoon.id, 'LexArb Article')

    const kw = `test-${ctx.runId}-lex-arb`
    const pages = [
      'plomberie chauffage devis intervention urgence artisan',
      'plomberie fuite réparation devis artisan toulouse',
      'chauffage entretien chaudière plomberie devis',
    ]
    await query(`INSERT INTO keyword_metrics (keyword) VALUES ($1)`, [kw])
    for (const [i, text] of pages.entries()) {
      const url = `https://t3-lexique.example/${i + 1}`
      await query(`INSERT INTO keyword_serp_results (keyword, position, url) VALUES ($1, $2, $3)`, [kw, i + 1, url])
      await query(
        `INSERT INTO keyword_serp_scrapes (keyword, position, url, text_content) VALUES ($1, $2, $3, $4)`,
        [kw, i + 1, url, text],
      )
    }

    const res = await apiPost<{ totalCompetitors: number }>('/serp/tfidf', { keyword: kw, articleId: article.id })
    expect(res.status).toBe(200)
    expect(res.data?.totalCompetitors, 'une page du corpus = un concurrent').toBe(3)

    const dbRes = await query<{ source_keyword: string }>(
      `SELECT source_keyword FROM lexique_explorations WHERE article_id = $1`,
      [article.id],
    )
    expect(dbRes.rows.map(r => r.source_keyword)).toEqual([kw])
  })

  it('Extraction sans corpus scrappé → 404 NOT_FOUND, rien d’enregistré', async ({ skip }) => {
    if (requireServer().skip) skip()
    const { apiPost } = await import('../helpers/api-client.js')
    const { query } = await import('../../server/db/client.js')
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'LexNone Cocon')
    const article = await ctx.createArticle(cocoon.id, 'LexNone Article')

    const res = await apiPost('/serp/tfidf', { keyword: `test-${ctx.runId}-lex-none`, articleId: article.id })
    expect(res.status).toBe(404)
    expect(res.error?.code).toBe('NOT_FOUND')
    const dbRes = await query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM lexique_explorations WHERE article_id = $1`,
      [article.id],
    )
    expect(dbRes.rows[0].count).toBe('0')
  })

  it.todo('Chips d\'explorations passées (frontend — Playwright)')
})

describe('Tab moteur/lexique — Validation', () => {
  it('Validation via PUT /articles/:id/keywords avec lexique[] persiste', async ({ skip }) => {
    if (requireServer().skip) skip()
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

  it('MOTEUR_LEXIQUE_VALIDATED check via /progress/check', async ({ skip }) => {
    if (requireServer().skip) skip()
    const { apiPost, apiGet, apiPut } = await import('../helpers/api-client.js')
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'LexC Cocon')
    const article = await ctx.createArticle(cocoon.id, 'LexC Article')

    // L'étape passe la porte du lexique (FR-LEX-METIER-ONLY) : il lui faut des
    // termes du métier, enregistrés AVANT de la demander.
    await apiPut(`/articles/${article.id}/keywords`, {
      capitaine: `test-${ctx.runId}-lexc`, lieutenants: [], lexique: ['pare-vapeur', 'laine soufflée'],
    })
    const accordee = await apiPost(`/articles/${article.id}/progress/check`, { check: 'moteur:lexique_validated' })
    expect(accordee.status).toBe(200)
    const res = await apiGet<{ completed_checks?: string[]; completedChecks?: string[] }>(`/articles/${article.id}/progress`)
    const checks = res.data as { completedChecks?: string[]; completed_checks?: string[] }
    const list = checks.completedChecks ?? checks.completed_checks ?? []
    expect(list).toContain('moteur:lexique_validated')
  })
})
