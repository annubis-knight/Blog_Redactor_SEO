/**
 * Vague 3 — Tests isolés useLieutenantsIa.
 *
 * Référence FR PRD : FR-LIE-PROPOSE-AI (streaming propose-lieutenants),
 * FR-LIE-CHECKBOX-COUNT (selection management).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import { useLieutenantsIa } from '../../../../src/composables/moteur/useLieutenantsIa'
import { useArticleKeywordsStore } from '../../../../src/stores/article/article-keywords.store'
import type { ProposedLieutenant } from '../../../../shared/types/serp-analysis.types'
import type { SelectedArticle } from '../../../../shared/types/index'

// Mock useStreaming pour contrôler le flow IA dans les tests
const mockStartStream = vi.fn()
const mockAbort = vi.fn()
const mockChunks = ref('')
const mockIsStreaming = ref(false)
const mockError = ref<string | null>(null)

vi.mock('../../../../src/composables/editor/useStreaming', () => ({
  useStreaming: () => ({
    chunks: mockChunks,
    isStreaming: mockIsStreaming,
    error: mockError,
    startStream: mockStartStream,
    abort: mockAbort,
  }),
}))

vi.mock('../../../../src/utils/logger', () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

function makeArticle(id = 1): SelectedArticle {
  return {
    id, slug: 'art', title: 'Article', keyword: 'seo', painPoint: 'p',
    type: 'Pilier', locked: false, source: 'proposed',
  } as never as SelectedArticle
}

function makeLt(keyword: string, score = 50): ProposedLieutenant {
  return { keyword, reasoning: 'r', sources: [], suggestedHnLevel: 2, score } as never
}

function buildDeps(overrides: Partial<Parameters<typeof useLieutenantsIa>[0]> = {}) {
  return {
    captainKeyword: ref('seo local'),
    articleLevel: ref('intermediaire' as const),
    selectedArticle: ref<SelectedArticle | null>(makeArticle()),
    serpResult: ref(null),
    serpResultsByKeyword: ref(new Map()),
    resolvedRootKeywords: ref<string[]>([]),
    wordGroups: ref([]),
    cocoonSlug: ref(''),
    isLocked: ref(false),
    articleKeywordsStore: useArticleKeywordsStore(),
    computeHnRecurrenceFrom: vi.fn(() => []),
    hnRecurrence: ref([]),
    onLieutenantsUpdated: vi.fn(),
    ...overrides,
  }
}

describe('useLieutenantsIa', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockStartStream.mockReset()
    mockAbort.mockReset()
    mockChunks.value = ''
    mockIsStreaming.value = false
    mockError.value = null
  })

  it('AC.J.7 — toggleLieutenant ajoute/retire un keyword + appelle onLieutenantsUpdated', () => {
    const onLieutenantsUpdated = vi.fn()
    const api = useLieutenantsIa(buildDeps({ onLieutenantsUpdated }))

    const lt = makeLt('agence')
    api.toggleLieutenant(lt)

    expect(api.selectedCards.value.has('agence')).toBe(true)
    expect(onLieutenantsUpdated).toHaveBeenCalledWith(['agence'])

    // Toggle à nouveau → retire
    api.toggleLieutenant(lt)
    expect(api.selectedCards.value.has('agence')).toBe(false)
  })

  it.skip('AC.J.7.bis — toggleLieutenant ne fait rien si isLocked = true (Sprint 17 — comportement inversé : toggleLieutenant doit toujours répondre pour FR-LIE-CHECKBOX-LOCK-IMMEDIATE)', () => {
    const onLieutenantsUpdated = vi.fn()
    const api = useLieutenantsIa(buildDeps({
      isLocked: ref(true),
      onLieutenantsUpdated,
    }))

    api.toggleLieutenant(makeLt('agence'))
    expect(api.selectedCards.value.size).toBe(0)
    expect(onLieutenantsUpdated).not.toHaveBeenCalled()
  })

  it('AC.J.8 — handleAssistAdd ajoute un keyword absent à lieutenantCards', () => {
    const api = useLieutenantsIa(buildDeps())

    api.handleAssistAdd('nouveau-kw')

    expect(api.lieutenantCards.value).toHaveLength(1)
    expect(api.lieutenantCards.value[0]!.keyword).toBe('nouveau-kw')
    expect(api.lieutenantCards.value[0]!.reasoning).toBe('Proposé depuis votre panier')
  })

  it('AC.J.8.bis — handleAssistAdd ignore si keyword déjà présent (case-insensitive)', () => {
    const api = useLieutenantsIa(buildDeps())
    api.handleAssistAdd('SEO Local')
    api.handleAssistAdd('seo local')
    api.handleAssistAdd('SEO LOCAL')

    expect(api.lieutenantCards.value).toHaveLength(1)
  })

  it('AC.J.9 — restoreLockedLieutenants depuis richLieutenants pré-coche les locked uniquement', () => {
    const articleKeywordsStore = useArticleKeywordsStore()
    articleKeywordsStore.keywords = {
      articleId: 1, capitaine: 'cap', lieutenants: [], lexique: [], rootKeywords: [],
      richLieutenants: [
        { keyword: 'lt-locked', status: 'locked', reasoning: '', sources: [], suggestedHnLevel: 2, score: 80 },
        { keyword: 'lt-suggest', status: 'suggested', reasoning: '', sources: [], suggestedHnLevel: 2, score: 60 },
        { keyword: 'lt-elim', status: 'eliminated', reasoning: '', sources: [], suggestedHnLevel: 2, score: 30 },
      ],
    } as never

    const onLieutenantsUpdated = vi.fn()
    const api = useLieutenantsIa(buildDeps({ articleKeywordsStore, onLieutenantsUpdated }))

    api.restoreLockedLieutenants()

    // lieutenantCards = locked + suggested
    expect(api.lieutenantCards.value).toHaveLength(2)
    expect(api.eliminatedCards.value).toHaveLength(1)

    // selectedCards = locked uniquement
    expect(api.selectedCards.value.size).toBe(1)
    expect(api.selectedCards.value.has('lt-locked')).toBe(true)
    expect(onLieutenantsUpdated).toHaveBeenCalledWith(['lt-locked'])
  })

  it('AC.J.9.bis — restoreLockedLieutenants ne re-restaure pas si lieutenantCards déjà rempli', () => {
    const articleKeywordsStore = useArticleKeywordsStore()
    articleKeywordsStore.keywords = {
      articleId: 1, capitaine: 'cap', lieutenants: [], lexique: [], rootKeywords: [],
      richLieutenants: [
        { keyword: 'lt-locked', status: 'locked', reasoning: '', sources: [], suggestedHnLevel: 2, score: 80 },
      ],
    } as never

    const api = useLieutenantsIa(buildDeps({ articleKeywordsStore }))
    api.lieutenantCards.value = [makeLt('existing-card')]

    api.restoreLockedLieutenants()
    expect(api.lieutenantCards.value).toHaveLength(1)
    expect(api.lieutenantCards.value[0]!.keyword).toBe('existing-card')
  })

  it('AC.J.10 — proposeLieutenants ne fait rien si captainKeyword null', () => {
    const api = useLieutenantsIa(buildDeps({ captainKeyword: ref(null) }))
    api.proposeLieutenants()
    expect(mockStartStream).not.toHaveBeenCalled()
  })

  it('AC.J.10.bis — proposeLieutenants ne fait rien si serpResult null', () => {
    const api = useLieutenantsIa(buildDeps({ serpResult: ref(null) }))
    api.proposeLieutenants()
    expect(mockStartStream).not.toHaveBeenCalled()
  })

  it('AC.J.11 — resetIaState remet à zéro tous les refs IA', () => {
    const api = useLieutenantsIa(buildDeps())
    api.lieutenantCards.value = [makeLt('a')]
    api.eliminatedCards.value = [makeLt('b')]
    api.totalGenerated.value = 5
    api.selectedCards.value = new Map([['a', makeLt('a')]])
    api.hnStructure.value = [{ level: 2, text: 'h2', children: [] }] as never
    api.contentGapInsights.value = 'insights'
    api.currentStep.value = 'done'

    api.resetIaState()

    expect(api.lieutenantCards.value).toEqual([])
    expect(api.eliminatedCards.value).toEqual([])
    expect(api.totalGenerated.value).toBe(0)
    expect(api.selectedCards.value.size).toBe(0)
    expect(api.hnStructure.value).toEqual([])
    expect(api.contentGapInsights.value).toBe('')
    expect(api.currentStep.value).toBe('idle')
    expect(mockAbort).toHaveBeenCalled()
  })
})
