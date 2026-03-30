import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useIntentStore } from '../../../src/stores/intent.store'

vi.mock('../../../src/services/api.service', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
}))

import { apiPost } from '../../../src/services/api.service'
const mockApiPost = vi.mocked(apiPost)

describe('intent.store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('initializes with null data and loading=false', () => {
    const store = useIntentStore()
    expect(store.intentData).toBeNull()
    expect(store.comparisonData).toBeNull()
    expect(store.autocompleteData).toBeNull()
    expect(store.isAnalyzingIntent).toBe(false)
    expect(store.isComparing).toBe(false)
    expect(store.isValidatingAutocomplete).toBe(false)
    expect(store.intentError).toBeNull()
    expect(store.comparisonError).toBeNull()
    expect(store.autocompleteError).toBeNull()
  })

  it('analyzeIntent sets loading, calls API and stores result', async () => {
    const mockData = {
      keyword: 'plombier lyon',
      modules: [{ type: 'local_pack', present: true, position: 1 }],
      scores: [{ category: 'local', score: 8, maxScore: 10 }],
      dominantIntent: 'transactional_local',
      classification: { type: 'transactional_local', confidence: 0.9, reasoning: 'Local pack detected' },
      recommendations: [],
      topOrganicResults: [],
      cachedAt: '2026-03-10',
    }
    mockApiPost.mockResolvedValue(mockData)

    const store = useIntentStore()
    const promise = store.analyzeIntent('plombier lyon')

    expect(store.isAnalyzingIntent).toBe(true)
    await promise

    expect(mockApiPost).toHaveBeenCalledWith('/intent/analyze', { keyword: 'plombier lyon', locationCode: undefined })
    expect(store.intentData).toEqual(mockData)
    expect(store.isAnalyzingIntent).toBe(false)
    expect(store.intentError).toBeNull()
  })

  it('hasLocalPack returns true when local_pack module present', () => {
    const store = useIntentStore()
    store.intentData = {
      keyword: 'plombier lyon',
      modules: [
        { type: 'local_pack', present: true, position: 1 },
        { type: 'featured_snippet', present: false },
      ],
      scores: [],
      dominantIntent: 'transactional_local',
      classification: { type: 'transactional_local', confidence: 0.9, reasoning: '' },
      recommendations: [],
      topOrganicResults: [],
      cachedAt: '2026-03-10',
    }
    expect(store.hasLocalPack).toBe(true)
  })

  it('hasLocalPack returns false when no local_pack module present', () => {
    const store = useIntentStore()
    store.intentData = {
      keyword: 'recette cookies',
      modules: [
        { type: 'featured_snippet', present: true, position: 1 },
        { type: 'people_also_ask', present: true, position: 3 },
      ],
      scores: [],
      dominantIntent: 'informational',
      classification: { type: 'informational', confidence: 0.85, reasoning: '' },
      recommendations: [],
      topOrganicResults: [],
      cachedAt: '2026-03-10',
    }
    expect(store.hasLocalPack).toBe(false)
  })

  it('dominantIntent returns the dominant intent from intentData', () => {
    const store = useIntentStore()
    expect(store.dominantIntent).toBeNull()

    store.intentData = {
      keyword: 'plombier lyon',
      modules: [],
      scores: [],
      dominantIntent: 'transactional_local',
      classification: { type: 'transactional_local', confidence: 0.9, reasoning: '' },
      recommendations: [],
      topOrganicResults: [],
      cachedAt: '2026-03-10',
    }
    expect(store.dominantIntent).toBe('transactional_local')
  })

  it('compareLocalNational stores comparison data', async () => {
    const mockComparison = {
      keyword: 'plombier',
      local: { searchVolume: 200, keywordDifficulty: 30, cpc: 2.5, competition: 0.4, monthlySearches: [180, 200, 210] },
      national: { searchVolume: 5000, keywordDifficulty: 55, cpc: 3.0, competition: 0.6, monthlySearches: [4800, 5000, 5200] },
      opportunityIndex: 0.72,
      alert: { keyword: 'plombier', index: 0.72, message: 'Opportunite locale', type: 'opportunity' as const },
      cachedAt: '2026-03-10',
    }
    mockApiPost.mockResolvedValue(mockComparison)

    const store = useIntentStore()
    await store.compareLocalNational('plombier')

    expect(mockApiPost).toHaveBeenCalledWith('/keywords/compare-local', { keyword: 'plombier' })
    expect(store.comparisonData).toEqual(mockComparison)
    expect(store.isComparing).toBe(false)
  })

  it('isOpportunity returns true when alert is present', () => {
    const store = useIntentStore()
    store.comparisonData = {
      keyword: 'plombier',
      local: { searchVolume: 200, keywordDifficulty: 30, cpc: 2.5, competition: 0.4, monthlySearches: [] },
      national: { searchVolume: 5000, keywordDifficulty: 55, cpc: 3.0, competition: 0.6, monthlySearches: [] },
      opportunityIndex: 0.72,
      alert: { keyword: 'plombier', index: 0.72, message: 'Opportunite', type: 'opportunity' },
      cachedAt: '2026-03-10',
    }
    expect(store.isOpportunity).toBe(true)
  })

  it('validateAutocomplete stores autocomplete data', async () => {
    const mockAutocomplete = {
      keyword: 'plombier lyon',
      suggestions: [
        { keyword: 'plombier lyon 3', type: 'autocomplete', searchVolume: 50 },
        { keyword: 'plombier lyon pas cher', type: 'autocomplete', searchVolume: 120 },
      ],
      validated: true,
      certaintyIndex: { autocompleteExists: 1, volumeNormalized: 0.8, serpDensity: 0.6, total: 0.8 },
      cachedAt: '2026-03-10',
    }
    mockApiPost.mockResolvedValue(mockAutocomplete)

    const store = useIntentStore()
    await store.validateAutocomplete('plombier lyon', ['comment', 'ou'])

    expect(mockApiPost).toHaveBeenCalledWith('/keywords/autocomplete', { keyword: 'plombier lyon', prefixes: ['comment', 'ou'] })
    expect(store.autocompleteData).toEqual(mockAutocomplete)
    expect(store.isValidatingAutocomplete).toBe(false)
  })

  it('reset clears all state', async () => {
    const store = useIntentStore()

    // Populate state
    mockApiPost.mockResolvedValue({
      keyword: 'test', modules: [], scores: [], dominantIntent: 'informational',
      classification: { type: 'informational', confidence: 0.5, reasoning: '' },
      recommendations: [], topOrganicResults: [], cachedAt: '2026-03-10',
    })
    await store.analyzeIntent('test')
    expect(store.intentData).not.toBeNull()

    store.reset()

    expect(store.intentData).toBeNull()
    expect(store.comparisonData).toBeNull()
    expect(store.autocompleteData).toBeNull()
    expect(store.intentError).toBeNull()
    expect(store.comparisonError).toBeNull()
    expect(store.autocompleteError).toBeNull()
  })
})
