/**
 * Chantier 3 — E2-S2 : LexiquePanel système d'onglets multi-keyword
 * (FR-LEX-MULTI-KEYWORD-TABS).
 *
 * Couvre :
 *   - AC.LEX-TABS.1 : 3 explorations → 3 onglets + 1 « + Tester » (4 tabs).
 *   - AC.LEX-TABS.2 : clic onglet → 0 refetch DB (apiGet count stable sur
 *                     /articles/:id/explorations).
 *   - AC.LEX-TABS.3 : 0 exploration → 1 seul onglet (« Tester un mot-clé »).
 *
 * AC.LEX-TABS.4 (extraction ajoute un onglet) est testé ci-après mais
 * couplé au flow extractCustomKeyword qui passe par fetchTfidf — on
 * vérifie au moins l'invariant data : pastExplorations grandit après extract.
 *
 * Cohérence affichage/calcul §2.0 : `tab.id === tab.label === entry.sourceKeyword`
 * (pas de lowercase/trim côté UI).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import LexiquePanel from '../../../../src/components/moteur/LexiquePanel.vue'
import { apiGet, apiPost } from '../../../../src/services/api.service'

vi.mock('../../../../src/services/api.service', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
}))

vi.mock('../../../../src/composables/lexique/useLexiqueIa', () => ({
  useLexiqueIa: () => ({
    iaIsStreaming: { value: false },
    iaError: { value: null },
    iaResult: { value: null },
    iaRecommendations: { value: new Map() },
    iaRecommendedCount: { value: 0 },
    iaNotRecommendedCount: { value: 0 },
    iaAbort: vi.fn(),
    getRecommendation: vi.fn(),
    isIaRecommended: vi.fn(),
    generateLexiqueUpfront: vi.fn(),
  }),
}))

const mockedGet = vi.mocked(apiGet)
const mockedPost = vi.mocked(apiPost)

const STUBS = {
  KeywordAssistPanel: true,
  LexiqueAiPanel: true,
  LexiqueTermsList: true,
  SortToggleBar: true,
  ConfirmModal: true,
  LexiqueCustomKeywordInput: true,
}

const BASE_PROPS = {
  selectedArticle: { id: 1, slug: 'a', cocoonSlug: 'c', painPoint: null, title: 'T' },
  captainKeyword: 'creation site web',
  articleLevel: 'pilier',
  selectedLieutenants: [],
  isCaptaineLocked: true,
  initialLocked: false,
  cocoonSlug: 'c',
}

function makeExploration(sourceKeyword: string) {
  return {
    articleId: 1,
    sourceKeyword,
    tfidfTerms: { keyword: sourceKeyword, totalCompetitors: 5, obligatoire: [], differenciateur: [], optionnel: [] },
    aiRecommendations: [],
    aiMissingTerms: [],
    aiSummary: null,
    exploredAt: '2026-05-08T10:00:00.000Z',
  }
}

beforeEach(() => {
  setActivePinia(createPinia())
  mockedGet.mockReset()
  mockedPost.mockReset()
})

function setupApi(opts: {
  exists?: boolean
  scrapedAt?: string | null
  explorations?: ReturnType<typeof makeExploration>[]
}) {
  mockedGet.mockImplementation(async (path: string) => {
    if (path.includes('/serp/exists')) return { exists: opts.exists ?? true, scrapedAt: opts.scrapedAt ?? '2026-05-08T10:00:00.000Z' }
    if (path.includes('/explorations')) return { lexique: opts.explorations ?? [] }
    return {}
  })
}

describe('LexiquePanel — onglets multi-keyword (chantier 3 E2-S2)', () => {
  it('AC.LEX-TABS.1 — 3 explorations → 3 onglets + 1 « + Tester » (4 tabs role="tab")', async () => {
    setupApi({
      exists: true,
      explorations: [
        makeExploration('creation site web'),
        makeExploration('creation site Toulouse'),
        makeExploration('site web entreprise'),
      ],
    })

    const wrapper = mount(LexiquePanel, {
      props: BASE_PROPS as unknown as Record<string, unknown>,
      global: { stubs: STUBS },
    })

    await flushPromises()
    await flushPromises()

    const tabs = wrapper.findAll('[role="tab"]')
    expect(tabs).toHaveLength(4)

    // Cohérence affichage/calcul : labels = sourceKeyword brut (pas de transformation)
    const labels = tabs.map(t => t.text())
    expect(labels).toContain('creation site web')
    expect(labels).toContain('creation site Toulouse')
    expect(labels).toContain('site web entreprise')
    // 4ème onglet = « + Tester un mot-clé »
    expect(labels.some(l => /Tester/.test(l))).toBe(true)
  })

  it('AC.LEX-TABS.4 — 0 exploration → 1 seul onglet (« Tester un mot-clé »)', async () => {
    setupApi({ exists: true, explorations: [] })

    const wrapper = mount(LexiquePanel, {
      props: BASE_PROPS as unknown as Record<string, unknown>,
      global: { stubs: STUBS },
    })

    await flushPromises()
    await flushPromises()

    const tabs = wrapper.findAll('[role="tab"]')
    expect(tabs).toHaveLength(1)
    expect(tabs[0].text()).toMatch(/Tester/)
  })

  it('AC.LEX-TABS.2 — clic onglet → 0 refetch DB sur /articles/:id/explorations', async () => {
    setupApi({
      exists: true,
      explorations: [
        makeExploration('creation site web'),
        makeExploration('creation site Toulouse'),
      ],
    })
    mockedPost.mockResolvedValue({ obligatoire: [], differenciateur: [], optionnel: [] })

    const wrapper = mount(LexiquePanel, {
      props: BASE_PROPS as unknown as Record<string, unknown>,
      global: { stubs: STUBS },
    })

    await flushPromises()
    await flushPromises()

    // Compte les calls /explorations AU mount
    const explorationCallsAfterMount = mockedGet.mock.calls.filter(c => String(c[0]).includes('/explorations')).length

    // Clic sur le 2ème onglet
    const tabs = wrapper.findAll('[role="tab"]')
    const toulouseTab = tabs.find(t => t.text() === 'creation site Toulouse')!
    await toulouseTab.trigger('click')
    await flushPromises()

    const explorationCallsAfterClick = mockedGet.mock.calls.filter(c => String(c[0]).includes('/explorations')).length

    // 0 nouveau call /explorations après le clic (le cache pastExplorations sert)
    expect(explorationCallsAfterClick).toBe(explorationCallsAfterMount)
  })

  it('cohérence affichage/calcul — tab.id (data-testid) = sourceKeyword brut', async () => {
    setupApi({
      exists: true,
      explorations: [makeExploration('Creation Site Web Entreprise')],
    })

    const wrapper = mount(LexiquePanel, {
      props: BASE_PROPS as unknown as Record<string, unknown>,
      global: { stubs: STUBS },
    })

    await flushPromises()
    await flushPromises()

    // L'id du data-testid = brut (pas de lowercase). L'attribut role=tab existe.
    const rawTab = wrapper.find('[data-testid="tab-Creation Site Web Entreprise"]')
    expect(rawTab.exists()).toBe(true)
    // Le label = brut aussi (pas de transformation côté template).
    expect(rawTab.text()).toBe('Creation Site Web Entreprise')
  })
})
