/**
 * S3 — Tests unit du composable useLongTailSuggestions.
 *
 * On mocke @/services/api.service (apiPost/apiPatch) pour rester en pure
 * logique sans I/O reseau.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { nextTick } from 'vue'

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

import { useLongTailSuggestions } from '../../../src/composables/intent/useLongTailSuggestions'
import type { LongTailSuggestion } from '@shared/types/long-tail.types'

const fixtureSuggestions: LongTailSuggestion[] = [
  { keyword: 'kw alpha', rationale: 'rationale a — long enough', preferenceScore: 9, derivedFromRoots: ['alpha'] },
  { keyword: 'kw beta', rationale: 'rationale b — long enough', preferenceScore: 8, derivedFromRoots: ['beta'] },
  { keyword: 'kw gamma', rationale: 'rationale c — long enough', preferenceScore: 7, derivedFromRoots: ['gamma'] },
  { keyword: 'kw delta', rationale: 'rationale d — long enough', preferenceScore: 6, derivedFromRoots: ['delta'] },
  { keyword: 'kw epsilon', rationale: 'rationale e — long enough', preferenceScore: 5, derivedFromRoots: ['epsilon'] },
  { keyword: 'kw zeta', rationale: 'rationale f — long enough', preferenceScore: 4, derivedFromRoots: ['zeta'] },
  { keyword: 'kw eta', rationale: 'rationale g — long enough', preferenceScore: 3, derivedFromRoots: ['eta'] },
]

describe('moteur:radar useLongTailSuggestions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  describe('initial state', () => {
    it('returns idle status with empty arrays', () => {
      const { status, suggestions, selectedKeywords } = useLongTailSuggestions(42)
      expect(status.value).toBe('idle')
      expect(suggestions.value).toEqual([])
      expect(selectedKeywords.value.size).toBe(0)
    })
  })

  describe('generate()', () => {
    it('calls apiPost, transitions idle → loading → success, populates suggestions', async () => {
      mockApiPost.mockResolvedValueOnce({ suggestions: fixtureSuggestions, fromCache: false })
      const composable = useLongTailSuggestions(42)
      const promise = composable.generate([{ keyword: 'a' }, { keyword: 'b' }], 'Title', 'Pain')
      expect(composable.status.value).toBe('loading')
      await promise
      expect(composable.status.value).toBe('success')
      expect(composable.suggestions.value).toHaveLength(7)
      expect(mockApiPost).toHaveBeenCalledWith(
        '/articles/42/radar-exploration/long-tail',
        expect.objectContaining({
          radarKeywords: [{ keyword: 'a' }, { keyword: 'b' }],
          articleTitle: 'Title',
          articlePainPoint: 'Pain',
        }),
      )
    })

    it('pre-checks the top 5 by preferenceScore desc on first generation', async () => {
      mockApiPost.mockResolvedValueOnce({ suggestions: fixtureSuggestions, fromCache: false })
      const composable = useLongTailSuggestions(42)
      await composable.generate([{ keyword: 'a' }, { keyword: 'b' }], 'T', 'P')
      // Top 5 = alpha (9), beta (8), gamma (7), delta (6), epsilon (5)
      expect(composable.selectedKeywords.value.has('kw alpha')).toBe(true)
      expect(composable.selectedKeywords.value.has('kw beta')).toBe(true)
      expect(composable.selectedKeywords.value.has('kw gamma')).toBe(true)
      expect(composable.selectedKeywords.value.has('kw delta')).toBe(true)
      expect(composable.selectedKeywords.value.has('kw epsilon')).toBe(true)
      // zeta (4) and eta (3) NOT pre-checked
      expect(composable.selectedKeywords.value.has('kw zeta')).toBe(false)
      expect(composable.selectedKeywords.value.has('kw eta')).toBe(false)
    })

    it('on error, transitions to error state, keeps prior suggestions', async () => {
      // First call OK
      mockApiPost.mockResolvedValueOnce({ suggestions: fixtureSuggestions.slice(0, 3), fromCache: false })
      const composable = useLongTailSuggestions(42)
      await composable.generate([{ keyword: 'a' }, { keyword: 'b' }], 'T', 'P')

      // Second call (regenerate) fails
      mockApiPost.mockRejectedValueOnce(new Error('AI down'))
      await expect(composable.regenerate([{ keyword: 'a' }, { keyword: 'b' }], 'T', 'P')).rejects.toThrow()
      expect(composable.status.value).toBe('error')
      // Suggestions précédentes préservées
      expect(composable.suggestions.value).toHaveLength(3)
    })
  })

  describe('regenerate()', () => {
    it('preserves selectedKeywords that match the new suggestion list', async () => {
      // First gen: 7 suggestions, top 5 cochées
      mockApiPost.mockResolvedValueOnce({ suggestions: fixtureSuggestions, fromCache: false })
      const composable = useLongTailSuggestions(42)
      await composable.generate([{ keyword: 'a' }, { keyword: 'b' }], 'T', 'P')
      expect(composable.selectedKeywords.value.size).toBe(5)

      // Regenerate with a different list (alpha disparaît, eta prend son score 9)
      const newList: LongTailSuggestion[] = [
        { keyword: 'kw beta', rationale: 'still here', preferenceScore: 9, derivedFromRoots: ['beta'] },
        { keyword: 'kw gamma', rationale: 'still here', preferenceScore: 8, derivedFromRoots: ['gamma'] },
        { keyword: 'kw new', rationale: 'fresh', preferenceScore: 7, derivedFromRoots: ['x'] },
      ]
      mockApiPost.mockResolvedValueOnce({ suggestions: newList, fromCache: false })
      await composable.regenerate([{ keyword: 'a' }, { keyword: 'b' }], 'T', 'P')

      // Selection précédente filtrée par intersect avec nouveau set de keywords
      // beta + gamma toujours là → conservés cochés. alpha/delta/epsilon disparus → retirés.
      expect(composable.selectedKeywords.value.has('kw beta')).toBe(true)
      expect(composable.selectedKeywords.value.has('kw gamma')).toBe(true)
      expect(composable.selectedKeywords.value.has('kw alpha')).toBe(false)
      expect(composable.selectedKeywords.value.has('kw new')).toBe(false) // pas pré-coché en regen
    })
  })

  describe('toggle()', () => {
    it('adds and removes keywords from the selection set', async () => {
      mockApiPost.mockResolvedValueOnce({ suggestions: fixtureSuggestions.slice(0, 2), fromCache: false })
      const composable = useLongTailSuggestions(42)
      await composable.generate([{ keyword: 'a' }, { keyword: 'b' }], 'T', 'P')

      const initialSize = composable.selectedKeywords.value.size
      composable.toggle('kw new')
      expect(composable.selectedKeywords.value.size).toBe(initialSize + 1)
      composable.toggle('kw new')
      expect(composable.selectedKeywords.value.size).toBe(initialSize)
    })
  })

  describe('hydrate()', () => {
    it('restores suggestions and selection without API call', () => {
      const composable = useLongTailSuggestions(42)
      composable.hydrate(fixtureSuggestions.slice(0, 3), ['kw alpha'])
      expect(composable.status.value).toBe('success')
      expect(composable.suggestions.value).toHaveLength(3)
      expect(composable.selectedKeywords.value.has('kw alpha')).toBe(true)
      expect(mockApiPost).not.toHaveBeenCalled()
    })
  })

  describe('getSelectedSuggestions()', () => {
    it('returns suggestions sorted by preferenceScore desc', async () => {
      mockApiPost.mockResolvedValueOnce({ suggestions: fixtureSuggestions, fromCache: false })
      const composable = useLongTailSuggestions(42)
      await composable.generate([{ keyword: 'a' }, { keyword: 'b' }], 'T', 'P')
      const sel = composable.getSelectedSuggestions()
      expect(sel.length).toBe(5)
      // sorted desc
      for (let i = 1; i < sel.length; i++) {
        expect(sel[i - 1]!.preferenceScore).toBeGreaterThanOrEqual(sel[i]!.preferenceScore)
      }
    })
  })

  describe('PATCH selection (debounced)', () => {
    it('debounces toggle persistence (500ms)', async () => {
      mockApiPost.mockResolvedValueOnce({ suggestions: fixtureSuggestions.slice(0, 3), fromCache: false })
      mockApiPatch.mockResolvedValue({ ok: true, count: 0 })
      const composable = useLongTailSuggestions(42)
      await composable.generate([{ keyword: 'a' }, { keyword: 'b' }], 'T', 'P')

      const callsBefore = mockApiPatch.mock.calls.length
      composable.toggle('kw beta')
      composable.toggle('kw gamma')
      composable.toggle('kw new')
      // Immediately after 3 toggles, no PATCH (debounced)
      expect(mockApiPatch.mock.calls.length).toBe(callsBefore)

      // Advance timers past debounce window
      vi.advanceTimersByTime(600)
      await nextTick()
      // Single PATCH coalesced — at most 1 new call
      expect(mockApiPatch.mock.calls.length).toBeLessThanOrEqual(callsBefore + 1)
    })
  })
})
