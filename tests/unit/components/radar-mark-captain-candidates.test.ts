/**
 * FR-RAD-AI-SUGGESTIONS — « Marquer comme candidats Capitaine (N) » transmet la
 * sélection au Capitaine.
 *
 * Recette du 2026-09-30 (RAD-11) : le bouton décochait les cases et rien
 * n'arrivait au Capitaine. `RadarAiPanel` émettait bien les mots-clés,
 * `RadarPanel` les relayait sous un nom (`captain-candidates-marked`) que
 * personne n'écoutait. Le bouton passe maintenant par le même chemin que
 * « Envoyer au Capitaine » (`cards-selected`, écouté par MoteurView) : les
 * cartes du scan partent, avec leurs indicateurs.
 *
 * Le vrai panneau « Suggestions IA Radar » tourne ; le scan est simulé.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import RadarPanel from '../../../src/components/intent/RadarPanel.vue'

const mockScanResult = ref<Record<string, unknown> | null>(null)

vi.mock('../../../src/composables/keyword/useResonanceScore', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('../../../src/composables/keyword/useResonanceScore')
  return {
    ...actual,
    useKeywordRadar: () => ({
      generatedKeywords: ref([]),
      scanResult: mockScanResult,
      isGenerating: ref(false),
      isScanning: ref(false),
      scanProgress: ref({ phase: '', scanned: 0, total: 0 }),
      error: ref(null),
      heatColor: ref('#22c55e'),
      heatLabel: ref('Chaude'),
      radarCacheStatus: ref(null),
      checkRadarCache: vi.fn(),
      loadFromRadarCache: vi.fn(async () => true),
      mergeFromRadarSource: vi.fn(async () => true),
      mergeRadarPayload: vi.fn(),
      generate: vi.fn(),
      scan: vi.fn(),
      removeKeyword: vi.fn(),
      reset: vi.fn(),
    }),
  }
})

vi.mock('../../../src/stores/article/keyword-modifiers.store', () => ({
  useKeywordModifiersStore: () => ({ getEffective: () => [], setModifier: vi.fn() }),
}))

vi.mock('../../../src/utils/logger', () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

function makeCard(keyword: string, market: number) {
  return {
    keyword,
    reasoning: '',
    combinedScore: market,
    cachedPaa: false,
    kpis: {
      searchVolume: 900, difficulty: 20, cpc: 1.5, competition: 0.3, paaTotal: 2,
      paaMatchCount: 0, paaWeightedScore: 0, intentTypes: [], intentProbability: null,
      autocompleteMatchCount: 0, avgSemanticScore: null,
    },
    paaItems: [],
    scoreBreakdown: { paaMatchScore: 0, resonanceBonus: 0, opportunityScore: 0, intentValueScore: 0, cpcScore: 0, painAlignmentScore: 0, total: market },
    marketScore: { total: market, verdict: 'GO', components: [] },
  }
}

const wrappers: Array<{ unmount: () => void }> = []

function mountRadar() {
  const wrapper = mount(RadarPanel, {
    props: {
      pilierKeyword: 'création site',
      articleTopic: 'Prix d’un site vitrine',
      articleKeyword: 'prix site vitrine',
      articlePainPoint: 'Le lecteur ne sait pas combien prévoir.',
      articleLevel: 'intermediaire',
      injectedKeywords: [],
      mode: 'libre',
    },
    attachTo: document.body,
  })
  wrappers.push(wrapper)
  return wrapper
}

beforeEach(() => {
  setActivePinia(createPinia())
  mockScanResult.value = {
    globalScore: 60,
    heatLevel: 'Chaude',
    cards: [makeCard('prix site vitrine', 61), makeCard('site vitrine artisan', 55), makeCard('tarif site web', 50)],
    autocomplete: { suggestions: [], totalCount: 0 },
  }
})

afterEach(() => {
  while (wrappers.length) wrappers.pop()!.unmount()
})

describe('FR-RAD-AI-SUGGESTIONS — « Marquer comme candidats Capitaine » transmet la sélection', () => {
  it('les cartes cochées dans « Suggestions IA Radar » partent au Capitaine, avec leurs indicateurs', async () => {
    const wrapper = mountRadar()
    const panel = wrapper.find('[data-testid="ai-panel-suggestion"]')
    const rows = panel.findAll('.radar-ai-item')
    const byKeyword = (kw: string) => rows.find(r => r.text().includes(kw))!.find('input[type="checkbox"]')

    await byKeyword('prix site vitrine').setValue(true)
    await byKeyword('tarif site web').setValue(true)
    const handoff = panel.find('[data-testid="radar-ai-handoff"]')
    expect(handoff.text()).toContain('(2)')
    await handoff.trigger('click')

    const sent = wrapper.emitted('cards-selected')
    expect(sent, 'le Capitaine reçoit la sélection').toBeTruthy()
    const cards = sent![0]![0] as Array<{ keyword: string; kpis: unknown }>
    expect(cards.map(c => c.keyword).sort()).toEqual(['prix site vitrine', 'tarif site web'])
    // Ce sont les cartes du scan, pas des mots-clés nus : le Capitaine garde leurs indicateurs.
    expect(cards.every(c => c.kpis !== null)).toBe(true)
    // Les cases se décochent.
    expect(panel.find('[data-testid="radar-ai-handoff"]').text()).toContain('(0)')
  })
})
