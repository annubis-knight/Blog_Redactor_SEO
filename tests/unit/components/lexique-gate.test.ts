/**
 * FR-LEX-METIER-ONLY — l'étape Lexique n'est accordée que si la porte passe,
 * et elle est revérifiée à chaque changement du lexique.
 *
 * Tests négatifs d'abord (NFR-TEST-BEHAVIORAL) :
 *   - un mot vide retenu → aucune étape, un bandeau explique pourquoi ;
 *   - le lexique est enregistré AVANT la vérification (la porte lit la base) ;
 *   - un mot vide ajouté après coup retire l'étape déjà accordée ;
 *   - le bandeau ouvre l'alarme ; une dérogation accordée rend l'étape.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, enableAutoUnmount } from '@vue/test-utils'
import { ref } from 'vue'
import LexiquePanel from '../../../src/components/moteur/LexiquePanel.vue'
import { MOTEUR_LEXIQUE_VALIDATED } from '../../../shared/constants/workflow-checks.constants'
import type { GateEvaluation } from '../../../shared/verifiers/gate'

vi.mock('../../../src/stores/article/radar-exploration.store', () => ({
  useRadarExplorationStore: () => ({
    entry: null, articleId: null, isLoading: false, isMutating: false,
    generatedKeywords: [], scanCards: [], hasScanResult: false, scanResult: null,
    setArticle: vi.fn(), hydrate: vi.fn(), addKeyword: vi.fn(),
    removeKeyword: vi.fn(), addKeywordsBatch: vi.fn(), setScanResultLocal: vi.fn(),
    $reset: vi.fn(),
  }),
}))

vi.mock('../../../src/services/api.service', () => ({
  apiPost: vi.fn().mockResolvedValue(null),
  apiGet: vi.fn().mockResolvedValue(null),
}))

vi.mock('../../../src/composables/editor/useStreaming', async () => {
  const { ref: vueRef } = await import('vue')
  return {
    useStreaming: () => ({
      chunks: vueRef(''), isStreaming: vueRef(false), error: vueRef(null),
      result: vueRef(null), usage: vueRef(null), startStream: vi.fn(), abort: vi.fn(),
    }),
  }
})

const calls: string[] = []
const keywords = ref<{ articleId: number; capitaine: string; lieutenants: string[]; lexique: string[] } | null>(null)
vi.mock('../../../src/stores/article/article-keywords.store', () => ({
  useArticleKeywordsStore: () => ({
    get keywords() { return keywords.value },
    saveDecisions: vi.fn(async () => { calls.push('saveDecisions'); return true }),
    saveKeywords: vi.fn(async () => true),
    initEmpty: vi.fn(),
    addLexiqueTerm: vi.fn(),
    removeLexiqueTerm: vi.fn(),
  }),
}))

const completedChecks = ref<string[]>([])
vi.mock('../../../src/stores/article/article-progress.store', () => ({
  useArticleProgressStore: () => ({ getProgress: () => ({ completedChecks: completedChecks.value }) }),
}))

const mockEvaluate = vi.fn()
const mockEnsure = vi.fn()
vi.mock('../../../src/stores/ui/gate-alarm.store', () => ({
  useGateAlarmStore: () => ({
    evaluate: (...args: unknown[]) => { calls.push('evaluate'); return mockEvaluate(...args) },
    ensure: (...args: unknown[]) => mockEnsure(...args),
  }),
}))

vi.mock('../../../src/utils/logger', () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const GENERIC: GateEvaluation = {
  gateId: 'lexique-lock', passed: false, inputHash: 'h', waived: [],
  issues: [{ rule: 'lexique-generic-term:vos', level: 'risque', message: '« vos » n’est pas un mot du métier.' }],
  blocking: [{ rule: 'lexique-generic-term:vos', level: 'risque', message: '« vos » n’est pas un mot du métier.' }],
}
const PASSED: GateEvaluation = { ...GENERIC, passed: true, issues: [], blocking: [] }

function mountPanel() {
  return mount(LexiquePanel, {
    props: {
      selectedArticle: { id: 1, slug: 'a', keyword: 'isolation', title: 'Isolation', type: 'pilier', painPoint: '', locked: false, source: 'proposed' as const },
      captainKeyword: 'isolation', articleLevel: 'pilier', selectedLieutenants: [], isCaptaineLocked: false,
    },
    global: { stubs: { CollapsableSection: { template: '<div><slot /></div>' } } },
  })
}

function emissions(wrapper: ReturnType<typeof mountPanel>, event: string): number {
  return (wrapper.emitted(event) ?? []).filter(args => args[0] === MOTEUR_LEXIQUE_VALIDATED).length
}

enableAutoUnmount(afterEach)

beforeEach(() => {
  vi.clearAllMocks()
  calls.length = 0
  completedChecks.value = []
  keywords.value = { articleId: 1, capitaine: 'isolation', lieutenants: [], lexique: ['vos'] }
})

describe('LexiquePanel — porte « valider le lexique »', () => {
  it('un mot vide retenu : aucune étape, un bandeau dit pourquoi', async () => {
    mockEvaluate.mockResolvedValue(GENERIC)
    const wrapper = mountPanel()
    await flushPromises()
    expect(mockEvaluate).toHaveBeenCalledWith(1, 'lexique-lock')
    expect(emissions(wrapper, 'check-completed')).toBe(0)
    expect(wrapper.get('[data-testid="lexique-gate-banner"]').text()).toContain('« vos » n’est pas un mot du métier')
  })

  it('le lexique est enregistré avant la vérification', async () => {
    mockEvaluate.mockResolvedValue(GENERIC)
    mountPanel()
    await flushPromises()
    expect(calls.indexOf('saveDecisions')).toBeGreaterThan(-1)
    expect(calls.indexOf('saveDecisions')).toBeLessThan(calls.indexOf('evaluate'))
  })

  it('un lexique de métier : l’étape est demandée une seule fois, sans bandeau', async () => {
    keywords.value = { articleId: 1, capitaine: 'isolation', lieutenants: [], lexique: ['pare-vapeur'] }
    mockEvaluate.mockResolvedValue(PASSED)
    const wrapper = mountPanel()
    await flushPromises()
    expect(emissions(wrapper, 'check-completed')).toBe(1)
    expect(wrapper.find('[data-testid="lexique-gate-banner"]').exists()).toBe(false)
  })

  it('un mot vide ajouté après coup retire l’étape déjà accordée', async () => {
    keywords.value = { articleId: 1, capitaine: 'isolation', lieutenants: [], lexique: ['pare-vapeur'] }
    mockEvaluate.mockResolvedValueOnce(PASSED).mockResolvedValue(GENERIC)
    const wrapper = mountPanel()
    await flushPromises()
    expect(emissions(wrapper, 'check-completed')).toBe(1)
    completedChecks.value = [MOTEUR_LEXIQUE_VALIDATED]

    keywords.value = { ...keywords.value!, lexique: ['pare-vapeur', 'vos'] }
    await flushPromises()
    expect(emissions(wrapper, 'check-removed')).toBe(1)
    expect(wrapper.find('[data-testid="lexique-gate-banner"]').exists()).toBe(true)
  })

  it('le bandeau ouvre l’alarme ; une dérogation accordée rend l’étape', async () => {
    mockEvaluate.mockResolvedValue(GENERIC)
    mockEnsure.mockResolvedValue(true)
    const wrapper = mountPanel()
    await flushPromises()
    await wrapper.get('[data-testid="lexique-gate-review"]').trigger('click')
    await flushPromises()
    expect(mockEnsure).toHaveBeenCalledWith(1, 'lexique-lock')
    expect(emissions(wrapper, 'check-completed')).toBe(1)
    expect(wrapper.find('[data-testid="lexique-gate-banner"]').exists()).toBe(false)
  })
})
