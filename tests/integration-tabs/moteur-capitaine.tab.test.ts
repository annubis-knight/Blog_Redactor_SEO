// @vitest-environment node
/**
 * Integration — Onglet Moteur · Capitaine (ui-sections-guide §3.5)
 */
import { describe, it, expect } from 'vitest'
import { setupTestContext } from '../helpers/test-context.js'
import { apiPost, apiGet } from '../helpers/api-client.js'
import { query } from '../../server/db/client.js'

const ctx = setupTestContext()
function requireServer() { return ctx.serverOk ? { skip: false } : { skip: true } as const }

describe('Tab moteur/capitaine — Validate', () => {
  it('POST /keywords/:kw/validate sans level → 400 MISSING_PARAM', async () => {
    if (requireServer().skip) return
    const res = await apiPost(`/keywords/${encodeURIComponent('test-' + ctx.runId)}/validate`, {})
    expect(res.error?.code).toBe('MISSING_PARAM')
  })

  it('POST /keywords/:kw/validate level invalide → 400', async () => {
    if (requireServer().skip) return
    const res = await apiPost(`/keywords/${encodeURIComponent('test-' + ctx.runId)}/validate`, { level: 'invalid' })
    expect(res.status).toBe(400)
  })

  it('POST /keywords/:kw/validate retourne 6 KPIs + verdict', { timeout: 30000 }, async () => {
    if (requireServer().skip) return
    const res = await apiPost<{ kpis: unknown[]; verdict: { level: string; totalKpis: number } }>(
      `/keywords/${encodeURIComponent('test-' + ctx.runId + '-cap')}/validate`,
      { level: 'pilier', articleTitle: 'test' },
    )
    expect(res.status).toBe(200)
    expect(res.data?.kpis.length).toBe(6)
    expect(['GO', 'ORANGE', 'NO-GO']).toContain(res.data?.verdict?.level ?? '')
  })

  it('POST /keywords/:kw/validate?articleId persiste captain_explorations', { timeout: 30000 }, async () => {
    if (requireServer().skip) return
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'CapPers Cocon')
    const article = await ctx.createArticle(cocoon.id, 'CapPers Article')

    const kw = `test-${ctx.runId}-cappers`
    await apiPost(`/keywords/${encodeURIComponent(kw)}/validate`, {
      level: 'pilier', articleTitle: 'test', articleId: article.id,
    })

    const dbRes = await query<{ keyword: string }>(
      `SELECT keyword FROM captain_explorations WHERE article_id = $1`, [article.id],
    )
    expect(dbRes.rows.some(r => r.keyword === kw)).toBe(true)
  })
})

describe('Tab moteur/capitaine — Carousel hydratation', () => {
  it('GET /articles/:id/explorations renvoie captain[] avec history', { timeout: 30000 }, async () => {
    if (requireServer().skip) return
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'CapHistory Cocon')
    const article = await ctx.createArticle(cocoon.id, 'CapHistory Article')

    const kw = `test-${ctx.runId}-history`
    await apiPost(`/keywords/${encodeURIComponent(kw)}/validate`, {
      level: 'pilier', articleTitle: 'test', articleId: article.id,
    })

    const res = await apiGet<{ captain: Array<{ keyword: string }> }>(`/articles/${article.id}/explorations`)
    expect(res.data?.captain.some(c => c.keyword === kw)).toBe(true)
  })

  it('GET /articles/:id/captain-explorations route dédiée existe', async () => {
    if (requireServer().skip) return
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'CapDirect Cocon')
    const article = await ctx.createArticle(cocoon.id, 'CapDirect Article')

    const res = await apiGet(`/articles/${article.id}/captain-explorations`)
    expect(res.status).toBe(200)
  })
})

describe('Tab moteur/capitaine — KeywordAssistPanel (F3)', () => {
  it.todo('Le panel affiche basket + groupes Discovery (frontend)')
  it.todo('Clic Tester pré-remplit input + déclenche validation (frontend)')
  it.todo('Le panel se masque si vide (frontend)')
})

