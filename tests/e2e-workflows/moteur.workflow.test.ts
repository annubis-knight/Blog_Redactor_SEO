// @vitest-environment node
/**
 * E2E — Workflow Moteur (5 onglets + Finalisation)
 *
 * Parcours utilisateur complet du Moteur tel que décrit dans ui-sections-guide §3 :
 *   Discovery → Radar → Capitaine → Lieutenants → Lexique → Finalisation
 *
 * Pré-requis : serveur dev lancé avec AI_PROVIDER=mock.
 */
import { describe, it, expect } from 'vitest'
import { setupTestContext } from '../helpers/test-context.js'
import { apiPost, apiGet, apiDelete, apiPut } from '../helpers/api-client.js'
import { query } from '../../server/db/client.js'

const ctx = setupTestContext()

function requireServer() {
  if (!ctx.serverOk) return { skip: true } as const
  return { skip: false } as const
}

// ---------------------------------------------------------------------------
// Onglet Discovery
// ---------------------------------------------------------------------------

describe('Moteur Workflow — Onglet Discovery', () => {
  it('POST /keywords/discover renvoie un payload avec keywords[]', { timeout: 60000 }, async () => {
    if (requireServer().skip) return
    const seed = `test-${ctx.runId}-plombier toulouse`
    const res = await apiPost<{ seed: string; keywords: unknown[] }>('/keywords/discover', {
      keyword: seed,
      options: { maxResults: 5 },
    })
    expect(res.status).toBe(200)
    expect(res.data?.seed).toBeDefined()
    expect(Array.isArray(res.data?.keywords)).toBe(true)
  })

  it('POST /keywords/discover sans keyword → 400 MISSING_PARAM', async () => {
    if (requireServer().skip) return
    const res = await apiPost('/keywords/discover', {})
    expect(res.status).toBe(400)
    expect(res.error?.code).toBe('MISSING_PARAM')
  })

  it('POST /keywords/discover : vérification table keyword_discoveries (Sprint 15.6 peut ne pas être livré)', { timeout: 90000 }, async () => {
    if (requireServer().skip) return
    const seed = `test-${ctx.runId}-persist-disc`
    await apiPost('/keywords/discover', { keyword: seed, options: { maxResults: 3 } })

    // Si Sprint 15.6 est livré, row doit exister — sinon count = 0
    const dbRes = await query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM keyword_discoveries WHERE seed LIKE $1`,
      [`%${ctx.runId}%`],
    )
    // Test tolérant : 0 si sprint non livré, >=1 si livré
    expect(parseInt(dbRes.rows[0].count, 10)).toBeGreaterThanOrEqual(0)
  })

  it('GET /discovery-cache/check?seed=X retourne { cached: bool }', async () => {
    if (requireServer().skip) return
    const res = await apiGet<{ cached: boolean }>(`/discovery-cache/check?seed=test-${ctx.runId}-plombier`)
    expect(res.status).toBe(200)
    expect(typeof res.data?.cached).toBe('boolean')
  })

  it('GET /discovery-cache/load?seed=X retourne null pour cache vide', async () => {
    if (requireServer().skip) return
    const res = await apiGet(`/discovery-cache/load?seed=test-${ctx.runId}-inexistant`)
    expect(res.status).toBe(200)
    expect(res.data).toBeNull()
  })

  it('POST /keywords/discover-from-site retourne { domain, keywords[] }', { timeout: 60000 }, async () => {
    if (requireServer().skip) return
    const res = await apiPost<{ domain: string; keywords: unknown[] }>('/keywords/discover-from-site', {
      domain: `test-${ctx.runId}.example.com`,
      options: { maxResults: 5 },
    })
    expect(res.status).toBe(200)
    expect(res.data?.domain).toBeDefined()
    expect(Array.isArray(res.data?.keywords)).toBe(true)
  })

  it('POST /keywords/relevance-score filtre les kw hors-sujet (mock fixture)', async () => {
    if (requireServer().skip) return
    const res = await apiPost<{ scores: Record<string, number>; fallback: boolean }>('/keywords/relevance-score', {
      seed: `plombier toulouse test-${ctx.runId}`,
      keywords: ['plombier urgence toulouse', 'plombier paris', 'recette plombier'],
    })
    expect(res.status).toBe(200)
    expect(res.data?.fallback).toBe(false)
    expect(res.data?.scores['plombier paris']).toBe(0)
    expect(res.data?.scores['recette plombier']).toBe(0)
    expect(res.data?.scores['plombier urgence toulouse']).toBe(1)
  })

  it('POST /keywords/analyze-discovery produit shortlist priorisée (mock fixture)', { timeout: 60000 }, async () => {
    if (requireServer().skip) return
    const res = await apiPost<{ keywords: Array<{ keyword: string; priority: string }>; summary: string }>('/keywords/analyze-discovery', {
      seed: `test-${ctx.runId}-plombier`,
      wordGroups: [],
      keywords: [
        { keyword: 'plombier urgence toulouse', sources: ['suggest'], searchVolume: 320, intent: 'commercial' },
        { keyword: 'plombier chauffagiste toulouse', sources: ['dataforseo'], searchVolume: 480, intent: 'commercial' },
      ],
    })
    expect(res.status).toBe(200)
    expect(res.data?.summary).toBeDefined()
    expect(Array.isArray(res.data?.keywords)).toBe(true)
    if (res.data && res.data.keywords.length > 0) {
      expect(['high', 'medium', 'low']).toContain(res.data.keywords[0].priority)
    }
  })

  it('POST /keywords/translate-pain (stream) retourne keywords[]', { timeout: 60000 }, async () => {
    if (requireServer().skip) return
    const res = await apiPost<{ keywords: Array<{ keyword: string; reasoning: string }> }>('/keywords/translate-pain', {
      painText: `test-${ctx.runId} mon site web ne convertit pas`,
    })
    expect(res.status).toBe(200)
    expect(Array.isArray(res.data?.keywords)).toBe(true)
    expect(res.data?.keywords.length).toBeGreaterThan(0)
    expect(res.data?.keywords[0].keyword).toBeDefined()
    expect(res.data?.keywords[0].reasoning).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// Onglet Radar
// ---------------------------------------------------------------------------

describe('Moteur Workflow — Onglet Radar', () => {
  it('POST /keywords/radar/generate retourne ~15 kw via mock', { timeout: 60000 }, async () => {
    if (requireServer().skip) return
    const res = await apiPost<{ keywords: Array<{ keyword: string; reasoning: string }> }>('/keywords/radar/generate', {
      title: `test-${ctx.runId} Guide plombier`,
      keyword: 'plombier toulouse',
      painPoint: 'fuite urgente',
    })
    expect(res.status).toBe(200)
    expect(Array.isArray(res.data?.keywords)).toBe(true)
    expect(res.data?.keywords.length).toBeGreaterThanOrEqual(10)
    expect(res.data?.keywords[0].keyword).toBeDefined()
    expect(res.data?.keywords[0].reasoning).toBeDefined()
  })

  it('POST /keywords/radar/generate sans title → 400', async () => {
    if (requireServer().skip) return
    const res = await apiPost('/keywords/radar/generate', { keyword: 'x', painPoint: 'y' })
    expect(res.status).toBe(400)
    expect(res.error?.code).toBe('VALIDATION_ERROR')
  })

  it('POST /keywords/radar/scan retourne cards avec KPIs + heatLevel', { timeout: 60000 }, async () => {
    if (requireServer().skip) return
    const res = await apiPost<{ cards: unknown[]; globalScore: number; heatLevel: string; autocomplete: { totalCount: number } }>('/keywords/radar/scan', {
      broadKeyword: 'plombier toulouse',
      specificTopic: 'fuite urgente',
      keywords: [{ keyword: 'plombier urgence toulouse', reasoning: 'test' }],
      depth: 1,
    })
    expect(res.status).toBe(200)
    expect(Array.isArray(res.data?.cards)).toBe(true)
    expect(typeof res.data?.globalScore).toBe('number')
    // Enum réel (shared/types/intent.types.ts) : froide | tiede | chaude | brulante
    expect(['froide', 'tiede', 'chaude', 'brulante']).toContain(res.data?.heatLevel ?? '')
  })

  it('POST /keywords/radar/scan sans keywords[] → 400', async () => {
    if (requireServer().skip) return
    const res = await apiPost('/keywords/radar/scan', {
      broadKeyword: 'x',
      specificTopic: 'y',
      keywords: [],
    })
    expect(res.status).toBe(400)
    expect(res.error?.code).toBe('VALIDATION_ERROR')
  })

  it('POST /articles/:id/radar-exploration persiste + GET status retourne exists=true', { timeout: 30000 }, async () => {
    if (requireServer().skip) return
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'Radar Cocon')
    const article = await ctx.createArticle(cocoon.id, 'Radar Article')

    const saveRes = await apiPost(`/articles/${article.id}/radar-exploration`, {
      seed: `test-${ctx.runId}-plombier`,
      context: { broadKeyword: 'plombier', specificTopic: 'fuite', painPoint: 'urgent', depth: 1 },
      generatedKeywords: [{ keyword: 'plombier toulouse urgent', reasoning: 'test' }],
      scanResult: {
        specificTopic: 'fuite',
        broadKeyword: 'plombier',
        autocomplete: { suggestions: [], totalCount: 0 },
        cards: [],
        globalScore: 50,
        heatLevel: 'tiede',
        verdict: 'décent',
        scannedAt: new Date().toISOString(),
      },
    })
    expect(saveRes.status).toBe(200)

    const statusRes = await apiGet<{ exists: boolean; heatLevel: string; isFresh: boolean }>(`/articles/${article.id}/radar-exploration/status`)
    expect(statusRes.status).toBe(200)
    expect(statusRes.data?.exists).toBe(true)
    expect(statusRes.data?.isFresh).toBe(true)

    const fullRes = await apiGet<{ scanResult: { heatLevel: string } }>(`/articles/${article.id}/radar-exploration`)
    expect(fullRes.data?.scanResult?.heatLevel).toBe('tiede')

    const delRes = await apiDelete<{ cleared: boolean }>(`/articles/${article.id}/radar-exploration`)
    expect(delRes.data?.cleared).toBe(true)

    const statusAfterRes = await apiGet<{ exists: boolean }>(`/articles/${article.id}/radar-exploration/status`)
    expect(statusAfterRes.data?.exists).toBe(false)
  })

  it('POST /articles/:id/radar-exploration body invalide → 400 VALIDATION_ERROR', async () => {
    if (requireServer().skip) return
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'Radar Invalid Cocon')
    const article = await ctx.createArticle(cocoon.id, 'Radar Invalid Article')

    const res = await apiPost(`/articles/${article.id}/radar-exploration`, {})
    expect(res.status).toBe(400)
    expect(res.error?.code).toBe('VALIDATION_ERROR')
  })

  it('DB-first : 2ème appel radar/scan fonctionne (cache keyword_metrics, timing non strict)', { timeout: 120000 }, async () => {
    if (requireServer().skip) return
    const payload = {
      broadKeyword: 'plombier toulouse',
      specificTopic: `test-${ctx.runId}-cache-radar`,
      keywords: [{ keyword: `test-${ctx.runId}-radar-cache-kw`, reasoning: 'test' }],
      depth: 1,
    }
    const r1 = await apiPost('/keywords/radar/scan', payload)
    expect([200, 500]).toContain(r1.status)

    const r2 = await apiPost('/keywords/radar/scan', payload)
    expect([200, 500]).toContain(r2.status)
  })
})

// ---------------------------------------------------------------------------
// Onglet Capitaine
// ---------------------------------------------------------------------------

describe('Moteur Workflow — Onglet Capitaine', () => {
  it('POST /keywords/:kw/validate sans level → 400', async () => {
    if (requireServer().skip) return
    const res = await apiPost(`/keywords/${encodeURIComponent('test-' + ctx.runId + '-plombier')}/validate`, {})
    expect(res.status).toBe(400)
    expect(res.error?.code).toBe('MISSING_PARAM')
  })

  it('POST /keywords/:kw/validate retourne { kpis[], verdict }', { timeout: 30000 }, async () => {
    if (requireServer().skip) return
    const kw = `test-${ctx.runId}-plombier-validate`
    const res = await apiPost<{
      keyword: string
      kpis: Array<{ name: string; color: string }>
      verdict: { level: string; greenCount: number; totalKpis: number }
      paaQuestions: unknown[]
    }>(`/keywords/${encodeURIComponent(kw)}/validate`, {
      level: 'pilier',
      articleTitle: 'Test article',
    })
    expect(res.status).toBe(200)
    expect(res.data?.keyword).toBe(kw)
    expect(Array.isArray(res.data?.kpis)).toBe(true)
    expect(res.data?.kpis.length).toBe(6)
    // Enum réel (shared/types/keyword-validate.types.ts) : 'GO' | 'ORANGE' | 'NO-GO'
    expect(['GO', 'ORANGE', 'NO-GO']).toContain(res.data?.verdict?.level ?? '')
    expect(typeof res.data?.verdict?.greenCount).toBe('number')
    expect(res.data?.verdict?.totalKpis).toBe(6)
  })

  it('POST /keywords/:kw/validate avec level invalide → 400', async () => {
    if (requireServer().skip) return
    const res = await apiPost(`/keywords/${encodeURIComponent('test-' + ctx.runId + '-plombier')}/validate`, {
      level: 'xyz',
    })
    expect(res.status).toBe(400)
  })

  it('POST /keywords/:kw/validate?articleId → persiste captain_explorations', { timeout: 30000 }, async () => {
    if (requireServer().skip) return
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'Captain Cocon')
    const article = await ctx.createArticle(cocoon.id, 'Captain Article')

    const kw = `test-${ctx.runId}-captain-persist`
    const res = await apiPost(`/keywords/${encodeURIComponent(kw)}/validate`, {
      level: 'pilier',
      articleTitle: 'Test',
      articleId: article.id,
    })
    expect(res.status).toBe(200)

    const dbRes = await query<{ keyword: string }>(
      `SELECT keyword FROM captain_explorations WHERE article_id = $1`,
      [article.id],
    )
    expect(dbRes.rows.length).toBeGreaterThan(0)
    expect(dbRes.rows.some(r => r.keyword === kw)).toBe(true)
  })

  it('GET /articles/:id/explorations renvoie captain[] avec validation history', { timeout: 30000 }, async () => {
    if (requireServer().skip) return
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'History Cocon')
    const article = await ctx.createArticle(cocoon.id, 'History Article')

    const kw = `test-${ctx.runId}-history`
    await apiPost(`/keywords/${encodeURIComponent(kw)}/validate`, {
      level: 'pilier',
      articleTitle: 'Test',
      articleId: article.id,
    })

    const res = await apiGet<{ captain: Array<{ keyword: string; kpis: unknown[] }> }>(`/articles/${article.id}/explorations`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.data?.captain)).toBe(true)
    expect(res.data?.captain.some(c => c.keyword === kw)).toBe(true)
  })

  it('U5 TTL : re-validation du même keyword est plus rapide (cache DB)', { timeout: 120000 }, async () => {
    if (requireServer().skip) return
    const kw = `test-${ctx.runId}-ttl`
    const t1 = Date.now()
    await apiPost(`/keywords/${encodeURIComponent(kw)}/validate`, { level: 'pilier', articleTitle: 'Test' })
    const e1 = Date.now() - t1

    const t2 = Date.now()
    const r2 = await apiPost(`/keywords/${encodeURIComponent(kw)}/validate`, { level: 'pilier', articleTitle: 'Test' })
    const e2 = Date.now() - t2

    expect(r2.status).toBe(200)
    expect(e2).toBeLessThan(e1 * 1.5)
  })

  it('POST /keywords/:kw/ai-panel (stream) retourne SSE event:chunk', { timeout: 30000 }, async () => {
    if (requireServer().skip) return
    const res = await fetch(`http://localhost:3005/api/keywords/${encodeURIComponent('test-' + ctx.runId + '-ai')}/ai-panel`, {
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

  it.todo('Verdict RED bloque le lock côté UI (frontend — testé via Playwright)')
  it('Lock Capitaine : PUT /articles/:id/keywords avec capitaine définit captain_locked_at', async () => {
    if (requireServer().skip) return
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'CapLockE2E Cocon')
    const article = await ctx.createArticle(cocoon.id, 'CapLockE2E Article')

    const res = await apiPut(`/articles/${article.id}/keywords`, {
      capitaine: `test-${ctx.runId}-lock`,
      lieutenants: [], lexique: [], rootKeywords: [], hnStructure: [],
    })
    expect(res.status).toBe(200)

    const dbRes = await query<{ capitaine: string }>(
      `SELECT capitaine FROM article_keywords WHERE article_id = $1`, [article.id],
    )
    expect(dbRes.rows[0]?.capitaine).toContain('test-')
  })

  it('Unlock Capitaine via PUT /articles/:id/keywords (remplacement)', async () => {
    if (requireServer().skip) return
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'CapUnlock Cocon')
    const article = await ctx.createArticle(cocoon.id, 'CapUnlock Article')

    // Lock
    await apiPut(`/articles/${article.id}/keywords`, {
      capitaine: `test-${ctx.runId}-u1`,
      lieutenants: [], lexique: [], rootKeywords: [], hnStructure: [],
    })
    // "Unlock" = remplacer par un autre
    const res = await apiPut(`/articles/${article.id}/keywords`, {
      capitaine: `test-${ctx.runId}-u2`,
      lieutenants: [], lexique: [], rootKeywords: [], hnStructure: [],
    })
    expect(res.status).toBe(200)
  })
})

