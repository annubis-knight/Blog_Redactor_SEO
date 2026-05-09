/**
 * Chantier 3 — E1-S2 : composable useSerpExistsCheck (FR-LEX-PRECHECK-SERP).
 *
 * Garanties testées :
 *   - keyword null/empty → ne fetch pas, exists reste null.
 *   - keyword set → 1 GET vers /keywords/<encoded>/serp/exists, exists hydraté.
 *   - keyword change → refetch déclenché.
 *   - encodage URL des keywords contenant des caractères spéciaux.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, nextTick } from 'vue'

const mockApiGet = vi.fn()
vi.mock('@/services/api.service', () => ({
  apiGet: (...args: unknown[]) => mockApiGet(...args),
}))

beforeEach(() => {
  mockApiGet.mockReset()
})

describe('useSerpExistsCheck — chantier 3 E1-S2', () => {
  it('keyword null → ne fetch pas, exists reste null', async () => {
    const { useSerpExistsCheck } = await import('@/composables/lexique/useSerpExistsCheck')

    const keyword = ref<string | null>(null)
    const { exists, scrapedAt } = useSerpExistsCheck(keyword)

    await nextTick()

    expect(mockApiGet).not.toHaveBeenCalled()
    expect(exists.value).toBeNull()
    expect(scrapedAt.value).toBeNull()
  })

  it('keyword set → 1 GET émis, exists hydraté avec la réponse', async () => {
    mockApiGet.mockResolvedValueOnce({ exists: true, scrapedAt: '2026-05-08T10:00:00.000Z' })
    const { useSerpExistsCheck } = await import('@/composables/lexique/useSerpExistsCheck')

    const keyword = ref<string | null>('marketing digital')
    const { exists, scrapedAt, isChecking } = useSerpExistsCheck(keyword)

    expect(isChecking.value).toBe(true)
    await vi.waitFor(() => expect(mockApiGet).toHaveBeenCalledTimes(1))
    await vi.waitFor(() => expect(isChecking.value).toBe(false))

    expect(mockApiGet).toHaveBeenCalledWith(
      `/keywords/${encodeURIComponent('marketing digital')}/serp/exists`,
    )
    expect(exists.value).toBe(true)
    expect(scrapedAt.value).toBe('2026-05-08T10:00:00.000Z')
  })

  it('keyword change → refetch déclenché (compteur passe à 2)', async () => {
    mockApiGet
      .mockResolvedValueOnce({ exists: false, scrapedAt: null })
      .mockResolvedValueOnce({ exists: true, scrapedAt: '2026-05-08T11:00:00.000Z' })
    const { useSerpExistsCheck } = await import('@/composables/lexique/useSerpExistsCheck')

    const keyword = ref<string | null>('seo basics')
    const { exists, refetch: _refetch } = useSerpExistsCheck(keyword)
    void _refetch
    await vi.waitFor(() => expect(mockApiGet).toHaveBeenCalledTimes(1))
    expect(exists.value).toBe(false)

    keyword.value = 'seo advanced'
    await vi.waitFor(() => expect(mockApiGet).toHaveBeenCalledTimes(2))
    expect(exists.value).toBe(true)
  })

  it('refetch() manuel → re-déclenche un GET', async () => {
    mockApiGet
      .mockResolvedValueOnce({ exists: false, scrapedAt: null })
      .mockResolvedValueOnce({ exists: true, scrapedAt: '2026-05-08T12:00:00.000Z' })
    const { useSerpExistsCheck } = await import('@/composables/lexique/useSerpExistsCheck')

    const keyword = ref<string | null>('marketing automation')
    const { exists, refetch } = useSerpExistsCheck(keyword)
    await vi.waitFor(() => expect(mockApiGet).toHaveBeenCalledTimes(1))

    await refetch()
    expect(mockApiGet).toHaveBeenCalledTimes(2)
    expect(exists.value).toBe(true)
  })
})