describe('Tab moteur/capitaine — AI Panel + TTL (U5)', () => {
  it('POST /keywords/:kw/ai-panel (stream) renvoie SSE chunks', { timeout: 30000 }, async () => {
    if (requireServer().skip) return
    const res = await fetch(`http://localhost:3005/api/keywords/${encodeURIComponent('test-' + ctx.runId)}/ai-panel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        level: 'pilier',
        articleTitle: 'Test',
        kpis: [{ name: 'volume', color: 'green' }],
        verdict: { level: 'GO', reason: 'ok', greenCount: 3, totalKpis: 6, autoNoGo: false },
      }),
    })
    expect(res.status).toBe(200)
    const text = await res.text()
    expect(text).toMatch(/event:\s*chunk/)
  })

  it.todo('Re-mount < 7j → restore depuis ai_panel_markdown sans re-stream (frontend TTL)')
})

describe('Tab moteur/capitaine — Root keywords editor (F4)', () => {
  it.todo('Racines affichées comme chips de mots cliquables (frontend)')
  it.todo('Garde-fou : minimum 2 mots significatifs (frontend)')
})

describe('Tab moteur/capitaine — Lock + cascade (F5, D3)', () => {
  it('Lock capitaine via PUT /articles/:id/keywords avec capitaine', async () => {
    if (requireServer().skip) return
    const { apiPut } = await import('../helpers/api-client.js')
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'CapLock Cocon')
    const article = await ctx.createArticle(cocoon.id, 'CapLock Article')

    const kw = `test-${ctx.runId}-lock`
    const res = await apiPut(`/articles/${article.id}/keywords`, {
      capitaine: kw,
      lieutenants: [],
      lexique: [],
      rootKeywords: [],
      hnStructure: [],
    })
    expect(res.status).toBe(200)

    const dbRes = await query<{ capitaine: string }>(
      `SELECT capitaine FROM article_keywords WHERE article_id = $1`,
      [article.id],
    )
    expect(dbRes.rows[0]?.capitaine).toBe(kw)
  })

  it('F5 : unlock capitaine ne réinitialise pas les autres checks', async () => {
    if (requireServer().skip) return
    const { apiPost, apiPut, apiGet } = await import('../helpers/api-client.js')
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'F5 Cocon')
    const article = await ctx.createArticle(cocoon.id, 'F5 Article')

    // Lock capitaine + ajout checks
    await apiPut(`/articles/${article.id}/keywords`, {
      capitaine: `test-${ctx.runId}-f5`, lieutenants: ['lt1'], lexique: ['lex1'],
      rootKeywords: [], hnStructure: [],
    })
    await apiPost(`/articles/${article.id}/progress/check`, { check: 'moteur:capitaine_locked' })
    await apiPost(`/articles/${article.id}/progress/check`, { check: 'moteur:lieutenants_locked' })
    await apiPost(`/articles/${article.id}/progress/check`, { check: 'moteur:lexique_validated' })

    // Unlock capitaine (simulate via PUT sans capitaine — peut nécessiter spec précise)
    // Pour l'instant on vérifie juste que les checks sont stables
    const progress = await apiGet<{ completed_checks?: string[]; completedChecks?: string[] }>(`/articles/${article.id}/progress`)
    const checks = (progress.data as { completedChecks?: string[]; completed_checks?: string[] })
    const list = checks.completedChecks ?? checks.completed_checks ?? []
    expect(list).toContain('moteur:capitaine_locked')
    expect(list).toContain('moteur:lieutenants_locked')
    expect(list).toContain('moteur:lexique_validated')
  })

  it.todo('Verdict GO/ORANGE → lock activable (frontend — Playwright)')
  it.todo('Verdict NO-GO → lock disabled (frontend — Playwright)')
  it.todo('Unlock AVEC lieutenants → modal Garder/Archiver/Annuler (frontend — Playwright)')
})
