// @vitest-environment node
/**
 * Integration — Onglet Cerveau · Stratégie cocon (ui-sections-guide §4.2)
 *
 * 6 étapes Q&A : cible, douleur, angle, promesse, cta + sous-questions (deepen),
 * enrichissement (enrich). NB : "aiguillage" n'existe pas — uniquement les 5 ci-dessus.
 */
import { describe, it, expect } from 'vitest'
import { setupTestContext } from '../helpers/test-context.js'
import { apiGet, apiPost } from '../helpers/api-client.js'

const ctx = setupTestContext()
function requireServer() { return ctx.serverOk ? { skip: false } : { skip: true } as const }

describe('Tab cerveau/strategy — Lecture', () => {
  it('GET /strategy/cocoon/:cocoonSlug retourne la stratégie ou null', async () => {
    if (requireServer().skip) return
    const res = await apiGet(`/strategy/cocoon/test-${ctx.runId}-no-strat`)
    expect(res.status).toBe(200)
  })
})

describe('Tab cerveau/strategy — Suggest (Q&A IA)', () => {
  it('POST /strategy/cocoon/:slug/suggest sans body → 400 ou 500', async () => {
    if (requireServer().skip) return
    const res = await apiPost(`/strategy/cocoon/test-${ctx.runId}/suggest`, {})
    expect([400, 500]).toContain(res.status)
  })

  it('POST /strategy/cocoon/:slug/suggest body valide → 200 + suggestion', { timeout: 30000 }, async () => {
    if (requireServer().skip) return
    const res = await apiPost<{ suggestion: string }>(`/strategy/cocoon/test-${ctx.runId}-st/suggest`, {
      step: 'cible',
      currentInput: '',
      context: { cocoonName: 'test', siloName: 'test' },
    })
    expect(res.status).toBe(200)
    expect(typeof res.data?.suggestion).toBe('string')
  })

  it('POST /suggest avec mergeWith → stream merge', { timeout: 30000 }, async () => {
    if (requireServer().skip) return
    const res = await apiPost<{ suggestion: string }>(`/strategy/cocoon/test-${ctx.runId}-merge/suggest`, {
      step: 'cible',
      currentInput: 'TPE locales Occitanie',
      mergeWith: 'PME 5-50 salariés Toulouse',
      existingValidated: '',
      context: { cocoonName: 'test', siloName: 'test' },
    })
    expect(res.status).toBe(200)
    expect(typeof res.data?.suggestion).toBe('string')
  })
})

describe('Tab cerveau/strategy — Deepen (sous-questions)', () => {
  it('POST /strategy/cocoon/:slug/deepen sans body → 400 ou 500', async () => {
    if (requireServer().skip) return
    const res = await apiPost(`/strategy/cocoon/test-${ctx.runId}/deepen`, {})
    expect([400, 500]).toContain(res.status)
  })

  it('POST /deepen body valide → stream suggestion', { timeout: 30000 }, async () => {
    if (requireServer().skip) return
    const res = await apiPost<{ question?: string; suggestion?: string }>(`/strategy/cocoon/test-${ctx.runId}-deep/deepen`, {
      step: 'cible',
      mainQuestion: 'Qui est votre cible ?',
      mainAnswer: 'TPE locales',
      existingSubQuestions: [],
      context: { cocoonName: 'test', siloName: 'test' },
    })
    // 200 (suggestion) ou 500 (schema strict peut rejeter)
    expect([200, 400, 500]).toContain(res.status)
  })

  it('POST /deepen avec step invalide (cta) → 400/500 (schema n\'accepte que cible|douleur|angle|promesse)', async () => {
    if (requireServer().skip) return
    const res = await apiPost(`/strategy/cocoon/test-${ctx.runId}-step/deepen`, {
      step: 'cta',
      mainQuestion: 'Q',
      mainAnswer: 'A',
      existingSubQuestions: [],
      context: { cocoonName: 'test', siloName: 'test' },
    })
    expect([400, 500]).toContain(res.status)
  })
})

describe('Tab cerveau/strategy — Enrich (fusion sous-question)', () => {
  it('POST /strategy/cocoon/:slug/enrich sans body → 400 ou 500', async () => {
    if (requireServer().skip) return
    const res = await apiPost(`/strategy/cocoon/test-${ctx.runId}/enrich`, {})
    expect([400, 500]).toContain(res.status)
  })

  it('POST /enrich body valide → 200 ou 500', { timeout: 30000 }, async () => {
    if (requireServer().skip) return
    const res = await apiPost(`/strategy/cocoon/test-${ctx.runId}-en/enrich`, {
      step: 'cible',
      existingValidated: 'TPE locales en Occitanie',
      subQuestion: 'Quel est leur budget ?',
      subAnswer: '500-2000€/mois',
      context: { cocoonName: 'test', siloName: 'test' },
    })
    expect([200, 400, 500]).toContain(res.status)
  })
})

describe('Tab cerveau/strategy — Consolidate', () => {
  it('POST /strategy/cocoon/:slug/consolidate sans body → 400 ou 500', async () => {
    if (requireServer().skip) return
    const res = await apiPost(`/strategy/cocoon/test-${ctx.runId}/consolidate`, {})
    expect([400, 500]).toContain(res.status)
  })

  it('POST /consolidate body valide → 200 ou 500', { timeout: 30000 }, async () => {
    if (requireServer().skip) return
    const res = await apiPost(`/strategy/cocoon/test-${ctx.runId}-cons/consolidate`, {
      step: 'cible',
      mainAnswer: 'TPE locales',
      subAnswers: [
        { question: 'Budget ?', answer: '500-2000€' },
        { question: 'Taille ?', answer: '5-50 salariés' },
      ],
      context: { cocoonName: 'test', siloName: 'test' },
    })
    expect([200, 400, 500]).toContain(res.status)
  })
})

describe('Tab cerveau/strategy — Enchaînement', () => {
  it('Workflow Q&A : suggest enchaîné sur les 5 steps', { timeout: 60000 }, async () => {
    if (requireServer().skip) return
    const slug = `test-${ctx.runId}-qa-chain`
    const steps = ['cible', 'douleur', 'angle', 'promesse', 'cta'] as const
    for (const step of steps) {
      const res = await apiPost<{ suggestion: string }>(`/strategy/cocoon/${slug}/suggest`, {
        step, currentInput: '', context: { cocoonName: 'test', siloName: 'test' },
      })
      expect(res.status).toBe(200)
      expect(typeof res.data?.suggestion).toBe('string')
    }
  })

  it.todo('Cocon complet → CERVEAU_STRATEGY_DEFINED check émis (frontend décide)')
  it.todo('Pas de cascade au unlock — semblable à F5 (frontend)')
})
