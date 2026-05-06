/**
 * Tests pour DiscoveryPanel — Onglet Discovery du Moteur.
 *
 * Couvre les actions utilisateur :
 * - input + bouton/Entrée pour lancer une découverte
 * - toggle des sections sources (collapsed)
 * - clic keyword → toggleSelect + captain-trigger toast 5s
 * - checkbox "Tout" par source
 * - filtre groupe (sidebar wordGroups)
 * - toggle filtre de pertinence
 * - pagination "Tout afficher" si > 100 items
 * - chargement / clear du cache
 * - lancement analyse IA + sélection batch
 * - émission send-to-radar avec selectedCount
 * - watchers pilier/articleKeyword
 *
 * Les API externes (DataForSEO, Claude, semantic scoring) sont mockées via
 * useDiscoveryPanel. captain-trigger est mocké pour observer schedule/cancel.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import DiscoveryPanel from '../../../src/components/moteur/DiscoveryPanel.vue'

// ===== Mock useDiscoveryPanel — état dynamique =====
const mockSuggestAlphabetKw = ref<unknown[]>([])
const mockSuggestQuestionsKw = ref<unknown[]>([])
const mockSuggestIntentsKw = ref<unknown[]>([])
const mockSuggestPrepositionsKw = ref<unknown[]>([])
const mockAiKeywords = ref<unknown[]>([])
const mockDataforseoKeywords = ref<unknown[]>([])
const mockSuggestLoading = ref(false)
const mockAiLoading = ref(false)
const mockDataforseoLoading = ref(false)
const mockIsAnyLoading = ref(false)
const mockWordGroups = ref<{ word: string; normalized: string; count: number }[]>([])
const mockWordGroupsLoading = ref(false)
const mockActiveGroupFilter = ref<string | null>(null)
const mockError = ref<string | null>(null)
const mockSelectedCount = ref(0)
const mockHasResults = ref(false)
const mockRelevanceFilterEnabled = ref(false)
const mockSemanticLoading = ref(false)
const mockIrrelevantCount = ref(0)
const mockScoringProgress = ref({ scored: 0, total: 0, pass: 0 })
const mockUniqueKeywordCount = ref(0)
const mockRelevantCount = ref(0)
const mockFilteringSuspect = ref(false)
const mockAnalysisResult = ref<{ keywords: unknown[]; summary: string } | null>(null)
const mockAnalysisLoading = ref(false)
const mockCacheStatus = ref<{ cached: boolean; cachedAt?: string; keywordCount?: number; hasAnalysis?: boolean } | null>(null)
const mockCacheLoading = ref(false)

const mockToggleRelevanceFilter = vi.fn()
const mockIsRelevant = vi.fn(() => true)
const mockGetRelevanceScore = vi.fn()
const mockGetKeywordSources = vi.fn(() => [])
const mockIsMultiSource = vi.fn(() => false)
const mockDiscover = vi.fn()
const mockFilteredList = vi.fn((list: unknown) => (Array.isArray(list) ? list : []))
const mockToggleSelect = vi.fn()
const mockIsSelected = vi.fn(() => false)
const mockSelectAllInSource = vi.fn()
const mockDeselectAllInSource = vi.fn()
const mockIsAllSourceSelected = vi.fn(() => false)
const mockSetGroupFilter = vi.fn()
const mockGetRadarKeywords = vi.fn(() => [{ keyword: 'kw1', source: 'ai' }, { keyword: 'kw2', source: 'dataforseo' }])
const mockAnalyzeResults = vi.fn()
const mockSelectAllAnalysis = vi.fn()
const mockDeselectAllAnalysis = vi.fn()
const mockIsAllAnalysisSelected = vi.fn(() => false)
const mockCheckCacheForSeed = vi.fn()
const mockLoadFromCache = vi.fn(async (_seed: string) => true)
const mockSaveToCache = vi.fn()
const mockClearCacheForSeed = vi.fn()
const mockReset = vi.fn()

vi.mock('../../../src/composables/keyword/useDiscoveryPanel', () => ({
  useDiscoveryPanel: () => ({
    suggestAlphabetKw: mockSuggestAlphabetKw,
    suggestQuestionsKw: mockSuggestQuestionsKw,
    suggestIntentsKw: mockSuggestIntentsKw,
    suggestPrepositionsKw: mockSuggestPrepositionsKw,
    aiKeywords: mockAiKeywords,
    dataforseoKeywords: mockDataforseoKeywords,
    suggestLoading: mockSuggestLoading,
    aiLoading: mockAiLoading,
    dataforseoLoading: mockDataforseoLoading,
    isAnyLoading: mockIsAnyLoading,
    wordGroups: mockWordGroups,
    wordGroupsLoading: mockWordGroupsLoading,
    activeGroupFilter: mockActiveGroupFilter,
    error: mockError,
    selectedCount: mockSelectedCount,
    hasResults: mockHasResults,
    relevanceFilterEnabled: mockRelevanceFilterEnabled,
    semanticLoading: mockSemanticLoading,
    irrelevantCount: mockIrrelevantCount,
    scoringProgress: mockScoringProgress,
    uniqueKeywordCount: mockUniqueKeywordCount,
    relevantCount: mockRelevantCount,
    toggleRelevanceFilter: mockToggleRelevanceFilter,
    isRelevant: mockIsRelevant,
    getRelevanceScore: mockGetRelevanceScore,
    filteringSuspect: mockFilteringSuspect,
    SOURCE_COLORS: {},
    getKeywordSources: mockGetKeywordSources,
    isMultiSource: mockIsMultiSource,
    discover: mockDiscover,
    filteredList: mockFilteredList,
    toggleSelect: mockToggleSelect,
    isSelected: mockIsSelected,
    selectAllInSource: mockSelectAllInSource,
    deselectAllInSource: mockDeselectAllInSource,
    isAllSourceSelected: mockIsAllSourceSelected,
    setGroupFilter: mockSetGroupFilter,
    getRadarKeywords: mockGetRadarKeywords,
    analysisResult: mockAnalysisResult,
    analysisLoading: mockAnalysisLoading,
    analyzeResults: mockAnalyzeResults,
    selectAllAnalysis: mockSelectAllAnalysis,
    deselectAllAnalysis: mockDeselectAllAnalysis,
    isAllAnalysisSelected: mockIsAllAnalysisSelected,
    cacheStatus: mockCacheStatus,
    cacheLoading: mockCacheLoading,
    checkCacheForSeed: mockCheckCacheForSeed,
    loadFromCache: mockLoadFromCache,
    saveToCache: mockSaveToCache,
    clearCacheForSeed: mockClearCacheForSeed,
    reset: mockReset,
  }),
}))

// ===== Mock captain-trigger store =====
const mockSchedule = vi.fn()
const mockCancel = vi.fn()
vi.mock('../../../src/stores/ui/captain-trigger.store', () => ({
  useCaptainTriggerStore: () => ({
    schedule: mockSchedule,
    cancel: mockCancel,
  }),
}))

vi.mock('../../../src/utils/logger', () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock('../../../src/composables/keyword/useCapitaineScan', () => ({
  articleTypeToLevel: (t: string) => {
    const m: Record<string, string> = { 'Pilier': 'pilier', 'Intermédiaire': 'intermediaire', 'Spécialisé': 'specifique' }
    return m[t] ?? 'intermediaire'
  },
}))

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  // Reset des refs
  mockSuggestAlphabetKw.value = []
  mockSuggestQuestionsKw.value = []
  mockSuggestIntentsKw.value = []
  mockSuggestPrepositionsKw.value = []
  mockAiKeywords.value = []
  mockDataforseoKeywords.value = []
  mockSuggestLoading.value = false
  mockAiLoading.value = false
  mockDataforseoLoading.value = false
  mockIsAnyLoading.value = false
  mockWordGroups.value = []
  mockWordGroupsLoading.value = false
  mockActiveGroupFilter.value = null
  mockError.value = null
  mockSelectedCount.value = 0
  mockHasResults.value = false
  mockRelevanceFilterEnabled.value = false
  mockSemanticLoading.value = false
  mockIrrelevantCount.value = 0
  mockScoringProgress.value = { scored: 0, total: 0, pass: 0 }
  mockUniqueKeywordCount.value = 0
  mockRelevantCount.value = 0
  mockFilteringSuspect.value = false
  mockAnalysisResult.value = null
  mockAnalysisLoading.value = false
  mockCacheStatus.value = null
  mockCacheLoading.value = false
  mockIsRelevant.mockReturnValue(true)
  mockIsSelected.mockReturnValue(false)
  mockIsAllSourceSelected.mockReturnValue(false)
  mockGetKeywordSources.mockReturnValue([])
  mockIsMultiSource.mockReturnValue(false)
  mockIsAllAnalysisSelected.mockReturnValue(false)
  mockGetRadarKeywords.mockReturnValue([{ keyword: 'kw1', source: 'ai' }, { keyword: 'kw2', source: 'dataforseo' }])
})

const baseProps = {
  pilierKeyword: 'seo local',
  articleId: 42,
  articleTitle: 'Article test',
  articleKeyword: 'seo local boulanger',
  articlePainPoint: 'pas assez de clients',
  articleType: 'Pilier',
  cocoonName: 'cocon-test',
}

// Track mounted wrappers — Teleport(to: body) leaks indicator nodes between tests.
const mountedWrappers: Array<{ unmount: () => void }> = []

function mountTab(propsOverride: Partial<typeof baseProps> = {}) {
  const wrapper = mount(DiscoveryPanel, {
    props: { ...baseProps, ...propsOverride },
    attachTo: document.body,
  })
  mountedWrappers.push(wrapper)
  return wrapper
}

afterEach(() => {
  while (mountedWrappers.length) mountedWrappers.pop()!.unmount()
  document.querySelectorAll('.cache-indicator').forEach(n => n.remove())
})

// ============================================================================
// Saisie + bouton Découvrir
// ============================================================================
describe('DiscoveryPanel — saisie + lancement découverte', () => {
  it('seedInput pré-rempli avec articleKeyword au mount', () => {
    const wrapper = mountTab()
    const input = wrapper.find('.discovery-input__field')
    expect((input.element as HTMLInputElement).value).toBe('seo local boulanger')
  })

  it('seedInput tombe sur pilierKeyword si articleKeyword absent', () => {
    const wrapper = mountTab({ articleKeyword: undefined })
    const input = wrapper.find('.discovery-input__field')
    expect((input.element as HTMLInputElement).value).toBe('seo local')
  })

  it('clic Découvrir appelle discover() avec les props complètes en mode workflow', async () => {
    const wrapper = mountTab()
    await wrapper.find('.discovery-input__btn').trigger('click')
    expect(mockDiscover).toHaveBeenCalledWith(
      'seo local boulanger',
      'Article test',
      'seo local boulanger',
      'pas assez de clients',
    )
  })

  it('Entrée dans l\'input lance discover()', async () => {
    const wrapper = mountTab()
    await wrapper.find('.discovery-input__field').trigger('keydown.enter')
    expect(mockDiscover).toHaveBeenCalledTimes(1)
  })

  it('mode libre : discover ne reçoit que le seed (pas de contexte article)', async () => {
    const wrapper = mountTab({ mode: 'libre' as const } as never)
    await wrapper.find('.discovery-input__btn').trigger('click')
    // En mode libre, signature courte
    const callArgs = mockDiscover.mock.calls[0]
    expect(callArgs![0]).toBe('seo local boulanger')
    expect(callArgs!.length).toBe(1)
  })

  it('bouton Découvrir désactivé si seedInput vide', async () => {
    const wrapper = mountTab({ articleKeyword: undefined, pilierKeyword: '' })
    const btn = wrapper.find('.discovery-input__btn')
    expect((btn.element as HTMLButtonElement).disabled).toBe(true)
  })

  it('bouton Découvrir désactivé pendant chargement', async () => {
    mockIsAnyLoading.value = true
    const wrapper = mountTab()
    const btn = wrapper.find('.discovery-input__btn')
    expect((btn.element as HTMLButtonElement).disabled).toBe(true)
    expect(btn.text()).toContain('Recherche')
  })
})

// ============================================================================
// Toggle sections sources (collapsed)
// ============================================================================
describe('DiscoveryPanel — sections collapsibles', () => {
  it('clic sur le header bascule la section en collapsed (chevron change)', async () => {
    mockHasResults.value = true
    mockSuggestAlphabetKw.value = [{ keyword: 'foo' }, { keyword: 'bar' }]
    const wrapper = mountTab()

    const headers = wrapper.findAll('.source-header')
    const firstChevron = headers[0]!.find('.source-header__chevron')

    // Initialement ouvert (chevron--open présent)
    expect(firstChevron.classes()).toContain('source-header__chevron--open')

    await headers[0]!.trigger('click')
    expect(firstChevron.classes()).not.toContain('source-header__chevron--open')
  })

  it('liste affichée dépend de l\'état collapsed', async () => {
    mockHasResults.value = true
    mockSuggestAlphabetKw.value = [{ keyword: 'foo' }]
    const wrapper = mountTab()

    expect(wrapper.findAll('.source-list').length).toBeGreaterThan(0)

    await wrapper.find('.source-header').trigger('click')
    // Une section de moins
    expect(wrapper.findAll('.source-list').length).toBeLessThan(6)
  })
})

// ============================================================================
// Clic keyword + captain-trigger
// ============================================================================
describe('DiscoveryPanel — clic keyword (captain-trigger toast)', () => {
  it('clic sur un keyword non-sélectionné : toggleSelect + captainTrigger.schedule', async () => {
    mockHasResults.value = true
    mockAiKeywords.value = [{ keyword: 'mon kw', reasoning: 'x' }]
    mockIsSelected.mockReturnValue(false)
    const wrapper = mountTab()

    // Trouve l'item de la section ai
    const items = wrapper.findAll('.source-item')
    expect(items.length).toBeGreaterThan(0)
    await items[0]!.trigger('click')

    expect(mockToggleSelect).toHaveBeenCalledWith('mon kw')
    // Bloc 5 — schedule reçoit désormais painPoint en 4e arg (depuis props.articlePainPoint)
    expect(mockSchedule).toHaveBeenCalledWith('mon kw', 42, 'pilier', 'pas assez de clients')
  })

  it('clic sur un keyword DÉJÀ sélectionné : toggleSelect + captainTrigger.cancel', async () => {
    mockHasResults.value = true
    mockAiKeywords.value = [{ keyword: 'mon kw' }]
    mockIsSelected.mockReturnValue(true)
    const wrapper = mountTab()

    await wrapper.find('.source-item').trigger('click')

    expect(mockToggleSelect).toHaveBeenCalledWith('mon kw')
    expect(mockCancel).toHaveBeenCalledWith('mon kw')
    expect(mockSchedule).not.toHaveBeenCalled()
  })

  it('clic SANS articleId : pas de schedule (pas de pré-validation possible)', async () => {
    mockHasResults.value = true
    mockAiKeywords.value = [{ keyword: 'mon kw' }]
    mockIsSelected.mockReturnValue(false)
    const wrapper = mountTab({ articleId: null })

    await wrapper.find('.source-item').trigger('click')

    expect(mockToggleSelect).toHaveBeenCalled()
    expect(mockSchedule).not.toHaveBeenCalled()
  })

  it('checkbox indépendante dans l\'item déclenche aussi handleKeywordClick', async () => {
    mockHasResults.value = true
    mockAiKeywords.value = [{ keyword: 'kw' }]
    const wrapper = mountTab()

    const checkbox = wrapper.find('.source-item input[type="checkbox"]')
    await checkbox.trigger('change')

    expect(mockToggleSelect).toHaveBeenCalledWith('kw')
  })
})

// ============================================================================
// Checkbox Tout par source
// ============================================================================
describe('DiscoveryPanel — sélection groupée par source', () => {
  it('checkbox "Tout" non-cochée → selectAllInSource', async () => {
    mockHasResults.value = true
    mockAiKeywords.value = [{ keyword: 'a' }, { keyword: 'b' }]
    mockIsAllSourceSelected.mockReturnValue(false)
    const wrapper = mountTab()

    const checkAll = wrapper.find('.source-header__check-all input')
    await checkAll.trigger('change')

    expect(mockSelectAllInSource).toHaveBeenCalled()
    expect(mockDeselectAllInSource).not.toHaveBeenCalled()
  })

  it('checkbox "Tout" déjà cochée → deselectAllInSource', async () => {
    mockHasResults.value = true
    mockAiKeywords.value = [{ keyword: 'a' }]
    mockIsAllSourceSelected.mockReturnValue(true)
    const wrapper = mountTab()

    const checkAll = wrapper.find('.source-header__check-all input')
    await checkAll.trigger('change')

    expect(mockDeselectAllInSource).toHaveBeenCalled()
    expect(mockSelectAllInSource).not.toHaveBeenCalled()
  })
})

// ============================================================================
// Filtre par groupe (sidebar)
// ============================================================================
describe('DiscoveryPanel — filtre par groupe', () => {
  it('clic sur un group-item active le filtre', async () => {
    mockHasResults.value = true
    mockWordGroups.value = [{ word: 'site', normalized: 'site', count: 5 }]
    const wrapper = mountTab()

    await wrapper.find('.group-item').trigger('click')
    expect(mockSetGroupFilter).toHaveBeenCalledWith('site')
  })

  it('re-clic sur le groupe actif désactive le filtre (toggle)', async () => {
    mockHasResults.value = true
    mockWordGroups.value = [{ word: 'site', normalized: 'site', count: 5 }]
    mockActiveGroupFilter.value = 'site'
    const wrapper = mountTab()

    await wrapper.find('.group-item').trigger('click')
    expect(mockSetGroupFilter).toHaveBeenCalledWith(null)
  })

  it('filter-indicator visible quand un filtre est actif', async () => {
    mockHasResults.value = true
    mockActiveGroupFilter.value = 'web'
    const wrapper = mountTab()

    expect(wrapper.find('.filter-indicator').exists()).toBe(true)
    expect(wrapper.find('.filter-indicator').text()).toContain('web')
  })

  it('clic sur "Effacer" du filter-indicator clear le filtre', async () => {
    mockHasResults.value = true
    mockActiveGroupFilter.value = 'web'
    const wrapper = mountTab()

    await wrapper.find('.filter-indicator__clear').trigger('click')
    expect(mockSetGroupFilter).toHaveBeenCalledWith(null)
  })
})

// ============================================================================
// Filtre de pertinence
// ============================================================================
describe('DiscoveryPanel — filtre de pertinence', () => {
  it('relevance-toggle visible après une découverte', () => {
    mockHasResults.value = true
    const wrapper = mountTab()
    expect(wrapper.find('.relevance-toggle').exists()).toBe(true)
  })

  it('relevance-toggle absent avant une découverte', () => {
    mockHasResults.value = false
    const wrapper = mountTab()
    expect(wrapper.find('.relevance-toggle').exists()).toBe(false)
  })

  it('cocher la checkbox pertinence appelle toggleRelevanceFilter', async () => {
    mockHasResults.value = true
    const wrapper = mountTab()
    await wrapper.find('.relevance-toggle__label input').trigger('change')
    expect(mockToggleRelevanceFilter).toHaveBeenCalledTimes(1)
  })

  it('compteur "N pertinents / M total" visible avec uniqueKeywordCount > 0', () => {
    mockHasResults.value = true
    mockUniqueKeywordCount.value = 50
    mockRelevantCount.value = 30
    const wrapper = mountTab()

    const total = wrapper.find('.relevance-toggle__total')
    expect(total.exists()).toBe(true)
    expect(total.text()).toContain('30')
    expect(total.text()).toContain('50')
  })

  it('warning filteringSuspect visible si filtre suspect', () => {
    mockHasResults.value = true
    mockFilteringSuspect.value = true
    const wrapper = mountTab()
    expect(wrapper.find('.filtering-suspect-warning').exists()).toBe(true)
  })
})

// ============================================================================
// Cache (Sprint 15.6)
// ============================================================================
describe('DiscoveryPanel — cache', () => {
  // Sprint 15.7 — cache-indicator est rendu via <Teleport to="body">,
  // donc on l'inspecte via document.querySelector au lieu du wrapper de mount.
  it('cache-indicator visible si cacheStatus.cached et !hasDiscovered', () => {
    mockCacheStatus.value = {
      cached: true,
      cachedAt: new Date().toISOString(),
      keywordCount: 25,
      hasAnalysis: true,
    }
    mockHasResults.value = false
    mountTab()

    const indicator = document.querySelector('.cache-indicator')
    expect(indicator).not.toBeNull()
    expect(indicator!.textContent).toContain('25')
  })

  it('clic "Charger" appelle loadFromCache', async () => {
    mockCacheStatus.value = { cached: true, keywordCount: 10 }
    mountTab()

    const btn = document.querySelector<HTMLButtonElement>('.cache-indicator__load')
    expect(btn).not.toBeNull()
    btn!.click()
    await nextTick()
    expect(mockLoadFromCache).toHaveBeenCalled()
  })

  it('clic "Rafraichir" appelle clearCacheForSeed et reset', async () => {
    mockCacheStatus.value = { cached: true, keywordCount: 10 }
    mountTab()

    const btn = document.querySelector<HTMLButtonElement>('.cache-indicator__clear')
    expect(btn).not.toBeNull()
    btn!.click()
    await nextTick()
    expect(mockClearCacheForSeed).toHaveBeenCalled()
    expect(mockReset).toHaveBeenCalled()
  })
})

// ============================================================================
// Analyse IA
// ============================================================================
describe('DiscoveryPanel — analyse IA', () => {
  it('bouton "Analyser" visible si hasResults + relevantCount > 0', () => {
    mockHasResults.value = true
    mockRelevantCount.value = 25
    mockIsAnyLoading.value = false
    mockSemanticLoading.value = false
    const wrapper = mountTab()
    expect(wrapper.find('.analysis-action__btn').exists()).toBe(true)
  })

  it('clic Analyser → analyzeResults', async () => {
    mockHasResults.value = true
    mockRelevantCount.value = 25
    const wrapper = mountTab()
    await wrapper.find('.analysis-action__btn').trigger('click')
    expect(mockAnalyzeResults).toHaveBeenCalledTimes(1)
  })

  it('section analysis-results visible si analysisResult défini', () => {
    mockAnalysisResult.value = {
      keywords: [
        { keyword: 'kw1', reasoning: 'r1', priority: 'high' },
        { keyword: 'kw2', reasoning: 'r2', priority: 'medium' },
      ],
      summary: 'Récap IA',
    }
    const wrapper = mountTab()
    expect(wrapper.find('.analysis-results').exists()).toBe(true)
    expect(wrapper.findAll('.analysis-item').length).toBe(2)
  })

  it('clic sur un analysis-item → toggleSelect', async () => {
    mockAnalysisResult.value = {
      keywords: [{ keyword: 'kw1', reasoning: 'r', priority: 'high' }],
      summary: 's',
    }
    const wrapper = mountTab()
    await wrapper.find('.analysis-item').trigger('click')
    expect(mockToggleSelect).toHaveBeenCalledWith('kw1')
  })

  it('checkbox "Tout sélectionner" sur analyse → selectAllAnalysis', async () => {
    mockAnalysisResult.value = {
      keywords: [{ keyword: 'kw1', priority: 'high' }],
      summary: 's',
    }
    mockIsAllAnalysisSelected.mockReturnValue(false)
    const wrapper = mountTab()
    await wrapper.find('.analysis-results__check-all input').trigger('change')
    expect(mockSelectAllAnalysis).toHaveBeenCalled()
  })

  it('checkbox déjà tout-sélectionnée → deselectAllAnalysis', async () => {
    mockAnalysisResult.value = {
      keywords: [{ keyword: 'kw1', priority: 'high' }],
      summary: 's',
    }
    mockIsAllAnalysisSelected.mockReturnValue(true)
    const wrapper = mountTab()
    await wrapper.find('.analysis-results__check-all input').trigger('change')
    expect(mockDeselectAllAnalysis).toHaveBeenCalled()
  })
})

// ============================================================================
// Send to Radar
// ============================================================================
describe('DiscoveryPanel — émission send-to-radar', () => {
  it('discovery-bar visible uniquement si selectedCount > 0', () => {
    mockSelectedCount.value = 0
    let wrapper = mountTab()
    expect(wrapper.find('.discovery-bar').exists()).toBe(false)

    mockSelectedCount.value = 3
    wrapper = mountTab()
    expect(wrapper.find('.discovery-bar').exists()).toBe(true)
    expect(wrapper.find('.discovery-bar__count').text()).toContain('3')
  })

  it('clic "Envoyer au Radar" émet send-to-radar avec les keywords', async () => {
    mockSelectedCount.value = 2
    const wrapper = mountTab()
    await wrapper.find('.discovery-bar__btn').trigger('click')

    expect(mockGetRadarKeywords).toHaveBeenCalled()
    expect(wrapper.emitted('send-to-radar')).toBeTruthy()
    const payload = wrapper.emitted('send-to-radar')![0]![0] as { keyword: string }[]
    expect(payload.length).toBe(2)
    expect(payload[0]!.keyword).toBe('kw1')
  })
})

// ============================================================================
// Watchers article / pilier
// ============================================================================
describe('DiscoveryPanel — watchers', () => {
  it('changer articleKeyword met à jour seedInput', async () => {
    const wrapper = mountTab()
    expect((wrapper.find('.discovery-input__field').element as HTMLInputElement).value).toBe('seo local boulanger')

    await wrapper.setProps({ articleKeyword: 'autre keyword' })
    await nextTick()

    expect((wrapper.find('.discovery-input__field').element as HTMLInputElement).value).toBe('autre keyword')
  })

  it('changer UNIQUEMENT pilierKeyword (cocoon, articleKeyword inchangé) provoque un reset complet', async () => {
    // Le watcher gère 2 cas : article toggled (return tôt) et pilier changed.
    // Pour atteindre la branche reset, articleKeyword DOIT rester identique.
    const wrapper = mount(DiscoveryPanel, {
      props: { ...baseProps, articleKeyword: 'kw-stable' },
    })
    await nextTick()
    mockReset.mockClear()

    await wrapper.setProps({ pilierKeyword: 'nouveau pilier' })
    await nextTick()

    expect(mockReset).toHaveBeenCalled()
  })
})

// ============================================================================
// Pagination "Tout afficher"
// ============================================================================
describe('DiscoveryPanel — pagination > 100 items', () => {
  it('bouton "Tout afficher" visible si list > VISIBLE_THRESHOLD (100)', () => {
    mockHasResults.value = true
    const big = Array.from({ length: 120 }, (_, i) => ({ keyword: `kw-${i}` }))
    mockSuggestAlphabetKw.value = big
    const wrapper = mountTab()
    expect(wrapper.find('.source-list__expand-btn').exists()).toBe(true)
    expect(wrapper.find('.source-list__expand-btn').text()).toContain('20')
  })

  it('bouton absent si list ≤ 100', () => {
    mockHasResults.value = true
    mockSuggestAlphabetKw.value = Array.from({ length: 50 }, (_, i) => ({ keyword: `kw-${i}` }))
    const wrapper = mountTab()
    expect(wrapper.find('.source-list__expand-btn').exists()).toBe(false)
  })

  it('clic sur "Tout afficher" → bascule en "Réduire"', async () => {
    mockHasResults.value = true
    mockSuggestAlphabetKw.value = Array.from({ length: 150 }, (_, i) => ({ keyword: `kw-${i}` }))
    const wrapper = mountTab()
    await wrapper.find('.source-list__expand-btn').trigger('click')
    expect(wrapper.find('.source-list__expand-btn').text()).toContain('Réduire')
  })
})

// ============================================================================
// États placeholder + empty
// ============================================================================
describe('DiscoveryPanel — états vides + erreur', () => {
  it('placeholder section : "Saisissez un mot-clé..." si pas encore lancé', () => {
    mockHasResults.value = false
    const wrapper = mountTab()
    expect(wrapper.text()).toContain('Saisissez un mot-clé')
  })

  it('placeholder section : "Aucun résultat" si lancé mais source vide', async () => {
    const wrapper = mountTab()
    // Force hasDiscovered=true via clic
    await wrapper.find('.discovery-input__btn').trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('Aucun résultat dans cette source')
  })

  it('discovery-empty global : aucun résultat global après découverte', async () => {
    const wrapper = mountTab()
    await wrapper.find('.discovery-input__btn').trigger('click')
    await nextTick()
    // hasDiscovered=true + isAnyLoading=false + hasResults=false
    expect(wrapper.find('.discovery-empty').exists()).toBe(true)
  })

  it('error visible si error ref défini', () => {
    mockError.value = 'API down'
    const wrapper = mountTab()
    expect(wrapper.find('.discovery-error').text()).toContain('API down')
  })
})
