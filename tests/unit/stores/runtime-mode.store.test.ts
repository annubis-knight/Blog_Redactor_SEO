/**
 * FR-INFRA-RUNTIME-MODE — store Pinia.
 *
 * Couvre :
 *   - lecture initiale depuis localStorage (pré-hydratation optimiste)
 *   - hydrate() depuis le serveur, dont le cas restart serveur (AC7)
 *   - setMode() : POST + maj localStorage + rollback en cas d'échec (AC6)
 *   - toggle() : inversion mock ↔ real
 */
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

const mockApiGet = vi.fn()
const mockApiPost = vi.fn()

vi.mock('@/services/api.service', () => ({
  apiGet: (...args: unknown[]) => mockApiGet(...args),
  apiPost: (...args: unknown[]) => mockApiPost(...args),
}))

vi.mock('@/utils/logger', () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { useRuntimeModeStore } from '@/stores/ui/runtime-mode.store'

const STORAGE_KEY = 'runtime-mode'

describe('FR-INFRA-RUNTIME-MODE — store Pinia', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    mockApiGet.mockReset()
    mockApiPost.mockReset()
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe('initialisation', () => {
    it('override null + effective "real" quand localStorage est vide', () => {
      const s = useRuntimeModeStore()
      expect(s.override).toBeNull()
      expect(s.effective).toBe('real')
      expect(s.isHydrated).toBe(false)
    })

    it('lit localStorage="mock" en pré-hydratation', () => {
      localStorage.setItem(STORAGE_KEY, 'mock')
      const s = useRuntimeModeStore()
      expect(s.override).toBe('mock')
      expect(s.effective).toBe('mock')
    })

    it('ignore une valeur localStorage corrompue', () => {
      localStorage.setItem(STORAGE_KEY, 'banana')
      const s = useRuntimeModeStore()
      expect(s.override).toBeNull()
      expect(s.effective).toBe('real')
    })
  })

  describe('hydrate() — synchronisation avec le serveur', () => {
    it('hydrate depuis le serveur quand localStorage est vide', async () => {
      mockApiGet.mockResolvedValueOnce({
        override: 'mock',
        effective: 'mock',
        envAiProvider: 'mock',
        envDataforseoSandbox: true,
      })
      const s = useRuntimeModeStore()
      await s.hydrate()
      expect(s.override).toBe('mock')
      expect(s.effective).toBe('mock')
      expect(s.isHydrated).toBe(true)
      expect(mockApiGet).toHaveBeenCalledWith('/runtime-mode')
      expect(mockApiPost).not.toHaveBeenCalled()
    })

    it('AC7 : restart serveur — front a override "real" en localStorage, serveur retourne null → repousse "real"', async () => {
      localStorage.setItem(STORAGE_KEY, 'real')
      mockApiGet.mockResolvedValueOnce({
        override: null,
        effective: 'real',
        envAiProvider: 'claude',
        envDataforseoSandbox: false,
      })
      mockApiPost.mockResolvedValueOnce({
        override: 'real',
        effective: 'real',
      })
      const s = useRuntimeModeStore()
      await s.hydrate()
      expect(mockApiPost).toHaveBeenCalledWith('/runtime-mode', { mode: 'real' })
      expect(s.override).toBe('real')
      expect(s.effective).toBe('real')
    })

    it('ne repousse rien si le serveur a déjà la même valeur', async () => {
      localStorage.setItem(STORAGE_KEY, 'mock')
      mockApiGet.mockResolvedValueOnce({
        override: 'mock',
        effective: 'mock',
        envAiProvider: 'claude',
        envDataforseoSandbox: false,
      })
      const s = useRuntimeModeStore()
      await s.hydrate()
      expect(mockApiPost).not.toHaveBeenCalled()
      expect(s.override).toBe('mock')
    })

    it('marque isHydrated même si le GET échoue (résilience)', async () => {
      mockApiGet.mockRejectedValueOnce(new Error('network'))
      const s = useRuntimeModeStore()
      await s.hydrate()
      expect(s.isHydrated).toBe(true)
    })
  })

  describe('setMode() — bascule explicite', () => {
    it('POST + met à jour localStorage + state', async () => {
      mockApiPost.mockResolvedValueOnce({
        override: 'mock',
        effective: 'mock',
      })
      const s = useRuntimeModeStore()
      await s.setMode('mock')
      expect(mockApiPost).toHaveBeenCalledWith('/runtime-mode', { mode: 'mock' })
      expect(s.override).toBe('mock')
      expect(s.effective).toBe('mock')
      expect(localStorage.getItem(STORAGE_KEY)).toBe('mock')
    })

    it('setMode(null) supprime l\'entrée localStorage', async () => {
      localStorage.setItem(STORAGE_KEY, 'mock')
      mockApiPost.mockResolvedValueOnce({
        override: null,
        effective: 'real',
      })
      const s = useRuntimeModeStore()
      await s.setMode(null)
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
      expect(s.override).toBeNull()
    })

    it('AC6 : rollback optimiste en cas d\'échec serveur', async () => {
      localStorage.setItem(STORAGE_KEY, 'real')
      const s = useRuntimeModeStore()
      // état initial : override='real'
      expect(s.override).toBe('real')

      mockApiPost.mockRejectedValueOnce(new Error('500'))
      await expect(s.setMode('mock')).rejects.toThrow('500')

      // l'état doit avoir été restauré
      expect(s.override).toBe('real')
      expect(s.effective).toBe('real')
      expect(localStorage.getItem(STORAGE_KEY)).toBe('real')
    })
  })

  describe('toggle() — inversion (AC8)', () => {
    it('toggle depuis "real" → "mock"', async () => {
      mockApiPost.mockResolvedValueOnce({
        override: 'mock',
        effective: 'mock',
      })
      const s = useRuntimeModeStore()
      // state initial : effective='real' (localStorage vide)
      expect(s.effective).toBe('real')
      await s.toggle()
      expect(mockApiPost).toHaveBeenCalledWith('/runtime-mode', { mode: 'mock' })
      expect(s.effective).toBe('mock')
    })

    it('toggle depuis "mock" → "real"', async () => {
      localStorage.setItem(STORAGE_KEY, 'mock')
      mockApiPost.mockResolvedValueOnce({
        override: 'real',
        effective: 'real',
      })
      const s = useRuntimeModeStore()
      expect(s.effective).toBe('mock')
      await s.toggle()
      expect(mockApiPost).toHaveBeenCalledWith('/runtime-mode', { mode: 'real' })
      expect(s.effective).toBe('real')
    })
  })
})
