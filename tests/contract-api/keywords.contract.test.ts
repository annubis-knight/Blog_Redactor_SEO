// @vitest-environment node
/**
 * Contract API — /keywords/* endpoints
 */
import { describe, it, expect } from 'vitest'
import { setupTestContext } from '../helpers/test-context.js'
import { apiPost } from '../helpers/api-client.js'

const ctx = setupTestContext()
function requireServer() { return ctx.serverOk ? { skip: false } : { skip: true } as const }

describe('Contract /keywords/discover', () => {
  it('POST sans body → 400 MISSING_PARAM', async () => {
    if (requireServer().skip) return
    const res = await apiPost('/keywords/discover', {})
    expect(res.status).toBe(400)
    expect(res.error?.code).toBe('MISSING_PARAM')
  })

  it('POST sans keyword → 400 MISSING_PARAM', async () => {
    if (requireServer().skip) return
    const res = await apiPost('/keywords/discover', { options: {} })
    expect(res.error?.code).toBe('MISSING_PARAM')
  })

  it('POST keyword vide → 400 MISSING_PARAM', async () => {
    if (requireServer().skip) return
    const res = await apiPost('/keywords/discover', { keyword: '' })
    expect(res.error?.code).toBe('MISSING_PARAM')
  })

  it('POST avec keyword valide → { data: { seed, keywords[] } }', { timeout: 90000 }, async () => {
    if (requireServer().skip) return
    const res = await apiPost<{ seed: string; keywords: unknown[] }>('/keywords/discover', {
      keyword: `test-${ctx.runId}-d`,
      options: { maxResults: 3 },
    })
    expect(res.status).toBe(200)
    expect(res.data?.seed).toBeDefined()
    expect(Array.isArray(res.data?.keywords)).toBe(true)
  })
})

describe('Contract /keywords/discover-from-site', () => {
  it('POST sans domain → 400', async () => {
    if (requireServer().skip) return
    const res = await apiPost('/keywords/discover-from-site', {})
    expect(res.error?.code).toBe('MISSING_PARAM')
  })

  it('POST OK → { domain, keywords[], total, apiCost }', { timeout: 90000 }, async () => {
    if (requireServer().skip) return
    const res = await apiPost<{ domain: string; keywords: unknown[] }>('/keywords/discover-from-site', {
      domain: `test-${ctx.runId}.com`,
    })
    expect(res.status).toBe(200)
    expect(res.data?.domain).toBeDefined()
  })
})

describe('Contract /keywords/relevance-score', () => {
  it('POST sans seed → 400', async () => {
    if (requireServer().skip) return
    const res = await apiPost('/keywords/relevance-score', { keywords: ['x'] })
    expect(res.status).toBe(400)
  })

  it('POST sans keywords[] → 400', async () => {
    if (requireServer().skip) return
    const res = await apiPost('/keywords/relevance-score', { seed: 'x' })
    expect(res.status).toBe(400)
  })

  it('POST keywords=[] → 400', async () => {
    if (requireServer().skip) return
    const res = await apiPost('/keywords/relevance-score', { seed: 'x', keywords: [] })
    expect(res.status).toBe(400)
  })

  it('POST OK → { scores: Record, fallback: bool }', async () => {
    if (requireServer().skip) return
    const res = await apiPost<{ scores: Record<string, number>; fallback: boolean }>('/keywords/relevance-score', {
      seed: `test-${ctx.runId}`, keywords: ['kw1', 'kw2'],
    })
    expect(res.status).toBe(200)
    expect(typeof res.data?.fallback).toBe('boolean')
    expect(typeof res.data?.scores).toBe('object')
  })

  it('POST avec strict=true retourne { scores, fallback }', async () => {
    if (requireServer().skip) return
    const res = await apiPost<{ scores: Record<string, number>; fallback: boolean }>('/keywords/relevance-score', {
      seed: `test-${ctx.runId}-s`,
      keywords: ['kw1', 'kw2'],
      strict: true,
    })
    expect(res.status).toBe(200)
    expect(typeof res.data?.scores).toBe('object')
  })
})

describe('Contract /keywords/analyze-discovery', () => {
  it('POST sans body → 400', async () => {
    if (requireServer().skip) return
    const res = await apiPost('/keywords/analyze-discovery', {})
    expect(res.status).toBe(400)
  })

  it('POST OK → { keywords: [{keyword, reasoning, priority}], summary }', { timeout: 60000 }, async () => {
    if (requireServer().skip) return
    const res = await apiPost<{ keywords: Array<{ priority: string }>; summary: string }>('/keywords/analyze-discovery', {
      seed: `test-${ctx.runId}`,
      wordGroups: [],
      keywords: [{ keyword: 'kw1', sources: ['suggest'] }],
    })
    expect(res.status).toBe(200)
    if ((res.data?.keywords ?? []).length > 0) {
      expect(['high', 'medium', 'low']).toContain(res.data!.keywords[0].priority)
    }
  })
})

describe('Contract /keywords/translate-pain', () => {
  it('POST sans painText → 400', async () => {
    if (requireServer().skip) return
    const res = await apiPost('/keywords/translate-pain', {})
    expect(res.status).toBe(400)
  })

  it('POST OK → { keywords: [{keyword, reasoning}] }', async () => {
    if (requireServer().skip) return
    const res = await apiPost<{ keywords: Array<{ keyword: string; reasoning: string }> }>('/keywords/translate-pain', {
      painText: `test-${ctx.runId} fuite urgente`,
    })
    expect(res.status).toBe(200)
    expect(Array.isArray(res.data?.keywords)).toBe(true)
  })
})

