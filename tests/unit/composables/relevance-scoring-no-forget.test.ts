/**
 * FR-DIS-RELEVANCE-FILTER — le filtre de pertinence n'oublie aucun jugement et
 * ne rejuge jamais un mot-clé déjà jugé (recette 2026-09-30, DIS-5, DIS-6, DIS-8).
 *
 * Avant : un plafond de 500 jugements oubliait les premiers jugés dès qu'une
 * découverte dépassait 500 mots-clés (644 et 1004 en recette) ; oubliés, ils
 * passaient pour « pertinents » (hors-sujet affiché) et étaient rejugés — donc
 * repayés en réel — à chaque ajout de mots-clés (courte-traîne, autre source).
 * « Découvrir » envoyait aussi deux fois les mêmes lots.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, computed } from 'vue'
import { useRelevanceScoring } from '@/composables/keyword/useRelevanceScoring'
import type { DiscoveredKeyword } from '@shared/types/discovery-tab.types'

const judged: string[] = []
const strictJudged: string[] = []

vi.mock('@/services/api.service', () => ({
  apiPost: vi.fn(async (_path: string, body: { keywords: string[]; strict: boolean }) => {
    ;(body.strict ? strictJudged : judged).push(...body.keywords)
    // Filtre simulé : tout ce qui contient « lyon » est hors sujet.
    const scores = Object.fromEntries(body.keywords.map(k => [k, k.includes('lyon') ? 0.1 : 0.9]))
    return { scores, fallback: false }
  }),
}))

vi.mock('@/utils/logger', () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

function keywords(prefix: string, n: number, source: DiscoveredKeyword['source'] = 'suggest-questions'): DiscoveredKeyword[] {
  return Array.from({ length: n }, (_, i) => ({ keyword: `${prefix} ${i}`, source }))
}

function setup(initial: DiscoveredKeyword[]) {
  const list = ref<DiscoveredKeyword[]>(initial)
  const allKeywordsFlat = computed(() => list.value)
  const uniqueKeywordCount = computed(() => new Set(list.value.map(k => k.keyword.toLowerCase())).size)
  const scoring = useRelevanceScoring({
    lastSeed: ref('mesurer résultats'),
    lastArticleContext: ref({}),
    allKeywordsFlat,
    uniqueKeywordCount,
  })
  return { list, scoring }
}

beforeEach(() => {
  judged.length = 0
  strictJudged.length = 0
})

describe('FR-DIS-RELEVANCE-FILTER — au-delà de 500 mots-clés', () => {
  it('chaque mot-clé est jugé une fois, et le hors-sujet jugé en premier reste masqué', async () => {
    // 400 hors-sujet d'abord (« lyon »), puis 604 pertinents : 1004 en tout.
    const { scoring } = setup([...keywords('mesurer résultats lyon', 400), ...keywords('mesurer résultats', 604)])
    await scoring.fetchRelevanceScores()

    expect(scoring.relevanceScores.value.size, 'aucun jugement oublié').toBe(1004)
    expect(judged, 'un seul jugement par mot-clé').toHaveLength(1004)
    expect(scoring.checkRelevance('mesurer résultats lyon 0'), 'le premier jugé reste hors sujet').toBe(false)
    expect(scoring.relevantCount.value).toBe(604)
  })

  it('des mots-clés arrivés ensuite sont jugés seuls : les anciens ne sont ni rejugés, ni repassés en strict', async () => {
    const { list, scoring } = setup([...keywords('mesurer résultats lyon', 300), ...keywords('mesurer résultats', 400)])
    await scoring.fetchRelevanceScores()
    judged.length = 0
    strictJudged.length = 0

    list.value = [...list.value, ...keywords('mesurer résultats rapide', 15, 'longtail-ai')]
    await scoring.fetchRelevanceScores()

    expect(judged, 'seuls les 15 nouveaux').toHaveLength(15)
    expect(strictJudged.every(k => k.startsWith('mesurer résultats rapide')), 'la passe stricte ne reprend que les nouveaux').toBe(true)
  })

  it('relancer sans nouveau mot-clé ne rejuge rien', async () => {
    const { scoring } = setup(keywords('mesurer résultats', 650))
    await scoring.fetchRelevanceScores()
    judged.length = 0
    strictJudged.length = 0
    await scoring.fetchRelevanceScores()
    expect(judged).toHaveLength(0)
    expect(strictJudged).toHaveLength(0)
  })
})
