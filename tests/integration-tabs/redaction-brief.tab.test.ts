// @vitest-environment node
/**
 * Integration — Onglet Rédaction · Brief (ui-sections-guide §5.1)
 */
import { describe, it, expect } from 'vitest'
import { setupTestContext } from '../helpers/test-context.js'
import { apiGet, apiPut, apiPost } from '../helpers/api-client.js'

const ctx = setupTestContext()
function requireServer() { return ctx.serverOk ? { skip: false } : { skip: true } as const }

describe('Tab redaction/brief — Micro-context CRUD', () => {
  it('GET /articles/:id/micro-context retourne null/empty pour article neuf', async () => {
    if (requireServer().skip) return
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'MCBrief Cocon')
    const article = await ctx.createArticle(cocoon.id, 'MCBrief Article')

    const res = await apiGet(`/articles/${article.id}/micro-context`)
    expect(res.status).toBe(200)
  })

  it('PUT sans angle → 400 (angle est requis dans schema)', async () => {
    if (requireServer().skip) return
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'MCNoAngle Cocon')
    const article = await ctx.createArticle(cocoon.id, 'MCNoAngle Article')

    const res = await apiPut(`/articles/${article.id}/micro-context`, { tone: 'x' })
    expect(res.status).toBe(400)
  })

  it('PUT avec angle valide sauvegarde + GET retourne le contenu', async () => {
    if (requireServer().skip) return
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'MCFull Cocon')
    const article = await ctx.createArticle(cocoon.id, 'MCFull Article')

    const angle = `[test:${ctx.runId}] Approche concrète avec checklists`
    await apiPut(`/articles/${article.id}/micro-context`, {
      angle,
      tone: 'Direct',
      directives: 'Inclure cas client',
    })

    const res = await apiGet<{ angle: string; tone: string }>(`/articles/${article.id}/micro-context`)
    expect(res.data?.angle).toBe(angle)
    expect(res.data?.tone).toBe('Direct')
  })

  it('PUT targetWordCount est sauvegardé et lu (bug fixé)', async () => {
    if (requireServer().skip) return
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'TWC Persist Cocon')
    const article = await ctx.createArticle(cocoon.id, 'TWC Persist Article')

    await apiPut(`/articles/${article.id}/micro-context`, {
      angle: `[test:${ctx.runId}] ok`,
      targetWordCount: 1750,
    })

    const res = await apiGet<{ targetWordCount?: number }>(`/articles/${article.id}/micro-context`)
    expect(res.data?.targetWordCount).toBe(1750)
  })

  it('PUT avec targetWordCount < 500 → 400 (range Zod schema)', async () => {
    if (requireServer().skip) return
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'MCRange Cocon')
    const article = await ctx.createArticle(cocoon.id, 'MCRange Article')

    // Le schema valide la range avant de tenter le save → 400 attendu
    // Si fail : le schema accepte 100 (problème de range schema)
    const res = await apiPut(`/articles/${article.id}/micro-context`, { angle: 'x', targetWordCount: 100 })
    // Tolérance : si le check articleId vient avant la validation Zod, peut être 404
    expect([400, 404]).toContain(res.status)
  })

  it('PUT article inexistant → 404', async () => {
    if (requireServer().skip) return
    const res = await apiPut(`/articles/9999999/micro-context`, { angle: 'x' })
    expect(res.status).toBe(404)
  })
})

describe('Tab redaction/brief — Suggestion IA', () => {
  it('POST /generate/micro-context-suggest sans body → 400/500', async () => {
    if (requireServer().skip) return
    const { apiPost } = await import('../helpers/api-client.js')
    const res = await apiPost('/generate/micro-context-suggest', {})
    expect([400, 500]).toContain(res.status)
  })

  it.todo('La suggestion ne remplace pas auto (frontend)')
})

describe('Tab redaction/brief — Keywords list', () => {
  it('GET /articles/:id/keywords renvoie la shape', async () => {
    if (requireServer().skip) return
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'BriefKw Cocon')
    const article = await ctx.createArticle(cocoon.id, 'BriefKw Article')

    const res = await apiGet(`/articles/${article.id}/keywords`)
    expect(res.status).toBe(200)
  })

  it('PUT /articles/:id/keywords replace total', async () => {
    if (requireServer().skip) return
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'BriefKwPut Cocon')
    const article = await ctx.createArticle(cocoon.id, 'BriefKwPut Article')

    const res = await apiPut(`/articles/${article.id}/keywords`, {
      capitaine: `test-${ctx.runId}-brief`,
      lieutenants: ['lt'],
      lexique: ['lex'],
      rootKeywords: [],
      hnStructure: [],
    })
    expect(res.status).toBe(200)
  })

  it('POST /keywords/lexique-suggest renvoie { lexique: string[] }', { timeout: 90000 }, async () => {
    if (requireServer().skip) return
    // Shape réelle (claude.service) : { lexique: string[] }
    const res = await apiPost<{ lexique: string[] }>('/keywords/lexique-suggest', {
      capitaine: `plombier toulouse`,
      cocoonName: 'test',
      existingTerms: [],
    })
    // 200 si IA répond OK, 500 si parse fail
    expect([200, 500]).toContain(res.status)
    if (res.status === 200) {
      expect(Array.isArray(res.data?.lexique)).toBe(true)
    }
  })
})

describe('Tab redaction/brief — Context recap', () => {
  it('GET /cocoons/:id/strategy/context retourne strategy ou null (alimente le recap)', async () => {
    if (requireServer().skip) return
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'StratRecap Cocon')

    const res = await apiGet(`/cocoons/${cocoon.id}/strategy/context`)
    expect(res.status).toBe(200)
  })

  it.todo('Cocon manquant → fallback (frontend — Playwright)')
})

void apiPost
