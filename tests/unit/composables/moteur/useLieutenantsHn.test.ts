/**
 * Vague 3 — Tests isolés useLieutenantsHn.
 *
 * Référence FR PRD : FR-LIE-HN-STRUCTURE.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import { useLieutenantsHn } from '../../../../src/composables/moteur/useLieutenantsHn'
import { useArticleKeywordsStore } from '../../../../src/stores/article/article-keywords.store'
import type { SelectedArticle } from '../../../../shared/types/index'
import type { ProposeLieutenantsHnNode, HnRecurrenceItem } from '../../../../shared/types/serp-analysis.types'

const mockApiPut = vi.fn()
vi.mock('../../../../src/services/api.service', () => ({
  apiPut: (...args: unknown[]) => mockApiPut(...args),
  apiGet: vi.fn(),
  apiPost: vi.fn(),
}))

vi.mock('../../../../src/stores/article/outline.store', () => ({
  hnToOutline: vi.fn((nodes: unknown[], title: string) => ({
    title,
    sections: (nodes as unknown[]).map((_n, i) => ({ heading: 'h' + i, level: 2 })),
  })),
}))

vi.mock('../../../../src/utils/logger', () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

function makeArticle(id = 1): SelectedArticle {
  return {
    id, slug: 'art', title: 'Article test', keyword: 'seo', painPoint: 'p',
    type: 'Pilier', locked: false, source: 'proposed',
  } as never as SelectedArticle
}

describe('useLieutenantsHn', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockApiPut.mockReset()
    mockApiPut.mockResolvedValue(undefined)
  })

  it('AC.J.12 — activeHnTab = "__all__" par défaut, activeHnRecurrence = hnRecurrence (merged)', () => {
    const hnRecurrence = ref<HnRecurrenceItem[]>([
      { level: 2, text: 'Comm', count: 3, total: 3, percent: 100 },
    ])

    const api = useLieutenantsHn({
      selectedArticle: ref(makeArticle()),
      serpResultsByKeyword: ref(new Map()),
      hnRecurrence,
      hnStructure: ref([]),
      articleKeywordsStore: useArticleKeywordsStore(),
      computeHnRecurrenceFrom: vi.fn(),
    })

    expect(api.activeHnTab.value).toBe('__all__')
    expect(api.activeHnRecurrence.value).toEqual(hnRecurrence.value)
  })

  it('AC.J.13 — activeHnTab par keyword → calcule via computeHnRecurrenceFrom du tab', () => {
    const computeHnRecurrenceFrom = vi.fn((_comps) => [
      { level: 3, text: 'Per-keyword H3', count: 1, total: 1, percent: 100 },
    ])

    const serpResultsByKeyword = ref(new Map([
      ['seo local', {
        keyword: 'seo local',
        competitors: [{ url: 'u1', domain: 'u1', title: 't', position: 1, headings: [], fetchError: false }],
        paaQuestions: [],
        maxScraped: 1,
      } as never],
    ]))

    const api = useLieutenantsHn({
      selectedArticle: ref(makeArticle()),
      serpResultsByKeyword,
      hnRecurrence: ref([]),
      hnStructure: ref([]),
      articleKeywordsStore: useArticleKeywordsStore(),
      computeHnRecurrenceFrom,
    })

    api.activeHnTab.value = 'seo local'
    const recurrence = api.activeHnRecurrence.value

    expect(computeHnRecurrenceFrom).toHaveBeenCalled()
    expect(recurrence[0]!.text).toBe('Per-keyword H3')
  })

  it('AC.J.14 — saveHnStructure persiste outline + flag hnSaved (revient à false après 2s)', async () => {
    vi.useFakeTimers()

    const articleKeywordsStore = useArticleKeywordsStore()
    articleKeywordsStore.keywords = {
      articleId: 1, capitaine: 'cap', lieutenants: [], lexique: [], rootKeywords: [],
    } as never
    articleKeywordsStore.saveDecisions = vi.fn().mockResolvedValue(undefined) as never

    const hnStructure = ref<ProposeLieutenantsHnNode[]>([
      { level: 2, text: 'H2 a', children: [] } as never,
    ])

    const api = useLieutenantsHn({
      selectedArticle: ref(makeArticle()),
      serpResultsByKeyword: ref(new Map()),
      hnRecurrence: ref([]),
      hnStructure,
      articleKeywordsStore,
      computeHnRecurrenceFrom: vi.fn(),
    })

    const promise = api.saveHnStructure()
    expect(api.isSavingHn.value).toBe(true)
    await promise

    expect(mockApiPut).toHaveBeenCalledWith(
      '/articles/1',
      expect.objectContaining({ outline: expect.any(Object) }),
    )
    expect(api.hnSaved.value).toBe(true)
    expect(api.isSavingHn.value).toBe(false)

    vi.advanceTimersByTime(2000)
    expect(api.hnSaved.value).toBe(false)

    vi.useRealTimers()
  })

  it('AC.J.15 — saveHnStructure no-op si pas d\'article ou hnStructure vide', async () => {
    const articleKeywordsStore = useArticleKeywordsStore()
    articleKeywordsStore.keywords = {
      articleId: 1, capitaine: 'cap', lieutenants: [], lexique: [], rootKeywords: [],
    } as never

    const api = useLieutenantsHn({
      selectedArticle: ref(null),
      serpResultsByKeyword: ref(new Map()),
      hnRecurrence: ref([]),
      hnStructure: ref([]),
      articleKeywordsStore,
      computeHnRecurrenceFrom: vi.fn(),
    })

    await api.saveHnStructure()
    expect(mockApiPut).not.toHaveBeenCalled()
    expect(api.isSavingHn.value).toBe(false)
  })

  it('AC.J.16 — resetHnState remet activeHnTab et flags à leur état initial', () => {
    const api = useLieutenantsHn({
      selectedArticle: ref(makeArticle()),
      serpResultsByKeyword: ref(new Map()),
      hnRecurrence: ref([]),
      hnStructure: ref([]),
      articleKeywordsStore: useArticleKeywordsStore(),
      computeHnRecurrenceFrom: vi.fn(),
    })

    api.activeHnTab.value = 'seo local'
    api.hnSaved.value = true
    api.isSavingHn.value = true

    api.resetHnState()

    expect(api.activeHnTab.value).toBe('__all__')
    expect(api.hnSaved.value).toBe(false)
    expect(api.isSavingHn.value).toBe(false)
  })
})
