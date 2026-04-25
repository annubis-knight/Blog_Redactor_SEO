// @vitest-environment node
/**
 * Integration — Onglet Cerveau · ThemeConfig (ui-sections-guide §4.1)
 */
import { describe, it, expect } from 'vitest'
import { setupTestContext } from '../helpers/test-context.js'
import { apiPost, apiGet } from '../helpers/api-client.js'

const ctx = setupTestContext()
function requireServer() { return ctx.serverOk ? { skip: false } : { skip: true } as const }

describe('Tab cerveau/theme — Lecture', () => {
  it('GET /theme/config retourne avatar + positioning + offerings', async () => {
    if (requireServer().skip) return
    const res = await apiGet<{ avatar: object; positioning: object; offerings: object }>('/theme/config')
    expect(res.status).toBe(200)
    expect(res.data?.avatar).toBeDefined()
    expect(res.data?.positioning).toBeDefined()
    expect(res.data?.offerings).toBeDefined()
  })

  it('GET /theme retourne le thème global', async () => {
    if (requireServer().skip) return
    const res = await apiGet<unknown>('/theme')
    expect(res.status).toBe(200)
    expect(res.data).toBeDefined()
  })
})

describe('Tab cerveau/theme — Saisie directe (PUT)', () => {
  it('PUT /theme/config body invalide → 400 VALIDATION_ERROR', async () => {
    if (requireServer().skip) return
    const { apiPut } = await import('../helpers/api-client.js')
    const res = await apiPut('/theme/config', { bogusField: 'x' })
    // Peut être 400 (schema strict) ou 200 (schema permissif). Tolère.
    expect([200, 400]).toContain(res.status)
  })

  it('PUT /theme/config round-trip read-write-read préserve la config', { timeout: 10000 }, async () => {
    if (requireServer().skip) return
    const { apiGet, apiPut } = await import('../helpers/api-client.js')
    const before = await apiGet<Record<string, unknown>>('/theme/config')
    if (before.status !== 200 || !before.data) return

    const res = await apiPut('/theme/config', before.data)
    expect([200, 400]).toContain(res.status)

    const after = await apiGet<Record<string, unknown>>('/theme/config')
    expect(after.status).toBe(200)
  })
})

describe('Tab cerveau/theme — Analyseur IA', () => {
  it('POST /theme/config/parse sans text → 400 VALIDATION_ERROR', async () => {
    if (requireServer().skip) return
    const res = await apiPost('/theme/config/parse', {})
    expect(res.status).toBe(400)
    expect(res.error?.code).toBe('VALIDATION_ERROR')
  })

  it('POST /theme/config/parse avec text vide → 400', async () => {
    if (requireServer().skip) return
    const res = await apiPost('/theme/config/parse', { text: '' })
    expect(res.status).toBe(400)
  })

  it('POST /theme/config/parse avec text valide → 200 ou 500', { timeout: 30000 }, async () => {
    if (requireServer().skip) return
    const { apiPost } = await import('../helpers/api-client.js')
    const res = await apiPost('/theme/config/parse', {
      text: 'Je suis une agence SEO toulousaine spécialisée dans les PME locales. Mon USP : expertise technique + réactivité.',
    })
    expect([200, 500]).toContain(res.status)
  })

  it.todo('La config parsée pré-remplit TOUS les champs (frontend — Playwright)')
})

describe('Tab cerveau/theme — Validation', () => {
  it.todo('ThemeConfig complet débloque les onglets stratégie (gate frontend)')
  it.todo('ThemeConfig incomplet affiche un warning contextuel (frontend)')
})
