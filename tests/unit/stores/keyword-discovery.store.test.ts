import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useKeywordDiscoveryStore } from '../../../src/stores/keyword/keyword-discovery.store'
import * as apiService from '../../../src/services/api.service'
import type { KeywordDiscoveryResult, DomainDiscoveryResult } from '../../../shared/types/index.js'

const emptyResult: KeywordDiscoveryResult = {
  keywords: [],
  apiCost: 0,
  totalBeforeDedup: 0,
  totalAfterDedup: 0,
}

const emptyDomain: DomainDiscoveryResult = {
  keywords: [],
  apiCost: 0,
  total: 0,
}

describe('useKeywordDiscoveryStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
  })

  describe('FR-INFRA-API-WRAPPER — utilise apiPost, pas fetch direct', () => {
    it('discoverFromSeed appelle apiPost("/keywords/discover", ...)', async () => {
      const spy = vi.spyOn(apiService, 'apiPost').mockResolvedValue(emptyResult)
      const store = useKeywordDiscoveryStore()
      await store.discoverFromSeed('seo local', 50)
      expect(spy).toHaveBeenCalledWith(
        '/keywords/discover',
        { keyword: 'seo local', options: { maxResults: 50 } },
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      )
    })

    it('discoverFromSeed sans maxResults envoie options=undefined', async () => {
      const spy = vi.spyOn(apiService, 'apiPost').mockResolvedValue(emptyResult)
      const store = useKeywordDiscoveryStore()
      await store.discoverFromSeed('seo local')
      expect(spy).toHaveBeenCalledWith(
        '/keywords/discover',
        { keyword: 'seo local', options: undefined },
        expect.any(Object),
      )
    })

    it('discoverFromDomain appelle apiPost("/keywords/discover-from-site", ...)', async () => {
      const spy = vi.spyOn(apiService, 'apiPost').mockResolvedValue(emptyDomain)
      const store = useKeywordDiscoveryStore()
      await store.discoverFromDomain('example.com', 100)
      expect(spy).toHaveBeenCalledWith(
        '/keywords/discover-from-site',
        { domain: 'example.com', options: { maxResults: 100 } },
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      )
    })

    it('propage les erreurs du wrapper dans store.error', async () => {
      vi.spyOn(apiService, 'apiPost').mockRejectedValue(new Error('Trop de requêtes'))
      const store = useKeywordDiscoveryStore()
      await store.discoverFromSeed('test')
      expect(store.error).toBe('Trop de requêtes')
      expect(store.results).toEqual([])
    })

    it('AbortError ne pollue pas store.error (annulation utilisateur)', async () => {
      const abortErr = new Error('Aborted')
      abortErr.name = 'AbortError'
      vi.spyOn(apiService, 'apiPost').mockRejectedValue(abortErr)
      const store = useKeywordDiscoveryStore()
      await store.discoverFromSeed('test')
      expect(store.error).toBeNull()
    })
  })
})
