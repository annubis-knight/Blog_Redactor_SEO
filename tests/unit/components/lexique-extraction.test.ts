import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, computed, nextTick } from 'vue'
import LexiqueExtraction from '../../../src/components/moteur/LexiqueExtraction.vue'

// --- Mocks ---
const mockApiPost = vi.fn()
vi.mock('../../../src/services/api.service', () => ({
  apiPost: (...args: unknown[]) => mockApiPost(...args),
}))

const mockAiChunks = ref('')
const mockAiIsStreaming = ref(false)
const mockAiError = ref<string | null>(null)
const mockAiStartStream = vi.fn()
const mockAiAbort = vi.fn()

vi.mock('../../../src/composables/useStreaming', () => ({
  useStreaming: () => ({
    chunks: mockAiChunks,
    isStreaming: mockAiIsStreaming,
    error: mockAiError,
    result: ref(null),
    usage: ref(null),
    startStream: mockAiStartStream,
    abort: mockAiAbort,
  }),
}))

const mockSaveKeywords = vi.fn().mockResolvedValue(undefined)
const mockInitEmpty = vi.fn()
const mockKeywordsRef = ref<{ articleSlug: string; capitaine: string; lieutenants: string[]; lexique: string[] } | null>(null)

vi.mock('../../../src/stores/article-keywords.store', () => ({
  useArticleKeywordsStore: () => ({
    keywords: mockKeywordsRef,
    saveKeywords: mockSaveKeywords,
    initEmpty: mockInitEmpty,
  }),
}))

