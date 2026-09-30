/**
 * Radar d'un article rouvert, puis rescanné (recette du 2026-09-30).
 *
 * - FR-RAD-PERSIST, FR-RAD-DB-FIRST (MOT-10) : après un rechargement, l'onglet
 *   Radar montrait « Aucun mot-clé en attente » et « Cartes radar (0) » alors que
 *   la base avait la liste et le scan : les cartes n'étaient reprises que par
 *   l'invite « Charger Radar ». Le dernier scan enregistré revient d'office.
 * - FR-RAD-SEND-CAPTAIN (RAD-14) : un nouveau scan fait disparaître la liste des
 *   longues traînes, mais leur sélection restait : « Envoyer au Capitaine (5) »
 *   sans rien de coché, et 5 mots-clés invisibles partaient à l'étude.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, enableAutoUnmount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import type { RadarCard, RadarKeyword, KeywordRadarScanResult, RadarExploration } from '@shared/types/intent.types'
import type { LongTailSuggestion } from '@shared/types/long-tail.types'

const { mockApiGet, mockApiPost } = vi.hoisted(() => ({ mockApiGet: vi.fn(), mockApiPost: vi.fn() }))
vi.mock('@/services/api.service', () => ({
  apiGet: mockApiGet,
  apiPost: mockApiPost,
  apiPatch: vi.fn().mockResolvedValue({}),
  apiDelete: vi.fn().mockResolvedValue({}),
}))
vi.mock('@/utils/logger', () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))
vi.mock('@/stores/article/keyword-modifiers.store', () => ({
  useKeywordModifiersStore: () => ({ getEffective: () => [], setModifier: vi.fn() }),
}))

const { default: RadarPanel } = await import('@/components/intent/RadarPanel.vue')

function card(keyword: string): RadarCard {
  return {
    keyword, reasoning: '', kpis: null, paaItems: [], combinedScore: 55,
    scoreBreakdown: { paaMatchScore: 0, resonanceBonus: 0, opportunityScore: 0, intentValueScore: 0, cpcScore: 0, painAlignmentScore: 0, total: 55 },
    cachedPaa: false,
  } as RadarCard
}

function scan(keywords: string[]): KeywordRadarScanResult {
  return {
    specificTopic: 'Étapes', broadKeyword: 'recette', autocomplete: { suggestions: [], totalCount: 0 },
    cards: keywords.map(card), globalScore: 55, heatLevel: 'chaude', verdict: 'ok', scannedAt: '2026-09-30T01:31:11Z',
  } as unknown as KeywordRadarScanResult
}

const LISTE: RadarKeyword[] = [
  { keyword: 'étapes bien démarrer guide', reasoning: '' },
  { keyword: 'étapes bien démarrer comment choisir', reasoning: '' },
] as RadarKeyword[]

const ENREGISTRE: RadarExploration = {
  articleId: 1339, seed: 'étapes bien démarrer',
  context: { broadKeyword: 'recette', specificTopic: 'Étapes', painPoint: '', depth: 2 },
  generatedKeywords: LISTE, scanResult: scan(LISTE.map(k => k.keyword)), scannedAt: '2026-09-30T01:31:11Z',
} as RadarExploration

const LONGUES: LongTailSuggestion[] = [
  { keyword: 'étapes guide pas cher', rationale: 'r', preferenceScore: 9, derivedFromRoots: [] },
  { keyword: 'étapes guide avis', rationale: 'r', preferenceScore: 8, derivedFromRoots: [] },
]

function mountRadar() {
  return mount(RadarPanel, {
    props: {
      pilierKeyword: 'recette', articleTopic: 'Étapes', articleKeyword: 'étapes bien démarrer',
      articlePainPoint: 'Le lecteur ne sait pas par où commencer.', articleId: 1339, mode: 'workflow',
    },
    global: { stubs: { DouleurScannerResults: true, DouleurScannerInputs: true, RadarAiPanel: true } },
  })
}

type Wrapper = ReturnType<typeof mountRadar>
const results = (wrapper: Wrapper) => wrapper.findComponent({ name: 'DouleurScannerResults' })

enableAutoUnmount(afterEach)

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  mockApiGet.mockImplementation(async (url: string) => (url === '/articles/1339/radar-exploration' ? ENREGISTRE : null))
  mockApiPost.mockImplementation(async (url: string) => (url === '/keywords/radar/scan' ? scan(['étapes bien démarrer guide']) : {}))
})

describe('RadarPanel — un article rouvert retrouve son exploration (FR-RAD-PERSIST, MOT-10)', () => {
  it('la liste d’attente et les cartes du dernier scan enregistré reviennent d’office, sans rien payer', async () => {
    const wrapper = mountRadar()
    await flushPromises()

    expect(wrapper.find('[data-testid="radar-keywords-preview"]').text()).toContain('2 mots-clés à scanner')
    const shown = results(wrapper).props('scanResult') as KeywordRadarScanResult | null
    expect(shown?.cards.map(c => c.keyword)).toEqual(['étapes bien démarrer guide', 'étapes bien démarrer comment choisir'])
    expect(mockApiPost, 'aucun scan relancé').not.toHaveBeenCalled()
    expect(wrapper.emitted('scanned'), 'aucune étape Radar redemandée').toBeUndefined()
  })

  it('un article jamais scanné garde son invitation à scanner (pas de résultat vide)', async () => {
    mockApiGet.mockImplementation(async () => ({ ...ENREGISTRE, scanResult: { cards: [] } }))
    const wrapper = mountRadar()
    await flushPromises()
    expect(results(wrapper).props('scanResult')).toBeNull()
  })
})

describe('RadarPanel — un nouveau scan oublie les longues traînes cochées (FR-RAD-SEND-CAPTAIN, RAD-14)', () => {
  it('après le scan, « Envoyer au Capitaine » ne compte plus les longues traînes disparues', async () => {
    const wrapper = mountRadar()
    await flushPromises()
    results(wrapper).vm.$emit('long-tail-selected', LONGUES)
    await flushPromises()
    expect(results(wrapper).props('totalSelectedCount')).toBe(2)

    await wrapper.find('[data-testid="radar-keywords-preview"] .btn-action').trigger('click')
    await flushPromises()

    expect(mockApiPost).toHaveBeenCalledWith('/keywords/radar/scan', expect.anything(), expect.anything())
    expect(results(wrapper).props('totalSelectedCount'), 'plus aucune longue traîne sélectionnée').toBe(0)
  })
})
