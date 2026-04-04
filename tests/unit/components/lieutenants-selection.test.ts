import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { ref, nextTick } from 'vue'
import LieutenantsSelection from '../../../src/components/moteur/LieutenantsSelection.vue'
import type { SelectedArticle, SerpAnalysisResult } from '../../../shared/types/index'
import type { WordGroup } from '../../../shared/types/discovery-tab.types'

// Mock api.service
const mockApiPost = vi.fn()
vi.mock('../../../src/services/api.service', () => ({
  apiPost: (...args: unknown[]) => mockApiPost(...args),
}))

// Mock useStreaming
const mockStartStream = vi.fn()
const mockAbort = vi.fn()
const mockChunks = ref('')
const mockIsStreaming = ref(false)
const mockStreamError = ref<string | null>(null)
vi.mock('../../../src/composables/useStreaming', () => ({
  useStreaming: () => ({
    chunks: mockChunks,
    isStreaming: mockIsStreaming,
    error: mockStreamError,
    result: ref(null),
    usage: ref(null),
    startStream: mockStartStream,
    abort: mockAbort,
  }),
}))

// Mock logger
vi.mock('../../../src/utils/logger', () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const ARTICLE: SelectedArticle = {
  slug: 'test-article',
  title: 'Test Article',
  keyword: 'seo local',
  painPoint: 'pain',
  type: 'Cluster',
}

const SERP_RESULT: SerpAnalysisResult = {
  keyword: 'seo local',
  articleLevel: 'intermediaire',
  competitors: [
    { position: 1, title: 'Page 1', url: 'https://example.com/1', domain: 'example.com', headings: [{ level: 1, text: 'Main Title' }, { level: 2, text: 'Causes' }], textContent: 'text1' },
    { position: 2, title: 'Page 2', url: 'https://example.com/2', domain: 'example.com', headings: [{ level: 2, text: 'Causes' }, { level: 2, text: 'Solutions' }], textContent: 'text2' },
    { position: 3, title: 'Page 3', url: 'https://example.com/3', domain: 'other.com', headings: [], textContent: '', fetchError: 'HTTP 403' },
    { position: 4, title: 'Page 4', url: 'https://example.com/4', domain: 'four.com', headings: [{ level: 2, text: 'Causes' }, { level: 3, text: 'Detail' }], textContent: 'text4' },
    { position: 5, title: 'Page 5', url: 'https://example.com/5', domain: 'five.com', headings: [{ level: 2, text: 'Solutions' }], textContent: 'text5' },
  ],
  paaQuestions: [
    { question: 'What is SEO?', answer: 'SEO is...' },
    { question: 'How to rank?', answer: null },
  ],
  maxScraped: 5,
  cachedAt: '2026-03-31T00:00:00.000Z',
  fromCache: false,
}

const WORD_GROUPS: WordGroup[] = [
  { word: 'referencement', count: 12, normalized: 'referencement' },
  { word: 'local', count: 8, normalized: 'local' },
  { word: 'google', count: 5, normalized: 'google' },
]

function mountComponent(overrides: Record<string, unknown> = {}) {
  return mount(LieutenantsSelection, {
    props: {
      selectedArticle: ARTICLE,
      mode: 'workflow',
      captainKeyword: 'seo local',
      articleLevel: 'intermediaire' as const,
      isCaptaineLocked: true,
      ...overrides,
    },
  })
}

async function mountWithResults(overrides: Record<string, unknown> = {}) {
  const w = mountComponent(overrides)
  await w.find('.btn-analyze').trigger('click')
  await nextTick()
  return w
}

beforeEach(() => {
  vi.clearAllMocks()
  mockApiPost.mockResolvedValue(SERP_RESULT)
  mockChunks.value = ''
  mockIsStreaming.value = false
  mockStreamError.value = null
})

describe('LieutenantsSelection', () => {
  // --- Header ---
  describe('Captain header', () => {
    it('displays captain keyword', () => {
      const w = mountComponent()
      expect(w.find('.captain-keyword').text()).toBe('seo local')
    })

    it('displays article level badge', () => {
      const w = mountComponent()
      expect(w.find('.level-badge').text()).toBe('intermediaire')
    })

    it('shows dash when captainKeyword is null', () => {
      const w = mountComponent({ captainKeyword: null })
      expect(w.find('.captain-keyword').text()).toContain('—')
    })
  })

  // --- Soft gate ---
  describe('Soft gating', () => {
    it('shows gate message when captain not locked', () => {
      const w = mountComponent({ isCaptaineLocked: false })
      expect(w.find('.soft-gate-message').exists()).toBe(true)
    })

    it('hides gate message when captain is locked', () => {
      const w = mountComponent({ isCaptaineLocked: true })
      expect(w.find('.soft-gate-message').exists()).toBe(false)
    })

    it('disables slider when captain not locked', () => {
      const w = mountComponent({ isCaptaineLocked: false })
      const slider = w.find('.serp-slider')
      expect((slider.element as HTMLInputElement).disabled).toBe(true)
    })

    it('disables analyze button when captain not locked', () => {
      const w = mountComponent({ isCaptaineLocked: false })
      const btn = w.find('.btn-analyze')
      expect((btn.element as HTMLButtonElement).disabled).toBe(true)
    })
  })

  // --- SERP slider ---
  describe('SERP slider', () => {
    it('renders range input with min=3 max=10', () => {
      const w = mountComponent()
      const slider = w.find('.serp-slider')
      expect(slider.attributes('min')).toBe('3')
      expect(slider.attributes('max')).toBe('10')
    })

    it('defaults to 10', () => {
      const w = mountComponent()
      expect(w.find('.slider-label strong').text()).toBe('10')
    })
  })

  // --- Analyze button ---
  describe('Analyze SERP button', () => {
    it('is enabled when captain is locked and keyword exists', () => {
      const w = mountComponent()
      const btn = w.find('.btn-analyze')
      expect((btn.element as HTMLButtonElement).disabled).toBe(false)
    })

    it('calls apiPost on click', async () => {
      const w = mountComponent()
      await w.find('.btn-analyze').trigger('click')
      expect(mockApiPost).toHaveBeenCalledWith('/serp/analyze', {
        keyword: 'seo local',
        topN: 10,
        articleLevel: 'intermediaire',
      })
    })

    it('emits serp-loaded after successful analysis', async () => {
      const w = mountComponent()
      await w.find('.btn-analyze').trigger('click')
      await nextTick()
      expect(w.emitted('serp-loaded')).toBeTruthy()
      expect(w.emitted('serp-loaded')![0][0]).toEqual(SERP_RESULT)
    })

    it('shows loading text during analysis', async () => {
      mockApiPost.mockReturnValue(new Promise(() => {})) // never resolves
      const w = mountComponent()
      await w.find('.btn-analyze').trigger('click')
      await nextTick()
      expect(w.find('.btn-analyze').text()).toBe('Analyse en cours...')
    })

    it('shows error message on failure', async () => {
      mockApiPost.mockRejectedValue(new Error('Network error'))
      const w = mountComponent()
      await w.find('.btn-analyze').trigger('click')
      await nextTick()
      expect(w.find('.error-message').exists()).toBe(true)
      expect(w.find('.error-message').text()).toContain('Network error')
    })
  })

  // --- 4 Collapsible sections ---
  describe('Collapsible sections', () => {
    it('renders 4 CollapsableSection after analysis', async () => {
      const w = await mountWithResults()
      const sections = w.findAllComponents({ name: 'CollapsableSection' })
      expect(sections).toHaveLength(4)
    })

    it('does not render sections before analysis', () => {
      const w = mountComponent()
      expect(w.find('.serp-results').exists()).toBe(false)
    })

    it('first section has title "Structure Hn concurrents"', async () => {
      const w = await mountWithResults()
      const sections = w.findAllComponents({ name: 'CollapsableSection' })
      expect(sections[0].props('title')).toBe('Structure Hn concurrents')
    })

    it('second section has title "PAA associes"', async () => {
      const w = await mountWithResults()
      const sections = w.findAllComponents({ name: 'CollapsableSection' })
      expect(sections[1].props('title')).toBe('PAA associes')
    })

    it('third section has title "Groupes de mots-cles"', async () => {
      const w = await mountWithResults()
      const sections = w.findAllComponents({ name: 'CollapsableSection' })
      expect(sections[2].props('title')).toBe('Groupes de mots-cles')
    })

    it('first section is open by default', async () => {
      const w = await mountWithResults()
      const sections = w.findAllComponents({ name: 'CollapsableSection' })
      expect(sections[0].props('defaultOpen')).toBe(true)
    })

    it('second and third sections are closed by default', async () => {
      const w = await mountWithResults()
      const sections = w.findAllComponents({ name: 'CollapsableSection' })
      expect(sections[1].props('defaultOpen')).toBe(false)
      expect(sections[2].props('defaultOpen')).toBe(false)
    })

    it('fourth section has title "Candidats Lieutenants"', async () => {
      const w = await mountWithResults()
      const sections = w.findAllComponents({ name: 'CollapsableSection' })
      expect(sections[3].props('title')).toBe('Candidats Lieutenants')
    })

    it('fourth section is open by default', async () => {
      const w = await mountWithResults()
      const sections = w.findAllComponents({ name: 'CollapsableSection' })
      expect(sections[3].props('defaultOpen')).toBe(true)
    })
  })

  // --- Hn recurrence ---
  describe('Hn recurrence', () => {
    it('computes hnRecurrence from displayed competitors', async () => {
      const w = await mountWithResults()
      const recurrence = (w.vm as any).hnRecurrence
      expect(recurrence.length).toBeGreaterThan(0)
    })

    it('aggregates H2 "Causes" across 3 of 4 valid competitors', async () => {
      const w = await mountWithResults()
      const recurrence = (w.vm as any).hnRecurrence
      const causes = recurrence.find((r: any) => r.text === 'Causes')
      expect(causes).toBeDefined()
      expect(causes.count).toBe(3) // competitors 1, 2, 4 have "Causes"
      expect(causes.total).toBe(4) // 5 competitors minus 1 with fetchError
      expect(causes.percent).toBe(75)
    })

    it('aggregates H2 "Solutions" across 2 competitors', async () => {
      const w = await mountWithResults()
      const recurrence = (w.vm as any).hnRecurrence
      const solutions = recurrence.find((r: any) => r.text === 'Solutions')
      expect(solutions).toBeDefined()
      expect(solutions.count).toBe(2)
      expect(solutions.percent).toBe(50)
    })

    it('excludes competitors with fetchError from total', async () => {
      const w = await mountWithResults()
      const recurrence = (w.vm as any).hnRecurrence
      // Total should be 4, not 5 (competitor 3 has fetchError)
      for (const item of recurrence) {
        expect(item.total).toBe(4)
      }
    })

    it('sorts by percent descending then level ascending', async () => {
      const w = await mountWithResults()
      const recurrence = (w.vm as any).hnRecurrence
      for (let i = 1; i < recurrence.length; i++) {
        const prev = recurrence[i - 1]
        const curr = recurrence[i]
        if (prev.percent === curr.percent) {
          expect(prev.level).toBeLessThanOrEqual(curr.level)
        } else {
          expect(prev.percent).toBeGreaterThan(curr.percent)
        }
      }
    })

    it('renders hn-recurrence-item elements', async () => {
      const w = await mountWithResults()
      const items = w.findAll('.hn-recurrence-item')
      expect(items.length).toBeGreaterThan(0)
    })

    it('displays level tag, text, frequency', async () => {
      const w = await mountWithResults()
      const first = w.findAll('.hn-recurrence-item')[0]
      expect(first.find('.hn-level-tag').exists()).toBe(true)
      expect(first.find('.hn-text').exists()).toBe(true)
      expect(first.find('.hn-freq').exists()).toBe(true)
      expect(first.find('.hn-percent').exists()).toBe(true)
    })

    it('updates hnRecurrence when slider decreases', async () => {
      const w = await mountWithResults()
      const fullRecurrence = (w.vm as any).hnRecurrence.length

      ;(w.vm as any).sliderValue = 2
      await nextTick()
      const filteredRecurrence = (w.vm as any).hnRecurrence
      // With only 2 competitors, recurrence changes
      expect(filteredRecurrence.length).toBeLessThanOrEqual(fullRecurrence)
    })
  })

  // --- PAA section ---
  describe('PAA section', () => {
    it('renders PAA items after analysis', async () => {
      const w = await mountWithResults()
      const items = w.findAll('.paa-item')
      expect(items).toHaveLength(2)
    })

    it('displays question text', async () => {
      const w = await mountWithResults()
      const first = w.findAll('.paa-item')[0]
      expect(first.find('.paa-question').text()).toBe('What is SEO?')
    })

    it('displays answer when available', async () => {
      const w = await mountWithResults()
      const first = w.findAll('.paa-item')[0]
      expect(first.find('.paa-answer').text()).toBe('SEO is...')
    })

    it('hides answer when null', async () => {
      const w = await mountWithResults()
      const second = w.findAll('.paa-item')[1]
      expect(second.find('.paa-answer').exists()).toBe(false)
    })

    it('shows empty message when no PAA', async () => {
      mockApiPost.mockResolvedValue({ ...SERP_RESULT, paaQuestions: [] })
      const w = await mountWithResults()
      // Find the PAA section (second CollapsableSection)
      const sections = w.findAllComponents({ name: 'CollapsableSection' })
      expect(sections[1].find('.section-empty').exists()).toBe(true)
    })
  })

  // --- Word groups section ---
  describe('Word groups section', () => {
    it('renders word group items when prop provided', async () => {
      const w = await mountWithResults({ wordGroups: WORD_GROUPS })
      const items = w.findAll('.group-item')
      expect(items).toHaveLength(3)
    })

    it('displays word and count', async () => {
      const w = await mountWithResults({ wordGroups: WORD_GROUPS })
      const first = w.findAll('.group-item')[0]
      expect(first.find('.group-word').text()).toBe('referencement')
      expect(first.find('.group-count').text()).toBe('12 termes')
    })

    it('shows empty message when no word groups', async () => {
      const w = await mountWithResults({ wordGroups: [] })
      const sections = w.findAllComponents({ name: 'CollapsableSection' })
      expect(sections[2].find('.section-empty').exists()).toBe(true)
    })

    it('shows empty message when wordGroups prop not provided', async () => {
      const w = await mountWithResults()
      const sections = w.findAllComponents({ name: 'CollapsableSection' })
      expect(sections[2].find('.section-empty').exists()).toBe(true)
    })
  })

  // --- Results summary ---
  describe('Results summary', () => {
    it('shows competitor count', async () => {
      const w = await mountWithResults()
      expect(w.find('.results-summary').text()).toContain('5')
    })

    it('shows PAA count', async () => {
      const w = await mountWithResults()
      expect(w.find('.paa-count').text()).toContain('2 questions PAA')
    })
  })

  // --- Smart cursor (local filtering) ---
  describe('Smart cursor', () => {
    it('filters hn recurrence locally when slider decreases', async () => {
      const w = await mountWithResults()
      const fullCount = (w.vm as any).hnRecurrence.length

      ;(w.vm as any).sliderValue = 3
      await nextTick()
      expect((w.vm as any).displayedCompetitors.length).toBe(3)
    })

    it('does not call API when slider decreases', async () => {
      const w = await mountWithResults()
      mockApiPost.mockClear()

      await w.find('.serp-slider').setValue(3)
      await nextTick()
      expect(mockApiPost).not.toHaveBeenCalled()
    })
  })

  // --- Lieutenant candidates ---
  describe('Lieutenant candidates', () => {
    it('generates candidates from hnRecurrence with count >= 2', async () => {
      const w = await mountWithResults({ wordGroups: WORD_GROUPS })
      const candidates = (w.vm as any).lieutenantCandidates
      // "Causes" has count 3, "Solutions" has count 2 → both qualify
      // "Main Title" has count 1 → excluded
      // "Detail" has count 1 → excluded
      const serpCandidates = candidates.filter((c: any) => c.sources.includes('serp'))
      expect(serpCandidates.length).toBe(2) // Causes and Solutions
    })

    it('generates candidates from PAA questions', async () => {
      const w = await mountWithResults({ wordGroups: WORD_GROUPS })
      const candidates = (w.vm as any).lieutenantCandidates
      const paaCandidates = candidates.filter((c: any) => c.sources.includes('paa'))
      expect(paaCandidates.length).toBe(2) // "What is SEO?" and "How to rank?"
    })

    it('generates candidates from word groups', async () => {
      const w = await mountWithResults({ wordGroups: WORD_GROUPS })
      const candidates = (w.vm as any).lieutenantCandidates
      const groupCandidates = candidates.filter((c: any) => c.sources.includes('group'))
      expect(groupCandidates.length).toBe(3) // referencement, local, google
    })

    it('merges multi-source candidates and assigns correct sources', async () => {
      // Create a scenario where a word group matches a SERP heading
      const matchingGroups: WordGroup[] = [
        { word: 'Causes', count: 5, normalized: 'causes' }, // matches H2 "Causes"
      ]
      const w = await mountWithResults({ wordGroups: matchingGroups })
      const candidates = (w.vm as any).lieutenantCandidates
      const causesCandidate = candidates.find((c: any) => c.text.toLowerCase() === 'causes')
      expect(causesCandidate).toBeDefined()
      expect(causesCandidate.sources).toContain('serp')
      expect(causesCandidate.sources).toContain('group')
    })

    it('assigns relevance fort when 3 sources', async () => {
      // Create a PAA question matching a SERP heading AND a word group
      const result = {
        ...SERP_RESULT,
        paaQuestions: [{ question: 'Causes', answer: null }],
      }
      const matchingGroups: WordGroup[] = [
        { word: 'Causes', count: 5, normalized: 'causes' },
      ]
      mockApiPost.mockResolvedValue(result)
      const w = await mountWithResults({ wordGroups: matchingGroups })
      const candidates = (w.vm as any).lieutenantCandidates
      const causesCandidate = candidates.find((c: any) => c.text.toLowerCase() === 'causes')
      expect(causesCandidate.relevance).toBe('fort')
      expect(causesCandidate.sources).toHaveLength(3)
    })

    it('assigns relevance moyen when 2 sources', async () => {
      const matchingGroups: WordGroup[] = [
        { word: 'Causes', count: 5, normalized: 'causes' },
      ]
      const w = await mountWithResults({ wordGroups: matchingGroups })
      const candidates = (w.vm as any).lieutenantCandidates
      const causesCandidate = candidates.find((c: any) => c.text.toLowerCase() === 'causes')
      expect(causesCandidate.relevance).toBe('moyen')
    })

    it('assigns relevance faible when 1 source', async () => {
      const w = await mountWithResults({ wordGroups: WORD_GROUPS })
      const candidates = (w.vm as any).lieutenantCandidates
      const google = candidates.find((c: any) => c.text === 'google')
      expect(google).toBeDefined()
      expect(google.relevance).toBe('faible')
    })

    it('sorts by relevance: fort first, then moyen, then faible', async () => {
      const result = {
        ...SERP_RESULT,
        paaQuestions: [{ question: 'Causes', answer: null }],
      }
      const matchingGroups: WordGroup[] = [
        { word: 'Causes', count: 5, normalized: 'causes' },
        { word: 'other', count: 2, normalized: 'other' },
      ]
      mockApiPost.mockResolvedValue(result)
      const w = await mountWithResults({ wordGroups: matchingGroups })
      const candidates = (w.vm as any).lieutenantCandidates
      const order: Record<string, number> = { fort: 0, moyen: 1, faible: 2 }
      for (let i = 1; i < candidates.length; i++) {
        expect(order[candidates[i - 1].relevance]).toBeLessThanOrEqual(order[candidates[i].relevance])
      }
    })

    it('returns empty array before SERP analysis', () => {
      const w = mountComponent({ wordGroups: WORD_GROUPS })
      const candidates = (w.vm as any).lieutenantCandidates
      expect(candidates).toEqual([])
    })

    it('renders lieutenant-row elements after analysis', async () => {
      const w = await mountWithResults({ wordGroups: WORD_GROUPS })
      const rows = w.findAll('.lieutenant-row')
      expect(rows.length).toBeGreaterThan(0)
    })

    it('shows empty message when no candidates', async () => {
      // No PAA, no word groups, and headings with count < 2
      mockApiPost.mockResolvedValue({
        ...SERP_RESULT,
        competitors: [
          { position: 1, title: 'P1', url: 'https://a.com', domain: 'a.com', headings: [{ level: 2, text: 'Unique heading' }], textContent: '' },
        ],
        paaQuestions: [],
      })
      const w = await mountWithResults({ wordGroups: [] })
      const sections = w.findAllComponents({ name: 'CollapsableSection' })
      expect(sections[3].find('.section-empty').exists()).toBe(true)
    })
  })

  // --- Lieutenant badges ---
  describe('Lieutenant badges', () => {
    it('renders provenance badges on each candidate', async () => {
      const w = await mountWithResults({ wordGroups: WORD_GROUPS })
      const rows = w.findAll('.lieutenant-row')
      // Each row should have at least one badge-source
      for (const row of rows) {
        expect(row.findAll('.badge-source').length).toBeGreaterThan(0)
      }
    })

    it('renders relevance badge on each candidate', async () => {
      const w = await mountWithResults({ wordGroups: WORD_GROUPS })
      const rows = w.findAll('.lieutenant-row')
      for (const row of rows) {
        expect(row.find('.badge-relevance').exists()).toBe(true)
      }
    })

    it('SERP badge has correct class', async () => {
      const w = await mountWithResults({ wordGroups: WORD_GROUPS })
      const serpBadges = w.findAll('.badge-serp')
      expect(serpBadges.length).toBeGreaterThan(0)
      expect(serpBadges[0].text()).toBe('SERP')
    })

    it('PAA badge has correct class', async () => {
      const w = await mountWithResults({ wordGroups: WORD_GROUPS })
      const paaBadges = w.findAll('.badge-paa')
      expect(paaBadges.length).toBeGreaterThan(0)
      expect(paaBadges[0].text()).toBe('PAA')
    })

    it('GROUP badge has correct class', async () => {
      const w = await mountWithResults({ wordGroups: WORD_GROUPS })
      const groupBadges = w.findAll('.badge-group')
      expect(groupBadges.length).toBeGreaterThan(0)
      expect(groupBadges[0].text()).toBe('GROUP')
    })
  })

  // --- Recommended counter ---
  describe('Recommended counter', () => {
    it('shows "3-5 recommandes" for intermediaire', async () => {
      const w = await mountWithResults({ wordGroups: WORD_GROUPS })
      expect(w.find('.lieutenant-counter').text()).toContain('3-5 recommandes')
    })

    it('shows "5-8 recommandes" for pilier', async () => {
      const w = await mountWithResults({ wordGroups: WORD_GROUPS, articleLevel: 'pilier' })
      expect(w.find('.lieutenant-counter').text()).toContain('5-8 recommandes')
    })

    it('shows "1-3 recommandes" for specifique', async () => {
      const w = await mountWithResults({ wordGroups: WORD_GROUPS, articleLevel: 'specifique' })
      expect(w.find('.lieutenant-counter').text()).toContain('1-3 recommandes')
    })

    it('shows "0 selectionne" initially', async () => {
      const w = await mountWithResults({ wordGroups: WORD_GROUPS })
      expect(w.find('.lieutenant-counter').text()).toContain('0 selectionne')
    })
  })

  // --- Checkbox selection ---
  describe('Checkbox selection', () => {
    it('selects a candidate on row click', async () => {
      const w = await mountWithResults({ wordGroups: WORD_GROUPS })
      const rows = w.findAll('.lieutenant-row')
      await rows[0].trigger('click')
      await nextTick()
      expect(rows[0].classes()).toContain('selected')
    })

    it('updates counter when selecting', async () => {
      const w = await mountWithResults({ wordGroups: WORD_GROUPS })
      const rows = w.findAll('.lieutenant-row')
      await rows[0].trigger('click')
      await nextTick()
      expect(w.find('.lieutenant-counter').text()).toContain('1 selectionne')
    })

    it('deselects a candidate on second click', async () => {
      const w = await mountWithResults({ wordGroups: WORD_GROUPS })
      const rows = w.findAll('.lieutenant-row')
      await rows[0].trigger('click')
      await nextTick()
      await rows[0].trigger('click')
      await nextTick()
      expect(rows[0].classes()).not.toContain('selected')
      expect(w.find('.lieutenant-counter').text()).toContain('0 selectionne')
    })

    it('emits lieutenants-updated on selection', async () => {
      const w = await mountWithResults({ wordGroups: WORD_GROUPS })
      const rows = w.findAll('.lieutenant-row')
      await rows[0].trigger('click')
      await nextTick()
      expect(w.emitted('lieutenants-updated')).toBeTruthy()
      const emitted = w.emitted('lieutenants-updated')!
      expect(emitted[0][0]).toHaveLength(1)
    })

    it('emits updated list on deselection', async () => {
      const w = await mountWithResults({ wordGroups: WORD_GROUPS })
      const rows = w.findAll('.lieutenant-row')
      await rows[0].trigger('click')
      await nextTick()
      await rows[0].trigger('click')
      await nextTick()
      const emitted = w.emitted('lieutenants-updated')!
      expect(emitted[emitted.length - 1][0]).toHaveLength(0)
    })

    it('checkbox reflects selection state', async () => {
      const w = await mountWithResults({ wordGroups: WORD_GROUPS })
      const rows = w.findAll('.lieutenant-row')
      const checkbox = rows[0].find('.lieutenant-checkbox') as any
      expect(checkbox.element.checked).toBe(false)
      await rows[0].trigger('click')
      await nextTick()
      expect(checkbox.element.checked).toBe(true)
    })

    it('pluralizes counter text correctly', async () => {
      const w = await mountWithResults({ wordGroups: WORD_GROUPS })
      const rows = w.findAll('.lieutenant-row')
      await rows[0].trigger('click')
      await nextTick()
      await rows[1].trigger('click')
      await nextTick()
      expect(w.find('.lieutenant-counter').text()).toContain('2 selectionnes')
    })
  })

  // --- Article change reset ---
  describe('Article change', () => {
    it('resets results when article changes', async () => {
      const w = await mountWithResults()
      expect(w.find('.serp-results').exists()).toBe(true)

      await w.setProps({
        selectedArticle: { ...ARTICLE, slug: 'other-article' },
      })
      await nextTick()
      expect(w.find('.serp-results').exists()).toBe(false)
    })

    it('resets lieutenant selection when article changes', async () => {
      const w = await mountWithResults({ wordGroups: WORD_GROUPS })
      const rows = w.findAll('.lieutenant-row')
      await rows[0].trigger('click')
      await nextTick()
      expect((w.vm as any).selectedLieutenants.size).toBe(1)

      await w.setProps({
        selectedArticle: { ...ARTICLE, slug: 'other-article' },
      })
      await nextTick()
      expect((w.vm as any).selectedLieutenants.size).toBe(0)
    })

    it('resets isLocked when article changes', async () => {
      const w = await mountWithResults({ wordGroups: WORD_GROUPS })
      // Select and lock
      const rows = w.findAll('.lieutenant-row')
      await rows[0].trigger('click')
      await nextTick()
      await w.find('[data-testid="lock-btn"]').trigger('click')
      await nextTick()
      expect((w.vm as any).isLocked).toBe(true)

      await w.setProps({
        selectedArticle: { ...ARTICLE, slug: 'other-article' },
      })
      await nextTick()
      expect((w.vm as any).isLocked).toBe(false)
    })

    it('calls aiAbort when article changes', async () => {
      const w = await mountWithResults({ wordGroups: WORD_GROUPS })
      mockAbort.mockClear()

      await w.setProps({
        selectedArticle: { ...ARTICLE, slug: 'other-article' },
      })
      await nextTick()
      expect(mockAbort).toHaveBeenCalled()
    })
  })

  // --- AI Panel ---
  describe('AI Panel', () => {
    it('renders ai-panel after analysis', async () => {
      const w = await mountWithResults({ wordGroups: WORD_GROUPS })
      expect(w.find('[data-testid="ai-panel"]').exists()).toBe(true)
    })

    it('panel is closed by default', async () => {
      const w = await mountWithResults({ wordGroups: WORD_GROUPS })
      expect(w.find('[data-testid="ai-panel-content"]').exists()).toBe(false)
    })

    it('toggles panel open on click', async () => {
      const w = await mountWithResults({ wordGroups: WORD_GROUPS })
      await w.find('[data-testid="ai-panel-toggle"]').trigger('click')
      await nextTick()
      expect(w.find('[data-testid="ai-panel-content"]').exists()).toBe(true)
    })

    it('shows generate button when panel is open and not locked', async () => {
      const w = await mountWithResults({ wordGroups: WORD_GROUPS })
      await w.find('[data-testid="ai-panel-toggle"]').trigger('click')
      await nextTick()
      expect(w.find('[data-testid="btn-generate"]').exists()).toBe(true)
    })

    it('generate button is disabled when no lieutenants selected', async () => {
      const w = await mountWithResults({ wordGroups: WORD_GROUPS })
      await w.find('[data-testid="ai-panel-toggle"]').trigger('click')
      await nextTick()
      const btn = w.find('[data-testid="btn-generate"]')
      expect((btn.element as HTMLButtonElement).disabled).toBe(true)
    })

    it('generate button is enabled when lieutenants are selected', async () => {
      const w = await mountWithResults({ wordGroups: WORD_GROUPS })
      // Select a lieutenant
      const rows = w.findAll('.lieutenant-row')
      await rows[0].trigger('click')
      await nextTick()
      // Open panel
      await w.find('[data-testid="ai-panel-toggle"]').trigger('click')
      await nextTick()
      const btn = w.find('[data-testid="btn-generate"]')
      expect((btn.element as HTMLButtonElement).disabled).toBe(false)
    })

    it('calls startStream when generate is clicked', async () => {
      const w = await mountWithResults({ wordGroups: WORD_GROUPS })
      const rows = w.findAll('.lieutenant-row')
      await rows[0].trigger('click')
      await nextTick()
      await w.find('[data-testid="ai-panel-toggle"]').trigger('click')
      await nextTick()
      await w.find('[data-testid="btn-generate"]').trigger('click')
      await nextTick()
      expect(mockStartStream).toHaveBeenCalledWith(
        expect.stringContaining('/api/keywords/'),
        expect.objectContaining({
          lieutenants: expect.any(Array),
          level: 'intermediaire',
        }),
      )
    })

    it('shows streaming-dot when streaming', async () => {
      mockIsStreaming.value = true
      const w = await mountWithResults({ wordGroups: WORD_GROUPS })
      expect(w.find('.ai-panel-streaming-dot').exists()).toBe(true)
    })

    it('shows ai-panel-text when chunks are available', async () => {
      mockChunks.value = 'Structure recommandee...'
      const w = await mountWithResults({ wordGroups: WORD_GROUPS })
      await w.find('[data-testid="ai-panel-toggle"]').trigger('click')
      await nextTick()
      expect(w.find('[data-testid="ai-panel-text"]').text()).toBe('Structure recommandee...')
    })

    it('shows error when aiError is set', async () => {
      mockStreamError.value = 'API error'
      const w = await mountWithResults({ wordGroups: WORD_GROUPS })
      await w.find('[data-testid="ai-panel-toggle"]').trigger('click')
      await nextTick()
      expect(w.find('.ai-panel-error').text()).toBe('API error')
    })

    it('shows empty message when no chunks and not streaming', async () => {
      const w = await mountWithResults({ wordGroups: WORD_GROUPS })
      await w.find('[data-testid="ai-panel-toggle"]').trigger('click')
      await nextTick()
      expect(w.find('.ai-panel-empty').exists()).toBe(true)
    })

    it('hides generate button when locked', async () => {
      const w = await mountWithResults({ wordGroups: WORD_GROUPS })
      const rows = w.findAll('.lieutenant-row')
      await rows[0].trigger('click')
      await nextTick()
      // Lock
      await w.find('[data-testid="lock-btn"]').trigger('click')
      await nextTick()
      // Open panel
      await w.find('[data-testid="ai-panel-toggle"]').trigger('click')
      await nextTick()
      expect(w.find('[data-testid="btn-generate"]').exists()).toBe(false)
    })
  })

  // --- Lock/unlock ---
  describe('Lock/unlock Lieutenants', () => {
    it('shows lock button after analysis', async () => {
      const w = await mountWithResults({ wordGroups: WORD_GROUPS })
      expect(w.find('[data-testid="lock-btn"]').exists()).toBe(true)
    })

    it('lock button is disabled when no lieutenants selected', async () => {
      const w = await mountWithResults({ wordGroups: WORD_GROUPS })
      const btn = w.find('[data-testid="lock-btn"]')
      expect((btn.element as HTMLButtonElement).disabled).toBe(true)
    })

    it('lock button is enabled when lieutenants are selected', async () => {
      const w = await mountWithResults({ wordGroups: WORD_GROUPS })
      const rows = w.findAll('.lieutenant-row')
      await rows[0].trigger('click')
      await nextTick()
      const btn = w.find('[data-testid="lock-btn"]')
      expect((btn.element as HTMLButtonElement).disabled).toBe(false)
    })

    it('emits check-completed with lieutenants_locked on lock', async () => {
      const w = await mountWithResults({ wordGroups: WORD_GROUPS })
      const rows = w.findAll('.lieutenant-row')
      await rows[0].trigger('click')
      await nextTick()
      await w.find('[data-testid="lock-btn"]').trigger('click')
      await nextTick()
      expect(w.emitted('check-completed')).toBeTruthy()
      expect(w.emitted('check-completed')![0][0]).toBe('lieutenants_locked')
    })

    it('shows locked state after locking', async () => {
      const w = await mountWithResults({ wordGroups: WORD_GROUPS })
      const rows = w.findAll('.lieutenant-row')
      await rows[0].trigger('click')
      await nextTick()
      await w.find('[data-testid="lock-btn"]').trigger('click')
      await nextTick()
      expect(w.find('[data-testid="locked-state"]').exists()).toBe(true)
      expect(w.find('.locked-badge').text()).toBe('Lieutenants verrouilles')
    })

    it('shows unlock button in locked state', async () => {
      const w = await mountWithResults({ wordGroups: WORD_GROUPS })
      const rows = w.findAll('.lieutenant-row')
      await rows[0].trigger('click')
      await nextTick()
      await w.find('[data-testid="lock-btn"]').trigger('click')
      await nextTick()
      expect(w.find('[data-testid="unlock-btn"]').exists()).toBe(true)
    })

    it('emits check-removed with lieutenants_locked on unlock', async () => {
      const w = await mountWithResults({ wordGroups: WORD_GROUPS })
      const rows = w.findAll('.lieutenant-row')
      await rows[0].trigger('click')
      await nextTick()
      await w.find('[data-testid="lock-btn"]').trigger('click')
      await nextTick()
      await w.find('[data-testid="unlock-btn"]').trigger('click')
      await nextTick()
      expect(w.emitted('check-removed')).toBeTruthy()
      expect(w.emitted('check-removed')![0][0]).toBe('lieutenants_locked')
    })

    it('unlocks after clicking unlock button', async () => {
      const w = await mountWithResults({ wordGroups: WORD_GROUPS })
      const rows = w.findAll('.lieutenant-row')
      await rows[0].trigger('click')
      await nextTick()
      await w.find('[data-testid="lock-btn"]').trigger('click')
      await nextTick()
      await w.find('[data-testid="unlock-btn"]').trigger('click')
      await nextTick()
      expect(w.find('[data-testid="lock-btn"]').exists()).toBe(true)
      expect(w.find('[data-testid="locked-state"]').exists()).toBe(false)
    })

    it('initialLocked prop sets locked state immediately', async () => {
      const w = await mountWithResults({ wordGroups: WORD_GROUPS, initialLocked: true })
      expect((w.vm as any).isLocked).toBe(true)
      expect(w.find('[data-testid="locked-state"]').exists()).toBe(true)
    })
  })

  // --- Locked state behavior ---
  describe('Locked state behavior', () => {
    async function mountLocked() {
      const w = await mountWithResults({ wordGroups: WORD_GROUPS })
      const rows = w.findAll('.lieutenant-row')
      await rows[0].trigger('click')
      await nextTick()
      await w.find('[data-testid="lock-btn"]').trigger('click')
      await nextTick()
      return w
    }

    it('disables checkboxes when locked', async () => {
      const w = await mountLocked()
      const checkboxes = w.findAll('.lieutenant-checkbox')
      for (const cb of checkboxes) {
        expect((cb.element as HTMLInputElement).disabled).toBe(true)
      }
    })

    it('rows have locked class when locked', async () => {
      const w = await mountLocked()
      const rows = w.findAll('.lieutenant-row')
      for (const row of rows) {
        expect(row.classes()).toContain('locked')
      }
    })

    it('clicking a row when locked does not change selection', async () => {
      const w = await mountLocked()
      const sizeBefore = (w.vm as any).selectedLieutenants.size
      const rows = w.findAll('.lieutenant-row')
      await rows[1].trigger('click')
      await nextTick()
      expect((w.vm as any).selectedLieutenants.size).toBe(sizeBefore)
    })
  })
})
