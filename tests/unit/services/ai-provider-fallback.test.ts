/**
 * FR-INFRA-AI-FALLBACK-CONFIG — un fournisseur mal configuré laisse sa place.
 *
 * La chaîne de repli ne poursuivait que sur un quota atteint ou une surcharge.
 * Un fournisseur devenu inutilisable par configuration — modèle renommé ou
 * retiré, clé invalide — faisait tomber toute la chaîne, même quand un autre
 * fournisseur restait disponible.
 *
 * Rencontré le 2026-09-23 en conditions réelles : crédit Anthropic épuisé
 * (la bascule vers Gemini se fait bien), puis `gemini-2.0-flash` retiré par
 * Google avec une 404 « no longer available ». OpenRouter, pourtant configuré,
 * n'a jamais été essayé. Une rédaction de vingt minutes s'est interrompue à la
 * troisième section.
 */
import { describe, it, expect } from 'vitest'
import {
  AIProviderQuotaError,
  AIProviderOverloadedError,
  AIProviderUnavailableError,
} from '../../../server/services/external/ai-provider.service'

/** Reproduit la décision de `withFallbackChain` : poursuit-on avec le suivant ? */
function poursuitLaChaine(err: unknown): boolean {
  return err instanceof AIProviderQuotaError
    || err instanceof AIProviderOverloadedError
    || err instanceof AIProviderUnavailableError
}

describe('chaîne de repli — ce qui justifie d’essayer le fournisseur suivant', () => {
  it('poursuit sur un quota atteint', () => {
    expect(poursuitLaChaine(new AIProviderQuotaError('claude'))).toBe(true)
  })

  it('poursuit sur une surcharge', () => {
    expect(poursuitLaChaine(new AIProviderOverloadedError('gemini'))).toBe(true)
  })

  it('poursuit sur un fournisseur inutilisable par configuration', () => {
    expect(
      poursuitLaChaine(new AIProviderUnavailableError('gemini', 'Modèle introuvable')),
      'un modèle retiré ne doit pas condamner les fournisseurs suivants',
    ).toBe(true)
  })

  it('s’arrête sur une erreur qui vient de la demande', () => {
    expect(poursuitLaChaine(new Error('prompt trop long')), 'réessayer ailleurs ne servirait à rien').toBe(false)
  })

  it('nomme le fournisseur en cause, pour savoir quoi corriger', () => {
    const err = new AIProviderUnavailableError('gemini', 'Modèle gemini introuvable — vérifiez GEMINI_MODEL dans .env.')
    expect(err.provider).toBe('gemini')
    expect(err.message).toMatch(/GEMINI_MODEL/)
    expect(err.name).toBe('AIProviderUnavailableError')
  })
})