vi.mock('../../../src/utils/logger', () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const MOCK_TFIDF_RESULT = {
  keyword: 'seo',
  totalCompetitors: 5,
  obligatoire: [
    { term: 'référencement', level: 'obligatoire', documentFrequency: 0.8, density: 4.2, competitorCount: 4, totalCompetitors: 5 },
    { term: 'optimisation', level: 'obligatoire', documentFrequency: 0.7, density: 3.1, competitorCount: 3, totalCompetitors: 5 },
  ],
  differenciateur: [
    { term: 'stratégie', level: 'differenciateur', documentFrequency: 0.5, density: 2.0, competitorCount: 2, totalCompetitors: 5 },
  ],
  optionnel: [
    { term: 'niche', level: 'optionnel', documentFrequency: 0.2, density: 1.0, competitorCount: 1, totalCompetitors: 5 },
  ],
}

function mountComponent(overrides: Record<string, unknown> = {}) {
  return mount(LexiqueExtraction, {
    props: {
      selectedArticle: { slug: 'test-article', keyword: 'seo', title: 'Test', type: 'Cluster', painPoint: '' },
      captainKeyword: 'seo',
      articleLevel: 'intermediaire',
      selectedLieutenants: ['causes', 'solutions'],
      isLieutenantsLocked: true,
      ...overrides,
    },
    global: {
      stubs: {
        CollapsableSection: {
          props: ['title', 'defaultOpen'],
          template: '<div class="collapsable-stub"><span class="collapsable-title">{{ title }}</span><slot /></div>',
        },
      },
    },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockApiPost.mockResolvedValue(MOCK_TFIDF_RESULT)
  mockAiChunks.value = ''
  mockAiIsStreaming.value = false
  mockAiError.value = null
  mockKeywordsRef.value = null
})

describe('LexiqueExtraction', () => {
  describe('Header', () => {
    it('displays captain keyword', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.captain-keyword').text()).toBe('seo')
    })

    it('displays lieutenant badges', () => {
      const wrapper = mountComponent()
      const badges = wrapper.findAll('.lt-badge')
      expect(badges).toHaveLength(2)
      expect(badges[0].text()).toBe('causes')
      expect(badges[1].text()).toBe('solutions')
    })

    it('displays article level badge', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.level-badge').text()).toBe('intermediaire')
    })

    it('shows dash when captain keyword is null', () => {
      const wrapper = mountComponent({ captainKeyword: null })
      expect(wrapper.find('.captain-keyword').text()).toContain('—')
    })

    it('hides lieutenant badges when empty array', () => {
      const wrapper = mountComponent({ selectedLieutenants: [] })
      expect(wrapper.findAll('.lt-badge')).toHaveLength(0)
    })
  })

  describe('Extract button', () => {
    it('is disabled when lieutenants not locked', () => {
      const wrapper = mountComponent({ isLieutenantsLocked: false })
      const btn = wrapper.find('[data-testid="btn-extract"]')
      expect(btn.attributes('disabled')).toBeDefined()
    })

    it('is disabled when captain keyword is null', () => {
      const wrapper = mountComponent({ captainKeyword: null })
      const btn = wrapper.find('[data-testid="btn-extract"]')
      expect(btn.attributes('disabled')).toBeDefined()
    })

    it('is enabled when lieutenants locked and captain keyword present (after auto-restore completes)', async () => {
      const wrapper = mountComponent()
      // Auto-restore watcher fires at mount, wait for it to complete
      await nextTick()
      await nextTick()
      const btn = wrapper.find('[data-testid="btn-extract"]')
      expect(btn.attributes('disabled')).toBeUndefined()
    })

    it('calls apiPost with correct params on click', async () => {
      const wrapper = mountComponent()
      await wrapper.find('[data-testid="btn-extract"]').trigger('click')
      expect(mockApiPost).toHaveBeenCalledWith('/serp/tfidf', { keyword: 'seo' })
    })

    it('shows loading text while extracting', async () => {
      let resolvePromise: (v: unknown) => void
      mockApiPost.mockReturnValue(new Promise(r => { resolvePromise = r }))

      const wrapper = mountComponent()
      wrapper.find('[data-testid="btn-extract"]').trigger('click')
      await nextTick()

      expect(wrapper.find('[data-testid="btn-extract"]').text()).toContain('Extraction en cours')
    })
  })

  describe('Results display', () => {
    async function mountWithResults() {
      const wrapper = mountComponent()
      await wrapper.find('[data-testid="btn-extract"]').trigger('click')
      await nextTick()
      await nextTick()
      return wrapper
    }

    it('shows results after extraction', async () => {
      const wrapper = await mountWithResults()
      expect(wrapper.find('[data-testid="lexique-results"]').exists()).toBe(true)
    })

    it('renders 3 CollapsableSection stubs', async () => {
      const wrapper = await mountWithResults()
      const sections = wrapper.findAll('.collapsable-stub')
      expect(sections).toHaveLength(3)
    })

    it('shows obligatoire section title with count', async () => {
      const wrapper = await mountWithResults()
      const titles = wrapper.findAll('.collapsable-title')
      expect(titles[0].text()).toContain('Obligatoire (70%+)')
      expect(titles[0].text()).toContain('2 termes')
    })

    it('shows differenciateur section title with count', async () => {
      const wrapper = await mountWithResults()
      const titles = wrapper.findAll('.collapsable-title')
      expect(titles[1].text()).toContain('Differenciateur (30-70%)')
      expect(titles[1].text()).toContain('1 termes')
    })

    it('shows optionnel section title with count', async () => {
      const wrapper = await mountWithResults()
      const titles = wrapper.findAll('.collapsable-title')
      expect(titles[2].text()).toContain('Optionnel (<30%)')
      expect(titles[2].text()).toContain('1 termes')
    })

    it('renders term text and density', async () => {
      const wrapper = await mountWithResults()
      const termRows = wrapper.findAll('.term-row')
      expect(termRows.length).toBeGreaterThanOrEqual(1)
      expect(termRows[0].find('.term-text').text()).toBe('référencement')
      expect(termRows[0].find('.term-density').text()).toContain('4.2')
    })

    it('renders term percentage', async () => {
      const wrapper = await mountWithResults()
      const termRows = wrapper.findAll('.term-row')
      expect(termRows[0].find('.term-percent').text()).toContain('80%')
    })
  })

  describe('Checkbox pre-selection', () => {
    async function mountWithResults() {
      const wrapper = mountComponent()
      await wrapper.find('[data-testid="btn-extract"]').trigger('click')
      await nextTick()
      await nextTick()
      return wrapper
    }

    it('pre-checks obligatoire terms', async () => {
      const wrapper = await mountWithResults()
      const checkboxes = wrapper.findAll('.term-checkbox')
      // First 2 are obligatoire — should be checked
      expect((checkboxes[0].element as HTMLInputElement).checked).toBe(true)
      expect((checkboxes[1].element as HTMLInputElement).checked).toBe(true)
    })

    it('does NOT pre-check differenciateur terms', async () => {
      const wrapper = await mountWithResults()
      const checkboxes = wrapper.findAll('.term-checkbox')
      // 3rd checkbox is differenciateur
      expect((checkboxes[2].element as HTMLInputElement).checked).toBe(false)
    })

    it('does NOT pre-check optionnel terms', async () => {
      const wrapper = await mountWithResults()
      const checkboxes = wrapper.findAll('.term-checkbox')
      // 4th checkbox is optionnel
      expect((checkboxes[3].element as HTMLInputElement).checked).toBe(false)
    })
  })

  describe('Checkbox toggle', () => {
    async function mountWithResults() {
      const wrapper = mountComponent()
      await wrapper.find('[data-testid="btn-extract"]').trigger('click')
      await nextTick()
      await nextTick()
      return wrapper
    }

    it('unchecks an obligatoire term on click', async () => {
      const wrapper = await mountWithResults()
      const checkbox = wrapper.findAll('.term-checkbox')[0]
      await checkbox.trigger('change')
      await nextTick()
      expect((checkbox.element as HTMLInputElement).checked).toBe(false)
    })

    it('checks a differenciateur term on click', async () => {
      const wrapper = await mountWithResults()
      const checkbox = wrapper.findAll('.term-checkbox')[2] // differenciateur
      await checkbox.trigger('change')
      await nextTick()
      expect((checkbox.element as HTMLInputElement).checked).toBe(true)
    })
  })

  describe('Selection counter', () => {
    it('shows correct count after extraction', async () => {
      const wrapper = mountComponent()
      await wrapper.find('[data-testid="btn-extract"]').trigger('click')
      await nextTick()
      await nextTick()

      const counter = wrapper.find('[data-testid="selection-counter"]')
      // 2 obligatoire pre-checked
      expect(counter.text()).toContain('2 termes selectionnes')
      expect(counter.text()).toContain('2O')
      expect(counter.text()).toContain('0D')
      expect(counter.text()).toContain('0Op')
    })

    it('updates count on toggle', async () => {
      const wrapper = mountComponent()
      await wrapper.find('[data-testid="btn-extract"]').trigger('click')
      await nextTick()
      await nextTick()

      // Check the differenciateur term
      const diffCheckbox = wrapper.findAll('.term-checkbox')[2]
      await diffCheckbox.trigger('change')
      await nextTick()

      const counter = wrapper.find('[data-testid="selection-counter"]')
      expect(counter.text()).toContain('3 termes selectionnes')
      expect(counter.text()).toContain('1D')
    })
  })

  describe('Error handling', () => {
    it('shows error message on API failure', async () => {
      mockApiPost.mockRejectedValue(new Error('SERP cache not found'))
      const wrapper = mountComponent()
      await wrapper.find('[data-testid="btn-extract"]').trigger('click')
      await nextTick()
      await nextTick()

      expect(wrapper.find('[data-testid="error-message"]').text()).toContain('SERP cache not found')
    })

    it('does not show results on error', async () => {
      mockApiPost.mockRejectedValue(new Error('fail'))
      const wrapper = mountComponent()
      await wrapper.find('[data-testid="btn-extract"]').trigger('click')
      await nextTick()
      await nextTick()

      expect(wrapper.find('[data-testid="lexique-results"]').exists()).toBe(false)
    })
  })

  describe('Article change reset', () => {
    it('clears results when article slug changes', async () => {
      const wrapper = mountComponent()
      await wrapper.find('[data-testid="btn-extract"]').trigger('click')
      await nextTick()
      await nextTick()

      expect(wrapper.find('[data-testid="lexique-results"]').exists()).toBe(true)

      // Change article
      await wrapper.setProps({
        selectedArticle: { slug: 'other-article', keyword: 'autre', title: 'Autre', type: 'Support', painPoint: '' },
      })
      await nextTick()

      expect(wrapper.find('[data-testid="lexique-results"]').exists()).toBe(false)
    })

    it('aborts AI stream when article changes', async () => {
      const wrapper = mountComponent()
      await wrapper.find('[data-testid="btn-extract"]').trigger('click')
      await nextTick()
      await nextTick()

      mockAiAbort.mockClear()
      await wrapper.setProps({
        selectedArticle: { slug: 'other', keyword: 'autre', title: 'Autre', type: 'Support', painPoint: '' },
      })
      await nextTick()

      expect(mockAiAbort).toHaveBeenCalled()
    })
  })

  describe('AI Panel', () => {
    async function mountWithResults() {
      const wrapper = mountComponent()
      await wrapper.find('[data-testid="btn-extract"]').trigger('click')
      await nextTick()
      await nextTick()
      return wrapper
    }

    it('renders AI panel after extraction', async () => {
      const wrapper = await mountWithResults()
      expect(wrapper.find('[data-testid="ai-panel"]').exists()).toBe(true)
    })

    it('toggles AI panel open/closed', async () => {
      const wrapper = await mountWithResults()
      expect(wrapper.find('[data-testid="ai-panel-content"]').exists()).toBe(true)

      await wrapper.find('[data-testid="ai-panel-toggle"]').trigger('click')
      expect(wrapper.find('[data-testid="ai-panel-content"]').exists()).toBe(false)

      await wrapper.find('[data-testid="ai-panel-toggle"]').trigger('click')
      expect(wrapper.find('[data-testid="ai-panel-content"]').exists()).toBe(true)
    })

    it('auto-triggers AI stream after extraction', async () => {
      await mountWithResults()
      expect(mockAiStartStream).toHaveBeenCalledWith(
        expect.stringContaining('/ai-lexique'),
        expect.objectContaining({
          level: 'intermediaire',
          lexiqueTerms: expect.objectContaining({
            obligatoire: expect.arrayContaining(['référencement', 'optimisation']),
          }),
        }),
      )
    })

    it('shows streaming dot when streaming', async () => {
      const wrapper = await mountWithResults()
      mockAiIsStreaming.value = true
      await nextTick()
      expect(wrapper.find('.ai-panel-streaming-dot').exists()).toBe(true)
    })

    it('shows AI chunks text', async () => {
      const wrapper = await mountWithResults()
      mockAiChunks.value = 'Analyse lexicale complète'
      await nextTick()
      expect(wrapper.find('[data-testid="ai-panel-text"]').text()).toContain('Analyse lexicale complète')
    })

    it('shows AI error', async () => {
      const wrapper = await mountWithResults()
      mockAiError.value = 'Erreur API'
      await nextTick()
      expect(wrapper.find('.ai-panel-error').text()).toContain('Erreur API')
    })

    it('shows loading state when streaming without chunks', async () => {
      const wrapper = await mountWithResults()
      mockAiIsStreaming.value = true
      mockAiChunks.value = ''
      await nextTick()
      expect(wrapper.find('.ai-panel-loading').exists()).toBe(true)
    })
  })

  describe('Validate / Lock', () => {
    async function mountWithResults(overrides: Record<string, unknown> = {}) {
      const wrapper = mountComponent(overrides)
      await wrapper.find('[data-testid="btn-extract"]').trigger('click')
      await nextTick()
      await nextTick()
      return wrapper
    }

    it('shows validate button after extraction', async () => {
      const wrapper = await mountWithResults()
      expect(wrapper.find('[data-testid="lock-btn"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="lock-btn"]').text()).toContain('Valider le Lexique')
    })

    it('validate button is disabled when no terms selected', async () => {
      // Override with empty TFIDF result
      mockApiPost.mockResolvedValue({
        keyword: 'seo',
        totalCompetitors: 5,
        obligatoire: [],
        differenciateur: [],
        optionnel: [],
      })
      const wrapper = mountComponent()
      await wrapper.find('[data-testid="btn-extract"]').trigger('click')
      await nextTick()
      await nextTick()

      expect(wrapper.find('[data-testid="lock-btn"]').attributes('disabled')).toBeDefined()
    })

    it('emits check-completed on validate', async () => {
      mockKeywordsRef.value = { articleSlug: 'test-article', capitaine: 'seo', lieutenants: [], lexique: [] }
      const wrapper = await mountWithResults()
      await wrapper.find('[data-testid="lock-btn"]').trigger('click')
      await nextTick()

      expect(wrapper.emitted('check-completed')).toBeDefined()
      expect(wrapper.emitted('check-completed')![0]).toEqual(['lexique_validated'])
    })

    it('saves keywords to store on validate', async () => {
      mockKeywordsRef.value = { articleSlug: 'test-article', capitaine: 'seo', lieutenants: [], lexique: [] }
      const wrapper = await mountWithResults()
      await wrapper.find('[data-testid="lock-btn"]').trigger('click')
      await nextTick()

      expect(mockSaveKeywords).toHaveBeenCalledWith('test-article')
    })

    it('shows locked state after validation', async () => {
      mockKeywordsRef.value = { articleSlug: 'test-article', capitaine: 'seo', lieutenants: [], lexique: [] }
      const wrapper = await mountWithResults()
      await wrapper.find('[data-testid="lock-btn"]').trigger('click')
      await nextTick()

      expect(wrapper.find('[data-testid="locked-state"]').exists()).toBe(true)
      expect(wrapper.find('.locked-badge').text()).toContain('Lexique verrouillé')
    })

    it('disables checkboxes when locked', async () => {
      mockKeywordsRef.value = { articleSlug: 'test-article', capitaine: 'seo', lieutenants: [], lexique: [] }
      const wrapper = await mountWithResults()
      await wrapper.find('[data-testid="lock-btn"]').trigger('click')
      await nextTick()

      const checkboxes = wrapper.findAll('.term-checkbox')
      for (const cb of checkboxes) {
        expect((cb.element as HTMLInputElement).disabled).toBe(true)
      }
    })

    it('disables extract button when locked', async () => {
      mockKeywordsRef.value = { articleSlug: 'test-article', capitaine: 'seo', lieutenants: [], lexique: [] }
      const wrapper = await mountWithResults()
      await wrapper.find('[data-testid="lock-btn"]').trigger('click')
      await nextTick()

      expect(wrapper.find('[data-testid="btn-extract"]').attributes('disabled')).toBeDefined()
    })

    it('shows locked state when initialLocked is true (without extraction)', () => {
      const wrapper = mountComponent({ initialLocked: true })
      expect(wrapper.find('[data-testid="locked-state"]').exists()).toBe(true)
      expect(wrapper.find('.locked-badge').text()).toContain('Lexique verrouillé')
    })

    it('unlocks and emits check-removed', async () => {
      const wrapper = mountComponent({ initialLocked: true })
      await wrapper.find('[data-testid="unlock-btn"]').trigger('click')
      await nextTick()

      expect(wrapper.emitted('check-removed')).toBeDefined()
      expect(wrapper.emitted('check-removed')![0]).toEqual(['lexique_validated'])
      expect(wrapper.find('[data-testid="locked-state"]').exists()).toBe(false)
    })
  })
})
