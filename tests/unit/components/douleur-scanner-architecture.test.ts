/**
 * Vague 1 — Tests architecturaux RadarPanel.
 *
 * Référence FR PRD : FR-RAD-SCAN (le Radar scanne 3 phases : Phase 1 inputs
 * pour saisir broad/specific/painPoint en mode libre, Phase 2 keywords
 * preview éditable, Phase 3 results avec cards classées par score KPI).
 *
 * Ces tests verrouillent la POSITION DOM des sous-composants après extraction :
 * - DouleurScannerInputs (Phase 1 + cache + error) est descendant direct de
 *   .intent-scanner.
 * - DouleurScannerResults (Phase 3) est descendant direct de .intent-scanner,
 *   PAS dans .radar-cards (qui est un sous-bloc interne).
 * - Les inputs Phase 1 sont visibles dans les 2 modes (décision 2026-05-11 :
 *   squelette stable, l'utilisateur peut toujours générer manuellement).
 *   En mode workflow, un workflow-hint clarifie le comportement (le test du
 *   hint vit dans douleur-intent-scanner-mode.test.ts).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import RadarPanel from '../../../src/components/intent/RadarPanel.vue'

const mockGeneratedKeywords = ref<{ keyword: string; reasoning?: string }[]>([])
const mockScanResult = ref<{ globalScore: number; heatLevel: string; cards: never[]; autocomplete: { suggestions: never[]; totalCount: number }; verdict?: string } | null>(null)

vi.mock('../../../src/composables/keyword/useResonanceScore', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('../../../src/composables/keyword/useResonanceScore')
  return {
    ...actual,
    useKeywordRadar: () => ({
      generatedKeywords: mockGeneratedKeywords,
      scanResult: mockScanResult,
      isGenerating: ref(false),
      isScanning: ref(false),
      scanProgress: ref({ phase: '', scanned: 0, total: 0 }),
      error: ref(null),
      heatColor: ref('#22c55e'),
      heatLabel: ref('Chaude'),
      radarCacheStatus: ref(null),
      checkRadarCache: vi.fn(),
      loadFromRadarCache: vi.fn(),
      mergeFromRadarSource: vi.fn(),
      generate: vi.fn(),
      scan: vi.fn(),
      removeKeyword: vi.fn(),
      reset: vi.fn(),
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

const stubs = {
  RadarAiPanel: { template: '<div data-testid="radar-ai-panel"></div>' },
  DouleurScannerInputs: {
    name: 'DouleurScannerInputs',
    template: '<div data-testid="douleur-scanner-inputs" :data-show-inputs="showInputs"></div>',
    props: ['broadKeyword', 'specificTopic', 'painPoint', 'phase', 'isGenerating', 'radarCacheStatus', 'isLoadingCache', 'error', 'showInputs'],
    emits: ['update:broad-keyword', 'update:specific-topic', 'update:pain-point', 'generate', 'reset-scan', 'load-cache', 'dismiss-cache', 'clear-error'],
  },
  DouleurScannerResults: {
    name: 'DouleurScannerResults',
    template: '<div data-testid="douleur-scanner-results"></div>',
    props: ['scanResult', 'filteredCards', 'radarSortOptions', 'radarSortState', 'cpcFilter', 'allChecked', 'checkedKeywords', 'autoGroups', 'articleLevel', 'articleId', 'articleTopic', 'painPoint', 'totalSelectedCount', 'getModifiersFor'],
    emits: ['update:cpc-filter', 'update:radar-sort-state', 'toggle-check', 'toggle-all-checked', 'modifier-untag', 'modifier-cycle', 'long-tail-selected', 'send-to-captain'],
  },
}

const baseProps = {
  pilierKeyword: 'seo local',
  articleTopic: 'Article test',
  articleKeyword: 'seo local boulanger',
  articlePainPoint: 'pas assez de clients',
  articleLevel: 'pilier' as const,
  injectedKeywords: [],
}

beforeEach(() => {
  setActivePinia(createPinia())
  mockGeneratedKeywords.value = []
  mockScanResult.value = null
})

function mountScanner(propsOverride: Partial<typeof baseProps & { mode: 'workflow' | 'libre' }> = {}) {
  return mount(RadarPanel, {
    props: { ...baseProps, ...propsOverride },
    global: { stubs },
  })
}

function isDescendantOf(wrapper: ReturnType<typeof mountScanner>, ancestorSelector: string, descendantSelector: string): boolean {
  const ancestor = wrapper.find(ancestorSelector)
  if (!ancestor.exists()) return false
  return ancestor.find(descendantSelector).exists()
}

describe('RadarPanel — architecture des phases (Vague 1)', () => {
  it('AC.E.1 — DouleurScannerInputs est descendant direct de .intent-scanner', async () => {
    const wrapper = mountScanner({ mode: 'libre' as const })
    await nextTick()
    expect(isDescendantOf(wrapper, '.intent-scanner', '[data-testid="douleur-scanner-inputs"]'))
      .toBe(true)
  })

  it('AC.E.2 — DouleurScannerResults est rendu après DouleurScannerInputs (ordre DOM)', async () => {
    const wrapper = mountScanner({ mode: 'libre' as const })
    mockScanResult.value = {
      globalScore: 50,
      heatLevel: 'tiede',
      cards: [],
      autocomplete: { suggestions: [], totalCount: 0 },
      verdict: 'GO',
    }
    await nextTick()

    const inputs = wrapper.find('[data-testid="douleur-scanner-inputs"]')
    const results = wrapper.find('[data-testid="douleur-scanner-results"]')
    expect(inputs.exists()).toBe(true)
    expect(results.exists()).toBe(true)

    // Inputs précèdent results dans le DOM
    const html = wrapper.html()
    const inputsIdx = html.indexOf('douleur-scanner-inputs')
    const resultsIdx = html.indexOf('douleur-scanner-results')
    expect(inputsIdx).toBeLessThan(resultsIdx)
  })

  it('AC.E.3 — En mode workflow, showInputs=false (génération déplacée vers Discovery)', async () => {
    const wrapper = mountScanner({ mode: 'workflow' as const })
    await nextTick()
    const inputs = wrapper.find('[data-testid="douleur-scanner-inputs"]')
    expect(inputs.exists()).toBe(true)
    expect(inputs.attributes('data-show-inputs')).toBe('false')
  })

  it('AC.E.3.bis — En mode libre, showInputs=true (utilisateur saisit ses inputs)', async () => {
    const wrapper = mountScanner({ mode: 'libre' as const })
    await nextTick()
    const inputs = wrapper.find('[data-testid="douleur-scanner-inputs"]')
    expect(inputs.attributes('data-show-inputs')).toBe('true')
  })
})
