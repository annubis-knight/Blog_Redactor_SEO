import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useLocalStore } from '../../../src/stores/external/local.store'

describe('local.store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('initializes with null data', () => {
    const store = useLocalStore()
    expect(store.mapsData).toBeNull()
  })

  it('hasLocalPack returns true when mapsData.hasLocalPack is true', () => {
    const store = useLocalStore()
    expect(store.hasLocalPack).toBe(false)

    store.mapsData = {
      keyword: 'plombier lyon',
      locationCode: 2250,
      hasLocalPack: true,
      listings: [],
      reviewGap: { averageCompetitorReviews: 50, myReviews: 10, gap: 40, objective: 'Atteindre 50 avis' },
      cachedAt: '2026-03-10',
    }
    expect(store.hasLocalPack).toBe(true)
  })

  it('reviewGap returns mapsData.reviewGap', () => {
    const store = useLocalStore()
    expect(store.reviewGap).toBeNull()

    const gap = { averageCompetitorReviews: 100, myReviews: 20, gap: 80, objective: 'Atteindre 100 avis' }
    store.mapsData = {
      keyword: 'plombier lyon',
      locationCode: 2250,
      hasLocalPack: false,
      listings: [],
      reviewGap: gap,
      cachedAt: '2026-03-10',
    }
    expect(store.reviewGap).toEqual(gap)
  })

  it('reset clears mapsData', () => {
    const store = useLocalStore()
    store.mapsData = {
      keyword: 'test', locationCode: 2250, hasLocalPack: true, listings: [],
      reviewGap: { averageCompetitorReviews: 50, myReviews: 10, gap: 40, objective: '' },
      cachedAt: '2026-03-10',
    }
    store.reset()
    expect(store.mapsData).toBeNull()
  })
})
