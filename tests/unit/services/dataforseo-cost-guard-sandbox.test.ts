// @vitest-environment node
/**
 * Garde-fou de coût DataForSEO et bac à sable.
 *
 * Le garde-fou protège de l'argent réel : au-delà du budget de la fenêtre, il
 * refuse l'appel. En bac à sable, DataForSEO facture `cost: 0` — compter un
 * budget y bloque des tests et des explorations gratuites (constaté le
 * 2026-09-22 : la suite de parcours épuisait les 2 $ sans dépenser un centime).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const RESULT = { tasks: [{ status_code: 20000, result: [{ items: [] }] }], status_code: 20000 }

function mockFetchOk() {
  return vi.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => RESULT,
  })) as unknown as typeof fetch
}

describe('DataForSEO — budget et bac à sable', () => {
  beforeEach(() => {
    vi.resetModules()
    process.env.DATAFORSEO_LOGIN = 'test'
    process.env.DATAFORSEO_PASSWORD = 'test'
    process.env.DATAFORSEO_COST_BUDGET_USD = '0.02' // deux appels « overview » au plus
    process.env.DATAFORSEO_COST_WINDOW_MIN = '30'
  })

  afterEach(() => {
    delete process.env.DATAFORSEO_SANDBOX
    vi.unstubAllGlobals()
  })

  it('en production, le budget de la fenêtre finit par refuser l’appel', async () => {
    process.env.DATAFORSEO_SANDBOX = 'false'
    vi.stubGlobal('fetch', mockFetchOk())
    const { fetchDataForSeo } = await import('../../../server/services/external/dataforseo/_client.js')

    const appel = () => fetchDataForSeo('/dataforseo_labs/google/keyword_overview/live', [{ keywords: ['a'] }])
    await appel()
    await appel()
    await expect(appel(), 'le troisième appel dépasse le budget').rejects.toThrow(/cost budget exceeded/i)
  })

  it('en bac à sable, les appels sont gratuits : aucun budget n’est consommé', async () => {
    process.env.DATAFORSEO_SANDBOX = 'true'
    vi.stubGlobal('fetch', mockFetchOk())
    const { fetchDataForSeo, getBaseUrl } = await import('../../../server/services/external/dataforseo/_client.js')

    expect(getBaseUrl(), 'les appels partent bien vers le bac à sable').toContain('sandbox')

    const appel = () => fetchDataForSeo('/dataforseo_labs/google/keyword_overview/live', [{ keywords: ['a'] }])
    for (let i = 0; i < 10; i++) {
      await expect(appel(), `appel ${i + 1} en bac à sable`).resolves.toBeDefined()
    }
  })
})
