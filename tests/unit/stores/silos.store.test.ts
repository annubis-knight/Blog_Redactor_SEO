import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSilosStore } from '../../../src/stores/silos.store'
import type { Theme, Silo } from '../../../shared/types/index.js'

// Mock the API service
vi.mock('../../../src/services/api.service', () => ({
  apiGet: vi.fn(),
}))

import { apiGet } from '../../../src/services/api.service'
const mockApiGet = vi.mocked(apiGet)

const mockTheme: Theme = {
  nom: 'Design Web & UX',
  description: 'Tout sur le design web et l\'expérience utilisateur',
}

const mockSilos: Silo[] = [
  {
    id: 1,
    nom: 'Silo UX',
    description: 'Tout sur l\'UX',
    cocons: [
      {
        id: 0,
        name: 'Cocoon A',
        siloName: 'Silo UX',
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
        siloName: 'Silo UX',
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
    ],
    stats: {
      totalArticles: 3,
      byType: { pilier: 1, intermediaire: 1, specialise: 1 },
      byStatus: { aRediger: 1, brouillon: 1, publie: 1 },
      completionPercent: 67,
    },
  },
  {
    id: 2,
    nom: 'Silo SEO',
    description: 'Tout sur le SEO',
    cocons: [
      {
        id: 2,
        name: 'Cocoon C',
        siloName: 'Silo SEO',
        articles: [
          { title: 'Article 4', type: 'Pilier', slug: 'article-4', topic: null, status: 'publié' },
          { title: 'Article 5', type: 'Spécialisé', slug: 'article-5', topic: 'SEO', status: 'publié' },
        ],
        stats: {
          totalArticles: 2,
          byType: { pilier: 1, intermediaire: 0, specialise: 1 },
          byStatus: { aRediger: 0, brouillon: 0, publie: 2 },
          completionPercent: 100,
        },
      },
    ],
    stats: {
      totalArticles: 2,
      byType: { pilier: 1, intermediaire: 0, specialise: 1 },
      byStatus: { aRediger: 0, brouillon: 0, publie: 2 },
      completionPercent: 100,
    },
  },
]

beforeEach(() => {
  setActivePinia(createPinia())
  mockApiGet.mockReset()
})

describe('silos.store — initial state', () => {
  it('has correct default values', () => {
    const store = useSilosStore()

    expect(store.theme).toBeNull()
    expect(store.silos).toEqual([])
    expect(store.isLoading).toBe(false)
    expect(store.error).toBeNull()
  })
})

describe('silos.store — fetchSilos', () => {
  it('loads theme and silos from API and updates state', async () => {
    mockApiGet.mockImplementation((path: string) => {
      if (path === '/theme') return Promise.resolve(mockTheme)
      if (path === '/silos') return Promise.resolve(mockSilos)
      return Promise.reject(new Error('Unknown path'))
    })
    const store = useSilosStore()

    await store.fetchSilos()

    expect(store.theme).toEqual(mockTheme)
    expect(store.silos).toEqual(mockSilos)
    expect(store.isLoading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('sets isLoading true during fetch', async () => {
    let resolveTheme: (value: Theme) => void
    let resolveSilos: (value: Silo[]) => void
    mockApiGet.mockImplementation((path: string) => {
      if (path === '/theme') return new Promise((resolve) => { resolveTheme = resolve as (value: Theme) => void })
      if (path === '/silos') return new Promise((resolve) => { resolveSilos = resolve as (value: Silo[]) => void })
      return Promise.reject(new Error('Unknown path'))
    })
    const store = useSilosStore()

    const promise = store.fetchSilos()
    expect(store.isLoading).toBe(true)

    resolveTheme!(mockTheme)
    resolveSilos!(mockSilos)
    await promise

    expect(store.isLoading).toBe(false)
  })

  it('sets error on API failure', async () => {
    mockApiGet.mockRejectedValue(new Error('Network error'))
    const store = useSilosStore()

    await store.fetchSilos()

    expect(store.error).toBe('Network error')
    expect(store.silos).toEqual([])
    expect(store.theme).toBeNull()
    expect(store.isLoading).toBe(false)
  })

  it('sets generic error message for non-Error throws', async () => {
    mockApiGet.mockRejectedValue('something went wrong')
    const store = useSilosStore()

    await store.fetchSilos()

    expect(store.error).toBe('Erreur inconnue')
  })

  it('clears previous error on retry', async () => {
    mockApiGet.mockRejectedValueOnce(new Error('fail'))
    const store = useSilosStore()
    await store.fetchSilos()
    expect(store.error).toBe('fail')

    mockApiGet.mockImplementation((path: string) => {
      if (path === '/theme') return Promise.resolve(mockTheme)
      if (path === '/silos') return Promise.resolve(mockSilos)
      return Promise.reject(new Error('Unknown path'))
    })
    await store.fetchSilos()
    expect(store.error).toBeNull()
    expect(store.silos).toEqual(mockSilos)
  })

  it('calls apiGet with /theme and /silos', async () => {
    mockApiGet.mockImplementation((path: string) => {
      if (path === '/theme') return Promise.resolve(mockTheme)
      if (path === '/silos') return Promise.resolve(mockSilos)
      return Promise.reject(new Error('Unknown path'))
    })
    const store = useSilosStore()
    await store.fetchSilos()

    expect(mockApiGet).toHaveBeenCalledWith('/theme')
    expect(mockApiGet).toHaveBeenCalledWith('/silos')
  })
})

describe('silos.store — computed properties', () => {
  it('totalArticles returns sum of all silo article counts', async () => {
    mockApiGet.mockImplementation((path: string) => {
      if (path === '/theme') return Promise.resolve(mockTheme)
      if (path === '/silos') return Promise.resolve(mockSilos)
      return Promise.reject(new Error('Unknown path'))
    })
    const store = useSilosStore()
    await store.fetchSilos()

    // Silo 1: 3 articles + Silo 2: 2 articles = 5
    expect(store.totalArticles).toBe(5)
  })

  it('totalCocoons returns sum of all cocoons across silos', async () => {
    mockApiGet.mockImplementation((path: string) => {
      if (path === '/theme') return Promise.resolve(mockTheme)
      if (path === '/silos') return Promise.resolve(mockSilos)
      return Promise.reject(new Error('Unknown path'))
    })
    const store = useSilosStore()
    await store.fetchSilos()

    // Silo 1: 2 cocoons + Silo 2: 1 cocoon = 3
    expect(store.totalCocoons).toBe(3)
  })

  it('globalCompletion computes weighted average', async () => {
    mockApiGet.mockImplementation((path: string) => {
      if (path === '/theme') return Promise.resolve(mockTheme)
      if (path === '/silos') return Promise.resolve(mockSilos)
      return Promise.reject(new Error('Unknown path'))
    })
    const store = useSilosStore()
    await store.fetchSilos()

    // Silo 1: round((67/100)*3) = round(2.01) = 2 completed out of 3
    // Silo 2: round((100/100)*2) = 2 completed out of 2
    // Total: (2+2)/5 = 0.8 => round(80) = 80%
    expect(store.globalCompletion).toBe(80)
  })

  it('globalCompletion returns 0 when no articles', () => {
    const store = useSilosStore()
    expect(store.globalCompletion).toBe(0)
  })

  it('totalArticles returns 0 when no silos loaded', () => {
    const store = useSilosStore()
    expect(store.totalArticles).toBe(0)
  })

  it('totalCocoons returns 0 when no silos loaded', () => {
    const store = useSilosStore()
    expect(store.totalCocoons).toBe(0)
  })

  it('handles silos without stats gracefully', async () => {
    const silosNoStats: Silo[] = [
      {
        id: 1,
        nom: 'Empty Silo',
        description: 'No stats',
        cocons: [],
      },
    ]
    mockApiGet.mockImplementation((path: string) => {
      if (path === '/theme') return Promise.resolve(mockTheme)
      if (path === '/silos') return Promise.resolve(silosNoStats)
      return Promise.reject(new Error('Unknown path'))
    })
    const store = useSilosStore()
    await store.fetchSilos()

    expect(store.totalArticles).toBe(0)
    expect(store.totalCocoons).toBe(0)
    expect(store.globalCompletion).toBe(0)
  })
})
