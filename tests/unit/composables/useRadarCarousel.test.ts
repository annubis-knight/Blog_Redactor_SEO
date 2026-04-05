import { describe, it, expect, vi, beforeEach } from 'vitest'
import { nextTick } from 'vue'
import type { RadarCard } from '../../../shared/types/intent.types'
import type { ValidateResponse } from '../../../shared/types/index'

// Mock api.service
const mockApiPost = vi.fn()
vi.mock('../../../src/services/api.service', () => ({
  apiPost: (...args: unknown[]) => mockApiPost(...args),
}))

vi.mock('../../../src/utils/logger', () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

function makeCard(keyword: string): RadarCard {
  return {
    keyword,
    reasoning: '',
    kpis: {
      searchVolume: 100, difficulty: 20, cpc: 1.5, competition: 0.5,
      intentTypes: [], intentProbability: null,
      autocompleteMatchCount: 2, paaMatchCount: 3, paaWeightedScore: 4.5, paaTotal: 5, avgSemanticScore: null,
    },
    paaItems: [],
    combinedScore: 75,
    scoreBreakdown: {
      paaMatches: { score: 80, weight: 0.3 },
      resonance: { score: 70, weight: 0.15 },
      opportunity: { score: 60, weight: 0.25 },
      intent: { score: 90, weight: 0.15 },
      cpc: { score: 50, weight: 0.15 },
    },
    cachedPaa: false,
  }
}

const goResponse: ValidateResponse = {
  keyword: 'seo local',
  articleLevel: 'pilier',
  kpis: [
    { name: 'volume', rawValue: 1500, color: 'green', label: '1500', thresholds: { green: 1000, orange: 200 } },
  ],
  verdict: { level: 'GO', greenCount: 5, totalKpis: 6, autoNoGo: false },
  fromCache: false,
  cachedAt: null,
}

const orangeResponse: ValidateResponse = {
  ...goResponse,
  keyword: 'copywriting web',
  verdict: { level: 'ORANGE', greenCount: 3, totalKpis: 6, autoNoGo: false },
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('useRadarCarousel', () => {
  // Dynamic import to avoid module-level mock timing issues
  async function createCarousel() {
    const { useRadarCarousel } = await import('../../../src/composables/useRadarCarousel')
    return useRadarCarousel()
  }

  it('starts inactive with no entries', async () => {
    const c = await createCarousel()
    expect(c.isActive.value).toBe(false)
    expect(c.count.value).toBe(0)
    expect(c.currentEntry.value).toBeNull()
  })

  it('loadCards creates entries and calls API for each', async () => {
    mockApiPost.mockResolvedValue(goResponse)
    const c = await createCarousel()

    const cards = [makeCard('seo local'), makeCard('copywriting web')]
    await c.loadCards(cards, 'pilier')

    expect(c.isActive.value).toBe(true)
    expect(c.count.value).toBe(2)
    expect(mockApiPost).toHaveBeenCalledTimes(2)
    expect(mockApiPost).toHaveBeenCalledWith('/keywords/seo%20local/validate', { level: 'pilier' })
    expect(mockApiPost).toHaveBeenCalledWith('/keywords/copywriting%20web/validate', { level: 'pilier' })
  })

  it('stores validation results in entries', async () => {
    mockApiPost
      .mockResolvedValueOnce(goResponse)
      .mockResolvedValueOnce(orangeResponse)

    const c = await createCarousel()
    await c.loadCards([makeCard('seo local'), makeCard('copywriting web')], 'pilier')

    expect(c.entries.value[0]?.validation?.verdict.level).toBe('GO')
    expect(c.entries.value[0]?.isLoading).toBe(false)
    expect(c.entries.value[1]?.validation?.verdict.level).toBe('ORANGE')
  })

  it('handles API errors per entry', async () => {
    mockApiPost
      .mockResolvedValueOnce(goResponse)
      .mockRejectedValueOnce(new Error('Network error'))

    const c = await createCarousel()
    await c.loadCards([makeCard('seo local'), makeCard('fail keyword')], 'pilier')

    expect(c.entries.value[0]?.validation).not.toBeNull()
    expect(c.entries.value[1]?.error).toBe('Network error')
    expect(c.entries.value[1]?.isLoading).toBe(false)
  })

  it('next() and prev() navigate correctly', async () => {
    mockApiPost.mockResolvedValue(goResponse)
    const c = await createCarousel()
    await c.loadCards([makeCard('a'), makeCard('b'), makeCard('c')], 'pilier')

    expect(c.currentIndex.value).toBe(0)
    c.next()
    expect(c.currentIndex.value).toBe(1)
    c.next()
    expect(c.currentIndex.value).toBe(2)
    c.next() // should not go past end
    expect(c.currentIndex.value).toBe(2)
    c.prev()
    expect(c.currentIndex.value).toBe(1)
    c.prev()
    expect(c.currentIndex.value).toBe(0)
    c.prev() // should not go before 0
    expect(c.currentIndex.value).toBe(0)
  })

  it('goTo navigates to specific index', async () => {
    mockApiPost.mockResolvedValue(goResponse)
    const c = await createCarousel()
    await c.loadCards([makeCard('a'), makeCard('b'), makeCard('c')], 'pilier')

    c.goTo(2)
    expect(c.currentIndex.value).toBe(2)
    c.goTo(-1) // out of bounds — no change
    expect(c.currentIndex.value).toBe(2)
    c.goTo(5) // out of bounds — no change
    expect(c.currentIndex.value).toBe(2)
  })

  it('effectiveVerdict returns verdict level from validation', async () => {
    mockApiPost.mockResolvedValue(orangeResponse)
    const c = await createCarousel()
    await c.loadCards([makeCard('copywriting web')], 'pilier')

    const entry = c.entries.value[0]!
    expect(c.effectiveVerdict(entry)).toBe('ORANGE')
  })

  it('effectiveVerdict returns null when no validation', async () => {
    const c = await createCarousel()
    const entry = { card: makeCard('x'), validation: null, isLoading: true, error: null, rootResult: null, isLoadingRoot: false }
    expect(c.effectiveVerdict(entry)).toBeNull()
  })

  it('reset() clears all state', async () => {
    mockApiPost.mockResolvedValue(goResponse)
    const c = await createCarousel()
    await c.loadCards([makeCard('a')], 'pilier')

    expect(c.isActive.value).toBe(true)
    c.reset()
    expect(c.isActive.value).toBe(false)
    expect(c.count.value).toBe(0)
    expect(c.currentIndex.value).toBe(0)
  })

  it('currentEntry reflects currentIndex', async () => {
    mockApiPost
      .mockResolvedValueOnce({ ...goResponse, keyword: 'a' })
      .mockResolvedValueOnce({ ...orangeResponse, keyword: 'b' })

    const c = await createCarousel()
    await c.loadCards([makeCard('a'), makeCard('b')], 'pilier')

    expect(c.currentEntry.value?.card.keyword).toBe('a')
    c.next()
    expect(c.currentEntry.value?.card.keyword).toBe('b')
  })

  describe('addEntry', () => {
    it('adds a new entry to the carousel and navigates to it', async () => {
      mockApiPost.mockResolvedValue(goResponse)
      const c = await createCarousel()
      await c.loadCards([makeCard('a')], 'pilier')

      expect(c.count.value).toBe(1)
      expect(c.currentIndex.value).toBe(0)

      await c.addEntry('new keyword', 'pilier')

      expect(c.count.value).toBe(2)
      expect(c.currentIndex.value).toBe(1)
      expect(c.currentEntry.value?.card.keyword).toBe('new keyword')
    })

    it('validates the new entry via API', async () => {
      mockApiPost.mockResolvedValue(goResponse)
      const c = await createCarousel()

      await c.addEntry('seo test', 'intermediaire')

      expect(mockApiPost).toHaveBeenCalledWith('/keywords/seo%20test/validate', { level: 'intermediaire' })
      expect(c.entries.value[0]?.validation).not.toBeNull()
      expect(c.entries.value[0]?.isLoading).toBe(false)
    })

    it('handles API errors in addEntry', async () => {
      mockApiPost.mockRejectedValue(new Error('Timeout'))
      const c = await createCarousel()

      await c.addEntry('fail kw', 'pilier')

      expect(c.entries.value[0]?.error).toBe('Timeout')
      expect(c.entries.value[0]?.isLoading).toBe(false)
    })

    it('creates a carousel from scratch when empty', async () => {
      mockApiPost.mockResolvedValue(goResponse)
      const c = await createCarousel()

      expect(c.isActive.value).toBe(false)
      await c.addEntry('first keyword', 'pilier')

      expect(c.isActive.value).toBe(true)
      expect(c.count.value).toBe(1)
      expect(c.currentIndex.value).toBe(0)
    })

    it('appends multiple entries sequentially', async () => {
      mockApiPost
        .mockResolvedValueOnce({ ...goResponse, keyword: 'first' })
        .mockResolvedValueOnce({ ...orangeResponse, keyword: 'second' })

      const c = await createCarousel()
      await c.addEntry('first', 'pilier')
      await c.addEntry('second', 'pilier')

      expect(c.count.value).toBe(2)
      expect(c.currentIndex.value).toBe(1)
      expect(c.entries.value[0]?.card.keyword).toBe('first')
      expect(c.entries.value[1]?.card.keyword).toBe('second')
    })
  })

  describe('hydrateCardFromValidation', () => {
    it('converts ValidateResponse to RadarCard with correct fields', async () => {
      const { hydrateCardFromValidation } = await import('../../../src/composables/useRadarCarousel')

      const response: ValidateResponse = {
        keyword: 'test keyword',
        articleLevel: 'pilier',
        kpis: [
          { name: 'volume', rawValue: 500, color: 'orange', label: '500', thresholds: { green: 1000, orange: 200 } },
          { name: 'kd', rawValue: 25, color: 'green', label: 'KD 25', thresholds: { green: 40, orange: 65 } },
          { name: 'cpc', rawValue: 1.5, color: 'green', label: '1.50€', thresholds: { green: 2 } },
          { name: 'paa', rawValue: 3, color: 'green', label: '3 PAA', thresholds: { green: 3, orange: 1 } },
          { name: 'autocomplete', rawValue: 2, color: 'green', label: 'Pos 2', thresholds: { green: 3, orange: 6 } },
        ],
        paaQuestions: [
          { question: 'What is SEO?', answer: 'It is...', match: 'total', matchQuality: 'exact' },
        ],
        verdict: { level: 'GO', greenCount: 5, totalKpis: 5, autoNoGo: false },
        fromCache: false,
        cachedAt: null,
      }

      const card = hydrateCardFromValidation('test keyword', response)

      expect(card.keyword).toBe('test keyword')
      expect(card.kpis.searchVolume).toBe(500)
      expect(card.kpis.difficulty).toBe(25)
      expect(card.kpis.cpc).toBe(1.5)
      expect(card.kpis.paaWeightedScore).toBe(3)
      expect(card.kpis.autocompleteMatchCount).toBe(2)
      expect(card.paaItems).toHaveLength(1)
      expect(card.paaItems[0].question).toBe('What is SEO?')
      expect(card.paaItems[0].match).toBe('total')
      expect(card.combinedScore).toBeGreaterThan(0)
      expect(card.scoreBreakdown).toBeDefined()
      expect(card.reasoning).toBe('')
      expect(card.cachedPaa).toBe(false)
    })
  })

  describe('multi-root validation', () => {
    const weakVolumeResponse: ValidateResponse = {
      keyword: 'creation site web entreprise toulouse',
      articleLevel: 'pilier',
      kpis: [
        { name: 'volume', rawValue: 50, color: 'orange', label: '50', thresholds: { green: 1000, orange: 200 } },
        { name: 'kd', rawValue: 20, color: 'green', label: 'KD 20', thresholds: { green: 40, orange: 65 } },
        { name: 'cpc', rawValue: 1.0, color: 'green', label: '1.00€', thresholds: { green: 2 } },
        { name: 'paa', rawValue: 3, color: 'green', label: '3 PAA', thresholds: { green: 3, orange: 1 } },
        { name: 'autocomplete', rawValue: 4, color: 'orange', label: 'Pos 4', thresholds: { green: 3, orange: 6 } },
      ],
      verdict: { level: 'ORANGE', greenCount: 3, totalKpis: 5, autoNoGo: false },
      fromCache: false,
      cachedAt: null,
    }

    function makeRootResponse(keyword: string): ValidateResponse {
      return {
        keyword,
        articleLevel: 'pilier',
        kpis: [
          { name: 'volume', rawValue: 500, color: 'orange', label: '500', thresholds: { green: 1000, orange: 200 } },
          { name: 'kd', rawValue: 15, color: 'green', label: 'KD 15', thresholds: { green: 40, orange: 65 } },
          { name: 'cpc', rawValue: 2.0, color: 'green', label: '2.00€', thresholds: { green: 2 } },
          { name: 'paa', rawValue: 4, color: 'green', label: '4 PAA', thresholds: { green: 3, orange: 1 } },
          { name: 'autocomplete', rawValue: 2, color: 'green', label: 'Pos 2', thresholds: { green: 3, orange: 6 } },
        ],
        verdict: { level: 'GO', greenCount: 5, totalKpis: 5, autoNoGo: false },
        fromCache: false,
        cachedAt: null,
      }
    }

    it('addEntry with 5-word keyword and weak volume validates all roots', async () => {
      mockApiPost.mockImplementation((url: string) => {
        if (url.includes('creation%20site%20web%20entreprise%20toulouse')) {
          return Promise.resolve(weakVolumeResponse)
        }
        const keyword = decodeURIComponent(url.split('/keywords/')[1].split('/validate')[0])
        return Promise.resolve(makeRootResponse(keyword))
      })

      const c = await createCarousel()
      await c.addEntry('creation site web entreprise toulouse', 'pilier')

      expect(mockApiPost).toHaveBeenCalledTimes(4) // main + 3 roots
      const entry = c.entries.value[0]!
      expect(entry.rootVariants.size).toBe(3)
      expect(entry.rootVariants.has('creation site web entreprise')).toBe(true)
      expect(entry.rootVariants.has('creation site web')).toBe(true)
      expect(entry.rootVariants.has('creation site')).toBe(true)
      expect(entry.isLoadingRoots).toBe(false)
    })

    it('addEntry with 2-word keyword skips root validation', async () => {
      mockApiPost.mockResolvedValue(goResponse)
      const c = await createCarousel()
      await c.addEntry('seo local', 'pilier')

      expect(mockApiPost).toHaveBeenCalledTimes(1)
      expect(c.entries.value[0]?.rootVariants.size).toBe(0)
    })

    it('addEntry with green volume skips root validation', async () => {
      const greenResponse: ValidateResponse = {
        ...weakVolumeResponse,
        kpis: weakVolumeResponse.kpis.map(k =>
          k.name === 'volume' ? { ...k, color: 'green' as const, rawValue: 2000 } : k,
        ),
      }
      mockApiPost.mockResolvedValue(greenResponse)
      const c = await createCarousel()
      await c.addEntry('creation site web entreprise toulouse', 'pilier')

      expect(mockApiPost).toHaveBeenCalledTimes(1)
      expect(c.entries.value[0]?.rootVariants.size).toBe(0)
    })

    it('stores successful roots when one root fails (best-effort)', async () => {
      let rootCallIndex = 0
      mockApiPost.mockImplementation((url: string) => {
        if (url.includes('creation%20site%20web%20entreprise%20toulouse')) {
          return Promise.resolve(weakVolumeResponse)
        }
        rootCallIndex++
        if (rootCallIndex === 2) return Promise.reject(new Error('root API error'))
        const keyword = decodeURIComponent(url.split('/keywords/')[1].split('/validate')[0])
        return Promise.resolve(makeRootResponse(keyword))
      })

      const c = await createCarousel()
      await c.addEntry('creation site web entreprise toulouse', 'pilier')

      expect(c.entries.value[0]?.rootVariants.size).toBe(2)
      expect(c.entries.value[0]?.isLoadingRoots).toBe(false)
    })
  })
})
