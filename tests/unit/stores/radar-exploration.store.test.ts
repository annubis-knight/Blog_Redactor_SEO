/**
 * Tests pour `useRadarExplorationStore` (Pinia, DB-first).
 *
 * Référence FR PRD : FR-RAD-DB-FIRST, FR-RAD-MANUAL-ADD.
 *
 * Couvre :
 *  - hydratation depuis GET /articles/:id/radar-exploration
 *  - addKeyword unitaire (POST + state mis à jour)
 *  - removeKeyword unitaire (DELETE + state)
 *  - addKeywordsBatch (POST batch + state)
 *  - setArticle: switch d'article = clear + re-hydrate
 *  - setScanResultLocal: synchro après scan
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

const mockApi = {
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiDelete: vi.fn(),
}

vi.mock('@/services/api.service', () => ({
  apiGet: (...args: unknown[]) => mockApi.apiGet(...args),
  apiPost: (...args: unknown[]) => mockApi.apiPost(...args),
  apiDelete: (...args: unknown[]) => mockApi.apiDelete(...args),
}))

vi.mock('@/utils/logger', () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const { useRadarExplorationStore } = await import('../../../src/stores/article/radar-exploration.store')

function makeEntry(articleId: number, keywords: string[] = []) {
  return {
    articleId,
    seed: 'seed',
    context: { broadKeyword: 'b', specificTopic: 's', painPoint: 'p', depth: 1 },
    generatedKeywords: keywords.map(k => ({ keyword: k, reasoning: '' })),
    scanResult: { cards: [] },
    scannedAt: '2026-05-11T00:00:00.000Z',
  }
}

beforeEach(() => {
  setActivePinia(createPinia())
  mockApi.apiGet.mockReset()
  mockApi.apiPost.mockReset()
  mockApi.apiDelete.mockReset()
})

describe('useRadarExplorationStore', () => {
  it('setArticle(null) : reste vide', async () => {
    const store = useRadarExplorationStore()
    await store.setArticle(null)
    expect(store.entry).toBeNull()
    expect(mockApi.apiGet).not.toHaveBeenCalled()
  })

  it('setArticle(id) : émet GET et hydrate l\'entry', async () => {
    mockApi.apiGet.mockResolvedValueOnce(makeEntry(64, ['kw-a', 'kw-b']))
    const store = useRadarExplorationStore()
    await store.setArticle(64)
    expect(mockApi.apiGet).toHaveBeenCalledWith('/articles/64/radar-exploration')
    expect(store.generatedKeywords).toHaveLength(2)
    expect(store.generatedKeywords[0].keyword).toBe('kw-a')
  })

  it('setArticle même id : no-op (pas de re-fetch)', async () => {
    mockApi.apiGet.mockResolvedValueOnce(makeEntry(64))
    const store = useRadarExplorationStore()
    await store.setArticle(64)
    await store.setArticle(64)
    expect(mockApi.apiGet).toHaveBeenCalledTimes(1)
  })

  it('setArticle switch : re-fetch avec le nouvel id', async () => {
    mockApi.apiGet
      .mockResolvedValueOnce(makeEntry(64))
      .mockResolvedValueOnce(makeEntry(65, ['kw-1']))
    const store = useRadarExplorationStore()
    await store.setArticle(64)
    await store.setArticle(65)
    expect(mockApi.apiGet).toHaveBeenCalledTimes(2)
    expect(store.articleId).toBe(65)
    expect(store.generatedKeywords).toHaveLength(1)
  })

  it('addKeyword : POST + state mis à jour si added: true', async () => {
    mockApi.apiGet.mockResolvedValueOnce(makeEntry(64))
    mockApi.apiPost.mockResolvedValueOnce({
      entry: makeEntry(64, ['new-kw']),
      added: true,
    })
    const store = useRadarExplorationStore()
    await store.setArticle(64)
    const added = await store.addKeyword('new-kw')
    expect(added).toBe(true)
    expect(mockApi.apiPost).toHaveBeenCalledWith(
      '/articles/64/radar-exploration/keyword',
      { keyword: 'new-kw', reasoning: undefined },
    )
    expect(store.generatedKeywords).toHaveLength(1)
  })

  it('addKeyword sans articleId : no-op', async () => {
    const store = useRadarExplorationStore()
    const added = await store.addKeyword('kw')
    expect(added).toBe(false)
    expect(mockApi.apiPost).not.toHaveBeenCalled()
  })

  it('addKeyword vide : no-op', async () => {
    mockApi.apiGet.mockResolvedValueOnce(makeEntry(64))
    const store = useRadarExplorationStore()
    await store.setArticle(64)
    const added = await store.addKeyword('   ')
    expect(added).toBe(false)
    expect(mockApi.apiPost).not.toHaveBeenCalled()
  })

  it('removeKeyword : DELETE + state mis à jour', async () => {
    mockApi.apiGet.mockResolvedValueOnce(makeEntry(64, ['kw-a', 'kw-b']))
    mockApi.apiDelete.mockResolvedValueOnce({ entry: makeEntry(64, ['kw-b']) })
    const store = useRadarExplorationStore()
    await store.setArticle(64)
    await store.removeKeyword('kw-a')
    expect(mockApi.apiDelete).toHaveBeenCalledWith(
      '/articles/64/radar-exploration/keyword?keyword=kw-a',
    )
    expect(store.generatedKeywords.map(k => k.keyword)).toEqual(['kw-b'])
  })

  it('addKeywordsBatch : POST batch + state mis à jour', async () => {
    mockApi.apiGet.mockResolvedValueOnce(makeEntry(64))
    mockApi.apiPost.mockResolvedValueOnce({
      entry: makeEntry(64, ['kw1', 'kw2', 'kw3']),
      added: 3,
    })
    const store = useRadarExplorationStore()
    await store.setArticle(64)
    const added = await store.addKeywordsBatch([
      { keyword: 'kw1' },
      { keyword: 'kw2' },
      { keyword: 'kw3' },
    ])
    expect(added).toBe(3)
    expect(mockApi.apiPost).toHaveBeenCalledWith(
      '/articles/64/radar-exploration/keywords',
      { keywords: [{ keyword: 'kw1' }, { keyword: 'kw2' }, { keyword: 'kw3' }] },
    )
    expect(store.generatedKeywords).toHaveLength(3)
  })

  it('setScanResultLocal : synchronise scan_result sans re-fetch DB', async () => {
    mockApi.apiGet.mockResolvedValueOnce(makeEntry(64, ['kw-a']))
    const store = useRadarExplorationStore()
    await store.setArticle(64)
    expect(store.hasScanResult).toBe(false)

    const scanResult = {
      globalScore: 75,
      heatLevel: 'chaude' as const,
      cards: [{ keyword: 'kw-a', kpis: null, paaItems: [] }],
      autocomplete: { suggestions: [], totalCount: 0 },
    } as never
    store.setScanResultLocal(scanResult)
    expect(store.hasScanResult).toBe(true)
    expect(store.scanCards).toHaveLength(1)
  })

  it('$reset : tout effacer', async () => {
    mockApi.apiGet.mockResolvedValueOnce(makeEntry(64, ['kw']))
    const store = useRadarExplorationStore()
    await store.setArticle(64)
    expect(store.generatedKeywords).toHaveLength(1)
    store.$reset()
    expect(store.entry).toBeNull()
    expect(store.articleId).toBeNull()
  })
})
