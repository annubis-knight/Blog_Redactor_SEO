import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useIntentStore } from '../../../src/stores/keyword/intent.store'

describe('intent.store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('initializes with null data', () => {
    const store = useIntentStore()
    expect(store.comparisonData).toBeNull()
    expect(store.autocompleteData).toBeNull()
    expect(store.localComparisons.size).toBe(0)
  })

  it('M3 — plus d’analyse d’intention relue : le store n’expose plus `intentData`', () => {
    // `intentData` relisait `keyword_intent_analyses`, table sans producteur
    // depuis la suppression de /api/intent/analyze, et aucun écran ne le lisait.
    const store = useIntentStore()
    expect('intentData' in store).toBe(false)
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
    store.comparisonData = { keyword: 'test' } as never
    store.autocompleteData = { keyword: 'test' } as never
    store.localComparisons.set('foo', {} as never)

    store.reset()

    expect(store.comparisonData).toBeNull()
    expect(store.autocompleteData).toBeNull()
    expect(store.localComparisons.size).toBe(0)
  })
})
