import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, nextTick } from 'vue'
import LexiqueExtraction from '../../../src/components/moteur/LexiqueExtraction.vue'
import type { LexiqueAnalysisResult, LexiqueTermRecommendation } from '../../../shared/types/serp-analysis.types'

// --- Mocks ---
const mockApiPost = vi.fn()
vi.mock('../../../src/services/api.service', () => ({
  apiPost: (...args: unknown[]) => mockApiPost(...args),
}))

// --- Two useStreaming instances: index 0 = IA upfront, index 1 = legacy AI panel ---
let streamingCallIndex = 0

const iaStreaming = {
  chunks: ref(''),
  isStreaming: ref(false),
  error: ref<string | null>(null),
  result: ref<LexiqueAnalysisResult | null>(null),
  usage: ref(null),
  startStream: vi.fn(),
  abort: vi.fn(),
}

const aiStreaming = {
  chunks: ref(''),
  isStreaming: ref(false),
  error: ref<string | null>(null),
  result: ref(null),
  usage: ref(null),
  startStream: vi.fn(),
  abort: vi.fn(),
}

vi.mock('../../../src/composables/editor/useStreaming', () => ({
  useStreaming: () => {
    const idx = streamingCallIndex++
    return idx === 0 ? iaStreaming : aiStreaming
  },
}))

const mockSaveKeywords = vi.fn().mockResolvedValue(undefined)
const mockInitEmpty = vi.fn()
const mockKeywordsRef = ref<{ articleId: number; capitaine: string; lieutenants: string[]; lexique: string[] } | null>(null)

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

const MOCK_IA_RECOMMENDATIONS: LexiqueTermRecommendation[] = [
  { term: 'référencement', aiRecommended: true, aiReason: 'Terme essentiel pour le SEO' },
  { term: 'optimisation', aiRecommended: true, aiReason: 'Terme clé lié au sujet' },
  { term: 'stratégie', aiRecommended: true, aiReason: 'Terme différenciateur pertinent' },
  { term: 'niche', aiRecommended: false, aiReason: 'Terme trop générique pour cet article' },
]

const MOCK_IA_RESULT: LexiqueAnalysisResult = {
  recommendations: MOCK_IA_RECOMMENDATIONS,
  missingTerms: ['backlinks'],
  summary: 'Analyse IA : 3 termes recommandés, 1 optionnel.',
}

/**
 * Simulate IA upfront completion by invoking the onDone callback
 * that was passed to iaStreaming.startStream().
 */
function simulateIaUpfrontDone(result: LexiqueAnalysisResult = MOCK_IA_RESULT) {
  const lastCall = iaStreaming.startStream.mock.calls.at(-1)
  if (!lastCall) throw new Error('iaStartStream was never called')
  // startStream(url, body, { onDone })
  const callbacks = lastCall[2] as { onDone?: (data: LexiqueAnalysisResult) => void }
  if (callbacks?.onDone) {
    callbacks.onDone(result)
  }
}

