/**
 * FR-MOT-CHECK-RECONCILIATION, FR-LIE-CHECK — choisir un article ne fait que
 * relire : aucune étape n'est retirée ni redemandée pendant que ses mots-clés
 * se chargent (recette du 2026-09-30, F4 / 03-T1 / 06-FIN-2).
 *
 * La course reproduite : au choix (ou au rechoix) d'un article, MoteurView vide
 * le store des mots-clés avant de le recharger. Pendant ce trou, l'onglet
 * Lieutenants voyait « aucun lieutenant verrouillé » alors que l'étape était en
 * base : il la retirait, et le serveur retirait « Structure validée » avec elle
 * (`checksRemovedWith`). Les mots-clés arrivés, l'étape Lieutenants était
 * redemandée (et les décisions réenregistrées), la Structure jamais.
 *
 * Règle gardée : la réconciliation ne juge que les données de l'article choisi,
 * une fois chargées ; leur arrivée n'est pas un geste de l'utilisateur.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, enableAutoUnmount } from '@vue/test-utils'
import { ref } from 'vue'
import LieutenantsPanel from '../../../src/components/moteur/LieutenantsPanel.vue'
import { MOTEUR_HN_LOCKED, MOTEUR_LIEUTENANTS_LOCKED } from '../../../shared/constants/workflow-checks.constants'
import type { SelectedArticle } from '../../../shared/types/index'
import type { RichLieutenant } from '../../../shared/types/keyword.types'
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
  apiPost: vi.fn().mockResolvedValue({}),
  apiGet: vi.fn().mockResolvedValue(null),
  apiPut: vi.fn().mockResolvedValue(undefined),
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

const saveDecisions = vi.fn(async () => true)
const storeKeywords = ref<Record<string, unknown> | null>(null)
vi.mock('../../../src/stores/article/article-keywords.store', () => ({
  useArticleKeywordsStore: () => ({
    get keywords() { return storeKeywords.value },
    get lockedLieutenants() {
      return ((storeKeywords.value?.richLieutenants as RichLieutenant[] | undefined) ?? []).filter(l => l.status === 'locked')
    },
    saveDecisions,
    setRichLieutenants: vi.fn(),
    saveRichLieutenantProposals: vi.fn(),
    saveLieutenantExplorationEntries: vi.fn().mockResolvedValue(undefined),
  }),
}))

/** Étapes enregistrées, par article (ce que le store de progression a relu). */
const checksById = ref<Record<number, string[]>>({})
vi.mock('../../../src/stores/article/article-progress.store', () => ({
  useArticleProgressStore: () => ({
    getProgress: (id: number) => (checksById.value[id] ? { completedChecks: checksById.value[id] } : null),
  }),
}))

const PASSED: GateEvaluation = { gateId: 'lieutenants-lock', passed: true, inputHash: 'h', waived: [], issues: [], blocking: [] }
const evaluate = vi.fn(async () => PASSED)
vi.mock('../../../src/stores/ui/gate-alarm.store', () => ({
  useGateAlarmStore: () => ({ evaluate, ensure: vi.fn() }),
}))

