// @vitest-environment node
/**
 * Contract API — POST /articles/:id/radar-exploration/long-tail
 *                PATCH /articles/:id/radar-exploration/long-tail/selection
 *
 * Skip si serveur down (CI sans backend live).
 */
import { describe, it, expect } from 'vitest'
import { setupTestContext } from '../helpers/test-context.js'
import { apiPost, apiPatch } from '../helpers/api-client.js'

const ctx = setupTestContext()
function requireServer() {
  return ctx.serverOk ? { skip: false } : { skip: true } as const
}

describe('Contract /articles/:id/radar-exploration/long-tail', () => {
  it('POST avec body invalide (radarKeywords vide) → 400 VALIDATION_ERROR', async ({ skip }) => {
    if (requireServer().skip) skip()
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'LT Cocon')
    const article = await ctx.createArticle(cocoon.id, 'LT Article')

    const res = await apiPost(`/articles/${article.id}/radar-exploration/long-tail`, {
      radarKeywords: [],
      articleTitle: 'Test',
      articlePainPoint: '',
      strategyContext: '',
    })
    expect(res.error?.code).toBe('VALIDATION_ERROR')
  })

  it('POST avec articleId non-positif → 400 INVALID_ID', async ({ skip }) => {
    if (requireServer().skip) skip()
    const res = await apiPost('/articles/-1/radar-exploration/long-tail', {
      radarKeywords: [{ keyword: 'a' }, { keyword: 'b' }],
      articleTitle: 'T',
      articlePainPoint: '',
      strategyContext: '',
    })
    expect(res.error?.code).toBe('INVALID_ID')
  })

  // 2026-09-25 (épopée qualité SEO, C2 · T3) : « fromCache est un booléen »
  // passait quoi qu'il arrive, et le garde `AI_PROVIDER` (lu côté tests) faisait
  // sortir le test vert sans rien vérifier. Le titre propre au run rend le
  // premier appel neuf (fromCache = false) et le second servi par le cache.
  it('POST OK en mode simulé → suggestions, puis la même demande vient du cache', async ({ skip }) => {
    if (requireServer().skip) skip()
    if (ctx.modeReel) skip() // pas d'IA réelle : le mode simulé suffit au contrat

    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'LT Cocon OK')
    const article = await ctx.createArticle(cocoon.id, 'LT Article OK')
    const url = `/articles/${article.id}/radar-exploration/long-tail`
    const body = {
      radarKeywords: [
        { keyword: 'copywriting email' },
        { keyword: 'pme industriel' },
        { keyword: 'taux conversion' },
      ],
      articleTitle: `Copywriting B2B ${ctx.runId}`,
      articlePainPoint: 'Mes emails sont ignorés par les prospects',
      strategyContext: '',
    }

    const first = await apiPost<{ suggestions: unknown[]; fromCache: boolean }>(url, body)
    expect(first.status).toBe(200)
    expect(Array.isArray(first.data?.suggestions)).toBe(true)
    expect(first.data?.fromCache, 'demande propre à ce run : jamais servie').toBe(false)

    const again = await apiPost<{ suggestions: unknown[]; fromCache: boolean }>(url, body)
    expect(again.data?.fromCache, 'même demande : servie par le cache').toBe(true)
    expect(again.data?.suggestions).toEqual(first.data?.suggestions)
  })

  it('PATCH selection OK → { ok: true, count: N }', async ({ skip }) => {
    if (requireServer().skip) skip()
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'LT Cocon PATCH')
    const article = await ctx.createArticle(cocoon.id, 'LT Article PATCH')

    const res = await apiPatch<{ ok: boolean; count: number }>(
      `/articles/${article.id}/radar-exploration/long-tail/selection`,
      { selectedKeywords: ['kw1', 'kw2'] },
    )
    expect(res.data?.ok).toBe(true)
    expect(res.data?.count).toBe(2)
  })

  it('PATCH avec body invalide → 400 VALIDATION_ERROR', async ({ skip }) => {
    if (requireServer().skip) skip()
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'LT Cocon PATCH 2')
    const article = await ctx.createArticle(cocoon.id, 'LT Article PATCH 2')

    const res = await apiPatch(
      `/articles/${article.id}/radar-exploration/long-tail/selection`,
      { selectedKeywords: 'not-an-array' as unknown as string[] },
    )
    expect(res.error?.code).toBe('VALIDATION_ERROR')
  })
})
