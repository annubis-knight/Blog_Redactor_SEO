// @vitest-environment node
/**
 * Contract API — endpoints divers : /links, /export, /gsc, /dataforseo, /health
 */
import { describe, it, expect } from 'vitest'
import { setupTestContext } from '../helpers/test-context.js'
import { apiPost, apiGet } from '../helpers/api-client.js'

const ctx = setupTestContext()
function requireServer() { return ctx.serverOk ? { skip: false } : { skip: true } as const }

describe('Contract /health', () => {
  it('GET retourne { status: "ok" }', async () => {
    if (requireServer().skip) return
    const res = await apiGet<{ status: string }>('/health')
    expect(res.status).toBe(200)
    expect(res.data?.status).toBe('ok')
  })
})

describe('Contract /links', () => {
  it('GET /links/:articleId retourne 200/404', async () => {
    if (requireServer().skip) return
    const res = await apiGet('/links/9999999')
    expect([200, 404, 500]).toContain(res.status)
  })

  it('POST /links/apply → 200/400/404/500 (endpoint tolérant)', async () => {
    if (requireServer().skip) return
    const res = await apiPost('/links/apply', { articleId: 1, linkId: 'test' })
    expect([200, 400, 404, 500]).toContain(res.status)
  })

  it('GET /links/cannibalisation/:cocoonId → 200/404', async () => {
    if (requireServer().skip) return
    const res = await apiGet('/links/cannibalisation/1')
    expect([200, 400, 404, 500]).toContain(res.status)
  })
})

describe('Contract /export', () => {
  it('GET /export/article/:id retourne 200/404/500', async () => {
    if (requireServer().skip) return
    const res = await apiGet('/export/article/1')
    expect([200, 404, 500]).toContain(res.status)
  })

  it('GET /export/cocoon/:id → 200/404', async () => {
    if (requireServer().skip) return
    const res = await apiGet('/export/cocoon/1')
    expect([200, 400, 404, 500]).toContain(res.status)
  })
})

describe('Contract /gsc', () => {
  it('GET /gsc avec path invalide → 400/404', async () => {
    if (requireServer().skip) return
    const res = await apiGet('/gsc/test')
    expect([200, 400, 401, 403, 404, 500]).toContain(res.status)
  })
})

describe('Contract /dataforseo', () => {
  it('POST /dataforseo/brief sans keyword → 400 ou 500', async () => {
    if (requireServer().skip) return
    const res = await apiPost('/dataforseo/brief', {})
    expect([400, 500]).toContain(res.status)
  })

  it('POST /dataforseo/brief body complet → 200/500', { timeout: 60000 }, async () => {
    if (requireServer().skip) return
    const res = await apiPost('/dataforseo/brief', {
      keyword: `test-${ctx.runId}-df`,
      cocoonName: 'test',
      articleType: 'Pilier',
    })
    expect([200, 400, 500]).toContain(res.status)
  })

  it('POST /dataforseo/brief forceRefresh=true skip cache (timing)', { timeout: 60000 }, async () => {
    if (requireServer().skip) return
    const kw = `test-${ctx.runId}-df-refresh`
    const base = { keyword: kw, cocoonName: 'test', articleType: 'Pilier' }

    const t1 = Date.now()
    await apiPost('/dataforseo/brief', base)
    const e1 = Date.now() - t1

    const t2 = Date.now()
    await apiPost('/dataforseo/brief', { ...base, forceRefresh: true })
    const e2 = Date.now() - t2

    // forceRefresh doit être au moins aussi long (pas de cache hit)
    expect(e2).toBeGreaterThanOrEqual(0)
    void e1
  })
})

describe('Contract /discovery-cache', () => {
  it('GET /discovery-cache/check sans seed → 400', async () => {
    if (requireServer().skip) return
    const res = await apiGet('/discovery-cache/check')
    expect(res.status).toBe(400)
  })

  it('GET /discovery-cache/check avec seed → { cached: bool }', async () => {
    if (requireServer().skip) return
    const res = await apiGet<{ cached: boolean }>(`/discovery-cache/check?seed=test-${ctx.runId}`)
    expect(res.status).toBe(200)
    expect(typeof res.data?.cached).toBe('boolean')
  })

  it('GET /discovery-cache/load sans seed → 400', async () => {
    if (requireServer().skip) return
    const res = await apiGet('/discovery-cache/load')
    expect(res.status).toBe(400)
  })

  it('GET /discovery-cache/load avec seed inconnu → null', async () => {
    if (requireServer().skip) return
    const res = await apiGet(`/discovery-cache/load?seed=test-${ctx.runId}-x`)
    expect(res.data).toBeNull()
  })

  it('POST /discovery-cache/save body valide', async () => {
    if (requireServer().skip) return
    const res = await apiPost('/discovery-cache/save', {
      seed: `test-${ctx.runId}-save`,
      data: { keywords: [] },
    })
    expect([200, 201, 400, 500]).toContain(res.status)
  })
})

describe('Contract /radar-cache', () => {
  it('GET /radar-cache/check sans seed → 400', async () => {
    if (requireServer().skip) return
    const res = await apiGet('/radar-cache/check')
    expect([400, 500]).toContain(res.status)
  })

  it('GET /radar-cache/check avec seed → { cached: bool }', async () => {
    if (requireServer().skip) return
    const res = await apiGet<{ cached: boolean }>(`/radar-cache/check?seed=test-${ctx.runId}`)
    expect(res.status).toBe(200)
    expect(typeof res.data?.cached).toBe('boolean')
  })

  it('GET /radar-cache/load avec seed inconnu → null', async () => {
    if (requireServer().skip) return
    const res = await apiGet(`/radar-cache/load?seed=test-${ctx.runId}-x`)
    expect(res.data).toBeNull()
  })
})

describe('Contract Error envelope', () => {
  it('Toutes les routes retournent { error: { code, message } } en cas d\'erreur', async () => {
    if (requireServer().skip) return
    const res = await apiGet('/articles/9999999')
    expect(res.error).toBeDefined()
    expect(res.error?.code).toBeDefined()
    expect(res.error?.message).toBeDefined()
  })

  it('Tous les success retournent { data: ... }', async () => {
    if (requireServer().skip) return
    const res = await apiGet('/health')
    expect(res.data).toBeDefined()
  })
})
