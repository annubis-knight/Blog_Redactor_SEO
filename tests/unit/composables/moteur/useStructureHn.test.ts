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

function setup(confirmReplaceOutline: () => boolean = () => true) {
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
    confirmReplaceOutline,
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
    await api.loadCompetitors({ fetchIfMissing: true })
    expect(mockApiPost).toHaveBeenCalledWith('/serp/analyze', expect.objectContaining({ keyword: 'site vitrine artisan', articleId: 7 }), expect.anything())
    expect(mockApiPost.mock.calls[0]![1]).not.toHaveProperty('cacheOnly')
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
    mockApiGet.mockImplementation(async (path: string) => path.endsWith('/content') ? { outline: null } : { targetWordCount: 2000 })
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
    mockApiGet.mockImplementation(async (path: string) => path.endsWith('/content') ? { outline: null } : { targetWordCount: 3000, angle: 'a' })
    api.structure.value = STRUCTURE
    await api.prepareValidation()
    // M20 : la longueur est recalculée AVANT de rendre la main (plus de tâche lancée sans l'attendre).
    expect(activityLog.addMessage).toHaveBeenCalled()
    expect(mockApiPut.mock.calls.some(([path]) => path === '/articles/7/micro-context')).toBe(false)
  })

  // M20 : un sommaire non enregistré était seulement journalisé, et l'étape
  // demandée quand même — la Rédaction suivait alors un autre sommaire.
  it('sommaire refusé par le serveur : la validation s’arrête', async () => {
    const { api } = setup()
    mockApiGet.mockResolvedValue({ outline: null })
    mockApiPut.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('réseau'))
    api.structure.value = STRUCTURE
    expect(await api.prepareValidation()).toBe(false)
  })

  // M20 : valider écrasait un sommaire retouché dans la Rédaction.
  describe('sommaire retouché dans la Rédaction', () => {
    const RETOUCHE = { sections: [
      { id: 'a', level: 1, title: 'Site vitrine pour artisan : le guide' },
      { id: 'b', level: 2, title: 'Mon chapitre ajouté à la main' },
    ] }

    it('l’utilisateur refuse de le remplacer : il est gardé, la structure est validée', async () => {
      const confirm = vi.fn(() => false)
      const { api, activityLog } = setup(confirm)
      mockApiPost.mockResolvedValue({ recommended: 2400, breakdown: { reasoning: 'r' } })
      mockApiGet.mockImplementation(async (path: string) => path.endsWith('/content') ? { outline: JSON.stringify(RETOUCHE) } : null)
      api.structure.value = STRUCTURE
      expect(await api.prepareValidation()).toBe(true)
      expect(confirm).toHaveBeenCalledTimes(1)
      expect(mockApiPut.mock.calls.some(([path]) => path === '/articles/7')).toBe(false)
      expect(activityLog.addMessage).toHaveBeenCalledWith('info', expect.stringMatching(/sommaire.*conservé/i), expect.any(String))
    })

    it('l’utilisateur accepte : il est remplacé par la structure', async () => {
      const confirm = vi.fn(() => true)
      const { api } = setup(confirm)
      mockApiPost.mockResolvedValue({ recommended: 2400, breakdown: { reasoning: 'r' } })
      mockApiGet.mockImplementation(async (path: string) => path.endsWith('/content') ? { outline: RETOUCHE } : null)
      api.structure.value = STRUCTURE
      expect(await api.prepareValidation()).toBe(true)
      expect(mockApiPut.mock.calls.some(([path]) => path === '/articles/7')).toBe(true)
    })

    it('le sommaire est celui de la structure précédente : remplacé sans rien demander', async () => {
      const confirm = vi.fn(() => false)
      const { api, store } = setup(confirm)
      store.keywords!.hnStructure = STRUCTURE.slice(0, 2)
      const precedent = { sections: [
        { id: 'x', level: 1, title: 'Site vitrine pour artisan : le guide' },
        { id: 'y', level: 2, title: 'Introduction' },
        { id: 'z', level: 2, title: 'Le prix d’un site vitrine' },
        { id: 'w', level: 3, title: 'Les postes' },
        { id: 'v', level: 2, title: 'Conclusion' },
      ] }
      mockApiPost.mockResolvedValue({ recommended: 2400, breakdown: { reasoning: 'r' } })
      mockApiGet.mockImplementation(async (path: string) => path.endsWith('/content') ? { outline: precedent } : null)
      api.structure.value = STRUCTURE
      expect(await api.prepareValidation()).toBe(true)
      expect(confirm).not.toHaveBeenCalled()
      expect(mockApiPut.mock.calls.some(([path]) => path === '/articles/7')).toBe(true)
    })
  })

  // M18 (FR-MOT-NO-AUTO-ACTION) : ouvrir l'onglet ne paie aucune analyse.
  describe('structure des concurrents', () => {
    it('par défaut, lecture de la base seulement', async () => {
      const { api } = setup()
      mockApiPost.mockResolvedValueOnce(null)
      await api.loadCompetitors()
      expect(mockApiPost.mock.calls[0]![1]).toMatchObject({ cacheOnly: true })
      expect(api.competitorsMissing.value).toBe(true)
      expect(api.competitorsError.value).toBeNull()
      expect(api.recurrence.value).toEqual([])
    })
  })
})
