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
  it('POST avec body invalide (radarKeywords vide) → 400 VALIDATION_ERROR', async () => {
    if (requireServer().skip) return
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

  it('POST avec articleId non-positif → 400 INVALID_ID', async () => {
    if (requireServer().skip) return
    const res = await apiPost('/articles/-1/radar-exploration/long-tail', {
      radarKeywords: [{ keyword: 'a' }, { keyword: 'b' }],
      articleTitle: 'T',
      articlePainPoint: '',
      strategyContext: '',
    })
    expect(res.error?.code).toBe('INVALID_ID')
  })

  it('POST OK en mock → { suggestions[], fromCache:boolean }', async () => {
    if (requireServer().skip) return
    if (process.env.AI_PROVIDER !== 'mock') return // garde-fou : pas d'IA réelle en CI

    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'LT Cocon OK')
    const article = await ctx.createArticle(cocoon.id, 'LT Article OK')

    const res = await apiPost<{ suggestions: unknown[]; fromCache: boolean }>(
      `/articles/${article.id}/radar-exploration/long-tail`,
      {
        radarKeywords: [
          { keyword: 'copywriting email' },
          { keyword: 'pme industriel' },
          { keyword: 'taux conversion' },
        ],
        articleTitle: 'Copywriting B2B',
        articlePainPoint: 'Mes emails sont ignorés par les prospects',
        strategyContext: '',
      },
    )

    expect(res.status).toBeLessThan(400)
    expect(Array.isArray(res.data?.suggestions)).toBe(true)
    expect(typeof res.data?.fromCache).toBe('boolean')
  })

  it('PATCH selection OK → { ok: true, count: N }', async () => {
    if (requireServer().skip) return
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

  it('PATCH avec body invalide → 400 VALIDATION_ERROR', async () => {
    if (requireServer().skip) return
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
