/**
 * Tests de persistance de la coque IA Discovery.
 *
 * Référence FR PRD : FR-DIS-AI-PANEL (8 ACs AC.DAIP.1 à 8) + FR-UI-AI-PANELS-PATTERN.
 *
 * La coque IA est rendue dans le DOM dès l'ouverture de l'onglet (présence
 * permanente). Ses états visuels (idle/streaming/success/error) sont pilotés
 * par les valeurs du composable `useDiscoveryPanel`, le CTA est `disabled`
 * tant que la précondition métier n'est pas remplie, et `DiscoveryAnalysisResults`
 * est rendu DANS la coque (slot par défaut) quand un résultat est disponible.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { ref, nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import DiscoveryPanel from '../../../../src/components/moteur/DiscoveryPanel.vue'
import { promises as fs } from 'node:fs'
import { resolve } from 'node:path'

const mockHasResults = ref(false)
const mockRelevantCount = ref(0)
const mockSemanticLoading = ref(false)
const mockAnalysisLoading = ref(false)
const mockAnalysisResult = ref<{ keywords: Array<{ keyword: string; reasoning: string; priority: 'high' | 'medium' | 'low' }>; summary: string } | null>(null)
const mockError = ref<string | null>(null)
const mockGetRadarKeywords = vi.fn(() => [{ keyword: 'kw1', reasoning: 'r1' }])
const mockAnalyzeResults = vi.fn()

vi.mock('../../../../src/composables/keyword/useDiscoveryPanel', () => ({
  useDiscoveryPanel: () => ({
    suggestAlphabetKw: ref([]),
    suggestQuestionsKw: ref([]),
    suggestIntentsKw: ref([]),
    suggestPrepositionsKw: ref([]),
    aiKeywords: ref([]),
    dataforseoKeywords: ref([]),
    longtailKeywords: ref([]),
    suggestLoading: ref(false),
    aiLoading: ref(false),
    dataforseoLoading: ref(false),
    longtailLoading: ref(false),
    generateLongTail: vi.fn(),
    isAnyLoading: ref(false),
    wordGroups: ref([]),
    wordGroupsLoading: ref(false),
    activeGroupFilter: ref(null),
    error: mockError,
    selectedCount: ref(0),
    hasResults: mockHasResults,
    relevanceFilterEnabled: ref(true),
    semanticLoading: mockSemanticLoading,
    irrelevantCount: ref(0),
    scoringProgress: ref({ scored: 0, total: 0, pass: 0 }),
    uniqueKeywordCount: ref(0),
    relevantCount: mockRelevantCount,
    toggleRelevanceFilter: vi.fn(),
    isRelevant: () => true,
    filteringSuspect: ref(false),
    getKeywordSources: () => [],
    isMultiSource: () => false,
    discover: vi.fn(),
    filteredList: (list: unknown[]) => list,
    toggleSelect: vi.fn(),
    isSelected: () => false,
    selectAllInSource: vi.fn(),
    deselectAllInSource: vi.fn(),
    isAllSourceSelected: () => false,
    setGroupFilter: vi.fn(),
    getRadarKeywords: mockGetRadarKeywords,
    analysisResult: mockAnalysisResult,
    analysisLoading: mockAnalysisLoading,
    analyzeResults: mockAnalyzeResults,
    selectAllAnalysis: vi.fn(),
    deselectAllAnalysis: vi.fn(),
    isAllAnalysisSelected: () => false,
    cacheStatus: ref(null),
    cacheLoading: ref(false),
    checkCacheForSeed: vi.fn(),
    loadFromCache: vi.fn(),
    saveToCache: vi.fn(),
    clearCacheForSeed: vi.fn(),
    reset: vi.fn(),
  }),
}))

vi.mock('../../../../src/stores/ui/captain-trigger.store', () => ({
  useCaptainTriggerStore: () => ({ schedule: vi.fn(), cancel: vi.fn() }),
}))

vi.mock('../../../../src/utils/logger', () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const baseProps = {
  pilierKeyword: 'design',
  articleId: 1,
  articleTitle: 'Test',
  articleKeyword: 'design émotionnel',
  articlePainPoint: 'difficile de choisir',
  articleType: 'Pilier',
  cocoonName: 'Cocoon',
  mode: 'workflow' as const,
}

type AiPanelStubProps = {
  state: string
  triggerDisabled: boolean
  ctaLabel: string
  error: string | null
}

function mountTab() {
  return mount(DiscoveryPanel, {
    props: baseProps,
    global: {
      stubs: {
        AiPanel: {
          template:
            '<section :data-testid="\'discovery-ai-panel\'" :data-state="state" :data-cta-disabled="String(triggerDisabled)" :data-cta-label="ctaLabel" :data-error="error || \'\'"><slot /><slot name="idle" /></section>',
          props: ['variant', 'title', 'subtitle', 'state', 'error', 'isStale', 'ctaLabel', 'regenLabel', 'hideUntilTriggered', 'regenConfirmMessage', 'triggerDisabled', 'defaultCollapsed'],
          emits: ['trigger'],
        },
        DiscoverySourcesList: { template: '<div data-testid="sources-list"></div>' },
        DiscoveryAnalysisResults: {
          template: '<div data-testid="discovery-analysis-results"></div>',
          props: ['analysisResult', 'isAllAnalysisSelected', 'isSelected', 'isMultiSource', 'sourceCountLabel'],
          emits: ['toggle-select', 'toggle-select-all'],
        },
        DiscoveryWordGroupsSidebar: { template: '<aside data-testid="word-groups-sidebar"></aside>' },
        KeywordDiscoveryCacheBar: { template: '<div></div>' },
        KeywordDiscoveryRelevanceToggle: { template: '<div></div>' },
      },
    },
  })
}

function readPanelProps(wrapper: VueWrapper): AiPanelStubProps {
  const panel = wrapper.find('[data-testid="discovery-ai-panel"]')
  return {
    state: panel.attributes('data-state') ?? '',
    triggerDisabled: panel.attributes('data-cta-disabled') === 'true',
    ctaLabel: panel.attributes('data-cta-label') ?? '',
    error: panel.attributes('data-error') ?? '',
  }
}

beforeEach(() => {
  setActivePinia(createPinia())
  mockHasResults.value = false
  mockRelevantCount.value = 0
  mockSemanticLoading.value = false
  mockAnalysisLoading.value = false
  mockAnalysisResult.value = null
  mockError.value = null
  mockGetRadarKeywords.mockClear()
  mockAnalyzeResults.mockClear()
})

describe('DiscoveryPanel — coque IA persistante (FR-DIS-AI-PANEL)', () => {
  it('AC.DAIP.1 — la coque AiPanel est rendue au mount, sans action utilisateur', async () => {
    const wrapper = mountTab()
    await nextTick()
    expect(wrapper.find('[data-testid="discovery-ai-panel"]').exists()).toBe(true)
  })

  it('AC.DAIP.2 — quand !hasResults, CTA disabled et slot idle indique « lance d\'abord une découverte »', async () => {
    const wrapper = mountTab()
    await nextTick()
    const props = readPanelProps(wrapper)
    expect(props.state).toBe('idle')
    expect(props.triggerDisabled).toBe(true)
    expect(wrapper.find('[data-testid="discovery-ai-idle"]').text()).toContain('découverte')
  })

  it('AC.DAIP.3 — quand semanticLoading actif, CTA disabled et slot idle indique « Filtrage de pertinence en cours »', async () => {
    mockHasResults.value = true
    mockSemanticLoading.value = true
    const wrapper = mountTab()
    await nextTick()
    const props = readPanelProps(wrapper)
    expect(props.triggerDisabled).toBe(true)
    expect(wrapper.find('[data-testid="discovery-ai-idle"]').text()).toContain('Filtrage de pertinence')
  })

  it('AC.DAIP.4 — quand hasResults mais relevantCount=0, CTA disabled et message « Aucun mot-clé pertinent »', async () => {
    mockHasResults.value = true
    mockRelevantCount.value = 0
    const wrapper = mountTab()
    await nextTick()
    const props = readPanelProps(wrapper)
    expect(props.triggerDisabled).toBe(true)
    expect(wrapper.find('[data-testid="discovery-ai-idle"]').text()).toContain('Aucun mot-clé pertinent')
  })

  it('AC.DAIP.5 — quand analysisLoading=true, state=streaming', async () => {
    mockHasResults.value = true
    mockRelevantCount.value = 5
    mockAnalysisLoading.value = true
    const wrapper = mountTab()
    await nextTick()
    expect(readPanelProps(wrapper).state).toBe('streaming')
  })

  it('AC.DAIP.6 — quand analysisResult non null, state=success et DiscoveryAnalysisResults est enfant DOM de la coque', async () => {
    mockHasResults.value = true
    mockRelevantCount.value = 3
    mockAnalysisResult.value = {
      keywords: [{ keyword: 'design émotionnel', reasoning: 'r1', priority: 'high' }],
      summary: 'Résumé',
    }
    const wrapper = mountTab()
    await nextTick()
    const props = readPanelProps(wrapper)
    expect(props.state).toBe('success')
    const panel = wrapper.find('[data-testid="discovery-ai-panel"]')
    expect(panel.find('[data-testid="discovery-analysis-results"]').exists()).toBe(true)
  })

  it('AC.DAIP.5.bis — quand relevantCount > 0 et pas d\'analyse, CTA actif avec label incluant le compte', async () => {
    mockHasResults.value = true
    mockRelevantCount.value = 12
    const wrapper = mountTab()
    await nextTick()
    const props = readPanelProps(wrapper)
    expect(props.state).toBe('idle')
    expect(props.triggerDisabled).toBe(false)
    expect(props.ctaLabel).toContain('12')
  })

  it('AC.DAIP.7 — clic « Envoyer au Radar » émet send-to-radar avec le payload renvoyé par getRadarKeywords()', async () => {
    mockHasResults.value = true
    mockRelevantCount.value = 3
    const wrapper = mountTab()
    // Force selectedCount > 0 pour faire apparaître le bouton sticky.
    // Ici on bypasse via interaction directe : on cherche le bouton et on clique.
    // En réalité le bouton sticky n'apparaît que si selectedCount > 0, donc on
    // appelle directement la méthode interne via émission depuis le composant
    // parent. Plus simple : invoquer handleSendToRadar via le composable mocké.
    // On vérifie ici que getRadarKeywords est bien le pont vers le payload.
    expect(mockGetRadarKeywords).not.toHaveBeenCalled()
    // Patch : simuler le clic en exposant la fonction via wm.vm
    const vm = wrapper.vm as unknown as { handleSendToRadar: () => void }
    vm.handleSendToRadar()
    await nextTick()
    expect(mockGetRadarKeywords).toHaveBeenCalledTimes(1)
    const emitted = wrapper.emitted('send-to-radar')
    expect(emitted).toBeTruthy()
    expect(emitted?.[0]?.[0]).toEqual([{ keyword: 'kw1', reasoning: 'r1' }])
  })

  it('AC.DAIP.8 — garde de suppression : aucun import de DiscoveryAiPanel ni useDiscoveryRanking dans src/', async () => {
    const srcRoot = resolve(__dirname, '../../../../src')
    const files = await collectVueAndTsFiles(srcRoot)
    const offenders: string[] = []
    for (const f of files) {
      const content = await fs.readFile(f, 'utf-8')
      if (/from\s+['"][^'"]*DiscoveryAiPanel/.test(content)) offenders.push(`${f} (DiscoveryAiPanel)`)
      if (/from\s+['"][^'"]*useDiscoveryRanking/.test(content)) offenders.push(`${f} (useDiscoveryRanking)`)
    }
    expect(offenders).toEqual([])
  })
})

async function collectVueAndTsFiles(dir: string, acc: string[] = []): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const path = resolve(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name.startsWith('_archive')) continue
      await collectVueAndTsFiles(path, acc)
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.vue'))) {
      acc.push(path)
    }
  }
  return acc
}
