/**
 * FR-HN-TAB — la structure H1/H2/H3 naît des lieutenants RETENUS (M7 : elle
 * naissait avec les candidats, avant tout choix), et sa validation écrit le
 * sommaire de la Rédaction avant que l'étape ne soit demandée.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { setActivePinia, createPinia } from 'pinia'

const { mockApiPost, mockApiPut, mockApiGet, mockStartStream } = vi.hoisted(() => ({
  mockApiPost: vi.fn(), mockApiPut: vi.fn(), mockApiGet: vi.fn(), mockStartStream: vi.fn(),
}))
vi.mock('../../../../src/services/api.service', () => ({ apiPost: mockApiPost, apiPut: mockApiPut, apiGet: mockApiGet, apiPatch: vi.fn() }))
vi.mock('../../../../src/composables/editor/useStreaming', () => ({
  useStreaming: () => ({ isStreaming: ref(false), startStream: mockStartStream }),
}))

import { useStructureHn } from '../../../../src/composables/moteur/useStructureHn'
import { useArticleKeywordsStore } from '../../../../src/stores/article/article-keywords.store'
import type { ProposeLieutenantsHnNode } from '../../../../shared/types/serp-analysis.types'

const STRUCTURE: ProposeLieutenantsHnNode[] = [
  { level: 1, text: 'Site vitrine pour artisan : le guide' },
  { level: 2, text: 'Le prix d’un site vitrine', children: [{ level: 3, text: 'Les postes' }] },
  { level: 2, text: 'Les étapes' },
]

function setup() {
  const store = useArticleKeywordsStore()
  store.keywords = {
    articleId: 7, capitaine: 'site vitrine artisan', lieutenants: ['prix site vitrine'], lexique: [], rootKeywords: [],
    richLieutenants: [
      { keyword: 'prix site vitrine', status: 'locked', reasoning: '', sources: [], suggestedHnLevel: 2, score: 80 },
      { keyword: 'site vitrine gratuit', status: 'suggested', reasoning: '', sources: [], suggestedHnLevel: 2, score: 40 },
    ],
    hnStructure: [],
  } as never
  const activityLog = { addMessage: vi.fn() }
  const api = useStructureHn({
    selectedArticle: ref({ id: 7, title: 'Site vitrine', slug: 's', keyword: null, type: 'Pilier' } as never),
    captainKeyword: ref('site vitrine artisan'),
    articleLevel: ref('pilier'),
    cocoonSlug: ref('sites'),
    articleKeywordsStore: store,
    activityLog: activityLog as never,
  })
  return { api, store, activityLog }
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  mockApiPut.mockResolvedValue({})
})

describe('useStructureHn', () => {
  it('la structure naît des seuls lieutenants retenus, avec la récurrence des concurrents', async () => {
    const { api } = setup()
    mockApiPost.mockResolvedValueOnce({
      keyword: 'site vitrine artisan', articleLevel: 'pilier', topN: 10, competitors: [
        { position: 1, title: 'A', url: 'https://a.fr', domain: 'a.fr', headings: [{ level: 2, text: 'Le prix' }], wordCount: 0, fetchError: null },
        { position: 2, title: 'B', url: 'https://b.fr', domain: 'b.fr', headings: [{ level: 2, text: 'Le prix' }], wordCount: 0, fetchError: null },
      ], paaQuestions: [], maxScraped: 2, cachedAt: '', fromCache: true,
    })
    await api.loadCompetitors()
    expect(mockApiPost).toHaveBeenCalledWith('/serp/analyze', expect.objectContaining({ keyword: 'site vitrine artisan', articleId: 7 }), expect.anything())
    expect(api.recurrence.value[0]).toMatchObject({ text: 'Le prix', count: 2 })

    mockStartStream.mockImplementationOnce(async (_url: string, _body: unknown, callbacks: { onDone: (d: { hnStructure: ProposeLieutenantsHnNode[] }) => void }) => {
      callbacks.onDone({ hnStructure: STRUCTURE })
    })
    await api.generate([])
    const [url, body] = mockStartStream.mock.calls[0]!
    expect(url).toBe('/api/keywords/site%20vitrine%20artisan/ai-hn-structure')
    expect(body).toMatchObject({ lieutenants: ['prix site vitrine'], level: 'pilier', articleId: 7, cocoonSlug: 'sites' })
    expect((body as { hnStructure: unknown[] }).hnStructure).toEqual([{ level: 2, text: 'Le prix', count: 2, percent: 100 }])
    expect(api.structure.value).toEqual(STRUCTURE)
    expect(api.dirty.value).toBe(true)
  })

  it('sans lieutenant retenu, aucune structure n’est demandée', async () => {
    const { api, store } = setup()
    store.keywords!.richLieutenants = []
    store.keywords!.lieutenants = []
    await api.generate([])
    expect(mockStartStream).not.toHaveBeenCalled()
  })

  it('valider : la structure, puis le sommaire de la Rédaction, sont enregistrés', async () => {
    const { api } = setup()
    mockApiPost.mockResolvedValue({ recommended: 2400, breakdown: { reasoning: 'r' } })
    mockApiGet.mockResolvedValue({ targetWordCount: 2000 })
    api.structure.value = STRUCTURE
    expect(await api.prepareValidation()).toBe(true)
    expect(mockApiPut.mock.calls[0]).toEqual(['/articles/7/keywords', expect.objectContaining({ hnStructure: STRUCTURE })])
    const outline = mockApiPut.mock.calls[1]!
    expect(outline[0]).toBe('/articles/7')
    expect((outline[1] as { outline: { sections: Array<{ title: string }> } }).outline.sections.map(s => s.title))
      .toEqual(['Site vitrine pour artisan : le guide', 'Introduction', 'Le prix d’un site vitrine', 'Les postes', 'Les étapes', 'Conclusion'])
    expect(api.dirty.value).toBe(false)
  })

  it('un enregistrement refusé : la validation s’arrête (la porte ne jugerait pas la base)', async () => {
    const { api } = setup()
    mockApiPut.mockRejectedValueOnce(new Error('réseau'))
    api.structure.value = STRUCTURE
    expect(await api.prepareValidation()).toBe(false)
    expect(mockApiPut).toHaveBeenCalledTimes(1)
  })

  it('la longueur conseillée n’écrase pas une longueur déjà choisie', async () => {
    const { api, activityLog } = setup()
    mockApiPost.mockResolvedValue({ recommended: 2400, breakdown: { reasoning: 'r' } })
    mockApiGet.mockResolvedValue({ targetWordCount: 3000, angle: 'a' })
    api.structure.value = STRUCTURE
    await api.prepareValidation()
    await vi.waitFor(() => expect(activityLog.addMessage).toHaveBeenCalled())
    expect(mockApiPut.mock.calls.some(([path]) => path === '/articles/7/micro-context')).toBe(false)
  })
})