function mountComponent(overrides: Record<string, unknown> = {}) {
  return mount(LexiqueExtraction, {
    props: {
      selectedArticle: { id: 1, slug: 'test-article', keyword: 'seo', title: 'Test', type: 'Cluster', painPoint: '', locked: false, source: 'proposed' as const },
      captainKeyword: 'seo',
      articleLevel: 'intermediaire',
      selectedLieutenants: ['causes', 'solutions'],
      isCaptaineLocked: true,
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
  streamingCallIndex = 0
  mockApiPost.mockResolvedValue(MOCK_TFIDF_RESULT)
  iaStreaming.chunks.value = ''
  iaStreaming.isStreaming.value = false
  iaStreaming.error.value = null
  iaStreaming.result.value = null
  aiStreaming.chunks.value = ''
  aiStreaming.isStreaming.value = false
  aiStreaming.error.value = null
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
    it('is disabled when captain not locked', () => {
      const wrapper = mountComponent({ isCaptaineLocked: false })
      const btn = wrapper.find('[data-testid="btn-extract"]')
      expect(btn.attributes('disabled')).toBeDefined()
    })

    it('is disabled when captain keyword is null', () => {
      const wrapper = mountComponent({ captainKeyword: null })
      const btn = wrapper.find('[data-testid="btn-extract"]')
      expect(btn.attributes('disabled')).toBeDefined()
    })

    it('is enabled when captain locked and keyword present (after auto-restore completes)', async () => {
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
      let resolvePromise!: (v: unknown) => void
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

  describe('Checkbox pre-selection (before IA)', () => {
    async function mountWithResults() {
      const wrapper = mountComponent()
      await wrapper.find('[data-testid="btn-extract"]').trigger('click')
      await nextTick()
      await nextTick()
      return wrapper
    }

    it('pre-checks obligatoire terms immediately after TF-IDF', async () => {
      const wrapper = await mountWithResults()
      const checkboxes = wrapper.findAll('.term-checkbox')
      // First 2 are obligatoire — should be checked
      expect((checkboxes[0].element as HTMLInputElement).checked).toBe(true)
      expect((checkboxes[1].element as HTMLInputElement).checked).toBe(true)
    })

    it('does NOT pre-check differenciateur terms before IA', async () => {
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
    it('shows correct count after extraction (before IA)', async () => {
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

    it('updates count after IA upfront completes (obligatoire + recommended differenciateur)', async () => {
      const wrapper = mountComponent()
      await wrapper.find('[data-testid="btn-extract"]').trigger('click')
      await nextTick()
      await nextTick()

      // Simulate IA completion — stratégie is aiRecommended=true
      simulateIaUpfrontDone()
      await nextTick()

      const counter = wrapper.find('[data-testid="selection-counter"]')
      // 2 obligatoire + 1 differenciateur (stratégie recommended) = 3
      expect(counter.text()).toContain('3 termes selectionnes')
      expect(counter.text()).toContain('2O')
      expect(counter.text()).toContain('1D')
      expect(counter.text()).toContain('0Op')
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

    it('aborts both IA and AI streams when article changes', async () => {
      const wrapper = mountComponent()
      await wrapper.find('[data-testid="btn-extract"]').trigger('click')
      await nextTick()
      await nextTick()

      iaStreaming.abort.mockClear()
      aiStreaming.abort.mockClear()
      await wrapper.setProps({
        selectedArticle: { slug: 'other', keyword: 'autre', title: 'Autre', type: 'Support', painPoint: '' },
      })
      await nextTick()

      expect(iaStreaming.abort).toHaveBeenCalled()
      expect(aiStreaming.abort).toHaveBeenCalled()
    })
  })

  describe('IA upfront analysis', () => {
    async function mountWithResults() {
      const wrapper = mountComponent()
      await wrapper.find('[data-testid="btn-extract"]').trigger('click')
      await nextTick()
      await nextTick()
      return wrapper
    }

    it('auto-triggers IA upfront stream after TF-IDF extraction', async () => {
      await mountWithResults()
      expect(iaStreaming.startStream).toHaveBeenCalledWith(
        expect.stringContaining('/ai-lexique-upfront'),
        expect.objectContaining({
          level: 'intermediaire',
          allTerms: expect.objectContaining({
            obligatoire: ['référencement', 'optimisation'],
            differenciateur: ['stratégie'],
            optionnel: ['niche'],
          }),
        }),
        expect.objectContaining({
          onDone: expect.any(Function),
        }),
      )
    })

    it('sends ALL terms (not just selected) to IA upfront endpoint', async () => {
      await mountWithResults()
      const callArgs = iaStreaming.startStream.mock.calls.at(-1)
      const body = callArgs![1] as { allTerms: { obligatoire: string[]; differenciateur: string[]; optionnel: string[] } }
      expect(body.allTerms.obligatoire).toEqual(['référencement', 'optimisation'])
      expect(body.allTerms.differenciateur).toEqual(['stratégie'])
      expect(body.allTerms.optionnel).toEqual(['niche'])
    })

    it('uses correct endpoint URL with encoded keyword', async () => {
      await mountWithResults()
      const callArgs = iaStreaming.startStream.mock.calls.at(-1)
      expect(callArgs![0]).toBe('/api/keywords/seo/ai-lexique-upfront')
    })

    it('shows IA loading state while streaming', async () => {
      const wrapper = await mountWithResults()
      iaStreaming.isStreaming.value = true
      await nextTick()
      expect(wrapper.find('[data-testid="ia-loading"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="ia-loading"]').text()).toContain('Analyse IA en cours')
    })

    it('shows IA analysis section inside results', async () => {
      const wrapper = await mountWithResults()
      expect(wrapper.find('[data-testid="ia-analysis-section"]').exists()).toBe(true)
    })

    it('shows IA summary after upfront completes', async () => {
      const wrapper = await mountWithResults()
      iaStreaming.result.value = MOCK_IA_RESULT
      await nextTick()
      expect(wrapper.find('[data-testid="ia-summary"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="ia-summary"]').text()).toContain('Analyse IA : 3 termes recommandés, 1 optionnel.')
    })

    it('shows missing terms in IA summary', async () => {
      const wrapper = await mountWithResults()
      iaStreaming.result.value = MOCK_IA_RESULT
      await nextTick()
      expect(wrapper.find('.ia-missing-terms').text()).toContain('backlinks')
    })

    it('builds iaRecommendations map from onDone callback', async () => {
      const wrapper = await mountWithResults()
      simulateIaUpfrontDone()
      await nextTick()

      // After IA upfront, differenciateur "stratégie" (aiRecommended=true) should be pre-checked
      const checkboxes = wrapper.findAll('.term-checkbox')
      // obligatoire[0]: référencement — checked
      expect((checkboxes[0].element as HTMLInputElement).checked).toBe(true)
      // obligatoire[1]: optimisation — checked
      expect((checkboxes[1].element as HTMLInputElement).checked).toBe(true)
      // differenciateur[0]: stratégie — checked (aiRecommended=true)
      expect((checkboxes[2].element as HTMLInputElement).checked).toBe(true)
      // optionnel[0]: niche — NOT checked (aiRecommended=false)
      expect((checkboxes[3].element as HTMLInputElement).checked).toBe(false)
    })
  })

  describe('IA recommendation badges', () => {
    async function mountWithIaComplete() {
      const wrapper = mountComponent()
      await wrapper.find('[data-testid="btn-extract"]').trigger('click')
      await nextTick()
      await nextTick()
      simulateIaUpfrontDone()
      await nextTick()
      return wrapper
    }

    it('shows "IA recommandé" badge on recommended terms', async () => {
      const wrapper = await mountWithIaComplete()
      const recommendedBadges = wrapper.findAll('.badge-ia-recommended')
      expect(recommendedBadges.length).toBeGreaterThanOrEqual(1)
      expect(recommendedBadges[0].text()).toBe('IA recommandé')
    })

    it('shows "IA optionnel" badge on non-recommended terms', async () => {
      const wrapper = await mountWithIaComplete()
      const optionalBadges = wrapper.findAll('.badge-ia-optional')
      expect(optionalBadges.length).toBeGreaterThanOrEqual(1)
      expect(optionalBadges[0].text()).toBe('IA optionnel')
    })

    it('shows badge-ia-recommended on obligatoire term référencement', async () => {
      const wrapper = await mountWithIaComplete()
      const termRows = wrapper.findAll('.term-row')
      // First term-row is référencement (obligatoire), aiRecommended=true
      const badge = termRows[0].find('.badge-ia')
      expect(badge.exists()).toBe(true)
      expect(badge.classes()).toContain('badge-ia-recommended')
    })

    it('shows badge-ia-recommended on differenciateur term stratégie', async () => {
      const wrapper = await mountWithIaComplete()
      const termRows = wrapper.findAll('.term-row')
      // 3rd row is stratégie (differenciateur), aiRecommended=true
      const badge = termRows[2].find('.badge-ia')
      expect(badge.exists()).toBe(true)
      expect(badge.classes()).toContain('badge-ia-recommended')
    })

    it('shows badge-ia-optional on optionnel term niche', async () => {
      const wrapper = await mountWithIaComplete()
      const termRows = wrapper.findAll('.term-row')
      // 4th row is niche (optionnel), aiRecommended=false
      const badge = termRows[3].find('.badge-ia')
      expect(badge.exists()).toBe(true)
      expect(badge.classes()).toContain('badge-ia-optional')
    })

    it('does NOT show badges before IA completes', async () => {
      const wrapper = mountComponent()
      await wrapper.find('[data-testid="btn-extract"]').trigger('click')
      await nextTick()
      await nextTick()
      // No IA callback fired — no badges
      expect(wrapper.findAll('.badge-ia')).toHaveLength(0)
    })

    it('badges have title attribute with aiReason', async () => {
      const wrapper = await mountWithIaComplete()
      const termRows = wrapper.findAll('.term-row')
      const badge = termRows[0].find('.badge-ia')
      expect(badge.attributes('title')).toBe('Terme essentiel pour le SEO')
    })
  })

  describe('Pre-check with IA', () => {
    async function mountWithIaComplete(iaResult: LexiqueAnalysisResult = MOCK_IA_RESULT) {
      const wrapper = mountComponent()
      await wrapper.find('[data-testid="btn-extract"]').trigger('click')
      await nextTick()
      await nextTick()
      simulateIaUpfrontDone(iaResult)
      await nextTick()
      return wrapper
    }

    it('pre-checks obligatoire terms after IA', async () => {
      const wrapper = await mountWithIaComplete()
      const checkboxes = wrapper.findAll('.term-checkbox')
      expect((checkboxes[0].element as HTMLInputElement).checked).toBe(true)
      expect((checkboxes[1].element as HTMLInputElement).checked).toBe(true)
    })

    it('pre-checks differenciateur terms where aiRecommended is true', async () => {
      const wrapper = await mountWithIaComplete()
      const checkboxes = wrapper.findAll('.term-checkbox')
      // stratégie is aiRecommended=true => checked
      expect((checkboxes[2].element as HTMLInputElement).checked).toBe(true)
    })

    it('does NOT pre-check differenciateur terms where aiRecommended is false', async () => {
      const iaResultNotRecommended: LexiqueAnalysisResult = {
        recommendations: [
          { term: 'référencement', aiRecommended: true, aiReason: 'ok' },
          { term: 'optimisation', aiRecommended: true, aiReason: 'ok' },
          { term: 'stratégie', aiRecommended: false, aiReason: 'Pas pertinent' },
          { term: 'niche', aiRecommended: false, aiReason: 'Non' },
        ],
        missingTerms: [],
        summary: 'Test',
      }
      const wrapper = await mountWithIaComplete(iaResultNotRecommended)
      const checkboxes = wrapper.findAll('.term-checkbox')
      // stratégie is aiRecommended=false => NOT checked
      expect((checkboxes[2].element as HTMLInputElement).checked).toBe(false)
    })

    it('does NOT pre-check optionnel terms even when aiRecommended is true', async () => {
      const iaResultOptionnelRecommended: LexiqueAnalysisResult = {
        recommendations: [
          { term: 'référencement', aiRecommended: true, aiReason: 'ok' },
          { term: 'optimisation', aiRecommended: true, aiReason: 'ok' },
          { term: 'stratégie', aiRecommended: true, aiReason: 'ok' },
          { term: 'niche', aiRecommended: true, aiReason: 'Recommandé quand même' },
        ],
        missingTerms: [],
        summary: 'Test',
      }
      const wrapper = await mountWithIaComplete(iaResultOptionnelRecommended)
      const checkboxes = wrapper.findAll('.term-checkbox')
      // niche is optionnel — pre-check logic only applies to obligatoire + differenciateur
      expect((checkboxes[3].element as HTMLInputElement).checked).toBe(false)
    })

    it('selection counter reflects IA pre-check (obligatoire + recommended differenciateur)', async () => {
      const wrapper = await mountWithIaComplete()
      const counter = wrapper.find('[data-testid="selection-counter"]')
      expect(counter.text()).toContain('3 termes selectionnes')
      expect(counter.text()).toContain('2O')
      expect(counter.text()).toContain('1D')
      expect(counter.text()).toContain('0Op')
    })
  })

  describe('IA error fallback', () => {
    async function mountWithIaError() {
      const wrapper = mountComponent()
      await wrapper.find('[data-testid="btn-extract"]').trigger('click')
      await nextTick()
      await nextTick()
      iaStreaming.error.value = 'Erreur IA upfront'
      iaStreaming.isStreaming.value = false
      await nextTick()
      return wrapper
    }

    it('shows IA error message', async () => {
      const wrapper = await mountWithIaError()
      expect(wrapper.find('[data-testid="ia-error"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="ia-error"]').text()).toContain('Erreur IA upfront')
    })

    it('shows retry button on IA error', async () => {
      const wrapper = await mountWithIaError()
      expect(wrapper.find('.btn-retry').exists()).toBe(true)
    })

    it('terms display without IA badges on error', async () => {
      const wrapper = await mountWithIaError()
      // No IA recommendations loaded — no badges
      expect(wrapper.findAll('.badge-ia')).toHaveLength(0)
    })

    it('pre-checks only obligatoire terms on error (fallback behavior)', async () => {
      const wrapper = await mountWithIaError()
      const checkboxes = wrapper.findAll('.term-checkbox')
      // Only obligatoire should be pre-checked (initial pre-check from TF-IDF, not refined by IA)
      expect((checkboxes[0].element as HTMLInputElement).checked).toBe(true)
      expect((checkboxes[1].element as HTMLInputElement).checked).toBe(true)
      // differenciateur NOT checked (no IA recommendations)
      expect((checkboxes[2].element as HTMLInputElement).checked).toBe(false)
      // optionnel NOT checked
      expect((checkboxes[3].element as HTMLInputElement).checked).toBe(false)
    })

    it('does not show IA summary on error', async () => {
      const wrapper = await mountWithIaError()
      expect(wrapper.find('[data-testid="ia-summary"]').exists()).toBe(false)
    })

    it('retry button re-triggers IA upfront', async () => {
      const wrapper = await mountWithIaError()
      iaStreaming.startStream.mockClear()
      await wrapper.find('.btn-retry').trigger('click')
      await nextTick()
      expect(iaStreaming.startStream).toHaveBeenCalledWith(
        expect.stringContaining('/ai-lexique-upfront'),
        expect.any(Object),
        expect.any(Object),
      )
    })
  })

  describe('AI Panel (legacy)', () => {
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

    it('shows streaming dot when streaming', async () => {
      const wrapper = await mountWithResults()
      aiStreaming.isStreaming.value = true
      await nextTick()
      expect(wrapper.find('.ai-panel-streaming-dot').exists()).toBe(true)
    })

    it('shows AI chunks text', async () => {
      const wrapper = await mountWithResults()
      aiStreaming.chunks.value = 'Analyse lexicale complète'
      await nextTick()
      expect(wrapper.find('[data-testid="ai-panel-text"]').text()).toContain('Analyse lexicale complète')
    })

    it('shows AI error', async () => {
      const wrapper = await mountWithResults()
      aiStreaming.error.value = 'Erreur API'
      await nextTick()
      expect(wrapper.find('.ai-panel-error').text()).toContain('Erreur API')
    })

    it('shows loading state when streaming without chunks', async () => {
      const wrapper = await mountWithResults()
      aiStreaming.isStreaming.value = true
      aiStreaming.chunks.value = ''
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
      mockKeywordsRef.value = { articleId: 1, capitaine: 'seo', lieutenants: [], lexique: [] }
      const wrapper = await mountWithResults()
      await wrapper.find('[data-testid="lock-btn"]').trigger('click')
      await nextTick()

      expect(wrapper.emitted('check-completed')).toBeDefined()
      expect(wrapper.emitted('check-completed')![0]).toEqual(['lexique_validated'])
    })

    it('saves keywords to store on validate', async () => {
      mockKeywordsRef.value = { articleId: 1, capitaine: 'seo', lieutenants: [], lexique: [] }
      const wrapper = await mountWithResults()
      await wrapper.find('[data-testid="lock-btn"]').trigger('click')
      await nextTick()

      expect(mockSaveKeywords).toHaveBeenCalledWith(1)
    })

    it('shows locked state after validation', async () => {
      mockKeywordsRef.value = { articleId: 1, capitaine: 'seo', lieutenants: [], lexique: [] }
      const wrapper = await mountWithResults()
      await wrapper.find('[data-testid="lock-btn"]').trigger('click')
      await nextTick()

      expect(wrapper.find('[data-testid="locked-state"]').exists()).toBe(true)
      expect(wrapper.find('.locked-badge').text()).toContain('Lexique verrouillé')
    })

    it('disables checkboxes when locked', async () => {
      mockKeywordsRef.value = { articleId: 1, capitaine: 'seo', lieutenants: [], lexique: [] }
      const wrapper = await mountWithResults()
      await wrapper.find('[data-testid="lock-btn"]').trigger('click')
      await nextTick()

      const checkboxes = wrapper.findAll('.term-checkbox')
      for (const cb of checkboxes) {
        expect((cb.element as HTMLInputElement).disabled).toBe(true)
      }
    })

    it('disables extract button when locked', async () => {
      mockKeywordsRef.value = { articleId: 1, capitaine: 'seo', lieutenants: [], lexique: [] }
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
