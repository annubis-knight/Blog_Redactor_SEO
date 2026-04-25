// @vitest-environment node
/**
 * E2E — Calcul targetWordCount conseillé
 *
 * Vérifie le service de recommandation : SERP avg + base type + sommaire HN
 * → conseil IA (mock) → propagé au micro-context et éditable par l'utilisateur.
 */
import { describe, it, expect } from 'vitest'
import { setupTestContext } from '../helpers/test-context.js'
import { apiPost, apiPut, apiGet } from '../helpers/api-client.js'

const ctx = setupTestContext()
function requireServer() { return ctx.serverOk ? { skip: false } : { skip: true } as const }

describe('Target word count — Heuristique seule (pas de SERP)', () => {
  it('Pilier sans SERP → midpoint 2650 (entre 1800 et 3500)', async () => {
    if (requireServer().skip) return
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'TWC P Cocon')
    const article = await ctx.createArticle(cocoon.id, 'TWC P Article', 'Pilier')

    const res = await apiPost<{ recommended: number; breakdown: { typeBase: { min: number; max: number; midpoint: number }; competitorsAvg: number | null; aiSuggestion: number | null } }>(
      `/articles/${article.id}/recommend-word-count`,
    )
    expect(res.status).toBe(200)
    expect(res.data?.recommended).toBe(2650)
    expect(res.data?.breakdown?.typeBase).toEqual({ min: 1800, max: 3500, midpoint: 2650 })
    expect(res.data?.breakdown?.competitorsAvg).toBeNull()
    expect(res.data?.breakdown?.aiSuggestion).toBeNull()
  })

  it('Intermédiaire sans SERP → midpoint 1850', async () => {
    if (requireServer().skip) return
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'TWC I Cocon')
    const article = await ctx.createArticle(cocoon.id, 'TWC I Article', 'Intermédiaire')

    const res = await apiPost<{ recommended: number; breakdown: { typeBase: { min: number; max: number } } }>(
      `/articles/${article.id}/recommend-word-count`,
    )
    expect(res.data?.recommended).toBe(1850)
    expect(res.data?.breakdown?.typeBase).toEqual(expect.objectContaining({ min: 1200, max: 2500 }))
  })

  it('Spécialisé sans SERP → midpoint 1150', async () => {
    if (requireServer().skip) return
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'TWC S Cocon')
    const article = await ctx.createArticle(cocoon.id, 'TWC S Article', 'Spécialisé')

    const res = await apiPost<{ recommended: number; breakdown: { typeBase: { min: number; max: number } } }>(
      `/articles/${article.id}/recommend-word-count`,
    )
    expect(res.data?.recommended).toBe(1150)
    expect(res.data?.breakdown?.typeBase).toEqual(expect.objectContaining({ min: 800, max: 1500 }))
  })
})

describe('Target word count — Validation', () => {
  it('POST avec id non-numérique → 400 INVALID_ID', async () => {
    if (requireServer().skip) return
    const res = await apiPost('/articles/abc/recommend-word-count')
    expect(res.error?.code).toBe('INVALID_ID')
  })

  it('POST avec id inexistant → 404 NOT_FOUND', async () => {
    if (requireServer().skip) return
    const res = await apiPost('/articles/9999999/recommend-word-count')
    expect(res.error?.code).toBe('NOT_FOUND')
  })
})

describe('Target word count — Intégration au workflow brief (contentLengthRecommendation)', () => {
  it('GET /articles/:id/recommend-word-count alimente la reco utilisée par le brief', async () => {
    if (requireServer().skip) return
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'WF Brief Cocon')
    const article = await ctx.createArticle(cocoon.id, 'WF Brief Article', 'Intermédiaire')

    // Le brief store appellera cet endpoint quand il charge les données
    const res = await apiPost<{ recommended: number; breakdown: { typeBase: { min: number; max: number } } }>(
      `/articles/${article.id}/recommend-word-count`,
    )
    expect(res.status).toBe(200)
    // Intermédiaire midpoint = 1850, range 1200-2500
    expect(res.data?.recommended).toBeGreaterThanOrEqual(1200)
    expect(res.data?.recommended).toBeLessThanOrEqual(2500)
  })
})

describe('Target word count — Workflow utilisateur (recommande puis sauvegarde dans micro-context)', () => {
  it('Recommandation → user accepte → PUT micro-context → GET retourne la valeur', async () => {
    if (requireServer().skip) return
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'TWC Flow Cocon')
    const article = await ctx.createArticle(cocoon.id, 'TWC Flow Article', 'Pilier')

    // 1. User clique "Suggérer" → endpoint conseille 2650 (Pilier sans SERP)
    const recRes = await apiPost<{ recommended: number }>(`/articles/${article.id}/recommend-word-count`)
    const recommended = recRes.data?.recommended ?? 0
    expect(recommended).toBeGreaterThan(0)

    // 2. User accepte → PUT micro-context avec cette valeur
    await apiPut(`/articles/${article.id}/micro-context`, {
      angle: `[test:${ctx.runId}] approche test`,
      targetWordCount: recommended,
    })

    // 3. GET micro-context retrouve la valeur (vérifie le fix du bug)
    const mcRes = await apiGet<{ targetWordCount?: number }>(`/articles/${article.id}/micro-context`)
    expect(mcRes.data?.targetWordCount).toBe(recommended)
  })

  it('User peut override la recommandation IA avec sa propre valeur', async () => {
    if (requireServer().skip) return
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'TWC Override Cocon')
    const article = await ctx.createArticle(cocoon.id, 'TWC Override Article', 'Pilier')

    // Conseil IA = 2650, mais user veut 1900
    await apiPut(`/articles/${article.id}/micro-context`, {
      angle: `[test:${ctx.runId}] short`,
      targetWordCount: 1900,
    })

    const mcRes = await apiGet<{ targetWordCount?: number }>(`/articles/${article.id}/micro-context`)
    expect(mcRes.data?.targetWordCount).toBe(1900)
  })

  it('Valeur clampée aux bornes du type — refuse < 500', async () => {
    if (requireServer().skip) return
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'TWC Range Cocon')
    const article = await ctx.createArticle(cocoon.id, 'TWC Range Article')

    const res = await apiPut(`/articles/${article.id}/micro-context`, {
      angle: 'x',
      targetWordCount: 100,
    })
    expect(res.status).toBe(400)
  })
})