vi.mock('../../../src/utils/logger', () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock('../../../src/stores/ui/cost-log.store', () => ({
  useCostLogStore: () => ({
    entries: [], isCollapsed: true, totalCost: 0, entryCount: 0,
    addEntry: vi.fn(), addMessage: vi.fn(), removeEntry: vi.fn(),
    clearAll: vi.fn(), toggleCollapsed: vi.fn(),
  }),
}))

function article(id: number, keyword: string): SelectedArticle {
  return {
    id, slug: `article-${id}`, title: `Article ${id}`, keyword, painPoint: 'douleur',
    type: 'intermediaire', locked: false, source: 'proposed',
  } as never as SelectedArticle
}

const PILIER = article(1335, 'recette 2026-09-30')
const ENFANT = article(1339, 'étapes bien démarrer')

function lieutenant(keyword: string): RichLieutenant {
  return { keyword, status: 'locked', reasoning: 'r', sources: [], suggestedHnLevel: 2, score: 70 } as never as RichLieutenant
}

function keywordsOf(target: SelectedArticle, locked: RichLieutenant[]): Record<string, unknown> {
  return {
    articleId: target.id, capitaine: target.keyword,
    lieutenants: locked.map(l => l.keyword), lexique: ['terme'], rootKeywords: [],
    richLieutenants: [...locked], hnStructure: [{ level: 2, text: 'Prix' }],
  }
}

function mountPanel(selected: SelectedArticle) {
  return mount(LieutenantsPanel, {
    props: {
      selectedArticle: selected, mode: 'workflow', captainKeyword: selected.keyword,
      articleLevel: 'intermediaire', isCaptaineLocked: true, wordGroups: [], rootKeywords: [],
      initialLocked: true, cocoonSlug: 'recette',
    },
    global: {
      stubs: {
        LieutenantSerpAnalysis: { template: '<div />' },
        LieutenantsResultsLayout: { template: '<div />' },
        KeywordAssistPanel: { template: '<div />' },
      },
    },
  })
}

type Wrapper = ReturnType<typeof mountPanel>
const emitted = (wrapper: Wrapper, event: string, check: string) =>
  (wrapper.emitted(event) ?? []).filter(args => args[0] === check).length

enableAutoUnmount(afterEach)

beforeEach(() => {
  vi.clearAllMocks()
  storeKeywords.value = null
  checksById.value = {
    [PILIER.id]: [MOTEUR_LIEUTENANTS_LOCKED, MOTEUR_HN_LOCKED],
    [ENFANT.id]: [MOTEUR_LIEUTENANTS_LOCKED, MOTEUR_HN_LOCKED],
  }
})

describe('LieutenantsPanel — la réconciliation attend les données de l’article (FR-MOT-CHECK-RECONCILIATION)', () => {
  it('monté avant l’arrivée des mots-clés : rien n’est retiré, ni pendant le chargement ni après', async () => {
    const wrapper = mountPanel(ENFANT)
    await flushPromises()
    expect(emitted(wrapper, 'check-removed', MOTEUR_LIEUTENANTS_LOCKED), 'pendant le chargement').toBe(0)

    // Les mots-clés arrivent : deux lieutenants verrouillés, étape et structure en base.
    storeKeywords.value = keywordsOf(ENFANT, [lieutenant('prix étapes'), lieutenant('étapes avis')])
    await flushPromises()

    expect(emitted(wrapper, 'check-removed', MOTEUR_LIEUTENANTS_LOCKED)).toBe(0)
    expect(emitted(wrapper, 'check-removed', MOTEUR_HN_LOCKED), '« Structure validée » reste').toBe(0)
    expect(emitted(wrapper, 'check-completed', MOTEUR_LIEUTENANTS_LOCKED), 'étape déjà là : rien à redemander').toBe(0)
    expect(saveDecisions, 'relire n’écrit rien').not.toHaveBeenCalled()
    expect(evaluate).not.toHaveBeenCalled()
  })

  it('changer d’article, panneau monté : rien n’est retiré au nouvel article pendant son chargement', async () => {
    storeKeywords.value = keywordsOf(PILIER, [lieutenant('prix recette'), lieutenant('recette avis'), lieutenant('recette étapes')])
    const wrapper = mountPanel(PILIER)
    await flushPromises()

    // MoteurView vide le store, puis le recharge pour le nouvel article.
    storeKeywords.value = null
    await wrapper.setProps({ selectedArticle: ENFANT, captainKeyword: ENFANT.keyword })
    await flushPromises()
    storeKeywords.value = keywordsOf(ENFANT, [lieutenant('prix étapes'), lieutenant('étapes avis')])
    await flushPromises()

    expect(emitted(wrapper, 'check-removed', MOTEUR_LIEUTENANTS_LOCKED)).toBe(0)
    expect(emitted(wrapper, 'check-removed', MOTEUR_HN_LOCKED)).toBe(0)
    expect(emitted(wrapper, 'check-completed', MOTEUR_LIEUTENANTS_LOCKED)).toBe(0)
    expect(saveDecisions).not.toHaveBeenCalled()
  })

  it('les mots-clés d’un autre article encore en mémoire ne sont pas jugés pour le nouvel article', async () => {
    storeKeywords.value = keywordsOf(PILIER, [])
    const wrapper = mountPanel(ENFANT)
    await flushPromises()
    expect(emitted(wrapper, 'check-removed', MOTEUR_LIEUTENANTS_LOCKED)).toBe(0)
  })

  it('une vraie contradiction, une fois les données là, est toujours corrigée : étape sans lieutenant retenu → retirée', async () => {
    const wrapper = mountPanel(ENFANT)
    await flushPromises()
    storeKeywords.value = keywordsOf(ENFANT, [])
    await flushPromises()
    expect(emitted(wrapper, 'check-removed', MOTEUR_LIEUTENANTS_LOCKED)).toBe(1)
  })

  it('la progression de l’article pas encore relue : rien n’est demandé ni retiré', async () => {
    checksById.value = {}
    storeKeywords.value = keywordsOf(ENFANT, [lieutenant('prix étapes'), lieutenant('étapes avis')])
    const wrapper = mountPanel(ENFANT)
    await flushPromises()
    expect(emitted(wrapper, 'check-completed', MOTEUR_LIEUTENANTS_LOCKED)).toBe(0)
    expect(evaluate).not.toHaveBeenCalled()

    // La progression arrive : étape déjà enregistrée, rien à faire.
    checksById.value = { [ENFANT.id]: [MOTEUR_LIEUTENANTS_LOCKED, MOTEUR_HN_LOCKED] }
    await flushPromises()
    expect(emitted(wrapper, 'check-completed', MOTEUR_LIEUTENANTS_LOCKED)).toBe(0)
    expect(emitted(wrapper, 'check-removed', MOTEUR_LIEUTENANTS_LOCKED)).toBe(0)
  })

  it('après le chargement, décocher le dernier lieutenant reste un geste : l’étape est retirée et la décision enregistrée', async () => {
    storeKeywords.value = keywordsOf(ENFANT, [lieutenant('prix étapes')])
    const wrapper = mountPanel(ENFANT)
    await flushPromises()
    expect(emitted(wrapper, 'check-removed', MOTEUR_LIEUTENANTS_LOCKED)).toBe(0)

    storeKeywords.value = keywordsOf(ENFANT, [])
    await flushPromises()
    expect(emitted(wrapper, 'check-removed', MOTEUR_LIEUTENANTS_LOCKED)).toBe(1)
    expect(saveDecisions).toHaveBeenCalledWith(ENFANT.id)
  })
})
