import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, computed, nextTick } from 'vue'

// Mock API service before importing composables
vi.mock('../../../src/services/api.service', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiDelete: vi.fn(),
}))

vi.mock('../../../src/utils/logger', () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { apiGet, apiPost, apiDelete } from '../../../src/services/api.service'
import { useDiscoveryCache } from '../../../src/composables/useDiscoveryCache'
import { useRelevanceScoring } from '../../../src/composables/useRelevanceScoring'
import { useDiscoverySelection } from '../../../src/composables/useDiscoverySelection'
import type { DiscoveredKeyword } from '../../../shared/types/discovery-tab.types'

describe('useDiscoveryCache', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sauvegarde et charge depuis le cache', async () => {
    const cache = useDiscoveryCache()

    // Mock save
    vi.mocked(apiPost).mockResolvedValueOnce(undefined)

    await cache.saveToCache('test-seed', {
      articleTitle: 'Test Article',
      articleKeyword: 'test',
      painPoint: 'pain',
    }, {
      suggestAlphabet: [{ keyword: 'test a', source: 'suggest-alphabet' }],
      suggestQuestions: [],
      suggestIntents: [],
      suggestPrepositions: [],
      aiKeywords: [],
      dataforseoKeywords: [],
      relevanceScores: { 'test a': 0.8 },
      wordGroups: [],
      analysisResult: null,
    })

    expect(apiPost).toHaveBeenCalledWith('/discovery-cache/save', expect.objectContaining({
      seed: 'test-seed',
    }))
    expect(cache.cacheStatus.value).toEqual({
      cached: true,
      cachedAt: expect.any(String),
    })

    // Mock load
    vi.mocked(apiGet).mockResolvedValueOnce({
      seed: 'test-seed',
      context: { articleTitle: 'Test Article', articleKeyword: 'test', painPoint: 'pain' },
      suggestAlphabet: [{ keyword: 'test a', source: 'suggest-alphabet' }],
      suggestQuestions: [],
      suggestIntents: [],
      suggestPrepositions: [],
      aiKeywords: [],
      dataforseoKeywords: [],
      relevanceScores: { 'test a': 0.8 },
      wordGroups: [],
      analysisResult: null,
    })

    const entry = await cache.loadFromCache('test-seed')
    expect(entry).not.toBeNull()
    expect(entry!.seed).toBe('test-seed')
    expect(entry!.suggestAlphabet).toHaveLength(1)
  })

  it('clear supprime le cache', async () => {
    const cache = useDiscoveryCache()
    cache.cacheStatus.value = { cached: true, cachedAt: '2024-01-01' }

    vi.mocked(apiDelete).mockResolvedValueOnce(undefined)

    await cache.clearCacheForSeed('test-seed')
    expect(apiDelete).toHaveBeenCalledWith('/discovery-cache?seed=test-seed')
    expect(cache.cacheStatus.value).toBeNull()
  })

  it('checkCacheForSeed met à jour le statut', async () => {
    const cache = useDiscoveryCache()

    vi.mocked(apiGet).mockResolvedValueOnce({ cached: true, cachedAt: '2024-01-01' })

    await cache.checkCacheForSeed('test-seed')
    expect(cache.cacheStatus.value).toEqual({ cached: true, cachedAt: '2024-01-01' })
  })

  it('gère les seeds vides', async () => {
    const cache = useDiscoveryCache()
    cache.cacheStatus.value = { cached: true, cachedAt: '2024-01-01' }

    await cache.checkCacheForSeed('')
    expect(cache.cacheStatus.value).toBeNull()
    expect(apiGet).not.toHaveBeenCalled()
  })
})

