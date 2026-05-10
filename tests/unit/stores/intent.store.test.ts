import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useIntentStore } from '../../../src/stores/keyword/intent.store'

describe('intent.store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('initializes with null data', () => {
    const store = useIntentStore()
    expect(store.intentData).toBeNull()
    expect(store.comparisonData).toBeNull()
    expect(store.autocompleteData).toBeNull()
    expect(store.localComparisons.size).toBe(0)
  })

  it('localComparisons accepts external mutation (Map shared with KeywordAuditTable switcher)', () => {
    const store = useIntentStore()
    const comparison = {
      keyword: 'plombier',
      local: { searchVolume: 200, keywordDifficulty: 30, cpc: 2.5, competition: 0.4, monthlySearches: [] },
      national: { searchVolume: 5000, keywordDifficulty: 55, cpc: 3.0, competition: 0.6, monthlySearches: [] },
      opportunityIndex: 0.72,
      alert: { keyword: 'plombier', index: 0.72, message: 'Opportunite', type: 'opportunity' as const },
      cachedAt: '2026-03-10',
    }
    store.localComparisons.set('plombier', comparison)
    expect(store.localComparisons.has('plombier')).toBe(true)
  })

  it('reset clears all refs and the localComparisons map', () => {
    const store = useIntentStore()
    store.intentData = {
      keyword: 'test', modules: [], scores: [], dominantIntent: 'informational',
      classification: { type: 'informational', confidence: 0.5, reasoning: '' },
      recommendations: [], topOrganicResults: [], cachedAt: '2026-03-10',
    }
    store.localComparisons.set('foo', {} as never)

    store.reset()

    expect(store.intentData).toBeNull()
    expect(store.comparisonData).toBeNull()
    expect(store.autocompleteData).toBeNull()
    expect(store.localComparisons.size).toBe(0)
  })
})
