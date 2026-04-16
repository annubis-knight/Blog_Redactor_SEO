import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, nextTick } from 'vue'
import LieutenantsSelection from '../../../src/components/moteur/LieutenantsSelection.vue'
import type { SelectedArticle, SerpAnalysisResult } from '../../../shared/types/index'
import type { WordGroup } from '../../../shared/types/discovery-tab.types'
import type { FilteredProposeLieutenantsResult, ProposedLieutenant } from '../../../shared/types/serp-analysis.types'

// --- Mock api.service ---
const mockApiPost = vi.fn()
vi.mock('../../../src/services/api.service', () => ({
  apiPost: (...args: unknown[]) => mockApiPost(...args),
}))

// --- Mock useStreaming (single instance: IA proposal) ---
const iaStreaming = {
  chunks: ref(''),
  isStreaming: ref(false),
  error: ref<string | null>(null),
  result: ref<FilteredProposeLieutenantsResult | null>(null),
  usage: ref(null),
  startStream: vi.fn(),
  abort: vi.fn(),
}

vi.mock('../../../src/composables/editor/useStreaming', () => ({
  useStreaming: () => iaStreaming,
}))

// --- Mock article-keywords store ---
const mockStoreKeywords = ref<{
  articleId: number
  capitaine: string
  lieutenants: string[]
  lexique: string[]
  rootKeywords: string[]
  richLieutenants?: any[]
} | null>({
  articleId: 1,
  capitaine: 'seo local',
  lieutenants: [],
  lexique: [],
  rootKeywords: [],
  richLieutenants: [],
})
const mockSaveKeywords = vi.fn().mockResolvedValue(undefined)
const mockSetRichLieutenants = vi.fn()
const mockSaveRichLieutenantProposals = vi.fn()

vi.mock('../../../src/stores/article-keywords.store', () => ({
  useArticleKeywordsStore: () => ({
    keywords: mockStoreKeywords.value,
    saveKeywords: mockSaveKeywords,
    setRichLieutenants: mockSetRichLieutenants,
    saveRichLieutenantProposals: mockSaveRichLieutenantProposals,
  }),
}))