describe('useRelevanceScoring', () => {
  function createScoring(keywords: DiscoveredKeyword[] = []) {
    const lastSeed = ref('seo technique')
    const lastArticleContext = ref<{ title?: string; painPoint?: string }>({})
    const allKeywordsFlat = computed(() => keywords)
    const uniqueKeywordCount = computed(() => {
      const seen = new Set<string>()
      for (const kw of keywords) seen.add(kw.keyword.toLowerCase())
      return seen.size
    })

    return useRelevanceScoring({ lastSeed, lastArticleContext, allKeywordsFlat, uniqueKeywordCount })
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('score les keywords par pertinence sémantique', async () => {
    const keywords: DiscoveredKeyword[] = [
      { keyword: 'seo technique', source: 'suggest-alphabet' },
      { keyword: 'marketing digital', source: 'suggest-alphabet' },
    ]
    const scoring = createScoring(keywords)

    // Mock API response for scoring
    vi.mocked(apiPost).mockResolvedValue({
      scores: { 'seo technique': 0.9, 'marketing digital': 0.3 },
      fallback: false,
    })

    await scoring.fetchRelevanceScores()

    expect(scoring.relevanceScores.value.get('seo technique')).toBe(0.9)
    expect(scoring.relevanceScores.value.get('marketing digital')).toBe(0.3)
  })

  it('filtre en dessous du seuil', () => {
    const scoring = createScoring()

    // Manually set scores
    scoring.relevanceScores.value = new Map([
      ['bon keyword', 0.8],
      ['mauvais keyword', 0.2],
    ])

    expect(scoring.isRelevant('bon keyword')).toBe(true)
    expect(scoring.isRelevant('mauvais keyword')).toBe(false)
  })

  it('traite les keywords non-scorés comme pertinents', () => {
    const scoring = createScoring()
    expect(scoring.isRelevant('keyword inconnu')).toBe(true)
  })

  it('toggleRelevanceFilter bascule le filtre', () => {
    const scoring = createScoring()
    expect(scoring.relevanceFilterEnabled.value).toBe(true)

    scoring.toggleRelevanceFilter()
    expect(scoring.relevanceFilterEnabled.value).toBe(false)

    // When filter is disabled, matchesRelevance should always return true
    scoring.relevanceScores.value = new Map([['bad', 0.1]])
    expect(scoring.matchesRelevance('bad')).toBe(true)
  })

  it('resetScores remet tout à zéro', () => {
    const scoring = createScoring()
    scoring.relevanceScores.value = new Map([['test', 0.8]])
    scoring.relevanceFilterEnabled.value = false
    scoring.filteringSuspect.value = true

    scoring.resetScores()

    expect(scoring.relevanceScores.value.size).toBe(0)
    expect(scoring.relevanceFilterEnabled.value).toBe(true)
    expect(scoring.filteringSuspect.value).toBe(false)
  })
})

describe('useDiscoverySelection', () => {
  const mockKeywords: DiscoveredKeyword[] = [
    { keyword: 'seo technique', source: 'suggest-alphabet' },
    { keyword: 'référencement naturel', source: 'suggest-alphabet' },
    { keyword: 'optimisation seo', source: 'ai' },
    { keyword: 'search engine', source: 'dataforseo' },
  ]

  function createSelection(keywords = mockKeywords) {
    return useDiscoverySelection({
      allKeywordsFlat: { value: keywords },
      matchesGroupFilter: () => true,
      matchesRelevance: () => true,
      filteredList: (list: DiscoveredKeyword[]) => list,
      getSourceList: (source) => keywords.filter(k => k.source === source),
      analysisResult: ref(null),
    })
  }

  it('toggle ajoute/retire de la sélection', () => {
    const sel = createSelection()

    sel.toggleSelect('seo technique')
    expect(sel.isSelected('seo technique')).toBe(true)
    expect(sel.selectedCount.value).toBe(1)

    sel.toggleSelect('seo technique')
    expect(sel.isSelected('seo technique')).toBe(false)
    expect(sel.selectedCount.value).toBe(0)
  })

  it('selectAll sélectionne par source', () => {
    const sel = createSelection()

    sel.selectAllInSource('suggest-alphabet')
    expect(sel.isSelected('seo technique')).toBe(true)
    expect(sel.isSelected('référencement naturel')).toBe(true)
    expect(sel.isSelected('optimisation seo')).toBe(false)
    expect(sel.selectedCount.value).toBe(2)
  })

  it('deselectAllInSource retire les keywords de la source', () => {
    const sel = createSelection()

    // Select all first
    sel.selectAll()
    expect(sel.selectedCount.value).toBe(4)

    sel.deselectAllInSource('suggest-alphabet')
    expect(sel.isSelected('seo technique')).toBe(false)
    expect(sel.isSelected('référencement naturel')).toBe(false)
    expect(sel.isSelected('optimisation seo')).toBe(true)
    expect(sel.selectedCount.value).toBe(2)
  })

  it('isAllSourceSelected vérifie la sélection complète', () => {
    const sel = createSelection()

    expect(sel.isAllSourceSelected('suggest-alphabet')).toBe(false)

    sel.selectAllInSource('suggest-alphabet')
    expect(sel.isAllSourceSelected('suggest-alphabet')).toBe(true)
  })

  it('selectAll sélectionne tous les keywords', () => {
    const sel = createSelection()

    sel.selectAll()
    expect(sel.selectedCount.value).toBe(4)
    expect(sel.isSelected('seo technique')).toBe(true)
    expect(sel.isSelected('search engine')).toBe(true)
  })

  it('deselectAll vide la sélection', () => {
    const sel = createSelection()

    sel.selectAll()
    expect(sel.selectedCount.value).toBe(4)

    sel.deselectAll()
    expect(sel.selectedCount.value).toBe(0)
  })

  it('selectAllAnalysis sélectionne les keywords de l\'analyse', () => {
    const analysisResult = ref({
      keywords: [
        { keyword: 'seo technique', reasoning: 'test', priority: 'high' as const },
        { keyword: 'nouveau keyword', reasoning: 'test', priority: 'medium' as const },
      ],
      summary: 'test',
    })

    const sel = useDiscoverySelection({
      allKeywordsFlat: { value: mockKeywords },
      matchesGroupFilter: () => true,
      matchesRelevance: () => true,
      filteredList: (list: DiscoveredKeyword[]) => list,
      getSourceList: (source) => mockKeywords.filter(k => k.source === source),
      analysisResult,
    })

    sel.selectAllAnalysis()
    expect(sel.isSelected('seo technique')).toBe(true)
    expect(sel.isSelected('nouveau keyword')).toBe(true)
    expect(sel.selectedCount.value).toBe(2)
  })

  it('resetSelection vide la sélection', () => {
    const sel = createSelection()
    sel.selectAll()
    expect(sel.selectedCount.value).toBe(4)

    sel.resetSelection()
    expect(sel.selectedCount.value).toBe(0)
  })
})
