import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCocoonsStore } from '../../../src/stores/cocoons.store'
import type { Cocoon } from '../../../shared/types/index.js'

// Mock the API service
vi.mock('../../../src/services/api.service', () => ({
  apiGet: vi.fn(),
}))

import { apiGet } from '../../../src/services/api.service'
const mockApiGet = vi.mocked(apiGet)

const mockCocoons: Cocoon[] = [
  {
    id: 0,
    name: 'Cocoon A',
    siloName: 'Silo A',
    articles: [
      { title: 'Article 1', type: 'Pilier', slug: 'article-1', topic: null, status: 'à rédiger' },
      { title: 'Article 2', type: 'Intermédiaire', slug: 'article-2', topic: 'Theme', status: 'brouillon' },
    ],
    stats: {
      totalArticles: 2,
      byType: { pilier: 1, intermediaire: 1, specialise: 0 },
      byStatus: { aRediger: 1, brouillon: 1, publie: 0 },
      completionPercent: 50,
    },
  },
  {
    id: 1,
    name: 'Cocoon B',
    siloName: 'Silo A',
    articles: [
      { title: 'Article 3', type: 'Spécialisé', slug: 'article-3', topic: 'Theme', status: 'publié' },
    ],
    stats: {
      totalArticles: 1,
      byType: { pilier: 0, intermediaire: 0, specialise: 1 },
      byStatus: { aRediger: 0, brouillon: 0, publie: 1 },
      completionPercent: 100,
    },
  },
]

beforeEach(() => {
  setActivePinia(createPinia())
  mockApiGet.mockReset()
})

describe('cocoons.store — fetchCocoons', () => {
  it('loads cocoons from API and updates state', async () => {
    mockApiGet.mockResolvedValue(mockCocoons)
    const store = useCocoonsStore()

    await store.fetchCocoons()

    expect(store.cocoons).toEqual(mockCocoons)
    expect(store.isLoading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('sets isLoading true during fetch', async () => {
    let resolvePromise: (value: Cocoon[]) => void
    mockApiGet.mockReturnValue(new Promise((resolve) => { resolvePromise = resolve }))
    const store = useCocoonsStore()

    const promise = store.fetchCocoons()
    expect(store.isLoading).toBe(true)

    resolvePromise!(mockCocoons)
    await promise

    expect(store.isLoading).toBe(false)
  })

  it('sets error on API failure', async () => {
    mockApiGet.mockRejectedValue(new Error('Network error'))
    const store = useCocoonsStore()

    await store.fetchCocoons()

    expect(store.error).toBe('Network error')
    expect(store.cocoons).toEqual([])
    expect(store.isLoading).toBe(false)
  })

  it('clears previous error on retry', async () => {
    mockApiGet.mockRejectedValueOnce(new Error('fail'))
    const store = useCocoonsStore()
    await store.fetchCocoons()
    expect(store.error).toBe('fail')

    mockApiGet.mockResolvedValueOnce(mockCocoons)
    await store.fetchCocoons()
    expect(store.error).toBeNull()
    expect(store.cocoons).toEqual(mockCocoons)
  })
})

describe('cocoons.store — totalArticles', () => {
  it('returns sum of all articles across cocoons', async () => {
    mockApiGet.mockResolvedValue(mockCocoons)
    const store = useCocoonsStore()
    await store.fetchCocoons()

    expect(store.totalArticles).toBe(3)
  })

  it('returns 0 when no cocoons loaded', () => {
    const store = useCocoonsStore()
    expect(store.totalArticles).toBe(0)
  })
})

describe('cocoons.store — apiGet called correctly', () => {
  it('calls apiGet with /cocoons', async () => {
    mockApiGet.mockResolvedValue([])
    const store = useCocoonsStore()
    await store.fetchCocoons()
    expect(mockApiGet).toHaveBeenCalledWith('/cocoons')
  })
})
