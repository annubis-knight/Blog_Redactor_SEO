import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'

// ---- Mocks ----

const mockApiPost = vi.fn()

vi.mock('../../../src/services/api.service', () => ({
  apiPost: (...args: unknown[]) => mockApiPost(...args),
  apiPut: vi.fn(),
  apiGet: vi.fn(),
}))

import PainValidation from '../../../src/components/intent/PainValidation.vue'
import type { ValidatePainResult } from '../../../shared/types/intent.types'

// ---- Helpers ----

function makeResult(keyword: string, overrides?: Partial<ValidatePainResult>): ValidatePainResult {
  return {
    keyword,
    dataforseo: {
      searchVolume: 500,
      difficulty: 30,
      cpc: 4.5,
      competition: 0.6,
      relatedCount: 8,
    },
    community: null,
    autocomplete: {
      suggestionsCount: 5,
      suggestions: [`${keyword} a`, `${keyword} b`],
      hasKeyword: false,
      position: null,
    },
    verdict: { category: 'incertaine', confidence: 0.3, sourcesAvailable: 2 },
    ...overrides,
  }
}

// ===================================================================
// PainValidation — rendering & logic tests
// ===================================================================

describe('PainValidation — rendering', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockApiPost.mockReset()
  })

  it('shows empty state when no translated keywords', () => {
    const wrapper = mount(PainValidation, {
      props: { translatedKeywords: [] },
    })
    expect(wrapper.find('.validation-empty').exists()).toBe(true)
    expect(wrapper.find('.validation-table').exists()).toBe(false)
  })

  it('shows loading spinner when validating', async () => {
    // Make apiPost hang (never resolve)
    mockApiPost.mockReturnValue(new Promise(() => {}))

    const wrapper = mount(PainValidation, {
      props: {
        translatedKeywords: [
          { keyword: 'seo toulouse', reasoning: 'Local keyword' },
        ],
      },
    })

    await wrapper.vm.$nextTick()
    expect(wrapper.find('.validation-loading').exists()).toBe(true)
    expect(wrapper.find('.spinner').exists()).toBe(true)
  })

  it('renders results table after successful validation', async () => {
    mockApiPost.mockResolvedValue({
      results: [
        makeResult('seo toulouse'),
        makeResult('referencement web', { dataforseo: { searchVolume: 50, difficulty: 15, cpc: 1.2, competition: 0.3, relatedCount: 3 } }),
      ],
    })

    const wrapper = mount(PainValidation, {
      props: {
        translatedKeywords: [
          { keyword: 'seo toulouse', reasoning: 'Local SEO' },
          { keyword: 'referencement web', reasoning: 'Generic' },
        ],
      },
    })

    await vi.waitFor(() => {
      expect(wrapper.find('.validation-table').exists()).toBe(true)
    })

    const rows = wrapper.findAll('.validation-row')
    expect(rows).toHaveLength(2)
  })

  it('displays per-source score columns', async () => {
    mockApiPost.mockResolvedValue({
      results: [makeResult('seo toulouse')],
    })

    const wrapper = mount(PainValidation, {
      props: {
        translatedKeywords: [{ keyword: 'seo toulouse', reasoning: 'Local SEO' }],
      },
    })

    await vi.waitFor(() => {
      expect(wrapper.find('.validation-table').exists()).toBe(true)
    })

    // Table headers should include DFS, Comm, Auto
    const headers = wrapper.findAll('th')
    const headerTexts = headers.map(h => h.text())
    expect(headerTexts).toContain('DFS')
    expect(headerTexts).toContain('Comm')
    expect(headerTexts).toContain('Auto')

    // Score values should be rendered
    const scoreValues = wrapper.findAll('.score-value')
    expect(scoreValues.length).toBeGreaterThanOrEqual(1)
  })

  it('auto-selects the best keyword', async () => {
    mockApiPost.mockResolvedValue({
      results: [
        makeResult('cold-kw', {
          dataforseo: { searchVolume: 0, difficulty: 0, cpc: 0, competition: 0, relatedCount: 0 },
          autocomplete: null,
        }),
        makeResult('hot-kw', {
          dataforseo: { searchVolume: 2000, difficulty: 20, cpc: 8.0, competition: 0.9, relatedCount: 30 },
          autocomplete: { suggestionsCount: 8, suggestions: ['hot-kw a', 'hot-kw b'], hasKeyword: true, position: 1 },
        }),
      ],
    })

    const wrapper = mount(PainValidation, {
      props: {
        translatedKeywords: [
          { keyword: 'cold-kw', reasoning: 'r1' },
          { keyword: 'hot-kw', reasoning: 'r2' },
        ],
      },
    })

    await vi.waitFor(() => {
      expect(wrapper.find('.validation-table').exists()).toBe(true)
    })

    // The hot keyword should be auto-selected (better verdict)
    const continueBtn = wrapper.find('.btn-continue')
    expect(continueBtn.text()).toContain('hot-kw')
  })

  it('emits "select" with selected keyword on continue click', async () => {
    mockApiPost.mockResolvedValue({
      results: [makeResult('seo toulouse')],
    })

    const wrapper = mount(PainValidation, {
      props: {
        translatedKeywords: [{ keyword: 'seo toulouse', reasoning: 'Local' }],
      },
    })

    await vi.waitFor(() => {
      expect(wrapper.find('.btn-continue').exists()).toBe(true)
    })

    await wrapper.find('.btn-continue').trigger('click')
    expect(wrapper.emitted('select')).toHaveLength(1)
    expect(wrapper.emitted('select')![0]).toEqual(['seo toulouse'])
  })

  it('emits "back" on back button click', async () => {
    const wrapper = mount(PainValidation, {
      props: { translatedKeywords: [] },
    })

    await wrapper.find('.btn-back').trigger('click')
    expect(wrapper.emitted('back')).toHaveLength(1)
  })

  it('clicking a row toggles detail expansion', async () => {
    mockApiPost.mockResolvedValue({
      results: [
        makeResult('kw1'),
        makeResult('kw2', { dataforseo: { searchVolume: 100, difficulty: 10, cpc: 1.0, competition: 0.3, relatedCount: 2 } }),
      ],
    })

    const wrapper = mount(PainValidation, {
      props: {
        translatedKeywords: [
          { keyword: 'kw1', reasoning: 'r1' },
          { keyword: 'kw2', reasoning: 'r2' },
        ],
      },
    })

    await vi.waitFor(() => {
      expect(wrapper.findAll('.validation-row')).toHaveLength(2)
    })

    // Click on first row to expand detail
    await wrapper.findAll('.validation-row')[0].trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.row-detail').exists()).toBe(true)
  })

  it('shows error state and retry button on API failure', async () => {
    mockApiPost.mockRejectedValue(new Error('Network error'))

    const wrapper = mount(PainValidation, {
      props: {
        translatedKeywords: [{ keyword: 'seo toulouse', reasoning: 'r1' }],
      },
    })

    await vi.waitFor(() => {
      expect(wrapper.find('.validation-error').exists()).toBe(true)
    })

    expect(wrapper.find('.validation-error').text()).toContain('Network error')
    expect(wrapper.find('.btn-retry').exists()).toBe(true)
  })

  it('displays keyword reasoning text', async () => {
    mockApiPost.mockResolvedValue({
      results: [makeResult('seo toulouse')],
    })

    const wrapper = mount(PainValidation, {
      props: {
        translatedKeywords: [{ keyword: 'seo toulouse', reasoning: 'Ciblage local pour agences web' }],
      },
    })

    await vi.waitFor(() => {
      expect(wrapper.find('.kw-reasoning').exists()).toBe(true)
    })

    expect(wrapper.find('.kw-reasoning').text()).toBe('Ciblage local pour agences web')
  })

  it('shows score color classes based on score value', async () => {
    mockApiPost.mockResolvedValue({
      results: [
        makeResult('strong-kw', {
          dataforseo: { searchVolume: 5000, difficulty: 10, cpc: 9.0, competition: 0.9, relatedCount: 40 },
          autocomplete: { suggestionsCount: 10, suggestions: ['strong-kw a'], hasKeyword: true, position: 1 },
        }),
      ],
    })

    const wrapper = mount(PainValidation, {
      props: {
        translatedKeywords: [{ keyword: 'strong-kw', reasoning: 'r1' }],
      },
    })

    await vi.waitFor(() => {
      expect(wrapper.find('.validation-table').exists()).toBe(true)
    })

    // At least one score should have a strong/medium/weak class
    const hasScoreClass = wrapper.find('.score--strong').exists()
      || wrapper.find('.score--medium').exists()
      || wrapper.find('.score--weak').exists()
    expect(hasScoreClass).toBe(true)
  })

  it('shows "—" for unavailable sources', async () => {
    mockApiPost.mockResolvedValue({
      results: [
        makeResult('kw-no-comm', {
          community: null,
          autocomplete: null,
        }),
      ],
    })

    const wrapper = mount(PainValidation, {
      props: {
        translatedKeywords: [{ keyword: 'kw-no-comm', reasoning: 'r1' }],
      },
    })

    await vi.waitFor(() => {
      expect(wrapper.find('.validation-table').exists()).toBe(true)
    })

    // Community and autocomplete scores are excluded from perSourceScores when unavailable
    // They should show "—"
    const naSpans = wrapper.findAll('.score-na')
    expect(naSpans.length).toBeGreaterThanOrEqual(1)
  })

  it('calls apiPost with correct endpoint and payload', async () => {
    mockApiPost.mockResolvedValue({ results: [] })

    mount(PainValidation, {
      props: {
        translatedKeywords: [
          { keyword: 'seo toulouse', reasoning: 'r1' },
          { keyword: 'web design', reasoning: 'r2' },
        ],
      },
    })

    await vi.waitFor(() => {
      expect(mockApiPost).toHaveBeenCalledWith(
        '/keywords/validate-pain',
        { keywords: ['seo toulouse', 'web design'] },
      )
    })
  })
})