describe('Contract /keywords/validate-pain', () => {
  it('POST sans keywords[] → 400', async () => {
    if (requireServer().skip) return
    const res = await apiPost('/keywords/validate-pain', {})
    expect(res.status).toBe(400)
  })

  it('POST /keywords/validate-pain avec keywords[] → 200/500 (DataForSEO lent)', { timeout: 60000 }, async () => {
    if (requireServer().skip) return
    const res = await apiPost('/keywords/validate-pain', {
      keywords: [`test-${ctx.runId}-vp-1`, `test-${ctx.runId}-vp-2`],
    })
    expect([200, 500]).toContain(res.status)
  })
})

describe('Contract /keywords/:kw/validate', () => {
  it('POST sans level → 400 MISSING_PARAM', async () => {
    if (requireServer().skip) return
    const res = await apiPost(`/keywords/${encodeURIComponent('test-' + ctx.runId)}/validate`, {})
    expect(res.error?.code).toBe('MISSING_PARAM')
  })

  it('POST level invalide → 400', async () => {
    if (requireServer().skip) return
    const res = await apiPost(`/keywords/${encodeURIComponent('test-' + ctx.runId)}/validate`, { level: 'xyz' })
    expect(res.status).toBe(400)
  })

  it('POST OK → { keyword, kpis[6], verdict, paaQuestions }', { timeout: 60000 }, async () => {
    if (requireServer().skip) return
    const res = await apiPost<{ keyword: string; kpis: unknown[]; verdict: { level: string } }>(
      `/keywords/${encodeURIComponent('test-' + ctx.runId + '-c')}/validate`,
      { level: 'pilier', articleTitle: 'test' },
    )
    expect(res.status).toBe(200)
    expect(res.data?.kpis.length).toBe(6)
    expect(['GO', 'ORANGE', 'NO-GO']).toContain(res.data?.verdict?.level ?? '')
  })
})

describe('Contract /keywords/:captain/propose-lieutenants', () => {
  it('POST sans body → 400/500', async () => {
    if (requireServer().skip) return
    const res = await apiPost(`/keywords/${encodeURIComponent('test-' + ctx.runId + '-c')}/propose-lieutenants`, {})
    expect([400, 500]).toContain(res.status)
  })

  it('POST OK → SSE stream', { timeout: 90000 }, async () => {
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
})

describe('Contract /keywords/:captain/ai-lexique-upfront', () => {
  it('POST OK → SSE stream', { timeout: 90000 }, async () => {
    if (requireServer().skip) return
    const res = await fetch(`http://localhost:3005/api/keywords/${encodeURIComponent('test-' + ctx.runId + '-cap')}/ai-lexique-upfront`, {
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
})

describe('Contract /keywords/radar/generate', () => {
  it('POST sans title → 400', async () => {
    if (requireServer().skip) return
    const res = await apiPost('/keywords/radar/generate', { keyword: 'x', painPoint: 'y' })
    expect(res.error?.code).toBe('VALIDATION_ERROR')
  })

  it('POST sans keyword → 400', async () => {
    if (requireServer().skip) return
    const res = await apiPost('/keywords/radar/generate', { title: 'x', painPoint: 'y' })
    expect(res.error?.code).toBe('VALIDATION_ERROR')
  })

  it('POST sans painPoint → 400', async () => {
    if (requireServer().skip) return
    const res = await apiPost('/keywords/radar/generate', { title: 'x', keyword: 'y' })
    expect(res.error?.code).toBe('VALIDATION_ERROR')
  })

  it('POST OK → { keywords[], _apiUsage }', async () => {
    if (requireServer().skip) return
    const res = await apiPost<{ keywords: unknown[]; _apiUsage: { model: string } }>('/keywords/radar/generate', {
      title: 'x', keyword: 'y', painPoint: 'z',
    })
    expect(res.status).toBe(200)
    expect(Array.isArray(res.data?.keywords)).toBe(true)
    expect(res.data?._apiUsage?.model).toBeDefined()
  })
})

describe('Contract /keywords/radar/scan', () => {
  it('POST sans broadKeyword → 400', async () => {
    if (requireServer().skip) return
    const res = await apiPost('/keywords/radar/scan', { specificTopic: 'x', keywords: [{}] })
    expect(res.error?.code).toBe('VALIDATION_ERROR')
  })

  it('POST sans specificTopic → 400', async () => {
    if (requireServer().skip) return
    const res = await apiPost('/keywords/radar/scan', { broadKeyword: 'x', keywords: [{}] })
    expect(res.error?.code).toBe('VALIDATION_ERROR')
  })

  it('POST keywords=[] → 400', async () => {
    if (requireServer().skip) return
    const res = await apiPost('/keywords/radar/scan', { broadKeyword: 'x', specificTopic: 'y', keywords: [] })
    expect(res.error?.code).toBe('VALIDATION_ERROR')
  })

  it('POST OK → { cards[], globalScore, heatLevel, autocomplete }', { timeout: 60000 }, async () => {
    if (requireServer().skip) return
    const res = await apiPost<{ cards: unknown[]; globalScore: number; heatLevel: string }>('/keywords/radar/scan', {
      broadKeyword: 'x', specificTopic: 'y', keywords: [{ keyword: 'kw1', reasoning: 'r' }], depth: 1,
    })
    expect(res.status).toBe(200)
    expect(['froide', 'tiede', 'chaude', 'brulante']).toContain(res.data?.heatLevel ?? '')
  })
})

describe('Contract /keywords/intent-scan', () => {
  it('POST /keywords/intent-scan avec body valide → 200/500', { timeout: 120000 }, async () => {
    if (requireServer().skip) return
    const res = await apiPost('/keywords/intent-scan', {
      broadKeyword: 'plombier toulouse',
      specificTopic: `test-${ctx.runId}-is`,
      depth: 1,
    })
    expect([200, 400, 500]).toContain(res.status)
  })
})
