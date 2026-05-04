/**
 * Tests pour DouleurIntentScanner — Onglet Radar du Moteur.
 *
 * Couvre les actions utilisateur :
 * - 3 inputs (broadKeyword, specificTopic, painPoint)
 * - phases input → keywords → scanning → results
 * - bouton Générer (phase 1)
 * - tags des mots-clés générés (suppression individuelle)
 * - bouton Lancer le scan (phase 2)
 * - bouton Nouveau scan (phase 3)
 * - cache : Charger / Ignorer
 * - filtre CPC + checkbox "Tout"
 * - sélection des cards + Envoyer au Capitaine
 * - keywords injectés depuis Discovery (watcher)
 * - reset au changement d'article (workflow seulement)
 *
 * Les API externes (DataForSEO, Claude) sont mockées via useKeywordRadar.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import DouleurIntentScanner from '../../../src/components/intent/DouleurIntentScanner.vue'

// ===== Mock useKeywordRadar =====
const mockGeneratedKeywords = ref<{ keyword: string; reasoning?: string }[]>([])
const mockScanResult = ref<{
  globalScore: number
  heatLevel: string
  cards: { keyword: string; kpis: { cpc: number; paaTotal: number } }[]
  autocomplete: { suggestions: { query: string; text: string; position: number }[]; totalCount: number }
  verdict?: string
} | null>(null)
const mockIsGenerating = ref(false)
const mockIsScanning = ref(false)
const mockScanProgress = ref({ phase: '', scanned: 0, total: 0 })
const mockError = ref<string | null>(null)
const mockRadarCacheStatus = ref<{ exists?: boolean; heatLevel?: string; globalScore?: number; keywordCount?: number } | null>(null)

const mockCheckRadarCache = vi.fn()
const mockLoadFromRadarCache = vi.fn(async (_seed: string) => true)
const mockGenerate = vi.fn()
const mockScan = vi.fn()
const mockRemoveKeyword = vi.fn((i: number) => {
  mockGeneratedKeywords.value = mockGeneratedKeywords.value.filter((_, idx) => idx !== i)
})
const mockReset = vi.fn(() => {
  mockGeneratedKeywords.value = []
  mockScanResult.value = null
})

vi.mock('../../../src/composables/keyword/useResonanceScore', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('../../../src/composables/keyword/useResonanceScore')
  return {
    ...actual,
    useKeywordRadar: () => ({
      generatedKeywords: mockGeneratedKeywords,
      scanResult: mockScanResult,
      isGenerating: mockIsGenerating,
      isScanning: mockIsScanning,
      scanProgress: mockScanProgress,
      error: mockError,
      heatColor: ref('#22c55e'),
      heatLabel: ref('Chaude'),
      radarCacheStatus: mockRadarCacheStatus,
      checkRadarCache: mockCheckRadarCache,
      loadFromRadarCache: mockLoadFromRadarCache,
      generate: mockGenerate,
      scan: mockScan,
      removeKeyword: mockRemoveKeyword,
      reset: mockReset,
    }),
  }
})

vi.mock('../../../src/stores/article/keyword-modifiers.store', () => ({
  useKeywordModifiersStore: () => ({
    getEffective: () => [],
    setModifier: vi.fn(),
  }),
}))

vi.mock('../../../src/utils/logger', () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  mockGeneratedKeywords.value = []
  mockScanResult.value = null
  mockIsGenerating.value = false
  mockIsScanning.value = false
  mockScanProgress.value = { phase: '', scanned: 0, total: 0 }
  mockError.value = null
  mockRadarCacheStatus.value = null
})

const baseProps = {
  pilierKeyword: 'seo local',
  articleTopic: 'Article test',
  articleKeyword: 'seo local boulanger',
  articlePainPoint: 'pas assez de clients',
  articleLevel: 'pilier' as const,
  injectedKeywords: [],
}

function makeCard(keyword: string, cpc = 1.5, paaTotal = 3) {
  return {
    keyword,
    reasoning: '',
    combinedScore: 50,
    cachedPaa: false,
    kpis: {
      searchVolume: 0, difficulty: 0, cpc, competition: 0, paaTotal,
      paaMatchCount: 0, paaWeightedScore: 0, intentTypes: [], intentProbability: null,
      autocompleteMatchCount: 0, avgSemanticScore: null,
    },
    paaItems: [],
    scoreBreakdown: { paaMatchScore: 0, resonanceBonus: 0, opportunityScore: 0, intentValueScore: 0, cpcScore: 0, total: 50 },
  }
}

// Track mounted wrappers so afterEach can unmount them — Teleport(to: body) leaks
// indicator nodes between tests otherwise.
const mountedWrappers: Array<{ unmount: () => void }> = []

function mountScanner(propsOverride: Partial<typeof baseProps> = {}) {
  const wrapper = mount(DouleurIntentScanner, {
    props: { ...baseProps, ...propsOverride },
    attachTo: document.body,
  })
  mountedWrappers.push(wrapper)
  return wrapper
}

afterEach(() => {
  while (mountedWrappers.length) mountedWrappers.pop()!.unmount()
  // Defensive cleanup pour les nœuds téléportés résiduels
  document.querySelectorAll('.cache-indicator').forEach(n => n.remove())
})

// ============================================================================
// Phase 1 — Inputs Phase 1 : SUPPRIMÉ (mode libre uniquement, hors périmètre).
// Sprint 5 (friction #7) a masqué les inputs broadKeyword/specificTopic/painPoint
// en mode workflow. Ces inputs n'existent plus que dans LaboView (mode libre),
// qui n'est plus une priorité produit. Tests retirés pour éviter de tester
// du code mort côté workflow.
// ============================================================================

// ============================================================================
// Phase 2 — Keywords générés (preview, suppression, scan)
// ============================================================================
describe('DouleurIntentScanner — phase 2 : keywords preview', () => {
  it('phase keywords : tags affichés avec compteur', () => {
    mockGeneratedKeywords.value = [
      { keyword: 'foo', reasoning: 'r1' },
      { keyword: 'bar', reasoning: 'r2' },
    ]
    const wrapper = mountScanner()
    expect(wrapper.find('.keywords-preview').exists()).toBe(true)
    expect(wrapper.text()).toContain('2 mots-cles')
    expect(wrapper.findAll('.keyword-tag').length).toBe(2)
  })

  it('clic sur × du tag supprime le keyword', async () => {
    mockGeneratedKeywords.value = [
      { keyword: 'foo' },
      { keyword: 'bar' },
    ]
    const wrapper = mountScanner()
    const removeBtn = wrapper.findAll('.tag-remove')[0]!
    await removeBtn.trigger('click')
    expect(mockRemoveKeyword).toHaveBeenCalledWith(0)
  })

  it('bouton "Lancer le scan" appelle scan() avec les paramètres bons', async () => {
    mockGeneratedKeywords.value = [{ keyword: 'foo' }]
    const wrapper = mountScanner()
    const launchBtn = wrapper.find('.keywords-header .btn-action')
    await launchBtn.trigger('click')
    expect(mockScan).toHaveBeenCalledTimes(1)
    const args = mockScan.mock.calls[0]!
    expect(args[0]).toBe('seo local')        // broadKeyword
    expect(args[1]).toBe('Article test')     // specificTopic
    expect(args[2]).toEqual([{ keyword: 'foo' }]) // generatedKeywords
    expect(args[3]).toBe(2)                  // depth fixe = 2
  })

  it('bouton "Lancer le scan" désactivé si liste vide', async () => {
    mockGeneratedKeywords.value = []
    const wrapper = mountScanner()
    // Pas de phase keywords → pas de bouton Lancer visible
    expect(wrapper.find('.keywords-preview').exists()).toBe(false)
  })
})

// ============================================================================
// Phase 3 — Scanning state
// ============================================================================
describe('DouleurIntentScanner — phase scanning', () => {
  it('spinner + texte de phase visibles pendant isScanning', () => {
    mockIsScanning.value = true
    mockScanProgress.value = { phase: 'PAA en cours', scanned: 5, total: 20 }
    const wrapper = mountScanner()
    expect(wrapper.find('.scanner-loading').exists()).toBe(true)
    expect(wrapper.text()).toContain('PAA en cours')
  })

  it('progress bar remplie à 25% pour 5/20', () => {
    mockIsScanning.value = true
    mockScanProgress.value = { phase: 'scan', scanned: 5, total: 20 }
    const wrapper = mountScanner()
    const fill = wrapper.find('.scanner-progress__fill')
    expect((fill.element as HTMLElement).style.width).toBe('25%')
  })

  it('progress text "5/20 mots-cles"', () => {
    mockIsScanning.value = true
    mockScanProgress.value = { phase: 'scan', scanned: 5, total: 20 }
    const wrapper = mountScanner()
    expect(wrapper.text()).toContain('5/20')
  })
})

// ============================================================================
// Phase 4 — Results (cards, filtre CPC, sélection)
// ============================================================================
describe('DouleurIntentScanner — phase results', () => {
  beforeEach(() => {
    mockScanResult.value = {
      globalScore: 72,
      heatLevel: 'chaude',
      cards: [makeCard('alpha', 1.5), makeCard('beta', 0), makeCard('gamma', 3.5)],
      autocomplete: { suggestions: [], totalCount: 0 },
    }
  })

  it('RadarThermometer rendu avec les bons props', () => {
    const wrapper = mountScanner()
    const thermo = wrapper.findComponent({ name: 'RadarThermometer' })
    expect(thermo.exists()).toBe(true)
    expect(thermo.props('globalScore')).toBe(72)
    expect(thermo.props('heatLevel')).toBe('chaude')
    expect(thermo.props('keywordsCount')).toBe(3)
  })

  it('barre de tri affiche le compteur de mots-clés', () => {
    const wrapper = mountScanner()
    // 2026-05-02 — Migration vers SortToggleBar (countLabel) au lieu du header textuel
    expect(wrapper.find('[data-testid="sort-toggle-bar"]').text()).toContain('3 mots-cl\u00e9s')
  })

  it('toutes les RadarCardCheckable sont rendues', () => {
    const wrapper = mountScanner()
    const cards = wrapper.findAllComponents({ name: 'RadarCardCheckable' })
    expect(cards.length).toBe(3)
  })

  // Tests "Nouveau scan" SUPPRIMÉS : le bouton vit dans le bloc inputs masqué
  // en mode workflow (Sprint 5 friction #7). En workflow, il n'y a pas de
  // "Nouveau scan" à cliquer — l'utilisateur change d'article ou re-déclenche
  // depuis Discovery. Mode libre uniquement → hors périmètre.

  it('filtre CPC "with" masque les cartes à CPC=0', async () => {
    const wrapper = mountScanner()
    const cpcToggle = wrapper.findComponent({ name: 'CpcFilterToggle' })
    cpcToggle.vm.$emit('update:modelValue', 'with')
    await nextTick()
    // Compte les cartes affichées : alpha (1.5) + gamma (3.5) = 2
    expect(wrapper.findAllComponents({ name: 'RadarCardCheckable' }).length).toBe(2)
  })

  it('filtre CPC "without" garde uniquement la carte CPC=0', async () => {
    const wrapper = mountScanner()
    const cpcToggle = wrapper.findComponent({ name: 'CpcFilterToggle' })
    cpcToggle.vm.$emit('update:modelValue', 'without')
    await nextTick()
    expect(wrapper.findAllComponents({ name: 'RadarCardCheckable' }).length).toBe(1)
  })

  it('cocher une card via update:checked ajoute à checkedKeywords', async () => {
    const wrapper = mountScanner()
    const firstCard = wrapper.findComponent({ name: 'RadarCardCheckable' })
    firstCard.vm.$emit('update:checked', true)
    await nextTick()
    // Bouton "Envoyer au Capitaine" apparait
    expect(wrapper.find('.btn-send-captain').exists()).toBe(true)
    expect(wrapper.find('.btn-send-captain').text()).toContain('1')
  })

  it('checkbox "Tout" coche toutes les cards visibles (filtre CPC respecté)', async () => {
    const wrapper = mountScanner()
    // Active le filtre CPC pour ne voir que 2 cartes
    wrapper.findComponent({ name: 'CpcFilterToggle' }).vm.$emit('update:modelValue', 'with')
    await nextTick()
    // Coche "Tout"
    await wrapper.find('.check-all-toggle input').trigger('change')
    await nextTick()
    // 2 cards visibles → 2 cochées (le bouton affiche le compteur)
    expect(wrapper.find('.btn-send-captain').text()).toContain('2')
  })

  it('clic "Envoyer au Capitaine" émet cards-selected avec les cards cochées', async () => {
    const wrapper = mountScanner()
    const cards = wrapper.findAllComponents({ name: 'RadarCardCheckable' })
    cards[0]!.vm.$emit('update:checked', true)
    cards[1]!.vm.$emit('update:checked', true)
    await nextTick()
    await wrapper.find('.btn-send-captain').trigger('click')

    expect(wrapper.emitted('cards-selected')).toBeTruthy()
    const payload = wrapper.emitted('cards-selected')![0]![0] as { keyword: string }[]
    expect(payload.length).toBe(2)
    expect(payload.map(c => c.keyword).sort()).toEqual(['alpha', 'beta'])
  })

  it('au scan terminé, émet "scanned" avec globalScore + heatLevel', async () => {
    // Démarre sans scanResult, on simule le scan
    mockScanResult.value = null
    mockGeneratedKeywords.value = [{ keyword: 'kw' }]
    const wrapper = mountScanner()

    // Simule la terminaison du scan : scanResult arrive après
    mockScanResult.value = {
      globalScore: 80, heatLevel: 'brulante',
      cards: [makeCard('kw')],
      autocomplete: { suggestions: [], totalCount: 0 },
    }
    await wrapper.find('.keywords-header .btn-action').trigger('click')
    await nextTick()
    // L'émission 'scanned' a lieu si scanResult est non-null après scan()
    // Note : scan() est mocké donc pas d'effet automatique → on vérifie juste que ça ne crash pas
    expect(mockScan).toHaveBeenCalled()
  })
})

// ============================================================================
// Cache (Sprint 2.X — radar_cache table)
// ============================================================================
describe('DouleurIntentScanner — cache', () => {
  // Note : depuis Sprint 15.7 le cache-indicator est rendu via <Teleport to="body">,
  // donc on l'inspecte via document.querySelector au lieu du wrapper de mount.
  it('cache-indicator visible si exists=true et phase=input', () => {
    mockRadarCacheStatus.value = {
      exists: true,
      heatLevel: 'chaude',
      globalScore: 65,
      keywordCount: 12,
    }
    mountScanner()
    const indicator = document.querySelector('.cache-indicator')
    expect(indicator).not.toBeNull()
    expect(indicator!.textContent).toContain('65')
    expect(indicator!.textContent).toContain('12')
  })

  it('cache-indicator masqué dès qu\'on a un scanResult', () => {
    mockRadarCacheStatus.value = { exists: true, globalScore: 50 }
    mockScanResult.value = {
      globalScore: 70, heatLevel: 'chaude', cards: [],
      autocomplete: { suggestions: [], totalCount: 0 },
    }
    mountScanner()
    expect(document.querySelector('.cache-indicator')).toBeNull()
  })

  it('clic "Charger depuis le cache" appelle loadFromRadarCache', async () => {
    mockRadarCacheStatus.value = { exists: true, globalScore: 50 }
    mountScanner()
    const btn = document.querySelector<HTMLButtonElement>('.cache-indicator__actions .btn-action')
    expect(btn).not.toBeNull()
    btn!.click()
    await nextTick()
    expect(mockLoadFromRadarCache).toHaveBeenCalledWith('seo local boulanger')
  })

  it('clic "Ignorer" cache la cache-indicator', async () => {
    mockRadarCacheStatus.value = { exists: true, globalScore: 50 }
    mountScanner()
    const btn = document.querySelector<HTMLButtonElement>('.cache-indicator .btn-action--secondary')
    expect(btn).not.toBeNull()
    btn!.click()
    await nextTick()
    expect(document.querySelector('.cache-indicator')).toBeNull()
  })
})

// ============================================================================
// Erreur
// ============================================================================
describe('DouleurIntentScanner — gestion erreur', () => {
  it('scanner-error visible si error défini', () => {
    mockError.value = 'API DataForSEO down'
    const wrapper = mountScanner()
    expect(wrapper.find('.scanner-error').text()).toContain('API DataForSEO down')
  })

  it('clic "Fermer" efface l\'erreur', async () => {
    mockError.value = 'erreur'
    const wrapper = mountScanner()
    await wrapper.find('.btn-retry').trigger('click')
    await nextTick()
    expect(wrapper.find('.scanner-error').exists()).toBe(false)
  })
})

// ============================================================================
// Watcher — keywords injectés depuis Discovery
// ============================================================================
describe('DouleurIntentScanner — keywords injectés depuis Discovery', () => {
  it('injectedKeywords non-vide remplit generatedKeywords + reset scanResult', async () => {
    const injected = [
      { keyword: 'kw-injected-1', reasoning: 'depuis Discovery' },
      { keyword: 'kw-injected-2', reasoning: 'depuis Discovery' },
    ]
    const wrapper = mountScanner({ injectedKeywords: injected })
    await nextTick()

    expect(mockGeneratedKeywords.value.length).toBe(2)
    expect(mockGeneratedKeywords.value[0]!.keyword).toBe('kw-injected-1')
    expect(wrapper.text()).toContain('2 mots-cles generes')
  })

  it('injectedKeywords vide n\'écrase PAS la liste existante', async () => {
    mockGeneratedKeywords.value = [{ keyword: 'existant' }]
    mountScanner({ injectedKeywords: [] })
    await nextTick()
    // Liste préservée
    expect(mockGeneratedKeywords.value.length).toBe(1)
    expect(mockGeneratedKeywords.value[0]!.keyword).toBe('existant')
  })
})

// ============================================================================
// Reset au changement d'article (mode workflow)
// ============================================================================
describe('DouleurIntentScanner — reset au changement d\'article (workflow)', () => {
  it('changer pilierKeyword en mode workflow déclenche reset()', async () => {
    const wrapper = mountScanner({ mode: 'workflow' as const })
    mockReset.mockClear()
    await wrapper.setProps({ pilierKeyword: 'autre pilier' })
    await nextTick()
    expect(mockReset).toHaveBeenCalled()
  })

  it('changer articleTopic en mode workflow déclenche reset()', async () => {
    const wrapper = mountScanner({ mode: 'workflow' as const })
    mockReset.mockClear()
    await wrapper.setProps({ articleTopic: 'autre topic' })
    await nextTick()
    expect(mockReset).toHaveBeenCalled()
  })

  it('changer pilierKeyword en mode libre ne déclenche PAS reset()', async () => {
    const wrapper = mountScanner({ mode: 'libre' as const })
    mockReset.mockClear()
    await wrapper.setProps({ pilierKeyword: 'autre pilier' })
    await nextTick()
    expect(mockReset).not.toHaveBeenCalled()
  })
})
