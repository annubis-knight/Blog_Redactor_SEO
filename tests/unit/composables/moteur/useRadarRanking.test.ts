/**
 * Sprint D-2 (2026-05-02) — Tests useRadarRanking.
 *
 * Tri local des RadarCard par mix marketScore + relevanceScore. Filtre les
 * verdicts NOGO. Pas d'appel IA. Pas de mutation.
 */
import { describe, it, expect } from 'vitest'
import { ref, computed } from 'vue'
import { useRadarRanking } from '@/composables/moteur/useRadarRanking'
import type { RadarCard } from '@shared/types/intent.types'

function makeCard(over: Partial<RadarCard> & { keyword: string }): RadarCard {
  return {
    keyword: over.keyword,
    reasoning: '',
    paaItems: [],
    combinedScore: 50,
    scoreBreakdown: {
      paaMatchScore: 50,
      resonanceBonus: 50,
      opportunityScore: 50,
      intentValueScore: 50,
      cpcScore: 50,
      painAlignmentScore: 50,
      total: 50,
    },
    cachedPaa: false,
    kpis: {
      searchVolume: 1000,
      difficulty: 30,
      cpc: 1.5,
      competition: 0.4,
      intentTypes: ['informational' as const],
      intentProbability: 0.8,
      autocompleteMatchCount: 2,
      paaMatchCount: 1,
      paaWeightedScore: 1.5,
      paaTotal: 3,
      avgSemanticScore: null,
    },
    ...over,
  }
}

describe('useRadarRanking', () => {
  it('liste vide → ranked vide', () => {
    const cards = ref<RadarCard[]>([])
    const { ranked } = useRadarRanking({ cards: computed(() => cards.value) })
    expect(ranked.value).toEqual([])
  })

  it('trie par marketScore + relevanceScore décroissant', () => {
    const cards = ref<RadarCard[]>([
      makeCard({
        keyword: 'low',
        marketScore: { total: 30, verdict: 'NOGO', components: [] as any },
        relevanceScore: { total: 30, verdict: 'NOGO', breakdown: {} as any, rootsContext: null },
      }),
      makeCard({
        keyword: 'high',
        marketScore: { total: 80, verdict: 'GO', components: [] as any },
        relevanceScore: { total: 70, verdict: 'GO', breakdown: {} as any, rootsContext: null },
      }),
      makeCard({
        keyword: 'mid',
        marketScore: { total: 60, verdict: 'ORANGE', components: [] as any },
        relevanceScore: { total: 50, verdict: 'ORANGE', breakdown: {} as any, rootsContext: null },
      }),
    ])
    const { ranked } = useRadarRanking({ cards: computed(() => cards.value) })
    // 'low' filtré (NOGO sur les deux), donc top = high puis mid
    expect(ranked.value.map(c => c.keyword)).toEqual(['high', 'mid'])
  })

  it('filtre les verdicts NOGO sur les DEUX scores', () => {
    const cards = ref<RadarCard[]>([
      makeCard({
        keyword: 'kept',
        marketScore: { total: 45, verdict: 'ORANGE', components: [] as any },
        relevanceScore: { total: 40, verdict: 'ORANGE', breakdown: {} as any, rootsContext: null },
      }),
      makeCard({
        keyword: 'dropped',
        marketScore: { total: 35, verdict: 'NOGO', components: [] as any },
        relevanceScore: { total: 35, verdict: 'NOGO', breakdown: {} as any, rootsContext: null },
      }),
    ])
    const { ranked } = useRadarRanking({ cards: computed(() => cards.value) })
    expect(ranked.value.map(c => c.keyword)).toEqual(['kept'])
  })

  it('garde une carte si AU MOINS un des deux verdicts n\'est pas NOGO', () => {
    const cards = ref<RadarCard[]>([
      makeCard({
        keyword: 'partial',
        marketScore: { total: 60, verdict: 'GO', components: [] as any },
        relevanceScore: { total: 30, verdict: 'NOGO', breakdown: {} as any, rootsContext: null },
      }),
    ])
    const { ranked } = useRadarRanking({ cards: computed(() => cards.value) })
    expect(ranked.value).toHaveLength(1)
  })

  it('cards sans marketScore ni relevanceScore → fallback sur combinedScore', () => {
    const cards = ref<RadarCard[]>([
      makeCard({ keyword: 'fallback-a', combinedScore: 80 }),
      makeCard({ keyword: 'fallback-b', combinedScore: 40 }),
    ])
    const { ranked } = useRadarRanking({ cards: computed(() => cards.value) })
    expect(ranked.value.map(c => c.keyword)).toEqual(['fallback-a', 'fallback-b'])
  })

  it('topN configurable (défaut 5)', () => {
    const cards = ref<RadarCard[]>(
      Array.from({ length: 10 }, (_, i) => makeCard({
        keyword: `kw-${i}`,
        marketScore: { total: 100 - i, verdict: 'GO', components: [] as any },
        relevanceScore: { total: 100 - i, verdict: 'GO', breakdown: {} as any, rootsContext: null },
      })),
    )
    const def = useRadarRanking({ cards: computed(() => cards.value) })
    expect(def.ranked.value.length).toBe(5)
    const custom = useRadarRanking({ cards: computed(() => cards.value), topN: 3 })
    expect(custom.ranked.value.length).toBe(3)
  })

  it('expose finalScore + marketTotal + relevanceTotal pour affichage', () => {
    const cards = ref<RadarCard[]>([
      makeCard({
        keyword: 'kw',
        marketScore: { total: 70, verdict: 'GO', components: [] as any },
        relevanceScore: { total: 60, verdict: 'GO', breakdown: {} as any, rootsContext: null },
      }),
    ])
    const { ranked } = useRadarRanking({ cards: computed(() => cards.value) })
    const top = ranked.value[0]
    expect(top.marketTotal).toBe(70)
    expect(top.relevanceTotal).toBe(60)
    expect(top.finalScore).toBeGreaterThan(0)
  })
})
