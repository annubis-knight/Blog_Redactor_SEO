// @vitest-environment node
/**
 * Contract API — Mutations unitaires de keywords dans radar_explorations.
 *
 * Référence FR PRD : FR-RAD-DB-FIRST, FR-RAD-MANUAL-ADD.
 *
 * Couvre :
 *  - POST /articles/:id/radar-exploration/keyword (add unitaire, idempotent)
 *  - DELETE /articles/:id/radar-exploration/keyword?keyword=… (remove unitaire)
 *  - POST /articles/:id/radar-exploration/keywords (batch add, idempotent)
 *
 * Pré-requis : serveur dev sur :3400 (ctx.serverOk).
 */
import { describe, it, expect } from 'vitest'
import { setupTestContext } from '../helpers/test-context.js'
import { apiPost, apiDelete, apiGet } from '../helpers/api-client.js'

const ctx = setupTestContext()
function requireServer() { return ctx.serverOk ? { skip: false } : { skip: true } as const }

interface RadarExplorationResponse {
  entry: {
    articleId: number
    generatedKeywords: Array<{ keyword: string; reasoning?: string }>
  }
  added?: boolean | number
}

describe('Contract POST /articles/:id/radar-exploration/keyword', () => {
  it('id invalide → 400 INVALID_ID', async () => {
    if (requireServer().skip) return
    const res = await apiPost('/articles/abc/radar-exploration/keyword', { keyword: 'foo' })
    expect(res.error?.code).toBe('INVALID_ID')
  })

  it('keyword manquant → 400 VALIDATION_ERROR', async () => {
    if (requireServer().skip) return
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'Radar Keyword Cocon A')
    const article = await ctx.createArticle(cocoon.id, 'Radar Keyword Article A')
    const res = await apiPost(`/articles/${article.id}/radar-exploration/keyword`, {})
    expect(res.error?.code).toBe('VALIDATION_ERROR')
  })

  it('keyword vide → 400 VALIDATION_ERROR', async () => {
    if (requireServer().skip) return
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'Radar Keyword Cocon B')
    const article = await ctx.createArticle(cocoon.id, 'Radar Keyword Article B')
    const res = await apiPost(`/articles/${article.id}/radar-exploration/keyword`, { keyword: '   ' })
    expect(res.error?.code).toBe('VALIDATION_ERROR')
  })

  it('ajout d\'un keyword inédit → 200 + added: true + entry contient le keyword', async () => {
    if (requireServer().skip) return
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'Radar Keyword Cocon C')
    const article = await ctx.createArticle(cocoon.id, 'Radar Keyword Article C')

    const res = await apiPost<RadarExplorationResponse>(
      `/articles/${article.id}/radar-exploration/keyword`,
      { keyword: 'seo local boulangerie' },
    )
    expect(res.error).toBeUndefined()
    expect(res.data?.added).toBe(true)
    expect(res.data?.entry.generatedKeywords).toHaveLength(1)
    expect(res.data?.entry.generatedKeywords[0].keyword).toBe('seo local boulangerie')
  })

  it('ajout idempotent du même keyword → added: false + count inchangé', async () => {
    if (requireServer().skip) return
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'Radar Keyword Cocon D')
    const article = await ctx.createArticle(cocoon.id, 'Radar Keyword Article D')

    await apiPost(`/articles/${article.id}/radar-exploration/keyword`, { keyword: 'foo bar' })
    const res2 = await apiPost<RadarExplorationResponse>(
      `/articles/${article.id}/radar-exploration/keyword`,
      { keyword: 'foo bar' },
    )
    expect(res2.data?.added).toBe(false)
    expect(res2.data?.entry.generatedKeywords).toHaveLength(1)
  })

  it('dédup insensible à la casse + trim', async () => {
    if (requireServer().skip) return
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'Radar Keyword Cocon E')
    const article = await ctx.createArticle(cocoon.id, 'Radar Keyword Article E')

    await apiPost(`/articles/${article.id}/radar-exploration/keyword`, { keyword: 'Coiffeur Lyon' })
    const res2 = await apiPost<RadarExplorationResponse>(
      `/articles/${article.id}/radar-exploration/keyword`,
      { keyword: '  coiffeur lyon  ' },
    )
    expect(res2.data?.added).toBe(false)
    expect(res2.data?.entry.generatedKeywords).toHaveLength(1)
  })
})

