/**
 * FR-CAP-AI-PANEL — la confirmation d'une régénération dit ce qui va vraiment
 * se passer : le fournisseur d'IA du moment en réel, aucun appel payant en
 * mode simulé (recette du 2026-09-30 : « Cela consommera un appel Claude »
 * s'affichait en MOCK comme avec Gemini).
 */
import { describe, it, expect } from 'vitest'
import { paidAiCallNotice } from '../../../shared/ai-call-notice'

describe('FR-CAP-AI-PANEL — paidAiCallNotice', () => {
  it('en mode simulé : aucun appel payant, jamais « Claude »', () => {
    for (const provider of ['mock', 'claude', 'gemini', null] as const) {
      const notice = paidAiCallNotice('mock', provider)
      expect(notice).toBe('Mode simulé : la réponse sera simulée, sans appel payant.')
      expect(notice).not.toContain('Claude')
    }
  })

  it('en réel : nomme le fournisseur d’IA du moment', () => {
    expect(paidAiCallNotice('real', 'claude')).toBe('Cela consommera un appel Claude.')
    expect(paidAiCallNotice('real', 'gemini')).toBe('Cela consommera un appel Gemini.')
    expect(paidAiCallNotice('real', 'openrouter')).toBe('Cela consommera un appel OpenRouter.')
  })

  it('en réel avec l’IA simulée : aucun appel payant', () => {
    expect(paidAiCallNotice('real', 'mock')).toBe('Mode simulé : la réponse sera simulée, sans appel payant.')
  })

  it('fournisseur inconnu : un appel à l’IA, sans nom inventé', () => {
    expect(paidAiCallNotice('real', null)).toBe("Cela consommera un appel à l'IA.")
    expect(paidAiCallNotice('real', undefined)).toBe("Cela consommera un appel à l'IA.")
    expect(paidAiCallNotice('real', 'autre')).toBe("Cela consommera un appel à l'IA.")
  })
})
