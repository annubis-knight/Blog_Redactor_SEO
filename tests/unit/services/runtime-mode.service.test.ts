/**
 * FR-INFRA-RUNTIME-MODE — service backend.
 *
 * Couvre AC1-AC4 : override prend le pas sur `.env` pour `getProvider()` /
 * `isSandbox()` ; getEffectiveMode() dérive correctement du `.env` quand
 * aucun override n'est posé.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  getRuntimeMode,
  setRuntimeMode,
  getEffectiveMode,
} from '../../../server/services/infra/runtime-mode.service'

describe('FR-INFRA-RUNTIME-MODE — service', () => {
  beforeEach(() => {
    setRuntimeMode(null)
    vi.unstubAllEnvs()
  })

  afterEach(() => {
    setRuntimeMode(null)
    vi.unstubAllEnvs()
  })

  describe('get / set', () => {
    it('null par défaut (aucun override posé)', () => {
      expect(getRuntimeMode()).toBeNull()
    })

    it('setRuntimeMode persiste la valeur en mémoire', () => {
      setRuntimeMode('mock')
      expect(getRuntimeMode()).toBe('mock')
      setRuntimeMode('real')
      expect(getRuntimeMode()).toBe('real')
      setRuntimeMode(null)
      expect(getRuntimeMode()).toBeNull()
    })
  })

  describe('getEffectiveMode — sans override (AC4)', () => {
    it('AI_PROVIDER=mock + DATAFORSEO_SANDBOX absent → "mock"', () => {
      vi.stubEnv('AI_PROVIDER', 'mock')
      vi.stubEnv('DATAFORSEO_SANDBOX', '')
      expect(getEffectiveMode()).toBe('mock')
    })

    it('AI_PROVIDER absent + DATAFORSEO_SANDBOX=true → "mock"', () => {
      vi.stubEnv('AI_PROVIDER', '')
      vi.stubEnv('DATAFORSEO_SANDBOX', 'true')
      expect(getEffectiveMode()).toBe('mock')
    })

    it('AI_PROVIDER=claude + DATAFORSEO_SANDBOX=false → "real"', () => {
      vi.stubEnv('AI_PROVIDER', 'claude')
      vi.stubEnv('DATAFORSEO_SANDBOX', 'false')
      expect(getEffectiveMode()).toBe('real')
    })

    it('AI_PROVIDER=gemini + DATAFORSEO_SANDBOX absent → "real" (gemini = provider réel)', () => {
      vi.stubEnv('AI_PROVIDER', 'gemini')
      vi.stubEnv('DATAFORSEO_SANDBOX', '')
      expect(getEffectiveMode()).toBe('real')
    })
  })

  describe('getEffectiveMode — avec override', () => {
    it('override "mock" force "mock" même si .env dit "real" (AC1)', () => {
      vi.stubEnv('AI_PROVIDER', 'claude')
      vi.stubEnv('DATAFORSEO_SANDBOX', 'false')
      setRuntimeMode('mock')
      expect(getEffectiveMode()).toBe('mock')
    })

    it('override "real" force "real" même si .env dit "mock" (AC2)', () => {
      vi.stubEnv('AI_PROVIDER', 'mock')
      vi.stubEnv('DATAFORSEO_SANDBOX', 'true')
      setRuntimeMode('real')
      expect(getEffectiveMode()).toBe('real')
    })

    it('override null fait retomber sur la lecture .env (AC3)', () => {
      vi.stubEnv('AI_PROVIDER', 'gemini')
      vi.stubEnv('DATAFORSEO_SANDBOX', '')
      setRuntimeMode('mock')
      expect(getEffectiveMode()).toBe('mock')
      setRuntimeMode(null)
      expect(getEffectiveMode()).toBe('real')
    })
  })
})
