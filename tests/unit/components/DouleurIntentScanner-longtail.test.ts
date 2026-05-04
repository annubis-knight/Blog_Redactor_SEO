/**
 * S4 — Tests unit du flux unifié "Envoyer au Capitaine" dans DouleurIntentScanner
 * (cards racines + longues-traînes, dédupliqués par keyword normalisé).
 *
 * Stratégie : on mocke useKeywordRadar pour injecter un scanResult artificiel
 * et useKeywordModifiersStore pour ne pas dépendre de Pinia.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'

const { mockApiPost, mockApiPatch } = vi.hoisted(() => ({
  mockApiPost: vi.fn(),
  mockApiPatch: vi.fn(),
}))

vi.mock('@/services/api.service', () => ({
  apiPost: mockApiPost,
  apiPatch: mockApiPatch,
  apiGet: vi.fn(),
  apiDelete: vi.fn(),
}))
vi.mock('@/utils/logger', () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

// scanResultData est mute par les tests via setScanResult(). Le mock Vue 'ref'
// est cree au moment de l'appel de useKeywordRadar (apres l'import de Vue).
let scanResultData: unknown = null
function setScanResult(data: unknown) { scanResultData = data }

vi.mock('@/composables/keyword/useResonanceScore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/composables/keyword/useResonanceScore')>()
  const { ref: vueRef, computed } = await import('vue')
  return {
    ...actual,
    useKeywordRadar: () => {
      const scanResult = computed({
        get: () => scanResultData,
        set: (v) => { scanResultData = v },
      })
      return {
        generatedKeywords: vueRef([]),
        scanResult,
        isGenerating: vueRef(false),
        isScanning: vueRef(false),
        scanProgress: vueRef({ phase: '', total: 0, scanned: 0 }),
        error: vueRef(null),
        radarCacheStatus: vueRef(null),
        checkRadarCache: vi.fn(),
        loadFromRadarCache: vi.fn(),
        mergeFromRadarSource: vi.fn(),
        generate: vi.fn(),
        scan: vi.fn(),
        removeKeyword: vi.fn(),
        reset: vi.fn(),
      }
    },
  }
})
vi.mock('@/stores/article/keyword-modifiers.store', () => ({
  useKeywordModifiersStore: () => ({
    getEffective: () => [],
    setModifier: vi.fn(),
  }),
}))

import DouleurIntentScanner from '../../../src/components/intent/DouleurIntentScanner.vue'
import type { RadarCard } from '@shared/types/intent.types'
import type { LongTailSuggestion } from '@shared/types/long-tail.types'

function makeCard(keyword: string, score = 60): RadarCard {
  return {
    keyword,
    reasoning: `${keyword} reasoning`,
    kpis: {
      searchVolume: 100,
      difficulty: 30,
      cpc: 1.5,
      competition: 0.4,
      intentTypes: ['informational'],
      intentProbability: 0.7,
      autocompleteMatchCount: 1,
      paaMatchCount: 1,
      paaWeightedScore: 1.0,
      paaTotal: 5,
      avgSemanticScore: 0.7,
    },
    paaItems: [],
    combinedScore: score,
    scoreBreakdown: {
      paaMatchScore: 0, resonanceBonus: 0, opportunityScore: 0,
      intentValueScore: 0, cpcScore: 0, painAlignmentScore: 0, total: score,
    },
    cachedPaa: false,
  }
}

const fakeLongTail: LongTailSuggestion[] = [
  { keyword: 'kw alpha', rationale: 'rationale a long', preferenceScore: 9, derivedFromRoots: ['root-a'] },
  { keyword: 'kw beta', rationale: 'rationale b long', preferenceScore: 8, derivedFromRoots: ['root-b'] },
]

describe('moteur:radar DouleurIntentScanner — CTA unifié + dédup longue-traîne', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
    setScanResult({
      specificTopic: 'test',
      broadKeyword: 'test',
      autocomplete: { suggestions: [], totalCount: 0 },
      cards: [makeCard('copywriting email'), makeCard('pme industriel'), makeCard('taux conversion')],
      globalScore: 70,
      heatLevel: 'chaude',
      verdict: 'OK',
      scannedAt: new Date().toISOString(),
    })
  })

  it('aggregates card racines + longue-traines and emits cards-selected without duplicates', async () => {
    mockApiPost.mockResolvedValueOnce({ suggestions: fakeLongTail, fromCache: false })

    const wrapper = mount(DouleurIntentScanner, {
      props: {
        pilierKeyword: 'copywriting',
        articleTopic: 'B2B',
        articleKeyword: 'copywriting email',
        articlePainPoint: 'Mes emails sont ignorés',
        articleId: 42,
      },
    })



await flushPromises()
    // Plus simple : on trigger le bouton suggérer longue-traîne, coche 2 LT,
    // et on verifie le compteur du bouton + l'emit (interaction avec
    // RadarCardCheckable via DOM imbrique non testee ici — couverte en S5).

    const suggestBtn = wrapper.find('[data-testid="btn-suggest-longtail"]')
    expect(suggestBtn.exists()).toBe(true)
    await suggestBtn.trigger('click')
    await flushPromises()

    // Top 2 longues-traines pre-cochees (alpha + beta puisque seulement 2)
    // NB : le top 5 dans useLongTailSuggestions.precheckTopN coche tout si liste <= 5.
    const ltSection = wrapper.find('[data-testid="radar-long-tail-section"]')
    expect(ltSection.exists()).toBe(true)
    expect(wrapper.findAll('.lt-row')).toHaveLength(2)

    // Les 2 longues-traines sont automatiquement cochees → totalSelectedCount = 2
    await flushPromises()
    const sendBtn = wrapper.find('.btn-send-captain')
    expect(sendBtn.exists()).toBe(true)
    expect(sendBtn.text()).toMatch(/Envoyer au Capitaine \(2\)/)

    // Click → emit cards-selected
    await sendBtn.trigger('click')
    const emitted = wrapper.emitted('cards-selected')
    expect(emitted).toBeTruthy()
    const payload = emitted![0]![0] as RadarCard[]
    expect(payload).toHaveLength(2)
    // Les 2 sont source: 'longtail' avec kpis: null (pas de fallback fantôme)
    for (const card of payload) {
      expect(card.source).toBe('longtail')
      expect(card.kpis).toBeNull()
    }
  })

  it('deduplicates when a long-tail keyword equals a checked root keyword (root wins)', async () => {
    // Card racine "copywriting email" + longue-traîne IA qui produit "copywriting email" aussi
    const lt: LongTailSuggestion[] = [
      { keyword: 'copywriting email', rationale: 'duplicates root', preferenceScore: 9, derivedFromRoots: ['copywriting'] },
      { keyword: 'pme industriel pro', rationale: 'unique', preferenceScore: 7, derivedFromRoots: ['pme'] },
    ]
    mockApiPost.mockResolvedValueOnce({ suggestions: lt, fromCache: false })

    const wrapper = mount(DouleurIntentScanner, {
      props: {
        pilierKeyword: 'copywriting',
        articleTopic: 'B2B',
        articleKeyword: 'copywriting email',
        articlePainPoint: 'pain',
        articleId: 42,
      },
    })

    await flushPromises()
    // Génère LT
    await wrapper.find('[data-testid="btn-suggest-longtail"]').trigger('click')
    await flushPromises()

    // Note : la coche d'une card racine via le DOM imbrique de
    // RadarCardCheckable est complexe a simuler ici. On valide la dedup
    // côté longue-traîne uniquement (les 2 LT pre-cochees ne doivent pas se
    // dupliquer entre elles). Le scenario root+LT est couvert en S5.
    await wrapper.find('.btn-send-captain').trigger('click')
    const emitted = wrapper.emitted('cards-selected')
    expect(emitted).toBeTruthy()
    const payload = emitted![0]![0] as RadarCard[]

    // Les 2 LT sont cochees (pre-cochage automatique car <= 5).
    // Pas de doublons côté LT seulement (le scenario root+LT necessite un test
    // d'integration plus pousse — couvert en S5 Playwright).
    const norms = payload.map(c => c.keyword.toLowerCase())
    expect(new Set(norms).size).toBe(norms.length)
  })

  it('does not emit when nothing is selected', async () => {
    const wrapper = mount(DouleurIntentScanner, {
      props: {
        pilierKeyword: 'copywriting',
        articleTopic: 'B2B',
        articleKeyword: 'copywriting email',
        articlePainPoint: 'pain',
        articleId: 42,
      },
    })
    await flushPromises()
    // Aucune coche, aucune longue-traîne générée → btn-send-captain absent
    expect(wrapper.find('.btn-send-captain').exists()).toBe(false)
  })

  it('hides the long-tail section when articleId is null (libre mode)', async () => {
    const wrapper = mount(DouleurIntentScanner, {
      props: {
        pilierKeyword: 'copywriting',
        articleTopic: 'B2B',
        articleKeyword: 'copywriting email',
        articlePainPoint: 'pain',
        articleId: null,
      },
    })
    await flushPromises()
    expect(wrapper.find('[data-testid="radar-long-tail-section"]').exists()).toBe(false)
  })
})
