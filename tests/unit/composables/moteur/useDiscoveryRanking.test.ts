/**
 * Sprint D-1 (2026-05-02) — Tests useDiscoveryRanking.
 *
 * Tri local du basket Discovery par signal-density × pain-alignment Jaccard.
 * Aucun appel IA. Pas de mutation du store.
 */
import { describe, it, expect } from 'vitest'
import { ref, computed } from 'vue'
import { useDiscoveryRanking } from '@/composables/moteur/useDiscoveryRanking'
import type { BasketKeyword } from '@/stores/article/moteur-basket.store'

function makeBasket(items: Array<Partial<BasketKeyword> & { keyword: string }>): BasketKeyword[] {
  return items.map((it, i) => ({
    keyword: it.keyword,
    source: it.source ?? 'discovery',
    addedAt: it.addedAt ?? `2026-05-02T00:00:0${i}.000Z`,
    reasoning: it.reasoning,
    score: it.score,
    validated: it.validated ?? false,
  }))
}

describe('useDiscoveryRanking', () => {
  it('basket vide → ranked vide', () => {
    const basket = ref<BasketKeyword[]>([])
    const painPoint = ref<string | null>(null)
    const { ranked } = useDiscoveryRanking({
      basket: computed(() => basket.value),
      painPoint: computed(() => painPoint.value),
    })
    expect(ranked.value).toEqual([])
  })

  it('trie par score décroissant (signal × Jaccard)', () => {
    const basket = ref<BasketKeyword[]>(makeBasket([
      // Faible alignement douleur (Jaccard) mais score basket élevé
      { keyword: 'velo electrique paris', score: 90, reasoning: '' },
      // Fort alignement douleur (mots en commun avec painPoint)
      { keyword: 'douleur articulation genou', score: 30, reasoning: '' },
      // Ni l'un ni l'autre
      { keyword: 'cuisine vegetarienne facile', score: 20, reasoning: '' },
    ]))
    const painPoint = ref<string | null>('Soulager douleur articulation chronique genou')
    const { ranked } = useDiscoveryRanking({
      basket: computed(() => basket.value),
      painPoint: computed(() => painPoint.value),
    })
    // Le 2ᵉ doit être tout en haut grâce au gros bonus pain alignment.
    expect(ranked.value[0].keyword).toBe('douleur articulation genou')
  })

  it('chaque item ranked expose un score, un signal et un painAlignment', () => {
    const basket = ref<BasketKeyword[]>(makeBasket([{ keyword: 'douleur dos chronique', score: 50 }]))
    const painPoint = ref<string | null>('Vivre avec douleur chronique au dos')
    const { ranked } = useDiscoveryRanking({
      basket: computed(() => basket.value),
      painPoint: computed(() => painPoint.value),
    })
    const top = ranked.value[0]
    expect(top).toHaveProperty('signalScore')
    expect(top).toHaveProperty('painAlignment')
    expect(top).toHaveProperty('finalScore')
    expect(top.painAlignment).toBeGreaterThan(0)
  })

  it('limite top par défaut à 10', () => {
    const items = Array.from({ length: 25 }, (_, i) => ({
      keyword: `kw-${i}`,
      score: 100 - i,
    }))
    const basket = ref<BasketKeyword[]>(makeBasket(items))
    const painPoint = ref<string | null>(null)
    const { ranked } = useDiscoveryRanking({
      basket: computed(() => basket.value),
      painPoint: computed(() => painPoint.value),
    })
    expect(ranked.value.length).toBe(10)
  })

  it('topN configurable', () => {
    const items = Array.from({ length: 25 }, (_, i) => ({
      keyword: `kw-${i}`,
      score: 100 - i,
    }))
    const basket = ref<BasketKeyword[]>(makeBasket(items))
    const painPoint = ref<string | null>(null)
    const { ranked } = useDiscoveryRanking({
      basket: computed(() => basket.value),
      painPoint: computed(() => painPoint.value),
      topN: 5,
    })
    expect(ranked.value.length).toBe(5)
  })

  it('ne mute pas le basket d\'origine', () => {
    const arr = makeBasket([
      { keyword: 'a', score: 1 },
      { keyword: 'b', score: 5 },
    ])
    const original = [...arr]
    const basket = ref<BasketKeyword[]>(arr)
    const painPoint = ref<string | null>(null)
    const { ranked } = useDiscoveryRanking({
      basket: computed(() => basket.value),
      painPoint: computed(() => painPoint.value),
    })
    void ranked.value
    expect(basket.value).toEqual(original)
  })

  it('reasoning expose une raison lisible (signal fort / aligné douleur)', () => {
    const basket = ref<BasketKeyword[]>(makeBasket([
      { keyword: 'douleur dos chronique', score: 80 },
    ]))
    const painPoint = ref<string | null>('Vivre avec douleur chronique au dos')
    const { ranked } = useDiscoveryRanking({
      basket: computed(() => basket.value),
      painPoint: computed(() => painPoint.value),
    })
    expect(ranked.value[0].reason).toBeTruthy()
    expect(ranked.value[0].reason).toMatch(/aligné|signal|douleur/i)
  })
})
