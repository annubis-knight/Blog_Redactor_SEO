// @vitest-environment node
/**
 * FR-INFRA-RUNTIME-MODE — consommateurs (getProvider / isSandbox).
 *
 * Vérifie que l'override runtime prend bien le pas sur les variables `.env`
 * pour les deux points de décision serveur :
 *   - `getProvider()` dans `ai-provider.service.ts`
 *   - `isSandbox()` dans `dataforseo/_client.ts`
 *
 * Ces deux fonctions sont appelées par tous les services externes — si
 * l'override n'est pas honoré, le toggle navbar n'a aucun effet.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setRuntimeMode, getEffectiveMode } from '../../../server/services/infra/runtime-mode.service'
import { getProvider } from '../../../server/services/external/ai-provider.service'
import { isSandbox } from '../../../server/services/external/dataforseo/_client'

describe('FR-INFRA-RUNTIME-MODE — consommateurs honorent l\'override', () => {
  beforeEach(() => {
    setRuntimeMode(null)
    vi.unstubAllEnvs()
    // Environnement neutre : chaque cas pose ce qu'il teste (le poste ou la CI
    // peuvent avoir AI_PROVIDER=mock ou DATAFORSEO_SANDBOX=true).
    vi.stubEnv('AI_PROVIDER', '')
    vi.stubEnv('DATAFORSEO_SANDBOX', '')
  })

  afterEach(() => {
    setRuntimeMode(null)
    vi.unstubAllEnvs()
  })

  describe('getProvider() — AI provider switch', () => {
    it('override "mock" → "mock" même si AI_PROVIDER=claude (AC1)', () => {
      vi.stubEnv('AI_PROVIDER', 'claude')
      setRuntimeMode('mock')
      expect(getProvider()).toBe('mock')
    })

    it('override "real" → "claude" même si AI_PROVIDER=mock (AC2)', () => {
      vi.stubEnv('AI_PROVIDER', 'mock')
      setRuntimeMode('real')
      expect(getProvider()).toBe('claude')
    })

    it('override "real" → "claude" même si AI_PROVIDER=gemini', () => {
      vi.stubEnv('AI_PROVIDER', 'gemini')
      setRuntimeMode('real')
      expect(getProvider()).toBe('claude')
    })

    it('override null → fallback sur .env (AC3)', () => {
      vi.stubEnv('AI_PROVIDER', 'gemini')
      setRuntimeMode(null)
      expect(getProvider()).toBe('gemini')
    })

    it('override null + AI_PROVIDER=openrouter → "openrouter"', () => {
      vi.stubEnv('AI_PROVIDER', 'openrouter')
      setRuntimeMode(null)
      expect(getProvider()).toBe('openrouter')
    })

    it('override null + AI_PROVIDER absent → "claude" (défaut historique)', () => {
      vi.stubEnv('AI_PROVIDER', '')
      setRuntimeMode(null)
      expect(getProvider()).toBe('claude')
    })
  })

  describe('isSandbox() — DataForSEO switch', () => {
    it('override "mock" → true même si DATAFORSEO_SANDBOX=false (AC1)', () => {
      vi.stubEnv('DATAFORSEO_SANDBOX', 'false')
      setRuntimeMode('mock')
      expect(isSandbox()).toBe(true)
    })

    it('override "real" → false même si DATAFORSEO_SANDBOX=true (AC2)', () => {
      vi.stubEnv('DATAFORSEO_SANDBOX', 'true')
      setRuntimeMode('real')
      expect(isSandbox()).toBe(false)
    })

    it('override null + DATAFORSEO_SANDBOX=true → true (AC3)', () => {
      vi.stubEnv('DATAFORSEO_SANDBOX', 'true')
      setRuntimeMode(null)
      expect(isSandbox()).toBe(true)
    })

    it('override null + DATAFORSEO_SANDBOX absent + IA réelle → false (défaut prod)', () => {
      vi.stubEnv('AI_PROVIDER', 'claude')
      vi.stubEnv('DATAFORSEO_SANDBOX', '')
      setRuntimeMode(null)
      expect(isSandbox()).toBe(false)
    })

    it('F1 (recette 2026-09-30) : override null + AI_PROVIDER=mock + DATAFORSEO_SANDBOX absent → bac à sable', () => {
      // Le poste d'Arnaud : le badge disait MOCK pendant que DataForSEO partait en production payante.
      vi.stubEnv('AI_PROVIDER', 'mock')
      vi.stubEnv('DATAFORSEO_SANDBOX', '')
      setRuntimeMode(null)
      expect(isSandbox()).toBe(true)
    })

    it('le bac à sable n’est jamais déduit de NODE_ENV', () => {
      vi.stubEnv('AI_PROVIDER', 'claude')
      vi.stubEnv('DATAFORSEO_SANDBOX', '')
      vi.stubEnv('NODE_ENV', 'development')
      setRuntimeMode(null)
      expect(isSandbox()).toBe(false)
    })
  })

  describe('F1 — une seule autorité : le mode effectif (FR-INFRA-RUNTIME-MODE, NFR-COST-AI-MOCK)', () => {
    it('override null + DATAFORSEO_SANDBOX=true + AI_PROVIDER=claude → IA simulée aussi', () => {
      vi.stubEnv('AI_PROVIDER', 'claude')
      vi.stubEnv('DATAFORSEO_SANDBOX', 'true')
      setRuntimeMode(null)
      expect(getProvider()).toBe('mock')
    })

    const providers = ['mock', 'claude', 'gemini', 'openrouter', '']
    const sandboxes = ['true', 'false', '']
    const overrides: Array<'mock' | 'real' | null> = [null, 'mock', 'real']
    for (const provider of providers) {
      for (const sandbox of sandboxes) {
        for (const override of overrides) {
          it(`AI_PROVIDER=${provider || '∅'}, DATAFORSEO_SANDBOX=${sandbox || '∅'}, override=${override ?? 'null'} : badge MOCK ⇔ rien de facturé`, () => {
            vi.stubEnv('AI_PROVIDER', provider)
            vi.stubEnv('DATAFORSEO_SANDBOX', sandbox)
            setRuntimeMode(override)
            const badgeSaysMock = getEffectiveMode() === 'mock'
            expect(isSandbox(), 'DataForSEO suit le badge').toBe(badgeSaysMock)
            expect(getProvider() === 'mock', 'l’IA suit le badge').toBe(badgeSaysMock)
          })
        }
      }
    }
  })

  describe('cohérence cross-API (AC1+AC2)', () => {
    it('override "mock" bascule simultanément AI et DataForSEO (un seul switch)', () => {
      vi.stubEnv('AI_PROVIDER', 'claude')
      vi.stubEnv('DATAFORSEO_SANDBOX', 'false')
      setRuntimeMode('mock')
      expect(getProvider()).toBe('mock')
      expect(isSandbox()).toBe(true)
    })

    it('override "real" bascule simultanément AI et DataForSEO', () => {
      vi.stubEnv('AI_PROVIDER', 'mock')
      vi.stubEnv('DATAFORSEO_SANDBOX', 'true')
      setRuntimeMode('real')
      expect(getProvider()).toBe('claude')
      expect(isSandbox()).toBe(false)
    })
  })
})