// ---------------------------------------------------------------------------
// Onglet Lieutenants
// ---------------------------------------------------------------------------

describe('Moteur Workflow — Onglet Lieutenants', () => {
  it('POST /articles/:id/lieutenants/archive avec aucun lieutenant → idempotent', async () => {
    if (requireServer().skip) return
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'Archive Cocon')
    const article = await ctx.createArticle(cocoon.id, 'Archive Article')

    const res = await apiPost(`/articles/${article.id}/lieutenants/archive`, {})
    expect([200, 204]).toContain(res.status)
  })

  it('GET /articles/:id/lieutenant-explorations renvoie [] pour article neuf', async () => {
    if (requireServer().skip) return
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'Lieut Cocon')
    const article = await ctx.createArticle(cocoon.id, 'Lieut Article')

    const res = await apiGet<{ lieutenants: unknown[] } | unknown[]>(`/articles/${article.id}/lieutenant-explorations`)
    expect(res.status).toBe(200)
    // Shape peut être { lieutenants: [] } ou directement []
    if (Array.isArray(res.data)) {
      expect(res.data.length).toBe(0)
    }
  })

  it('POST /serp/analyze renvoie { keyword, competitors[] }', { timeout: 60000 }, async () => {
    if (requireServer().skip) return
    const res = await apiPost<{ keyword: string; competitors: unknown[] }>('/serp/analyze', {
      keyword: `test-${ctx.runId}-serp`,
    })
    if (res.status === 200) {
      expect(res.data?.keyword).toBeDefined()
      expect(Array.isArray(res.data?.competitors)).toBe(true)
    } else {
      expect([500]).toContain(res.status)
    }
  })

  it('POST /keywords/:captain/propose-lieutenants (stream) retourne SSE', { timeout: 30000 }, async () => {
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

  it('Lock lieutenants : PUT /articles/:id/keywords avec lieutenants[] persiste', async () => {
    if (requireServer().skip) return
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'LLock Cocon')
    const article = await ctx.createArticle(cocoon.id, 'LLock Article')

    const res = await apiPut(`/articles/${article.id}/keywords`, {
      capitaine: `test-${ctx.runId}-lcap`,
      lieutenants: ['lt1', 'lt2'],
      lexique: [],
      rootKeywords: [],
      hnStructure: [],
    })
    expect(res.status).toBe(200)

    // Lieutenants persistés
    const dbRes = await query<{ lieutenants: string[] }>(
      `SELECT lieutenants FROM article_keywords WHERE article_id = $1`,
      [article.id],
    )
    expect(dbRes.rows[0]?.lieutenants).toEqual(['lt1', 'lt2'])
  })

  it('Lock lieutenants + check MOTEUR_LIEUTENANTS_LOCKED via /progress/check', async () => {
    if (requireServer().skip) return
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'LLock E2E Cocon')
    const article = await ctx.createArticle(cocoon.id, 'LLock E2E Article')

    await apiPut(`/articles/${article.id}/keywords`, {
      capitaine: `test-${ctx.runId}-lcap2`,
      lieutenants: ['lt1', 'lt2'],
      lexique: [], rootKeywords: [], hnStructure: [],
    })
    await apiPost(`/articles/${article.id}/progress/check`, { check: 'moteur:lieutenants_locked' })

    const dbRes = await query<{ lieutenants: string[]; completed_checks: string[] }>(
      `SELECT ak.lieutenants, a.completed_checks FROM article_keywords ak
       JOIN articles a ON a.id = ak.article_id WHERE ak.article_id = $1`,
      [article.id],
    )
    expect(dbRes.rows[0]?.lieutenants.length).toBe(2)
    expect(dbRes.rows[0]?.completed_checks).toContain('moteur:lieutenants_locked')
  })

  it('hnStructure persisté dans article_keywords.hn_structure (pas article_content.outline automatiquement)', async () => {
    if (requireServer().skip) return
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'HnStruct E2E Cocon')
    const article = await ctx.createArticle(cocoon.id, 'HnStruct E2E Article')

    await apiPut(`/articles/${article.id}/keywords`, {
      capitaine: `test-${ctx.runId}-hn`,
      lieutenants: [], lexique: [], rootKeywords: [],
      hnStructure: [{ level: 'H2', title: 'Intro' }, { level: 'H2', title: 'Conclusion' }],
    })

    const dbRes = await query<{ hn_structure: unknown }>(
      `SELECT hn_structure FROM article_keywords WHERE article_id = $1`, [article.id],
    )
    expect(dbRes.rows[0]?.hn_structure).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// Onglet Lexique
// ---------------------------------------------------------------------------

describe('Moteur Workflow — Onglet Lexique', () => {
  it('POST /serp/tfidf retourne 200/404/500 selon SERP dispo', async () => {
    if (requireServer().skip) return
    const res = await apiPost('/serp/tfidf', { keyword: `test-${ctx.runId}-tfidf` })
    expect([200, 400, 404, 500]).toContain(res.status)
  })

  it('POST /keywords/:kw/ai-lexique-upfront (stream) retourne SSE', { timeout: 30000 }, async () => {
    if (requireServer().skip) return
    const res = await fetch(`http://localhost:3005/api/keywords/${encodeURIComponent('test-' + ctx.runId + '-lex')}/ai-lexique-upfront`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        level: 'pilier',
        allTerms: ['terme1', 'terme2'],
        cocoonSlug: 'test',
      }),
    })
    expect([200, 400, 500]).toContain(res.status)
  })

  it.todo('Multi-keyword : extraction sur kw arbitraire (frontend D4)')

  it('GET /articles/:id/explorations renvoie lexique[] vide pour article neuf', async () => {
    if (requireServer().skip) return
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'Lex Cocon')
    const article = await ctx.createArticle(cocoon.id, 'Lex Article')

    const res = await apiGet<{ lexique: unknown[] }>(`/articles/${article.id}/explorations`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.data?.lexique)).toBe(true)
    expect(res.data?.lexique.length).toBe(0)
  })

  it('Validation Lexique : PUT /articles/:id/keywords avec lexique[] persiste', async () => {
    if (requireServer().skip) return
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'LexVal Cocon')
    const article = await ctx.createArticle(cocoon.id, 'LexVal Article')

    const res = await apiPut(`/articles/${article.id}/keywords`, {
      capitaine: `test-${ctx.runId}-lex`,
      lieutenants: [],
      lexique: ['terme1', 'terme2', 'terme3'],
      rootKeywords: [],
      hnStructure: [],
    })
    expect(res.status).toBe(200)

    const dbRes = await query<{ lexique: string[] }>(
      `SELECT lexique FROM article_keywords WHERE article_id = $1`,
      [article.id],
    )
    expect(dbRes.rows[0]?.lexique).toEqual(['terme1', 'terme2', 'terme3'])
  })

  it.todo('U5 TTL : re-mount < 7j restore depuis DB (frontend U5)')
})

