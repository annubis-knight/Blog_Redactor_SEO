/**
 * Tests de caractérisation pour article-progress.store.
 *
 * S2.2 — Sprint 2 stabilisation. On fige le comportement actuel :
 * - cache LRU par articleId (max 50 items, eviction des plus anciens)
 * - addCheck/removeCheck via API POST avec mise à jour locale
 * - getProgress synchronie (lecture cache uniquement)
 * - clearAll vide tout
 *
 * Pré-requis cartographie (CLAUDE.md §2.0) : la donnée `progress.completedChecks`
 * est lue par CaptainTriggerStore et UI dots de progression. Les checks préfixés
 * (`moteur:*`, `cerveau:*`, `redaction:*`) circulent ici.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

const mockApiGet = vi.fn()
const mockApiPost = vi.fn()
const mockApiPut = vi.fn()

vi.mock('@/services/api.service', () => ({
  apiGet: (...args: unknown[]) => mockApiGet(...args),
  apiPost: (...args: unknown[]) => mockApiPost(...args),
  apiPut: (...args: unknown[]) => mockApiPut(...args),
}))

vi.mock('@/utils/logger', () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const { useArticleProgressStore } = await import('@/stores/article/article-progress.store')

const fakeProgress = (id: number, phase: string = 'explorer', checks: string[] = []) => ({
  articleId: id,
  phase,
  completedChecks: checks,
  lastTouchedAt: new Date().toISOString(),
})

describe('moteur:article-progress:initial state', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('starts with empty progressMap and isLoading=false', () => {
    const store = useArticleProgressStore()
    expect(store.progressMap).toEqual({})
    expect(store.isLoading).toBe(false)
  })

  it('getProgress returns null for unknown articleId', () => {
    const store = useArticleProgressStore()
    expect(store.getProgress(42)).toBeNull()
  })
})

describe('moteur:article-progress:fetchProgress', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('caches the response by articleId (string key)', async () => {
    const store = useArticleProgressStore()
    mockApiGet.mockResolvedValueOnce(fakeProgress(1, 'valider', ['moteur:radar_done']))
    await store.fetchProgress(1)
    expect(store.progressMap['1']).toBeDefined()
    expect(store.progressMap['1']!.phase).toBe('valider')
  })

  it('returns null on API failure (does not throw)', async () => {
    const store = useArticleProgressStore()
    mockApiGet.mockRejectedValueOnce(new Error('Network down'))
    const result = await store.fetchProgress(1)
    expect(result).toBeNull()
    expect(store.progressMap['1']).toBeUndefined()
  })

  it('returns null when API returns null (article without progress yet)', async () => {
    const store = useArticleProgressStore()
    mockApiGet.mockResolvedValueOnce(null)
    const result = await store.fetchProgress(1)
    expect(result).toBeNull()
  })

  it('uses GET /articles/:id/progress endpoint', async () => {
    const store = useArticleProgressStore()
    mockApiGet.mockResolvedValueOnce(null)
    await store.fetchProgress(42)
    expect(mockApiGet).toHaveBeenCalledWith('/articles/42/progress')
  })
})

describe('moteur:article-progress:addCheck/removeCheck', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('addCheck POSTs to /check endpoint with check name', async () => {
    const store = useArticleProgressStore()
    mockApiPost.mockResolvedValueOnce(fakeProgress(1, 'valider', ['moteur:capitaine_locked']))
    await store.addCheck(1, 'moteur:capitaine_locked')
    expect(mockApiPost).toHaveBeenCalledWith(
      '/articles/1/progress/check',
      { check: 'moteur:capitaine_locked' },
    )
    expect(store.progressMap['1']!.completedChecks).toContain('moteur:capitaine_locked')
  })

  it('removeCheck POSTs to /uncheck endpoint with check name', async () => {
    const store = useArticleProgressStore()
    mockApiPost.mockResolvedValueOnce(fakeProgress(1, 'valider', []))
    await store.removeCheck(1, 'moteur:capitaine_locked')
    expect(mockApiPost).toHaveBeenCalledWith(
      '/articles/1/progress/uncheck',
      { check: 'moteur:capitaine_locked' },
    )
  })
})

describe('moteur:article-progress:saveProgress', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('PUTs the progress and updates local cache', async () => {
    const store = useArticleProgressStore()
    const next = fakeProgress(7, 'finalisation', ['moteur:lexique_validated'])
    mockApiPut.mockResolvedValueOnce(next)
    await store.saveProgress(7, next)
    expect(mockApiPut).toHaveBeenCalledWith('/articles/7/progress', next)
    expect(store.progressMap['7']).toEqual(next)
  })
})

describe('moteur:article-progress:getProgress (cached read)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('returns cached progress after fetch', async () => {
    const store = useArticleProgressStore()
    mockApiGet.mockResolvedValueOnce(fakeProgress(1, 'explorer'))
    await store.fetchProgress(1)
    expect(store.getProgress(1)).not.toBeNull()
    expect(store.getProgress(1)!.phase).toBe('explorer')
  })
})

describe('moteur:article-progress:LRU eviction', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('evicts oldest entries when exceeding 50 items', async () => {
    const store = useArticleProgressStore()
    for (let i = 1; i <= 52; i++) {
      mockApiGet.mockResolvedValueOnce(fakeProgress(i))
      await store.fetchProgress(i)
    }
    // Should have at most 50 entries
    expect(Object.keys(store.progressMap).length).toBeLessThanOrEqual(50)
    // Oldest (id=1) evicted
    expect(store.progressMap['1']).toBeUndefined()
    // Newest (id=52) kept
    expect(store.progressMap['52']).toBeDefined()
  })
})

describe('moteur:article-progress:clearAll', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('empties progressMap', async () => {
    const store = useArticleProgressStore()
    mockApiGet.mockResolvedValueOnce(fakeProgress(1))
    await store.fetchProgress(1)
    expect(Object.keys(store.progressMap).length).toBe(1)
    store.clearAll()
    expect(store.progressMap).toEqual({})
  })
})
