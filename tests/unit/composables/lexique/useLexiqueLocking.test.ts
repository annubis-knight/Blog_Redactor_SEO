/**
 * Chantier 3 — E3-S2 : composable useLexiqueLocking (VERROUILLAGE).
 *
 * Famille VERROUILLAGE stricte (FR-LEX-LECTURE-VS-VERROUILLAGE / AC.LEX-SEP.2) :
 *   - toggleTerm appelle articleKeywordsStore.addLexiqueTerm/removeLexiqueTerm
 *     puis saveDecisions(id) → 1 PUT /articles/:id/keywords par toggle.
 *   - 0 GET vers /articles/:id/explorations (jamais).
 *   - isLocked dérivé de keywords.lexique.length > 0.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { createPinia, setActivePinia } from 'pinia'

const mockApiGet = vi.fn()
const mockApiPost = vi.fn()
const mockApiPut = vi.fn()
const mockApiDelete = vi.fn()

vi.mock('@/services/api.service', () => ({
  apiGet: (...args: unknown[]) => mockApiGet(...args),
  apiPost: (...args: unknown[]) => mockApiPost(...args),
  apiPut: (...args: unknown[]) => mockApiPut(...args),
  apiDelete: (...args: unknown[]) => mockApiDelete(...args),
}))

beforeEach(() => {
  setActivePinia(createPinia())
  mockApiGet.mockReset()
  mockApiPost.mockReset()
  mockApiPut.mockReset()
  mockApiDelete.mockReset()
  // saveDecisions issue un PUT /articles/:id/keywords
  mockApiPut.mockResolvedValue({ success: true })
})

describe('useLexiqueLocking — chantier 3 E3-S2 (VERROUILLAGE)', () => {
  it('toggleTerm("foo") → 1 PUT /articles/:id/keywords, 0 GET /explorations', async () => {
    const { useLexiqueLocking } = await import('@/composables/lexique/useLexiqueLocking')
    const { useArticleKeywordsStore } = await import('@/stores/article/article-keywords.store')

    const store = useArticleKeywordsStore()
    store.initEmpty(42)

    const articleId = ref<number | undefined>(42)
    const { toggleTerm, isLocked, lockedTerms } = useLexiqueLocking({ articleId })

    expect(isLocked.value).toBe(false)
    toggleTerm('foo')
    // saveDecisions est appelé avec await — flush pending microtasks
    await Promise.resolve()
    await Promise.resolve()

    const keywordsPuts = mockApiPut.mock.calls.filter(c => /\/articles\/\d+\/keywords/.test(String(c[0])))
    expect(keywordsPuts).toHaveLength(1)

    // Aucune lecture des explorations
    const explorationsGets = mockApiGet.mock.calls.filter(c => String(c[0]).includes('/explorations'))
    expect(explorationsGets).toHaveLength(0)

    expect(lockedTerms.value).toContain('foo')
    expect(isLocked.value).toBe(true)
  })

  it('toggleTerm 3 fois → 3 PUT, 0 GET /explorations', async () => {
    const { useLexiqueLocking } = await import('@/composables/lexique/useLexiqueLocking')
    const { useArticleKeywordsStore } = await import('@/stores/article/article-keywords.store')

    const store = useArticleKeywordsStore()
    store.initEmpty(42)

    const articleId = ref<number | undefined>(42)
    const { toggleTerm } = useLexiqueLocking({ articleId })

    toggleTerm('a')
    toggleTerm('b')
    toggleTerm('c')
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()

    const keywordsPuts = mockApiPut.mock.calls.filter(c => /\/articles\/\d+\/keywords/.test(String(c[0])))
    expect(keywordsPuts).toHaveLength(3)

    const explorationsGets = mockApiGet.mock.calls.filter(c => String(c[0]).includes('/explorations'))
    expect(explorationsGets).toHaveLength(0)
  })

  it('isLocked reflète keywords.lexique.length > 0', async () => {
    const { useLexiqueLocking } = await import('@/composables/lexique/useLexiqueLocking')
    const { useArticleKeywordsStore } = await import('@/stores/article/article-keywords.store')

    const store = useArticleKeywordsStore()
    store.initEmpty(42)

    const articleId = ref<number | undefined>(42)
    const { isLocked, toggleTerm } = useLexiqueLocking({ articleId })

    expect(isLocked.value).toBe(false)

    toggleTerm('foo')
    expect(isLocked.value).toBe(true)

    toggleTerm('foo') // toggle off
    expect(isLocked.value).toBe(false)
  })

  it('toggleTerm sans articleId → no-op (pas de PUT)', async () => {
    const { useLexiqueLocking } = await import('@/composables/lexique/useLexiqueLocking')

    const articleId = ref<number | undefined>(undefined)
    const { toggleTerm, lockedTerms } = useLexiqueLocking({ articleId })

    toggleTerm('foo')
    await Promise.resolve()

    expect(mockApiPut).not.toHaveBeenCalled()
    expect(lockedTerms.value).toEqual([])
  })
})
