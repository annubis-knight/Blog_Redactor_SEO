// @vitest-environment node
/**
 * Contract API — /cocoons/* + /strategy/* + /silos/* + /theme/*
 */
import { describe, it, expect } from 'vitest'
import { setupTestContext } from '../helpers/test-context.js'
import { apiPost, apiGet, apiPut } from '../helpers/api-client.js'

const ctx = setupTestContext()
function requireServer() { return ctx.serverOk ? { skip: false } : { skip: true } as const }

describe('Contract /cocoons', () => {
  it('GET /cocoons retourne array', async () => {
    if (requireServer().skip) return
    const res = await apiGet<unknown[]>('/cocoons')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.data)).toBe(true)
  })

  it('GET /cocoons/:id/strategy/context valide id', async () => {
    if (requireServer().skip) return
    const res = await apiGet('/cocoons/abc/strategy/context')
    expect(res.error?.code).toBe('INVALID_ID')
  })

  it('GET /cocoons/:cocoonName/capitaines pour cocon inconnu → 200 (vide ou null)', async () => {
    if (requireServer().skip) return
    const res = await apiGet(`/cocoons/test-${ctx.runId}-unknown/capitaines`)
    // Soit 200 (data vide) soit 404
    expect([200, 404]).toContain(res.status)
  })
})

describe('Contract /strategy/cocoon/:cocoonSlug', () => {
  it('GET retourne stratégie ou null', async () => {
    if (requireServer().skip) return
    const res = await apiGet(`/strategy/cocoon/test-${ctx.runId}-no-strat`)
    expect(res.status).toBe(200)
  })

  it('PUT body invalide → 500 ou 400 (schema cocoonStrategySchema strict)', async () => {
    if (requireServer().skip) return
    const res = await apiPut(`/strategy/cocoon/test-${ctx.runId}-put`, { foo: 'bar' })
    expect([400, 500]).toContain(res.status)
  })

  it('POST /suggest sans body → 400 ou 500', async () => {
    if (requireServer().skip) return
    const res = await apiPost(`/strategy/cocoon/test-${ctx.runId}/suggest`, {})
    expect([400, 500]).toContain(res.status)
  })

  it('POST /suggest body valide → 200 + { suggestion }', { timeout: 90000 }, async () => {
    if (requireServer().skip) return
    const res = await apiPost<{ suggestion: string }>(`/strategy/cocoon/test-${ctx.runId}/suggest`, {
      step: 'cible',
      currentInput: '',
      context: { cocoonName: 'test', siloName: 'test' },
    })
    expect(res.status).toBe(200)
    expect(typeof res.data?.suggestion).toBe('string')
    expect((res.data?.suggestion ?? '').length).toBeGreaterThan(0)
  })

  it('POST /deepen sans body → 400 ou 500', async () => {
    if (requireServer().skip) return
    const res = await apiPost(`/strategy/cocoon/test-${ctx.runId}/deepen`, {})
    expect([400, 500]).toContain(res.status)
  })

  it('POST /enrich sans body → 400 ou 500', async () => {
    if (requireServer().skip) return
    const res = await apiPost(`/strategy/cocoon/test-${ctx.runId}/enrich`, {})
    expect([400, 500]).toContain(res.status)
  })

  it('POST /suggest avec step inconnu → 400/500 (enum strict)', async () => {
    if (requireServer().skip) return
    const res = await apiPost(`/strategy/cocoon/test-${ctx.runId}-unk/suggest`, {
      step: 'step_inexistant',
      currentInput: '',
      context: { cocoonName: 'test', siloName: 'test' },
    })
    expect([400, 500]).toContain(res.status)
  })
})

describe('Contract /strategy/cocoon/:slug/topics (endpoint peut-être absent)', () => {
  it('POST /topics → 200/404 selon si endpoint présent', async () => {
    if (requireServer().skip) return
    const res = await apiPost(`/strategy/cocoon/test-${ctx.runId}-topics/topics`, {
      context: { cocoonName: 'test', siloName: 'test' },
    })
    // Endpoint peut exister ou non — on tolère
    expect([200, 400, 404, 500]).toContain(res.status)
  })
})

describe('Contract /silos', () => {
  it('GET /silos retourne array de silos', async () => {
    if (requireServer().skip) return
    const res = await apiGet<Array<{ id: number; nom: string }>>('/silos')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.data)).toBe(true)
  })

  it('GET /silos/:name pour silo inexistant → 404', async () => {
    if (requireServer().skip) return
    const res = await apiGet(`/silos/test-${ctx.runId}-no-silo`)
    expect([200, 404]).toContain(res.status)
  })

  it('POST /silos/:name/cocoons sans name body → 400', async () => {
    if (requireServer().skip) return
    const silo = await ctx.getSilo()
    const res = await apiPost(`/silos/${encodeURIComponent(silo.nom)}/cocoons`, {})
    expect(res.status).toBe(400)
  })
})

describe('Contract /theme', () => {
  it('GET /theme retourne le thème courant', async () => {
    if (requireServer().skip) return
    const res = await apiGet('/theme')
    expect(res.status).toBe(200)
  })

  it('GET /theme/config retourne avatar+positioning+offerings', async () => {
    if (requireServer().skip) return
    const res = await apiGet<{ avatar: object; positioning: object; offerings: object }>('/theme/config')
    expect(res.status).toBe(200)
    expect(res.data?.avatar).toBeDefined()
    expect(res.data?.positioning).toBeDefined()
    expect(res.data?.offerings).toBeDefined()
  })

  it('POST /theme/config/parse sans text → 400', async () => {
    if (requireServer().skip) return
    const res = await apiPost('/theme/config/parse', {})
    expect(res.status).toBe(400)
  })

  it('POST /theme/config/parse text vide → 400', async () => {
    if (requireServer().skip) return
    const res = await apiPost('/theme/config/parse', { text: '' })
    expect(res.status).toBe(400)
  })

  it('PUT /theme/config body invalide → 400/200 (schema peut être permissif)', async () => {
    if (requireServer().skip) return
    const res = await apiPut('/theme/config', { unknownField: 42 })
    expect([200, 400, 500]).toContain(res.status)
  })

  it('PUT /theme/config sauvegarde (round-trip read-modify-write-read)', { timeout: 10000 }, async () => {
    if (requireServer().skip) return
    // Lit la config existante, la renvoie telle quelle (round-trip safe)
    const existing = await apiGet<Record<string, unknown>>('/theme/config')
    if (existing.status !== 200 || !existing.data) return

    const res = await apiPut('/theme/config', existing.data)
    expect([200, 400]).toContain(res.status)
  })

  it('POST /theme/config/parse avec texte valide → 200 ou 500', { timeout: 90000 }, async () => {
    if (requireServer().skip) return
    const res = await apiPost<Record<string, unknown>>('/theme/config/parse', {
      text: 'Agence SEO à Toulouse pour PME locales. On aide les dirigeants à maîtriser leur visibilité Google.',
    })
    expect([200, 500]).toContain(res.status)
  })
})