describe('Contract DELETE /articles/:id/radar-exploration/keyword', () => {
  it('id invalide → 400 INVALID_ID', async () => {
    if (requireServer().skip) return
    const res = await apiDelete('/articles/abc/radar-exploration/keyword?keyword=foo')
    expect(res.error?.code).toBe('INVALID_ID')
  })

  it('query keyword manquant → 400 VALIDATION_ERROR', async () => {
    if (requireServer().skip) return
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'Radar Delete Cocon A')
    const article = await ctx.createArticle(cocoon.id, 'Radar Delete Article A')
    const res = await apiDelete(`/articles/${article.id}/radar-exploration/keyword`)
    expect(res.error?.code).toBe('VALIDATION_ERROR')
  })

  it('suppression d\'un keyword existant → entry sans ce keyword', async () => {
    if (requireServer().skip) return
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'Radar Delete Cocon B')
    const article = await ctx.createArticle(cocoon.id, 'Radar Delete Article B')

    await apiPost(`/articles/${article.id}/radar-exploration/keyword`, { keyword: 'kw-a' })
    await apiPost(`/articles/${article.id}/radar-exploration/keyword`, { keyword: 'kw-b' })

    const res = await apiDelete<{ entry: RadarExplorationResponse['entry'] | null }>(
      `/articles/${article.id}/radar-exploration/keyword?keyword=kw-a`,
    )
    expect(res.error).toBeUndefined()
    expect(res.data?.entry?.generatedKeywords).toHaveLength(1)
    expect(res.data?.entry?.generatedKeywords[0].keyword).toBe('kw-b')
  })

  it('suppression d\'un keyword inexistant → no-op, entry inchangée', async () => {
    if (requireServer().skip) return
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'Radar Delete Cocon C')
    const article = await ctx.createArticle(cocoon.id, 'Radar Delete Article C')

    await apiPost(`/articles/${article.id}/radar-exploration/keyword`, { keyword: 'kw-a' })
    const res = await apiDelete<{ entry: RadarExplorationResponse['entry'] | null }>(
      `/articles/${article.id}/radar-exploration/keyword?keyword=kw-z`,
    )
    expect(res.error).toBeUndefined()
    expect(res.data?.entry?.generatedKeywords).toHaveLength(1)
    expect(res.data?.entry?.generatedKeywords[0].keyword).toBe('kw-a')
  })
})

describe('Contract POST /articles/:id/radar-exploration/keywords (batch)', () => {
  it('id invalide → 400 INVALID_ID', async () => {
    if (requireServer().skip) return
    const res = await apiPost('/articles/abc/radar-exploration/keywords', { keywords: [{ keyword: 'a' }] })
    expect(res.error?.code).toBe('INVALID_ID')
  })

  it('body sans tableau → 400 VALIDATION_ERROR', async () => {
    if (requireServer().skip) return
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'Radar Batch Cocon A')
    const article = await ctx.createArticle(cocoon.id, 'Radar Batch Article A')
    const res = await apiPost(`/articles/${article.id}/radar-exploration/keywords`, { keywords: 'not-an-array' })
    expect(res.error?.code).toBe('VALIDATION_ERROR')
  })

  it('batch initial de 3 keywords inédits → added: 3', async () => {
    if (requireServer().skip) return
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'Radar Batch Cocon B')
    const article = await ctx.createArticle(cocoon.id, 'Radar Batch Article B')

    const res = await apiPost<RadarExplorationResponse>(
      `/articles/${article.id}/radar-exploration/keywords`,
      {
        keywords: [
          { keyword: 'kw-1', reasoning: 'r1' },
          { keyword: 'kw-2' },
          { keyword: 'kw-3', reasoning: 'r3' },
        ],
      },
    )
    expect(res.data?.added).toBe(3)
    expect(res.data?.entry.generatedKeywords).toHaveLength(3)
  })

  it('batch idempotent : re-soumettre les mêmes keywords → added: 0', async () => {
    if (requireServer().skip) return
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'Radar Batch Cocon C')
    const article = await ctx.createArticle(cocoon.id, 'Radar Batch Article C')

    await apiPost(`/articles/${article.id}/radar-exploration/keywords`, {
      keywords: [{ keyword: 'alpha' }, { keyword: 'beta' }],
    })
    const res2 = await apiPost<RadarExplorationResponse>(
      `/articles/${article.id}/radar-exploration/keywords`,
      { keywords: [{ keyword: 'alpha' }, { keyword: 'beta' }] },
    )
    expect(res2.data?.added).toBe(0)
    expect(res2.data?.entry.generatedKeywords).toHaveLength(2)
  })

  it('GET après ajouts retourne tous les keywords ajoutés', async () => {
    if (requireServer().skip) return
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'Radar Batch Cocon D')
    const article = await ctx.createArticle(cocoon.id, 'Radar Batch Article D')

    await apiPost(`/articles/${article.id}/radar-exploration/keywords`, {
      keywords: [{ keyword: 'x' }, { keyword: 'y' }, { keyword: 'z' }],
    })

    const res = await apiGet<{ generatedKeywords: Array<{ keyword: string }> }>(
      `/articles/${article.id}/radar-exploration`,
    )
    expect(res.data?.generatedKeywords).toHaveLength(3)
    const keys = res.data?.generatedKeywords.map(k => k.keyword)
    expect(keys).toContain('x')
    expect(keys).toContain('y')
    expect(keys).toContain('z')
  })
})
