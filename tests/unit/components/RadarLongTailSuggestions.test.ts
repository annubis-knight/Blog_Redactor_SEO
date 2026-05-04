/**
 * S3 — Tests unit du composant RadarLongTailSuggestions.vue.
 *
 * On mocke @/services/api.service via le composable parent.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

const { mockApiPost, mockApiPatch } = vi.hoisted(() => ({
  mockApiPost: vi.fn(),
  mockApiPatch: vi.fn(),
}))

vi.mock('@/services/api.service', () => ({
  apiPost: mockApiPost,
  apiPatch: mockApiPatch,
  apiGet: vi.fn(),
  apiDelete: vi.fn(),
}))
vi.mock('@/utils/logger', () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

import RadarLongTailSuggestions from '../../../src/components/intent/RadarLongTailSuggestions.vue'
import type { LongTailSuggestion } from '@shared/types/long-tail.types'

const fixtures: LongTailSuggestion[] = [
  { keyword: 'kw alpha', rationale: 'rationale a long', preferenceScore: 9, derivedFromRoots: ['root-a'] },
  { keyword: 'kw beta', rationale: 'rationale b long', preferenceScore: 7, derivedFromRoots: ['root-b'] },
  { keyword: 'kw gamma', rationale: 'rationale c long', preferenceScore: 5, derivedFromRoots: ['root-c'] },
  { keyword: 'kw delta', rationale: 'rationale d long', preferenceScore: 3, derivedFromRoots: ['root-d'] },
  { keyword: 'kw epsilon', rationale: 'rationale e long', preferenceScore: 2, derivedFromRoots: ['root-e'] },
  { keyword: 'kw zeta', rationale: 'rationale f long', preferenceScore: 1, derivedFromRoots: ['root-f'] },
]

const baseProps = {
  articleId: 42,
  articleTitle: 'Test Article',
  articlePainPoint: 'Une douleur claire',
  radarKeywords: [{ keyword: 'a' }, { keyword: 'b' }, { keyword: 'c' }],
}

describe('moteur:radar RadarLongTailSuggestions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('visibility', () => {
    it('renders nothing when radarKeywords.length < 2', () => {
      const wrapper = mount(RadarLongTailSuggestions, {
        props: { ...baseProps, radarKeywords: [{ keyword: 'a' }] },
      })
      expect(wrapper.find('[data-testid="radar-long-tail-section"]').exists()).toBe(false)
    })

    it('renders the section when radarKeywords.length >= 2', () => {
      const wrapper = mount(RadarLongTailSuggestions, { props: baseProps })
      expect(wrapper.find('[data-testid="radar-long-tail-section"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="btn-suggest-longtail"]').exists()).toBe(true)
    })
  })

  describe('generation flow', () => {
    it('clicks Suggerer → loading → success → list with checkboxes', async () => {
      // Promesse manuelle pour controller le moment de resolution
      let resolveApi!: (value: { suggestions: LongTailSuggestion[]; fromCache: boolean }) => void
      const apiPromise = new Promise<{ suggestions: LongTailSuggestion[]; fromCache: boolean }>((resolve) => {
        resolveApi = resolve
      })
      mockApiPost.mockReturnValueOnce(apiPromise)

      const wrapper = mount(RadarLongTailSuggestions, { props: baseProps })
      await wrapper.find('[data-testid="btn-suggest-longtail"]').trigger('click')
      // loading state visible AVANT que la promesse ne soit resolue
      expect(wrapper.find('[data-testid="longtail-loading"]').exists()).toBe(true)

      // Maintenant on resoud
      resolveApi({ suggestions: fixtures, fromCache: false })
      await flushPromises()

      // Loading disparait, liste affichee
      expect(wrapper.find('[data-testid="longtail-loading"]').exists()).toBe(false)
      expect(wrapper.find('[data-testid="longtail-list"]').exists()).toBe(true)
      const rows = wrapper.findAll('.lt-row')
      expect(rows).toHaveLength(6)
    })

    it('pre-checks the top 5 by preferenceScore desc', async () => {
      mockApiPost.mockResolvedValueOnce({ suggestions: fixtures, fromCache: false })
      const wrapper = mount(RadarLongTailSuggestions, { props: baseProps })
      await wrapper.find('[data-testid="btn-suggest-longtail"]').trigger('click')
      await flushPromises()

      // Les 5 premières (alpha 9, beta 7, gamma 5, delta 3, epsilon 2) cochées
      const checkboxes = wrapper.findAll('input[type="checkbox"]')
      expect(checkboxes).toHaveLength(6)
      // Les 5 premiers checkboxes sont coches (sort desc), le 6e (zeta=1) non
      for (let i = 0; i < 5; i++) {
        expect((checkboxes[i]!.element as HTMLInputElement).checked).toBe(true)
      }
      expect((checkboxes[5]!.element as HTMLInputElement).checked).toBe(false)
    })

    it('shows the Regenerate button after first generation', async () => {
      mockApiPost.mockResolvedValueOnce({ suggestions: fixtures.slice(0, 3), fromCache: false })
      const wrapper = mount(RadarLongTailSuggestions, { props: baseProps })
      expect(wrapper.find('[data-testid="btn-regenerate-longtail"]').exists()).toBe(false)
      await wrapper.find('[data-testid="btn-suggest-longtail"]').trigger('click')
      await flushPromises()
      expect(wrapper.find('[data-testid="btn-regenerate-longtail"]').exists()).toBe(true)
    })
  })

  describe('hydration from DB', () => {
    it('renders directly from initialSuggestions without API call', () => {
      const wrapper = mount(RadarLongTailSuggestions, {
        props: {
          ...baseProps,
          initialSuggestions: fixtures.slice(0, 3),
          initialSelectedKeywords: ['kw alpha'],
        },
      })
      expect(wrapper.find('[data-testid="longtail-list"]').exists()).toBe(true)
      expect(wrapper.findAll('.lt-row')).toHaveLength(3)
      expect(mockApiPost).not.toHaveBeenCalled()
    })
  })

  describe('emit update:selected-keywords', () => {
    it('emits when checkbox is toggled', async () => {
      mockApiPost.mockResolvedValueOnce({ suggestions: fixtures.slice(0, 3), fromCache: false })
      const wrapper = mount(RadarLongTailSuggestions, { props: baseProps })
      await wrapper.find('[data-testid="btn-suggest-longtail"]').trigger('click')
      await flushPromises()

      const callsBefore = wrapper.emitted('update:selected-keywords')?.length ?? 0
      // Toggle alpha (was checked) → uncheck
      await wrapper.find('[data-testid="longtail-checkbox-0"]').trigger('change')
      await flushPromises()
      const callsAfter = wrapper.emitted('update:selected-keywords')?.length ?? 0
      expect(callsAfter).toBeGreaterThan(callsBefore)
    })
  })

  describe('error state', () => {
    it('shows error message and Reessayer button when generation fails', async () => {
      mockApiPost.mockRejectedValueOnce(new Error('AI down'))
      const wrapper = mount(RadarLongTailSuggestions, { props: baseProps })
      await wrapper.find('[data-testid="btn-suggest-longtail"]').trigger('click')
      await flushPromises()
      expect(wrapper.text()).toMatch(/Erreur/i)
      expect(wrapper.find('[data-testid="btn-suggest-longtail"]').text()).toMatch(/Reessayer/i)
    })
  })
})
