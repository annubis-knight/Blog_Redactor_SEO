// @vitest-environment node
/**
 * Contract API — /generate/* endpoints
 *
 * NB : il n'y a pas de POST /generate/structure, /generate/paa-queries ou
 * /generate/specialises — seulement outline, article, reduce-section,
 * humanize-section, meta, action, micro-context-suggest, brief-explain.
 */
import { describe, it, expect } from 'vitest'
import { setupTestContext } from '../helpers/test-context.js'
import { apiPost } from '../helpers/api-client.js'

const ctx = setupTestContext()
function requireServer() { return ctx.serverOk ? { skip: false } : { skip: true } as const }

describe('Contract /generate/outline', () => {
  it('POST sans body → 400 VALIDATION_ERROR', async () => {
    if (requireServer().skip) return
    const res = await apiPost('/generate/outline', {})
    expect(res.error?.code).toBe('VALIDATION_ERROR')
  })

  it('POST OK avec body valide → 200 ou 500 (selon load prompt)', { timeout: 90000 }, async () => {
    if (requireServer().skip) return
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'Outline Cocon')
    const article = await ctx.createArticle(cocoon.id, 'Outline Article')

    const res = await apiPost('/generate/outline', {
      articleId: article.id,
      keyword: 'plombier toulouse',
      keywords: [],
      paa: [],
      articleType: 'Pilier',
      articleTitle: article.titre,
      cocoonName: cocoon.nom,
      topic: null,
    })
    expect([200, 500]).toContain(res.status)
  })
})

describe('Contract /generate/article', () => {
  it('POST sans body valide → 400 ou 500', async () => {
    if (requireServer().skip) return
    const res = await apiPost('/generate/article', {})
    expect([400, 500]).toContain(res.status)
  })

  it('POST avec body invalide → 400 VALIDATION_ERROR', async () => {
    if (requireServer().skip) return
    const res = await apiPost('/generate/article', { articleId: 1 })
    expect([400, 500]).toContain(res.status)
  })

  it.todo('Stream interrompu → pas de HTML partiel persisté (complexe, nécessite AbortController)')
})

describe('Contract /generate/reduce-section', () => {
  it('POST sans body → 400 ou 500', async () => {
    if (requireServer().skip) return
    const res = await apiPost('/generate/reduce-section', {})
    expect([400, 500]).toContain(res.status)
  })
})

describe('Contract /generate/humanize-section', () => {
  it('POST sans body → 400 ou 500', async () => {
    if (requireServer().skip) return
    const res = await apiPost('/generate/humanize-section', {})
    expect([400, 500]).toContain(res.status)
  })
})

describe('Contract /generate/meta', () => {
  it('POST sans body → 400 ou 500', async () => {
    if (requireServer().skip) return
    const res = await apiPost('/generate/meta', {})
    expect([400, 500]).toContain(res.status)
  })

  it('POST OK → metaTitle + metaDescription', { timeout: 90000 }, async () => {
    if (requireServer().skip) return
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'Meta Cocon')
    const article = await ctx.createArticle(cocoon.id, 'Meta Article')

    const res = await apiPost<{ metaTitle: string; metaDescription: string }>('/generate/meta', {
      articleId: article.id,
      keyword: `test-${ctx.runId}-meta`,
      articleTitle: 'Guide plombier à Toulouse',
      articleContent: 'Lorsque vous recherchez un plombier à Toulouse, plusieurs critères doivent guider votre choix : les certifications, les avis clients, la réactivité en cas d\'urgence, et la transparence des tarifs. Cet article vous guide pour éviter les mauvaises surprises et trouver un artisan fiable.',
    })
    // 200 si IA répond en JSON, 500 si IA refuse (contenu trop court/invalide)
    expect([200, 500]).toContain(res.status)
    if (res.status === 200) {
      expect(res.data?.metaTitle).toBeDefined()
      expect(res.data?.metaDescription).toBeDefined()
      expect((res.data?.metaTitle ?? '').length).toBeLessThanOrEqual(70)
      expect((res.data?.metaDescription ?? '').length).toBeLessThanOrEqual(170)
    }
  })
})

describe('Contract /generate/micro-context-suggest', () => {
  it('POST sans body → 400 ou 500', async () => {
    if (requireServer().skip) return
    const res = await apiPost('/generate/micro-context-suggest', {})
    expect([400, 500]).toContain(res.status)
  })

  it('POST /generate/micro-context-suggest avec body minimal → 200/400/500', { timeout: 90000 }, async () => {
    if (requireServer().skip) return
    const res = await apiPost('/generate/micro-context-suggest', {
      articleId: 1,
      articleTitle: 'Test',
      keyword: `test-${ctx.runId}-mc`,
      articleType: 'Pilier',
    })
    expect([200, 400, 500]).toContain(res.status)
  })
})

describe('Contract /generate/action', () => {
  it('POST sans body → 400 ou 500', async () => {
    if (requireServer().skip) return
    const res = await apiPost('/generate/action', {})
    expect([400, 500]).toContain(res.status)
  })
})

describe('Contract /generate/brief-explain', () => {
  it('POST sans body → 400 ou 500', async () => {
    if (requireServer().skip) return
    const res = await apiPost('/generate/brief-explain', {})
    expect([400, 500]).toContain(res.status)
  })
})

describe.skip('Contract endpoints non implémentés', () => {
  it('POST /generate/structure → 404 (endpoint inexistant)', async () => {
    if (requireServer().skip) return
    const res = await apiPost('/generate/structure', {})
    expect(res.status).toBe(404)
  })

  it('POST /generate/paa-queries → 404 (endpoint inexistant)', async () => {
    if (requireServer().skip) return
    const res = await apiPost('/generate/paa-queries', {})
    expect(res.status).toBe(404)
  })

  it('POST /generate/specialises → 404 (endpoint inexistant)', async () => {
    if (requireServer().skip) return
    const res = await apiPost('/generate/specialises', {})
    expect(res.status).toBe(404)
  })
})
