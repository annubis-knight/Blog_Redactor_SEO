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

    it('F1 : sans override, le badge affiche le mode EFFECTIF du serveur (celui qui décide de la facturation)', async () => {
      mockApiGet.mockResolvedValueOnce({
        override: null,
        effective: 'mock',
        envAiProvider: 'mock',
        envDataforseoSandbox: false,
      })
      const s = useRuntimeModeStore()
      await s.hydrate()
      expect(s.effective).toBe('mock')
      expect(mockApiPost).not.toHaveBeenCalled()
    })

    it('un choix posé ailleurs (mode automatique) est adopté, jamais renversé', async () => {
      // Le navigateur se souvenait de « real » ; le mode automatique a passé le
      // serveur en « mock ». Repousser « real » ferait payer le run simulé.
      localStorage.setItem(STORAGE_KEY, 'real')
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
      expect(s.effective).toBe('mock')
      expect(localStorage.getItem(STORAGE_KEY)).toBe('mock')
    })

    it('deux resynchronisations simultanées ne font qu’une requête', async () => {
      mockApiGet.mockResolvedValue({ override: null, effective: 'real', envAiProvider: 'claude', envDataforseoSandbox: false })
      const s = useRuntimeModeStore()
      await Promise.all([s.hydrate(), s.hydrate()])
      expect(mockApiGet).toHaveBeenCalledTimes(1)
    })
  })

  describe('startAutoResync() — le badge suit le serveur sans rechargement (FR-INFRA-RUNTIME-MODE)', () => {
    afterEach(() => {
      vi.useRealTimers()
    })

    it('redémarrage du serveur en cours de session : le badge se resynchronise seul, à intervalle', async () => {
      vi.useFakeTimers()
      localStorage.setItem(STORAGE_KEY, 'mock')
      const s = useRuntimeModeStore()
      // 1er passage : le serveur a toujours le choix « mock ».
      mockApiGet.mockResolvedValue({ override: 'mock', effective: 'mock', envAiProvider: 'claude', envDataforseoSandbox: false })
      await s.hydrate()
      const stop = s.startAutoResync(1000)

      // Le serveur redémarre et perd l'override : sa config le met en réel.
      mockApiGet.mockResolvedValue({ override: null, effective: 'real', envAiProvider: 'claude', envDataforseoSandbox: false })
      mockApiPost.mockResolvedValueOnce({ override: 'mock', effective: 'mock' })
      await vi.advanceTimersByTimeAsync(1000)

      expect(mockApiPost, 'le choix de l’utilisateur est rendu au serveur').toHaveBeenCalledWith('/runtime-mode', { mode: 'mock' })
      expect(s.effective).toBe('mock')
      stop()
    })

    it('au retour du focus, le badge relit le serveur', async () => {
      const s = useRuntimeModeStore()
      mockApiGet.mockResolvedValue({ override: null, effective: 'mock', envAiProvider: 'mock', envDataforseoSandbox: false })
      const stop = s.startAutoResync(60_000)
      window.dispatchEvent(new Event('focus'))
      await vi.waitFor(() => expect(s.effective).toBe('mock'))
      expect(mockApiGet).toHaveBeenCalledTimes(1)
      stop()
    })

    it('arrêté, il ne relit plus rien', async () => {
      vi.useFakeTimers()
      const s = useRuntimeModeStore()
      mockApiGet.mockResolvedValue({ override: null, effective: 'real', envAiProvider: 'claude', envDataforseoSandbox: false })
      const stop = s.startAutoResync(1000)
      stop()
      window.dispatchEvent(new Event('focus'))
      await vi.advanceTimersByTimeAsync(5000)
      expect(mockApiGet).not.toHaveBeenCalled()
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

  // FR-CAP-AI-PANEL — la confirmation d'une régénération nomme le fournisseur
  // d'IA effectif, ou dit qu'aucun appel payant ne part : le store le garde.
  describe('FR-CAP-AI-PANEL — fournisseur d’IA effectif', () => {
    it('inconnu avant toute lecture du serveur', () => {
      expect(useRuntimeModeStore().aiProvider).toBeNull()
    })

    it('hydrate() le relit sur le serveur', async () => {
      mockApiGet.mockResolvedValueOnce({ override: null, effective: 'real', aiProvider: 'gemini' })
      const s = useRuntimeModeStore()
      await s.hydrate()
      expect(s.aiProvider).toBe('gemini')
    })

    it('une bascule le reprend de la réponse : passer en réel ne garde pas « mock »', async () => {
      mockApiGet.mockResolvedValueOnce({ override: 'mock', effective: 'mock', aiProvider: 'mock' })
      mockApiPost.mockResolvedValueOnce({ override: 'real', effective: 'real', aiProvider: 'claude' })
      const s = useRuntimeModeStore()
      await s.hydrate()
      await s.setMode('real')
      expect(s.aiProvider).toBe('claude')
    })

    it('une bascule en échec rend le fournisseur d’avant', async () => {
      mockApiGet.mockResolvedValueOnce({ override: null, effective: 'real', aiProvider: 'gemini' })
      mockApiPost.mockRejectedValueOnce(new Error('500'))
      const s = useRuntimeModeStore()
      await s.hydrate()
      await expect(s.setMode('mock')).rejects.toThrow('500')
      expect(s.aiProvider).toBe('gemini')
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
