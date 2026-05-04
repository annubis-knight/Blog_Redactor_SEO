/**
 * Vague 3 — Tests isolés useLieutenantsSerp.
 *
 * Référence FR PRD : FR-LIE-SERP-ANALYZE (multi-SERP keyword + dedup),
 * FR-LIE-EXTRACT-HEADINGS (Hn recurrence).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import { useLieutenantsSerp } from '../../../../src/composables/moteur/useLieutenantsSerp'
import { useCostLogStore } from '../../../../src/stores/ui/cost-log.store'
import type { SerpAnalysisResult, SerpCompetitor } from '../../../../shared/types/index'

const mockApiPost = vi.fn()
vi.mock('../../../../src/services/api.service', () => ({
  apiPost: (...args: unknown[]) => mockApiPost(...args),
  apiGet: vi.fn(),
}))

vi.mock('../../../../src/utils/logger', () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

function makeSerpResult(keyword: string, urls: string[] = ['url1', 'url2']): SerpAnalysisResult {
  return {
    keyword,
    competitors: urls.map((url, i) => ({
      url,
      domain: url + '.com',
      title: `Title ${url}`,
      position: i + 1,
      headings: [
        { level: 2, text: `H2 commune ${keyword}` },
        { level: 3, text: `H3 spécifique ${url}` },
      ],
      fetchError: false,
    } as never as SerpCompetitor)),
    paaQuestions: [{ question: `Q ${keyword} ?`, answer: 'A' }] as never,
    maxScraped: urls.length,
  } as never as SerpAnalysisResult
}

describe('useLieutenantsSerp', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockApiPost.mockReset()
  })

  it('AC.J.1 — analyzeSERP itère sur captain + root keywords (sans doublon) et incrémente serpDoneCount', async () => {
    mockApiPost.mockImplementation((_path, body) => {
      return Promise.resolve(makeSerpResult((body as { keyword: string }).keyword))
    })

    const api = useLieutenantsSerp({
      captainKeyword: ref('seo local'),
      articleLevel: ref('intermediaire'),
      selectedArticleId: ref(1),
      canAnalyze: ref(true),
      resolvedRootKeywords: ref(['seo', 'local']),
      activityLog: useCostLogStore(),
    })

    await api.analyzeSERP()

    expect(api.serpDoneCount.value).toBe(3) // captain + 'seo' + 'local'
    expect(api.serpTotalCount.value).toBe(3)
    expect(api.serpResultsByKeyword.value.size).toBe(3)
    expect(api.isLoading.value).toBe(false)
  })

  it('AC.J.2 — analyzeSERP merge les SerpAnalysisResult (dedup competitors par URL)', async () => {
    // Deux SERP avec un URL commun ("commune.com") → deduped dans le merge
    mockApiPost.mockImplementation((_path, body) => {
      const kw = (body as { keyword: string }).keyword
      const urls = kw === 'seo local' ? ['commune', 'unique-1'] : ['commune', 'unique-2']
      return Promise.resolve(makeSerpResult(kw, urls))
    })

    const api = useLieutenantsSerp({
      captainKeyword: ref('seo local'),
      articleLevel: ref('intermediaire'),
      selectedArticleId: ref(1),
      canAnalyze: ref(true),
      resolvedRootKeywords: ref(['root']),
      activityLog: useCostLogStore(),
    })

    await api.analyzeSERP()

    expect(api.serpResult.value).not.toBeNull()
    // 3 URLs uniques après dedup (commune + unique-1 + unique-2)
    expect(api.serpResult.value!.competitors.length).toBe(3)
  })

  it('AC.J.3 — displayedCompetitors limite par sliderValue', () => {
    const api = useLieutenantsSerp({
      captainKeyword: ref('seo'),
      articleLevel: ref('intermediaire'),
      selectedArticleId: ref(1),
      canAnalyze: ref(true),
      resolvedRootKeywords: ref([]),
      activityLog: useCostLogStore(),
    })

    api.serpResult.value = makeSerpResult('seo', ['u1', 'u2', 'u3', 'u4', 'u5'])
    api.sliderValue.value = 3

    expect(api.displayedCompetitors.value.length).toBe(3)
  })

  it('AC.J.4 — computeHnRecurrenceFrom calcule la fréquence par heading', () => {
    const api = useLieutenantsSerp({
      captainKeyword: ref('seo'),
      articleLevel: ref('intermediaire'),
      selectedArticleId: ref(1),
      canAnalyze: ref(true),
      resolvedRootKeywords: ref([]),
      activityLog: useCostLogStore(),
    })

    const comps: SerpCompetitor[] = [
      { url: 'u1', domain: 'u1', title: 't', position: 1, headings: [{ level: 2, text: 'Comm' }, { level: 2, text: 'Spe1' }], fetchError: false } as never,
      { url: 'u2', domain: 'u2', title: 't', position: 2, headings: [{ level: 2, text: 'Comm' }, { level: 2, text: 'Spe2' }], fetchError: false } as never,
    ]

    const recurrence = api.computeHnRecurrenceFrom(comps)
    const comm = recurrence.find(r => r.text === 'Comm')
    expect(comm).toBeDefined()
    expect(comm!.count).toBe(2)
    expect(comm!.percent).toBe(100)
  })

  it('AC.J.5 — analyzeSERP avec canAnalyze=false ne fait rien', async () => {
    const api = useLieutenantsSerp({
      captainKeyword: ref('seo'),
      articleLevel: ref('intermediaire'),
      selectedArticleId: ref(1),
      canAnalyze: ref(false),
      resolvedRootKeywords: ref([]),
      activityLog: useCostLogStore(),
    })

    await api.analyzeSERP()
    expect(mockApiPost).not.toHaveBeenCalled()
    expect(api.isLoading.value).toBe(false)
  })

  it('AC.J.6 — resetSerpState remet à zéro l\'état SERP', () => {
    const api = useLieutenantsSerp({
      captainKeyword: ref('seo'),
      articleLevel: ref('intermediaire'),
      selectedArticleId: ref(1),
      canAnalyze: ref(true),
      resolvedRootKeywords: ref([]),
      activityLog: useCostLogStore(),
    })

    api.serpResult.value = makeSerpResult('seo')
    api.serpResultsByKeyword.value = new Map([['seo', makeSerpResult('seo')]])
    api.error.value = 'oops'
    api.sliderValue.value = 5
    api.serpDoneCount.value = 2
    api.serpTotalCount.value = 3
    api.activeSerpTab.value = 'seo'

    api.resetSerpState()

    expect(api.serpResult.value).toBe(null)
    expect(api.serpResultsByKeyword.value.size).toBe(0)
    expect(api.error.value).toBe(null)
    expect(api.sliderValue.value).toBe(10)
    expect(api.serpDoneCount.value).toBe(0)
    expect(api.serpTotalCount.value).toBe(0)
    expect(api.activeSerpTab.value).toBe('')
  })
})