// --- Mock logger ---
vi.mock('../../../src/utils/logger', () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

// --- Test data ---
const ARTICLE: SelectedArticle = {
  id: 1,
  slug: 'test-article',
  title: 'Test Article',
  keyword: 'seo local',
  painPoint: 'pain',
  type: 'Cluster',
  locked: false,
  source: 'proposed',
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

function makeProposedLieutenant(overrides: Partial<ProposedLieutenant> = {}): ProposedLieutenant {
  return {
    keyword: 'causes seo',
    reasoning: 'Test reasoning',
    aiConfidence: 'fort',
    sources: ['serp', 'paa'],
    suggestedHnLevel: 2,
    score: 82,
    ...overrides,
  }
}

const MOCK_CARDS: ProposedLieutenant[] = [
  makeProposedLieutenant({ keyword: 'causes seo', aiConfidence: 'fort', score: 90, sources: ['serp', 'paa'] }),
  makeProposedLieutenant({ keyword: 'solutions seo', aiConfidence: 'moyen', score: 72, sources: ['serp'] }),
  makeProposedLieutenant({ keyword: 'outils seo', aiConfidence: 'faible', score: 55, sources: ['group'] }),
]

const MOCK_ELIMINATED: ProposedLieutenant[] = [
  makeProposedLieutenant({ keyword: 'seo avancé', aiConfidence: 'faible', score: 30, sources: ['root'] }),
]

const MOCK_IA_RESULT: FilteredProposeLieutenantsResult = {
  selectedLieutenants: MOCK_CARDS,
  eliminatedLieutenants: MOCK_ELIMINATED,
  hnStructure: [
    { level: 2, text: 'Causes du SEO', children: [{ level: 3, text: 'Detail causes' }] },
    { level: 2, text: 'Solutions SEO' },
  ],
  contentGapInsights: 'Missing content about local SEO tools',
  totalGenerated: 4,
}

// --- LieutenantCard stub ---
const LieutenantCardStub = {
  name: 'LieutenantCard',
  props: ['lieutenant', 'checked', 'disabled'],
  emits: ['update:checked'],
  template: `
    <div class="lt-card-stub" :class="{ checked, disabled }" data-testid="lt-card-stub">
      <input type="checkbox" :checked="checked" :disabled="disabled" class="stub-checkbox" @change="$emit('update:checked', !checked)" />
      <span class="stub-keyword">{{ lieutenant.keyword }}</span>
      <span class="stub-score">{{ lieutenant.score }}</span>
      <span class="stub-confidence">{{ lieutenant.aiConfidence }}</span>
    </div>
  `,
}

function mountComponent(overrides: Record<string, unknown> = {}) {
  return mount(LieutenantsSelection, {
    props: {
      selectedArticle: ARTICLE,
      mode: 'workflow',
      captainKeyword: 'seo local',
      articleLevel: 'intermediaire' as const,
      // Default to false to avoid TDZ error on currentStep in the immediate watcher.
      // Tests that need isCaptaineLocked: true should set it explicitly via setProps.
      isCaptaineLocked: false,
      ...overrides,
    },
    global: {
      stubs: {
        LieutenantCard: LieutenantCardStub,
      },
    },
  })
}

async function mountWithResults(overrides: Record<string, unknown> = {}, serpData: SerpAnalysisResult = SERP_RESULT) {
  // mountComponent defaults to isCaptaineLocked: false to avoid TDZ error on
  // currentStep in the immediate watcher. We set serpResult directly on the VM,
  // then enable isCaptaineLocked so the auto-trigger watcher sees serpResult is
  // already set and skips calling analyzeSERP().
  const w = mountComponent(overrides)
  await nextTick()
  // Directly set serpResult to simulate a completed SERP analysis
  ;(w.vm as any).serpResult = serpData
  await nextTick()
  // Enable captain lock (tests expect isCaptaineLocked: true)
  await w.setProps({ isCaptaineLocked: true })
  await nextTick()
  await nextTick()
  return w
}

/**
 * Mount with SERP results, then simulate IA proposal completion.
 * This populates lieutenantCards so that card-dependent tests work.
 * All selectedLieutenants are pre-selected (matches onDone behavior).
 */
async function mountWithCards(overrides: Record<string, unknown> = {}) {
  const w = await mountWithResults(overrides)

  // Simulate IA proposal completing — all selected lieutenants are pre-checked
  ;(w.vm as any).lieutenantCards = MOCK_CARDS
  ;(w.vm as any).eliminatedCards = MOCK_ELIMINATED
  ;(w.vm as any).totalGenerated = MOCK_IA_RESULT.totalGenerated

  const preSelected = new Map<string, ProposedLieutenant>()
  for (const card of MOCK_CARDS) {
    preSelected.set(card.keyword, card)
  }
  ;(w.vm as any).selectedCards = preSelected
  ;(w.vm as any).currentStep = 'done'

  await nextTick()
  return w
}

beforeEach(() => {
  vi.clearAllMocks()
  mockApiPost.mockResolvedValue(SERP_RESULT)
  // Reset IA streaming refs
  iaStreaming.chunks.value = ''
  iaStreaming.isStreaming.value = false
  iaStreaming.error.value = null
  iaStreaming.result.value = null
  iaStreaming.startStream.mockClear()
  iaStreaming.abort.mockClear()
  // Reset store
  mockStoreKeywords.value = {
    articleId: 1,
    capitaine: 'seo local',
    lieutenants: [],
    lexique: [],
    rootKeywords: [],
  }
  mockSaveKeywords.mockClear()
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

    it('hides gate message when captain is locked', async () => {
      const w = mountComponent()
      await nextTick()
      await w.setProps({ isCaptaineLocked: true })
      await nextTick()
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
    it('is enabled when captain is locked and keyword exists (after auto-trigger completes)', async () => {
      // Mount with captain NOT locked to avoid TDZ error on currentStep during immediate watcher
      const w = mountComponent({ isCaptaineLocked: false })
      await nextTick()
      // Lock the captain — the auto-trigger watcher fires analyzeSERP()
      await w.setProps({ isCaptaineLocked: true })
      // Wait for: watcher → apiPost resolves → isLoading = false
      await nextTick()
      await nextTick()
      await nextTick()
      await nextTick()
      const btn = w.find('.btn-analyze')
      expect((btn.element as HTMLButtonElement).disabled).toBe(false)
    })

    it('calls apiPost on click', async () => {
      // Mount with captain NOT locked so auto-trigger does not fire
      const w = mountComponent({ isCaptaineLocked: false })
      await nextTick()
      // Lock the captain — auto-trigger watcher fires → analyzeSERP() called
      await w.setProps({ isCaptaineLocked: true })
      await nextTick()
      await nextTick()
      await nextTick()
      expect(mockApiPost).toHaveBeenCalledWith('/serp/analyze', {
        keyword: 'seo local',
        topN: 10,
        articleLevel: 'intermediaire',
      })
    })

    it('emits serp-loaded after successful analysis', async () => {
      // Mount with captain NOT locked to avoid TDZ error on currentStep
      const w = mountComponent({ isCaptaineLocked: false })
      await nextTick()
      // Lock the captain — auto-trigger fires → analyzeSERP() → apiPost resolves → emits serp-loaded
      await w.setProps({ isCaptaineLocked: true })
      await nextTick()
      await nextTick()
      await nextTick()
      await nextTick()
      expect(w.emitted('serp-loaded')).toBeTruthy()
      expect(w.emitted('serp-loaded')![0][0]).toEqual(SERP_RESULT)
    })

    it('shows loading text during analysis', async () => {
      mockApiPost.mockReturnValue(new Promise(() => {})) // never resolves
      // Mount with captain NOT locked to avoid TDZ error on currentStep
      const w = mountComponent({ isCaptaineLocked: false })
      await nextTick()
      // Lock the captain — auto-trigger fires → analyzeSERP() starts → isLoading = true
      await w.setProps({ isCaptaineLocked: true })
      await nextTick()
      expect(w.find('.btn-analyze').text()).toBe('Analyse en cours...')
    })

    it('shows error message on failure', async () => {
      mockApiPost.mockRejectedValue(new Error('Network error'))
      // Mount with captain NOT locked to avoid TDZ error on currentStep
      const w = mountComponent({ isCaptaineLocked: false })
      await nextTick()
      // Lock the captain — auto-trigger fires → analyzeSERP() → apiPost rejects → error is set
      await w.setProps({ isCaptaineLocked: true })
      await nextTick()
      await nextTick()
      await nextTick()
      await nextTick()
      expect(w.find('.error-message').exists()).toBe(true)
      expect(w.find('.error-message').text()).toContain('Network error')
    })
  })

  // --- Collapsible sections ---
  describe('Collapsible sections', () => {
    it('renders CollapsableSections after analysis', async () => {
      const w = await mountWithResults()
      const sections = w.findAllComponents({ name: 'CollapsableSection' })
      // The number of sections depends on hnStructure: 0 hnStructure → 3 sections (Hn concurrents, PAA, Groupes)
      expect(sections.length).toBeGreaterThanOrEqual(3)
    })

    it('does not render sections before analysis', () => {
      const w = mountComponent()
      expect(w.find('.serp-results').exists()).toBe(false)
    })

    it('Hn concurrents section has correct title', async () => {
      const w = await mountWithResults()
      const sections = w.findAllComponents({ name: 'CollapsableSection' })
      const hnSection = sections.find(s => s.props('title') === 'Structure Hn concurrents')
      expect(hnSection).toBeDefined()
    })

    it('PAA section has correct title', async () => {
      const w = await mountWithResults()
      const sections = w.findAllComponents({ name: 'CollapsableSection' })
      const paaSection = sections.find(s => s.props('title') === 'PAA associes')
      expect(paaSection).toBeDefined()
    })

    it('Groupes section has correct title', async () => {
      const w = await mountWithResults()
      const sections = w.findAllComponents({ name: 'CollapsableSection' })
      const groupSection = sections.find(s => s.props('title') === 'Groupes de mots-cles')
      expect(groupSection).toBeDefined()
    })

    it('Hn concurrents section is closed by default', async () => {
      const w = await mountWithResults()
      const sections = w.findAllComponents({ name: 'CollapsableSection' })
      const hnSection = sections.find(s => s.props('title') === 'Structure Hn concurrents')
      expect(hnSection!.props('defaultOpen')).toBe(false)
    })

    it('PAA and Groupes sections are closed by default', async () => {
      const w = await mountWithResults()
      const sections = w.findAllComponents({ name: 'CollapsableSection' })
      const paaSection = sections.find(s => s.props('title') === 'PAA associes')
      const groupSection = sections.find(s => s.props('title') === 'Groupes de mots-cles')
      expect(paaSection!.props('defaultOpen')).toBe(false)
      expect(groupSection!.props('defaultOpen')).toBe(false)
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
      const w = await mountWithResults({}, { ...SERP_RESULT, paaQuestions: [] })
      const sections = w.findAllComponents({ name: 'CollapsableSection' })
      const paaSection = sections.find(s => s.props('title') === 'PAA associes')
      expect(paaSection!.find('.section-empty').exists()).toBe(true)
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
      const groupSection = sections.find(s => s.props('title') === 'Groupes de mots-cles')
      expect(groupSection!.find('.section-empty').exists()).toBe(true)
    })

    it('shows empty message when wordGroups prop not provided', async () => {
      const w = await mountWithResults()
      const sections = w.findAllComponents({ name: 'CollapsableSection' })
      const groupSection = sections.find(s => s.props('title') === 'Groupes de mots-cles')
      expect(groupSection!.find('.section-empty').exists()).toBe(true)
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

  // --- IA Proposal ---
  describe('IA proposal', () => {
    it('auto-triggers proposeLieutenants after SERP success', async () => {
      const w = await mountWithResults()
      await nextTick()
      // The watcher on serpResult should call iaStartStream
      expect(iaStreaming.startStream).toHaveBeenCalledWith(
        expect.stringContaining('/propose-lieutenants'),
        expect.objectContaining({
          level: 'intermediaire',
          articleId: 1,
        }),
        expect.any(Object),
      )
    })

    it('sends correct payload to propose-lieutenants endpoint', async () => {
      const w = await mountWithResults({ wordGroups: WORD_GROUPS, rootKeywords: ['seo'] })
      await nextTick()
      expect(iaStreaming.startStream).toHaveBeenCalledWith(
        expect.stringContaining('/api/keywords/seo%20local/propose-lieutenants'),
        expect.objectContaining({
          level: 'intermediaire',
          articleId: 1,
          wordGroups: ['referencement', 'local', 'google'],
          rootKeywords: ['seo'],
        }),
        expect.any(Object),
      )
    })

    it('shows ia-loading when iaIsStreaming is true', async () => {
      iaStreaming.isStreaming.value = true
      const w = await mountWithResults()
      await nextTick()
      expect(w.find('[data-testid="ia-loading"]').exists()).toBe(true)
      expect(w.find('[data-testid="ia-loading"]').text()).toContain('Analyse IA en cours')
    })

    it('shows ia-error when iaError is set', async () => {
      iaStreaming.error.value = 'IA endpoint failed'
      const w = await mountWithResults()
      await nextTick()
      expect(w.find('[data-testid="ia-error"]').exists()).toBe(true)
      expect(w.find('[data-testid="ia-error"]').text()).toContain('IA endpoint failed')
    })

    it('shows retry button on IA error', async () => {
      iaStreaming.error.value = 'IA failed'
      const w = await mountWithResults()
      await nextTick()
      expect(w.find('[data-testid="ia-error"] .btn-retry').exists()).toBe(true)
    })

    it('shows ia-proposal-section after SERP analysis', async () => {
      const w = await mountWithResults()
      expect(w.find('[data-testid="ia-proposal-section"]').exists()).toBe(true)
    })

    it('shows empty message when no cards and not streaming', async () => {
      const w = await mountWithResults()
      await nextTick()
      // lieutenantCards is empty, iaIsStreaming is false, no errors
      expect(w.find('.ia-proposal-section .section-empty').exists()).toBe(true)
    })
  })

  // --- Batch RadarCard building ---
  describe('IA filtering and card assignment', () => {
    it('populates lieutenantCards from selectedLieutenants', async () => {
      const w = await mountWithCards()
      expect((w.vm as any).lieutenantCards).toHaveLength(3)
    })

    it('populates eliminatedCards from eliminatedLieutenants', async () => {
      const w = await mountWithCards()
      expect((w.vm as any).eliminatedCards).toHaveLength(1)
    })

    it('pre-selects all selectedLieutenants', async () => {
      const w = await mountWithCards()
      const selected = (w.vm as any).selectedCards as Map<string, ProposedLieutenant>
      expect(selected.has('causes seo')).toBe(true)
      expect(selected.has('solutions seo')).toBe(true)
      expect(selected.has('outils seo')).toBe(true)
    })

    it('tracks totalGenerated count', async () => {
      const w = await mountWithCards()
      expect((w.vm as any).totalGenerated).toBe(4)
    })

    it('shows eliminated section toggle when eliminated cards exist', async () => {
      const w = await mountWithCards()
      expect(w.find('[data-testid="eliminated-section"]').exists()).toBe(true)
      expect(w.find('.eliminated-toggle').text()).toContain('Autres candidats (1)')
    })

    it('toggleLieutenant emits lieutenants-updated', async () => {
      const w = await mountWithCards()
      // Toggle off one card → should emit
      ;(w.vm as any).toggleLieutenant(MOCK_CARDS[0])
      await nextTick()
      const emitted = w.emitted('lieutenants-updated')
      expect(emitted).toBeTruthy()
    })
  })

  // --- LieutenantCard display ---
  describe('LieutenantCard display', () => {
    it('renders LieutenantCard stubs for each lieutenant card', async () => {
      const w = await mountWithCards()
      const stubs = w.findAll('[data-testid="lt-card-stub"]')
      expect(stubs).toHaveLength(3)
    })

    it('passes correct checked prop to all pre-selected cards', async () => {
      const w = await mountWithCards()
      const stubs = w.findAllComponents({ name: 'LieutenantCard' })
      // All selectedLieutenants are pre-checked
      for (const stub of stubs) {
        expect(stub.props('checked')).toBe(true)
      }
    })

    it('passes lieutenant prop with score and confidence', async () => {
      const w = await mountWithCards()
      const stubs = w.findAllComponents({ name: 'LieutenantCard' })
      const causesStub = stubs.find(s => s.props('lieutenant').keyword === 'causes seo')
      expect(causesStub!.props('lieutenant').score).toBe(90)
      expect(causesStub!.props('lieutenant').aiConfidence).toBe('fort')
    })

    it('shows stub-confidence for each card', async () => {
      const w = await mountWithCards()
      const confidences = w.findAll('.stub-confidence')
      expect(confidences).toHaveLength(3)
    })
  })

  // --- IA confidence data passed to LieutenantCard ---
  describe('IA confidence data', () => {
    it('passes fort confidence to LieutenantCard', async () => {
      const w = await mountWithCards()
      const stubs = w.findAllComponents({ name: 'LieutenantCard' })
      const fortCard = stubs.find(s => s.props('lieutenant').keyword === 'causes seo')
      expect(fortCard!.props('lieutenant').aiConfidence).toBe('fort')
    })

    it('passes moyen confidence to LieutenantCard', async () => {
      const w = await mountWithCards()
      const stubs = w.findAllComponents({ name: 'LieutenantCard' })
      const moyenCard = stubs.find(s => s.props('lieutenant').keyword === 'solutions seo')
      expect(moyenCard!.props('lieutenant').aiConfidence).toBe('moyen')
    })

    it('passes faible confidence to LieutenantCard', async () => {
      const w = await mountWithCards()
      const stubs = w.findAllComponents({ name: 'LieutenantCard' })
      const faibleCard = stubs.find(s => s.props('lieutenant').keyword === 'outils seo')
      expect(faibleCard!.props('lieutenant').aiConfidence).toBe('faible')
    })

    it('passes score to each LieutenantCard', async () => {
      const w = await mountWithCards()
      const stubs = w.findAllComponents({ name: 'LieutenantCard' })
      const scores = stubs.map(s => s.props('lieutenant').score)
      expect(scores).toContain(90)
      expect(scores).toContain(72)
      expect(scores).toContain(55)
    })
  })

  // --- Selection counter ---
  describe('Selection counter', () => {
    it('shows "0 lieutenant selectionne" when no cards selected', async () => {
      const w = await mountWithCards()
      // Deselect all: set selectedCards to empty
      ;(w.vm as any).selectedCards = new Map()
      await nextTick()
      const counter = w.find('[data-testid="lieutenant-counter"]')
      expect(counter.text()).toContain('0')
      expect(counter.text()).toContain('selectionne')
    })

    it('shows pre-selected count (all selected lieutenants)', async () => {
      const w = await mountWithCards()
      const counter = w.find('[data-testid="lieutenant-counter"]')
      // All 3 selectedLieutenants are pre-selected
      expect(counter.text()).toContain('3')
      expect(counter.text()).toContain('selectionne')
    })

    it('shows total generated count', async () => {
      const w = await mountWithCards()
      const counter = w.find('[data-testid="lieutenant-counter"]')
      expect(counter.text()).toContain('4')
      expect(counter.text()).toContain('generes')
    })
  })

  // --- Checkbox selection via LieutenantCard ---
  describe('Checkbox selection', () => {
    it('deselects when LieutenantCard emits update:checked on pre-selected card', async () => {
      const w = await mountWithCards()
      // 'causes seo' is pre-selected → toggle it off
      const stubs = w.findAllComponents({ name: 'LieutenantCard' })
      const causesStub = stubs.find(s => s.props('lieutenant').keyword === 'causes seo')
      causesStub!.vm.$emit('update:checked', false)
      await nextTick()
      expect((w.vm as any).selectedCards.has('causes seo')).toBe(false)
    })

    it('re-selects after deselection', async () => {
      const w = await mountWithCards()
      // Deselect causes seo first
      const stubs = w.findAllComponents({ name: 'LieutenantCard' })
      const causesStub = stubs.find(s => s.props('lieutenant').keyword === 'causes seo')
      causesStub!.vm.$emit('update:checked', false)
      await nextTick()
      expect((w.vm as any).selectedCards.has('causes seo')).toBe(false)
      // Re-select it
      causesStub!.vm.$emit('update:checked', true)
      await nextTick()
      expect((w.vm as any).selectedCards.has('causes seo')).toBe(true)
    })

    it('updates counter when deselecting', async () => {
      const w = await mountWithCards()
      // Start with 3 selected, toggle causes seo off
      const stubs = w.findAllComponents({ name: 'LieutenantCard' })
      const causesStub = stubs.find(s => s.props('lieutenant').keyword === 'causes seo')
      causesStub!.vm.$emit('update:checked', false)
      await nextTick()
      const counter = w.find('[data-testid="lieutenant-counter"]')
      expect(counter.text()).toContain('2')
      expect(counter.text()).toContain('selectionnes')
    })

    it('emits lieutenants-updated on deselection', async () => {
      const w = await mountWithCards()
      const prevCount = (w.emitted('lieutenants-updated') || []).length
      const stubs = w.findAllComponents({ name: 'LieutenantCard' })
      const causesStub = stubs.find(s => s.props('lieutenant').keyword === 'causes seo')
      causesStub!.vm.$emit('update:checked', false)
      await nextTick()
      const emitted = w.emitted('lieutenants-updated')!
      expect(emitted.length).toBeGreaterThan(prevCount)
      const last = emitted[emitted.length - 1][0] as string[]
      expect(last).not.toContain('causes seo')
      expect(last).toContain('solutions seo')
    })

    it('emits updated list including re-selected card', async () => {
      const w = await mountWithCards()
      // Deselect first
      const stubs = w.findAllComponents({ name: 'LieutenantCard' })
      const causesStub = stubs.find(s => s.props('lieutenant').keyword === 'causes seo')
      causesStub!.vm.$emit('update:checked', false)
      await nextTick()
      // Re-select
      causesStub!.vm.$emit('update:checked', true)
      await nextTick()
      const emitted = w.emitted('lieutenants-updated')!
      const last = emitted[emitted.length - 1][0] as string[]
      expect(last).toContain('causes seo')
    })
  })

  // --- Article change reset ---
  describe('Article change', () => {
    it('resets results when article changes', async () => {
      const w = await mountWithResults()
      expect(w.find('.serp-results').exists()).toBe(true)

      await w.setProps({
        selectedArticle: { ...ARTICLE, id: 2 },
      })
      await nextTick()
      expect(w.find('.serp-results').exists()).toBe(false)
    })

    it('resets selectedCards when article changes', async () => {
      const w = await mountWithCards()
      expect((w.vm as any).selectedCards.size).toBeGreaterThan(0)

      await w.setProps({
        selectedArticle: { ...ARTICLE, id: 2 },
      })
      await nextTick()
      expect((w.vm as any).selectedCards.size).toBe(0)
    })

    it('resets isLocked when article changes', async () => {
      const w = await mountWithCards()
      // Lock
      await w.find('[data-testid="lock-btn"]').trigger('click')
      await nextTick()
      expect((w.vm as any).isLocked).toBe(true)

      await w.setProps({
        selectedArticle: { ...ARTICLE, id: 2 },
      })
      await nextTick()
      expect((w.vm as any).isLocked).toBe(false)
    })

    it('calls abort when article changes', async () => {
      const w = await mountWithCards()
      iaStreaming.abort.mockClear()

      await w.setProps({
        selectedArticle: { ...ARTICLE, id: 2 },
      })
      await nextTick()
      expect(iaStreaming.abort).toHaveBeenCalled()
    })

    it('resets lieutenantCards when article changes', async () => {
      const w = await mountWithCards()
      expect((w.vm as any).lieutenantCards.length).toBe(3)

      await w.setProps({
        selectedArticle: { ...ARTICLE, id: 2 },
      })
      await nextTick()
      expect((w.vm as any).lieutenantCards.length).toBe(0)
    })
  })

  // --- Lock/unlock ---
  describe('Lock/unlock Lieutenants', () => {
    it('shows lock button after analysis with cards', async () => {
      const w = await mountWithCards()
      expect(w.find('[data-testid="lock-btn"]').exists()).toBe(true)
    })

    it('lock button is disabled when no cards selected', async () => {
      const w = await mountWithCards()
      ;(w.vm as any).selectedCards = new Map()
      await nextTick()
      const btn = w.find('[data-testid="lock-btn"]')
      expect((btn.element as HTMLButtonElement).disabled).toBe(true)
    })

    it('lock button is enabled when cards are selected', async () => {
      const w = await mountWithCards()
      const btn = w.find('[data-testid="lock-btn"]')
      expect((btn.element as HTMLButtonElement).disabled).toBe(false)
    })

    it('calls saveKeywords on the store when locking', async () => {
      const w = await mountWithCards()
      await w.find('[data-testid="lock-btn"]').trigger('click')
      await nextTick()
      expect(mockSaveKeywords).toHaveBeenCalledWith(1)
    })

    it('writes lieutenants to store keywords before saving', async () => {
      const w = await mountWithCards()
      await w.find('[data-testid="lock-btn"]').trigger('click')
      await nextTick()
      // setRichLieutenants is called with selected and eliminated proposals
      expect(mockSetRichLieutenants).toHaveBeenCalled()
      const [selected] = mockSetRichLieutenants.mock.calls[0]
      expect(selected.some((s: any) => s.keyword === 'causes seo')).toBe(true)
    })

    it('emits check-completed with lieutenants_locked on lock', async () => {
      const w = await mountWithCards()
      await w.find('[data-testid="lock-btn"]').trigger('click')
      await nextTick()
      expect(w.emitted('check-completed')).toBeTruthy()
      expect(w.emitted('check-completed')![0][0]).toBe('lieutenants_locked')
    })

    it('shows locked state after locking', async () => {
      const w = await mountWithCards()
      await w.find('[data-testid="lock-btn"]').trigger('click')
      await nextTick()
      expect(w.find('[data-testid="locked-state"]').exists()).toBe(true)
      expect(w.find('.locked-badge').text()).toBe('Lieutenants verrouilles')
    })

    it('shows unlock button in locked state', async () => {
      const w = await mountWithCards()
      await w.find('[data-testid="lock-btn"]').trigger('click')
      await nextTick()
      expect(w.find('[data-testid="unlock-btn"]').exists()).toBe(true)
    })

    it('emits check-removed with lieutenants_locked on unlock', async () => {
      const w = await mountWithCards()
      await w.find('[data-testid="lock-btn"]').trigger('click')
      await nextTick()
      await w.find('[data-testid="unlock-btn"]').trigger('click')
      await nextTick()
      expect(w.emitted('check-removed')).toBeTruthy()
      expect(w.emitted('check-removed')![0][0]).toBe('lieutenants_locked')
    })

    it('unlocks after clicking unlock button', async () => {
      const w = await mountWithCards()
      await w.find('[data-testid="lock-btn"]').trigger('click')
      await nextTick()
      await w.find('[data-testid="unlock-btn"]').trigger('click')
      await nextTick()
      expect(w.find('[data-testid="lock-btn"]').exists()).toBe(true)
      expect(w.find('[data-testid="locked-state"]').exists()).toBe(false)
    })

    it('initialLocked prop sets locked state immediately', async () => {
      const w = await mountWithCards({ initialLocked: true })
      expect((w.vm as any).isLocked).toBe(true)
      expect(w.find('[data-testid="locked-state"]').exists()).toBe(true)
    })
  })

  // --- Locked state behavior ---
  describe('Locked state behavior', () => {
    async function mountLocked() {
      const w = await mountWithCards()
      await w.find('[data-testid="lock-btn"]').trigger('click')
      await nextTick()
      return w
    }

    it('passes disabled=true to LieutenantCard when locked', async () => {
      const w = await mountLocked()
      const stubs = w.findAllComponents({ name: 'LieutenantCard' })
      for (const stub of stubs) {
        expect(stub.props('disabled')).toBe(true)
      }
    })

    it('toggleLieutenant is a no-op when locked', async () => {
      const w = await mountLocked()
      const sizeBefore = (w.vm as any).selectedCards.size
      // Try to toggle a card via the component
      const stubs = w.findAllComponents({ name: 'LieutenantCard' })
      stubs[0].vm.$emit('update:checked', false)
      await nextTick()
      expect((w.vm as any).selectedCards.size).toBe(sizeBefore)
    })
  })

  // --- Hn Structure section (from IA proposal) ---
  describe('Hn structure section', () => {
    it('renders hn-structure-section when hnStructure is populated', async () => {
      const w = await mountWithResults()
      ;(w.vm as any).hnStructure = MOCK_IA_RESULT.hnStructure
      await nextTick()
      const sections = w.findAllComponents({ name: 'CollapsableSection' })
      const hnIaSection = sections.find(s => s.props('title') === 'Structure Hn recommandee (IA)')
      expect(hnIaSection).toBeDefined()
    })

    it('does not render hn-structure-section when hnStructure is empty', async () => {
      const w = await mountWithResults()
      const sections = w.findAllComponents({ name: 'CollapsableSection' })
      const hnIaSection = sections.find(s => s.props('title') === 'Structure Hn recommandee (IA)')
      expect(hnIaSection).toBeUndefined()
    })

    it('renders hn-structure-item elements for each node', async () => {
      const w = await mountWithResults()
      ;(w.vm as any).hnStructure = MOCK_IA_RESULT.hnStructure
      await nextTick()
      const items = w.findAll('.hn-structure-item')
      expect(items).toHaveLength(2)
    })

    it('renders children under parent nodes', async () => {
      const w = await mountWithResults()
      ;(w.vm as any).hnStructure = MOCK_IA_RESULT.hnStructure
      await nextTick()
      const children = w.findAll('.hn-structure-child')
      expect(children).toHaveLength(1) // Only first node has children
    })
  })

  // --- Content gap insights ---
  describe('Content gap insights', () => {
    it('renders content-gap-section when contentGapInsights is set', async () => {
      const w = await mountWithCards()
      ;(w.vm as any).contentGapInsights = 'Missing local SEO tools'
      await nextTick()
      expect(w.find('.content-gap-section').exists()).toBe(true)
      expect(w.find('.content-gap-section').text()).toContain('Missing local SEO tools')
    })

    it('does not render content-gap-section when empty', async () => {
      const w = await mountWithCards()
      ;(w.vm as any).contentGapInsights = ''
      await nextTick()
      expect(w.find('.content-gap-section').exists()).toBe(false)
    })
  })

  // --- Auto-save rich lieutenant proposals (status='suggested') ---
  // Business rule: tout keyword approfondi (ici: proposition IA après SERP + Claude)
  // DOIT être persisté dès son apparition dans l'interface, même avant "Valider".
  describe('Auto-save rich lieutenant proposals', () => {
    it('saves proposals with status=suggested as soon as IA onDone fires', async () => {
      const w = await mountWithResults()
      ;(w.vm as any).proposeLieutenants()
      await nextTick()

      // Retrieve the onDone callback passed to iaStartStream
      const startStreamCall = iaStreaming.startStream.mock.calls[0]
      expect(startStreamCall).toBeDefined()
      const options = startStreamCall[2] as { onDone: (data: FilteredProposeLieutenantsResult) => void }
      expect(typeof options.onDone).toBe('function')

      // Simulate IA streaming completion
      options.onDone(MOCK_IA_RESULT)
      await nextTick()

      // Must have persisted with status='suggested' (via saveRichLieutenantProposals)
      expect(mockSaveRichLieutenantProposals).toHaveBeenCalledTimes(1)
      expect(mockSaveRichLieutenantProposals).toHaveBeenCalledWith(
        MOCK_IA_RESULT.selectedLieutenants,
        MOCK_IA_RESULT.eliminatedLieutenants,
      )

      // setRichLieutenants (status='locked') must NOT be called — only after user clicks Valider
      expect(mockSetRichLieutenants).not.toHaveBeenCalled()
    })

    it('debounces the saveKeywords call after proposal auto-save', async () => {
      vi.useFakeTimers()
      try {
        const w = await mountWithResults()
        ;(w.vm as any).proposeLieutenants()
        await nextTick()

        const options = iaStreaming.startStream.mock.calls[0][2] as { onDone: (data: FilteredProposeLieutenantsResult) => void }
        options.onDone(MOCK_IA_RESULT)
        await nextTick()

        // Before debounce window expires: saveKeywords not yet called
        expect(mockSaveKeywords).not.toHaveBeenCalled()

        // Advance past the 300ms debounce window
        await vi.advanceTimersByTimeAsync(350)

        expect(mockSaveKeywords).toHaveBeenCalledWith(ARTICLE.id)
      } finally {
        vi.useRealTimers()
      }
    })

    it('skips auto-save when selectedArticle.id differs from store articleId (cross-article guard)', async () => {
      // Simulate a cross-article race: mount with a different article than the store's
      // articleId. The store mock is static (articleId=1), so we select a DIFFERENT
      // selectedArticle — the guard must detect the mismatch and abort persistence.
      const mismatchedArticle: SelectedArticle = { ...ARTICLE, id: 999 }
      const w = await mountWithResults({ selectedArticle: mismatchedArticle })
      ;(w.vm as any).proposeLieutenants()
      await nextTick()

      const options = iaStreaming.startStream.mock.calls[0][2] as { onDone: (data: FilteredProposeLieutenantsResult) => void }
      options.onDone(MOCK_IA_RESULT)
      await nextTick()

      // Guard must prevent persistence when articleId mismatch
      expect(mockSaveRichLieutenantProposals).not.toHaveBeenCalled()
      expect(mockSaveKeywords).not.toHaveBeenCalled()
    })
  })
})