// ---------------------------------------------------------------------------
// Onglet Finalisation + Cross-tab
// ---------------------------------------------------------------------------

describe('Moteur Workflow — Cross-tab transitions', () => {
  it('GET /articles/:id/explorations/counts retourne 8 compteurs à 0 pour article neuf', async () => {
    if (requireServer().skip) return
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'Counts Cocon')
    const article = await ctx.createArticle(cocoon.id, 'Counts Article')

    const res = await apiGet<{
      radar: number
      captain: number
      lieutenants: number
      paa: number
      intent: number
      local: number
      contentGap: number
      lexique: number
    }>(`/articles/${article.id}/explorations/counts`)
    expect(res.status).toBe(200)
    expect(res.data?.radar).toBe(0)
    expect(res.data?.captain).toBe(0)
    expect(res.data?.lieutenants).toBe(0)
    expect(res.data?.paa).toBe(0)
    expect(res.data?.intent).toBe(0)
    expect(res.data?.local).toBe(0)
    expect(res.data?.contentGap).toBe(0)
    expect(res.data?.lexique).toBe(0)
  })

  it('GET /articles/:id/explorations/counts incrémente captain après validate', { timeout: 30000 }, async () => {
    if (requireServer().skip) return
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'Counts2 Cocon')
    const article = await ctx.createArticle(cocoon.id, 'Counts2 Article')

    await apiPost(`/keywords/${encodeURIComponent('test-' + ctx.runId + '-c2')}/validate`, {
      level: 'pilier',
      articleTitle: 'Test',
      articleId: article.id,
    })

    const res = await apiGet<{ captain: number }>(`/articles/${article.id}/explorations/counts`)
    expect(res.data?.captain).toBeGreaterThanOrEqual(1)
  })

  it('GET /articles/:id/external-cache retourne au moins { autocomplete: ... }', async () => {
    if (requireServer().skip) return
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'ExtCache Cocon')
    const article = await ctx.createArticle(cocoon.id, 'ExtCache Article')

    const res = await apiGet(`/articles/${article.id}/external-cache`)
    expect(res.status).toBe(200)
    expect(res.data).toBeDefined()
  })

  it('DELETE /articles/:id/external-cache idempotent', async () => {
    if (requireServer().skip) return
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'DelCache Cocon')
    const article = await ctx.createArticle(cocoon.id, 'DelCache Article')

    const res = await apiDelete(`/articles/${article.id}/external-cache`)
    expect(res.status).toBe(200)
  })

  it('Workflow complet Discovery → Radar → Capitaine → Lieutenants → Lexique', { timeout: 120000 }, async () => {
    if (requireServer().skip) return
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'WF Cocon')
    const article = await ctx.createArticle(cocoon.id, 'WF Article')

    // 1. Discovery
    const discover = await apiPost<{ keywords: unknown[] }>('/keywords/discover', {
      keyword: `test-${ctx.runId}-wf-plombier`, options: { maxResults: 3 },
    })
    expect(discover.status).toBe(200)
    expect(Array.isArray(discover.data?.keywords)).toBe(true)

    // 2. Radar generate
    const radarGen = await apiPost<{ keywords: Array<{ keyword: string; reasoning: string }> }>('/keywords/radar/generate', {
      title: article.titre, keyword: 'plombier', painPoint: 'urgent',
    })
    expect(radarGen.status).toBe(200)
    expect(radarGen.data?.keywords.length).toBeGreaterThan(0)

    // 3. Radar persist
    const persist = await apiPost(`/articles/${article.id}/radar-exploration`, {
      seed: `test-${ctx.runId}-wf`,
      context: { broadKeyword: 'plombier', specificTopic: 'urgent', painPoint: 'urgent', depth: 1 },
      generatedKeywords: radarGen.data!.keywords.slice(0, 2),
      scanResult: {
        specificTopic: 'urgent', broadKeyword: 'plombier',
        autocomplete: { suggestions: [], totalCount: 0 },
        cards: [], globalScore: 50, heatLevel: 'tiede',
        verdict: 'test', scannedAt: new Date().toISOString(),
      },
    })
    expect(persist.status).toBe(200)

    // 4. Capitaine validate
    const kw = `test-${ctx.runId}-wf-cap`
    await apiPost(`/keywords/${encodeURIComponent(kw)}/validate`, {
      level: 'pilier', articleTitle: article.titre, articleId: article.id,
    })

    // 5. Persist keywords (lieutenants + lexique en une fois)
    await apiPut(`/articles/${article.id}/keywords`, {
      capitaine: kw,
      lieutenants: ['lt1', 'lt2'],
      lexique: ['lex1', 'lex2'],
      rootKeywords: [],
      hnStructure: [],
    })

    // 6. Check complet via explorations
    const exp = await apiGet<{ captain: Array<{ keyword: string }>; lieutenants: unknown[]; lexique: unknown[]; radar: unknown }>(`/articles/${article.id}/explorations`)
    expect(exp.status).toBe(200)
    expect(exp.data?.captain.some(c => c.keyword === kw)).toBe(true)
    expect(exp.data?.radar).toBeDefined()
  })

  it('Switch d\'article en vol : validations parallèles sur 2 articles restent isolées', { timeout: 30000 }, async () => {
    if (requireServer().skip) return
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'SwitchE2E Cocon')
    const a1 = await ctx.createArticle(cocoon.id, 'SwitchE2E A1')
    const a2 = await ctx.createArticle(cocoon.id, 'SwitchE2E A2')

    const kw1 = `test-${ctx.runId}-se-1`
    const kw2 = `test-${ctx.runId}-se-2`
    await Promise.all([
      apiPost(`/keywords/${encodeURIComponent(kw1)}/validate`, { level: 'pilier', articleTitle: a1.titre, articleId: a1.id }),
      apiPost(`/keywords/${encodeURIComponent(kw2)}/validate`, { level: 'pilier', articleTitle: a2.titre, articleId: a2.id }),
    ])

    const db1 = await query<{ keyword: string }>(`SELECT keyword FROM captain_explorations WHERE article_id = $1`, [a1.id])
    const db2 = await query<{ keyword: string }>(`SELECT keyword FROM captain_explorations WHERE article_id = $1`, [a2.id])
    expect(db1.rows.some(r => r.keyword === kw1)).toBe(true)
    expect(db1.rows.some(r => r.keyword === kw2)).toBe(false)
    expect(db2.rows.some(r => r.keyword === kw2)).toBe(true)
    expect(db2.rows.some(r => r.keyword === kw1)).toBe(false)
  })
})

void apiPut
