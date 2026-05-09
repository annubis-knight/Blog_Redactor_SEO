/**
 * Chantier 3 — E3-S1 : composable useLexiqueExplorations (LECTURE).
 *
 * Famille LECTURE stricte (FR-LEX-LECTURE-VS-VERROUILLAGE / AC.LEX-SEP.1) :
 *   - hydrateFromDb / mergeFromDb / selectExploration / addExploration
 *     n'écrivent JAMAIS dans `article_keywords.lexique` (0 appel apiPut
 *     / apiPost / apiDelete sur /articles/:id/keywords).
 *   - Aucun import de `useArticleKeywordsStore` (sauf typage).
 *   - selectExploration lit le cache local, ne fetch pas.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import type { TfidfResult, LexiqueTermRecommendation } from '@shared/types/serp-analysis.types.js'

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
  mockApiGet.mockReset()
  mockApiPost.mockReset()
  mockApiPut.mockReset()
  mockApiDelete.mockReset()
})

const TFIDF: TfidfResult = {
  keyword: 'creation site web',
  totalCompetitors: 5,
  obligatoire: [],
  differenciateur: [],
  optionnel: [],
}

function makeEntry(sourceKeyword: string, recs: Array<{ term: string; aiRecommended: boolean; aiReason: string }> = []) {
  return {
    articleId: 42,
    sourceKeyword,
    tfidfTerms: { ...TFIDF, keyword: sourceKeyword } as TfidfResult,
    aiRecommendations: recs as unknown as LexiqueTermRecommendation[],
    aiMissingTerms: [],
    aiSummary: null,
    exploredAt: '2026-05-08T10:00:00.000Z',
  }
}

describe('useLexiqueExplorations — chantier 3 E3-S1 (LECTURE)', () => {
  it('hydrateFromDb → 1 GET /articles/:id/explorations, 0 PUT/POST/DELETE keywords', async () => {
    mockApiGet.mockResolvedValueOnce({ lexique: [makeEntry('creation site web')] })
    const { useLexiqueExplorations } = await import('@/composables/lexique/useLexiqueExplorations')

    const articleId = ref<number | undefined>(42)
    const captainKeyword = ref<string | null>('creation site web')
    const { pastExplorations, hydrateFromDb } = useLexiqueExplorations({ articleId, captainKeyword })

    await hydrateFromDb()

    const explorationCalls = mockApiGet.mock.calls.filter(c => String(c[0]).includes('/explorations'))
    expect(explorationCalls).toHaveLength(1)
    expect(pastExplorations.value).toHaveLength(1)
    expect(pastExplorations.value[0].sourceKeyword).toBe('creation site web')

    // Garantie LECTURE — 0 mutation persistante côté article_keywords
    const keywordsWrites = [
      ...mockApiPut.mock.calls,
      ...mockApiPost.mock.calls,
      ...mockApiDelete.mock.calls,
    ].filter(c => String(c[0]).includes('/articles/') && String(c[0]).includes('/keywords'))
    expect(keywordsWrites).toHaveLength(0)
  })

  it('selectExploration → 0 GET, 0 PUT/POST, mute tfidfResult depuis cache', async () => {
    mockApiGet.mockResolvedValueOnce({
      lexique: [
        makeEntry('keyword A'),
        makeEntry('keyword B', [{ term: 'foo', aiRecommended: true, aiReason: 'r' }]),
      ],
    })
    const { useLexiqueExplorations } = await import('@/composables/lexique/useLexiqueExplorations')

    const articleId = ref<number | undefined>(42)
    const captainKeyword = ref<string | null>('keyword A')
    const { tfidfResult, iaRecommendations, activeSourceKeyword, hydrateFromDb, selectExploration } =
      useLexiqueExplorations({ articleId, captainKeyword })

    await hydrateFromDb()
    mockApiGet.mockClear()

    selectExploration('keyword B')

    expect(mockApiGet).not.toHaveBeenCalled()
    expect(mockApiPut).not.toHaveBeenCalled()
    expect(mockApiPost).not.toHaveBeenCalled()
    expect(activeSourceKeyword.value).toBe('keyword B')
    expect(tfidfResult.value?.keyword).toBe('keyword B')
    expect(iaRecommendations.value.size).toBe(1)
  })

  it('addExploration → 0 GET, 0 PUT/POST, push dans pastExplorations + sélection', async () => {
    mockApiGet.mockResolvedValueOnce({ lexique: [] })
    const { useLexiqueExplorations } = await import('@/composables/lexique/useLexiqueExplorations')

    const articleId = ref<number | undefined>(42)
    const captainKeyword = ref<string | null>('keyword A')
    const { pastExplorations, activeSourceKeyword, hydrateFromDb, addExploration } =
      useLexiqueExplorations({ articleId, captainKeyword })

    await hydrateFromDb()
    mockApiGet.mockClear()

    addExploration(makeEntry('nouveau keyword'))

    expect(mockApiGet).not.toHaveBeenCalled()
    expect(mockApiPut).not.toHaveBeenCalled()
    expect(mockApiPost).not.toHaveBeenCalled()
    expect(pastExplorations.value).toHaveLength(1)
    expect(pastExplorations.value[0].sourceKeyword).toBe('nouveau keyword')
    expect(activeSourceKeyword.value).toBe('nouveau keyword')
  })

  it('mergeFromDb → 1 GET, fusion sans doublon (clé sourceKeyword brut)', async () => {
    // Mount initial avec 1 exploration
    mockApiGet.mockResolvedValueOnce({ lexique: [makeEntry('keyword A')] })
    const { useLexiqueExplorations } = await import('@/composables/lexique/useLexiqueExplorations')

    const articleId = ref<number | undefined>(42)
    const captainKeyword = ref<string | null>('keyword A')
    const { pastExplorations, hydrateFromDb, mergeFromDb } =
      useLexiqueExplorations({ articleId, captainKeyword })

    await hydrateFromDb()
    expect(pastExplorations.value).toHaveLength(1)

    // Merge avec 2 explorations dont 1 déjà présente
    mockApiGet.mockResolvedValueOnce({
      lexique: [makeEntry('keyword A'), makeEntry('keyword B')],
    })
    await mergeFromDb()

    expect(pastExplorations.value).toHaveLength(2)
    const sourceKeywords = pastExplorations.value.map(e => e.sourceKeyword).sort()
    expect(sourceKeywords).toEqual(['keyword A', 'keyword B'])

    // Total mock count PUT /articles/:id/keywords = 0
    expect(mockApiPut).not.toHaveBeenCalled()
    expect(mockApiPost).not.toHaveBeenCalled()
    expect(mockApiDelete).not.toHaveBeenCalled()
  })

  it('reset() → vide pastExplorations + tfidfResult + activeSourceKeyword', async () => {
    mockApiGet.mockResolvedValueOnce({ lexique: [makeEntry('keyword A')] })
    const { useLexiqueExplorations } = await import('@/composables/lexique/useLexiqueExplorations')

    const articleId = ref<number | undefined>(42)
    const captainKeyword = ref<string | null>('keyword A')
    const { pastExplorations, tfidfResult, activeSourceKeyword, hydrateFromDb, reset } =
      useLexiqueExplorations({ articleId, captainKeyword })

    await hydrateFromDb()
    expect(pastExplorations.value.length).toBeGreaterThan(0)

    reset()

    expect(pastExplorations.value).toHaveLength(0)
    expect(tfidfResult.value).toBeNull()
    expect(activeSourceKeyword.value).toBe('')
  })
})
