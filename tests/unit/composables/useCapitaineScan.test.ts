import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../../src/services/api.service', () => ({
  apiPost: vi.fn(),
}))

vi.mock('../../../src/utils/logger', () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { apiPost } from '../../../src/services/api.service'
import { useCapitaineScan, extractRoot, extractRoots } from '../../../src/composables/keyword/useCapitaineScan'
import type { ScanResponse } from '../../../shared/types/keyword-validate.types'

const mockApiPost = vi.mocked(apiPost)

function makeMockResult(keyword: string, verdict = 'GO' as const): ScanResponse {
  return {
    keyword,
    articleLevel: 'pilier',
    kpis: [
      { name: 'volume', rawValue: 1500, color: 'green', label: '1 500', thresholds: { green: 1000, orange: 200 } },
      { name: 'kd', rawValue: 30, color: 'green', label: 'KD 30', thresholds: { green: 40, orange: 65 } },
      { name: 'cpc', rawValue: 2.5, color: 'bonus', label: '2.50€', thresholds: { green: 2 } },
      { name: 'paa', rawValue: 5, color: 'green', label: '5 PAA', thresholds: { green: 3, orange: 1 } },
      { name: 'intent', rawValue: 1, color: 'green', label: 'informational', thresholds: { green: 1, orange: 0.5 } },
      { name: 'autocomplete', rawValue: 2, color: 'green', label: 'Position 2', thresholds: { green: 3, orange: 6 } },
    ],
    verdict: { level: verdict, greenCount: 6, totalKpis: 6, autoNoGo: false },
    fromCache: false,
    cachedAt: null,
  }
}

const EMPTY_RADAR_RESULT = {
  specificTopic: '', broadKeyword: '',
  autocomplete: { suggestions: [], totalCount: 0 },
  cards: [], globalScore: 0, heatLevel: 'froide', verdict: '', scannedAt: '',
}

/**
 * Setup mock that routes by URL:
 * - /radar/scan → returns empty radar result (or custom)
 * - /scan → returns from validateResults queue
 */
function setupRoutedMock(validateResults: ScanResponse[], radarResult = EMPTY_RADAR_RESULT) {
  let validateIdx = 0
  mockApiPost.mockImplementation((url: string) => {
    if (url.includes('/radar/scan')) {
      return Promise.resolve(radarResult)
    }
    const res = validateResults[validateIdx++]
    if (res) return Promise.resolve(res)
    return Promise.resolve(makeMockResult('fallback'))
  })
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('useCapitaineScan', () => {
  it('starts with null result, not loading, no error', () => {
    const { result, isLoading, error, radarCard } = useCapitaineScan()
    expect(result.value).toBeNull()
    expect(isLoading.value).toBe(false)
    expect(error.value).toBeNull()
    expect(radarCard.value).toBeNull()
  })

  it('validates keyword and returns result', async () => {
    setupRoutedMock([makeMockResult('seo')])
    const { result, scanKeyword } = useCapitaineScan()
    await scanKeyword('seo', 'pilier')
    expect(mockApiPost).toHaveBeenCalledWith('/keywords/seo/scan', { level: 'pilier' })
    expect(result.value?.keyword).toBe('seo')
  })

  it('calls radar scan in parallel', async () => {
    setupRoutedMock([makeMockResult('seo')])
    const { scanKeyword } = useCapitaineScan()
    await scanKeyword('seo', 'pilier', 'Mon article SEO')
    expect(mockApiPost).toHaveBeenCalledWith('/keywords/radar/scan', {
      broadKeyword: 'seo',
      specificTopic: 'Mon article SEO',
      keywords: [{ keyword: 'seo', reasoning: '' }],
      depth: 1,
    })
  })

  it('uses keyword as specificTopic when no articleTitle', async () => {
    setupRoutedMock([makeMockResult('seo')])
    const { scanKeyword } = useCapitaineScan()
    await scanKeyword('seo', 'pilier')
    expect(mockApiPost).toHaveBeenCalledWith('/keywords/radar/scan', expect.objectContaining({
      specificTopic: 'seo',
    }))
  })

  it('populates radarCard from scan result', async () => {
    const mockCard = {
      keyword: 'seo', reasoning: '', combinedScore: 72,
      kpis: { searchVolume: 1500, difficulty: 30, cpc: 2.5, competition: 0.5, intentTypes: [], intentProbability: null, autocompleteMatchCount: 0, paaMatchCount: 0, paaWeightedScore: 0, paaTotal: 0, avgSemanticScore: null },
      paaItems: [], scoreBreakdown: { paaMatchScore: 0, resonanceBonus: 0, opportunityScore: 0, intentValueScore: 0, cpcScore: 0, total: 72 },
      cachedPaa: false,
    }
    setupRoutedMock([makeMockResult('seo')], { ...EMPTY_RADAR_RESULT, cards: [mockCard] })
    const { radarCard, scanKeyword } = useCapitaineScan()
    await scanKeyword('seo', 'pilier')
    expect(radarCard.value).not.toBeNull()
    expect(radarCard.value?.combinedScore).toBe(72)
  })

  it('radar failure is best-effort (does not set error)', async () => {
    let validateIdx = 0
    const results = [makeMockResult('seo')]
    mockApiPost.mockImplementation((url: string) => {
      if (url.includes('/radar/scan')) return Promise.reject(new Error('Radar down'))
      return Promise.resolve(results[validateIdx++])
    })
    const { error, radarCard, scanKeyword } = useCapitaineScan()
    await scanKeyword('seo', 'pilier')
    expect(error.value).toBeNull()
    expect(radarCard.value).toBeNull()
  })

  it('encodes keyword in URL', async () => {
    setupRoutedMock([makeMockResult('mot clé')])
    const { scanKeyword } = useCapitaineScan()
    await scanKeyword('mot clé', 'pilier')
    expect(mockApiPost).toHaveBeenCalledWith(`/keywords/${encodeURIComponent('mot clé')}/scan`, { level: 'pilier' })
  })

  it('sets error on API failure', async () => {
    mockApiPost.mockImplementation((url: string) => {
      if (url.includes('/radar/scan')) return Promise.resolve(EMPTY_RADAR_RESULT)
      return Promise.reject(new Error('Network error'))
    })
    const { error, scanKeyword } = useCapitaineScan()
    await scanKeyword('seo', 'pilier')
    expect(error.value).toBe('Network error')
  })

  it('reset clears all state including radarCard', async () => {
    setupRoutedMock([makeMockResult('seo')])
    const { result, history, radarCard, scanKeyword, reset } = useCapitaineScan()
    await scanKeyword('seo', 'pilier')
    reset()
    expect(result.value).toBeNull()
    expect(history.value).toHaveLength(0)
    expect(radarCard.value).toBeNull()
  })

  describe('history', () => {
    it('unshifts results to history (newest first)', async () => {
      setupRoutedMock([makeMockResult('seo'), makeMockResult('seo local')])
      const { history, scanKeyword } = useCapitaineScan()
      await scanKeyword('seo', 'pilier')
      await scanKeyword('seo local', 'pilier')
      expect(history.value).toHaveLength(2)
      expect(history.value[0].keyword).toBe('seo local')
      expect(history.value[1].keyword).toBe('seo')
    })

    it('deduplicates by keyword', async () => {
      setupRoutedMock([makeMockResult('seo'), makeMockResult('seo local'), makeMockResult('seo')])
      const { history, scanKeyword } = useCapitaineScan()
      await scanKeyword('seo', 'pilier')
      await scanKeyword('seo local', 'pilier')
      await scanKeyword('seo', 'pilier')
      expect(history.value).toHaveLength(2)
      expect(history.value[0].keyword).toBe('seo')
      expect(history.value[1].keyword).toBe('seo local')
    })

    it('caps history at 20 entries', async () => {
      const results = Array.from({ length: 25 }, (_, i) => makeMockResult(`kw-${i}`))
      setupRoutedMock(results)
      const { history, scanKeyword } = useCapitaineScan()
      for (let i = 0; i < 25; i++) {
        await scanKeyword(`kw-${i}`, 'pilier')
      }
      expect(history.value.length).toBeLessThanOrEqual(20)
      expect(history.value[0].keyword).toBe('kw-24')
    })

    it('navigates history without API call', async () => {
      setupRoutedMock([makeMockResult('seo'), makeMockResult('seo local')])
      const { currentResult, historyIndex, scanKeyword, navigateHistory } = useCapitaineScan()
      await scanKeyword('seo', 'pilier')
      await scanKeyword('seo local', 'pilier')
      expect(currentResult.value?.keyword).toBe('seo local')

      const callsBefore = mockApiPost.mock.calls.length
      navigateHistory(1)
      expect(historyIndex.value).toBe(1)
      expect(currentResult.value?.keyword).toBe('seo')
      expect(mockApiPost).toHaveBeenCalledTimes(callsBefore) // No additional call
    })

    it('historyIndex tracks latest entry at 0', async () => {
      setupRoutedMock([makeMockResult('a'), makeMockResult('b')])
      const { historyIndex, scanKeyword } = useCapitaineScan()
      await scanKeyword('a', 'pilier')
      expect(historyIndex.value).toBe(0)
      await scanKeyword('b', 'pilier')
      expect(historyIndex.value).toBe(0)
    })
  })

  describe('root analysis', () => {
    it('fetches root for long-tail with weak volume', async () => {
      const weakResult = makeMockResult('plombier urgence paris')
      weakResult.kpis[0] = { ...weakResult.kpis[0], color: 'orange', rawValue: 100 }
      const rootResponse = makeMockResult('plombier urgence')

      setupRoutedMock([weakResult, rootResponse])

      const { rootResult, scanKeyword } = useCapitaineScan()
      await scanKeyword('plombier urgence paris', 'pilier')

      expect(rootResult.value).not.toBeNull()
      expect(rootResult.value?.keyword).toBe('plombier urgence')
    })

    it('does NOT fetch root for short keywords', async () => {
      setupRoutedMock([makeMockResult('seo')])
      const { rootResult, scanKeyword } = useCapitaineScan()
      await scanKeyword('seo', 'pilier')
      expect(rootResult.value).toBeNull()
    })

    it('does NOT fetch root when volume is green', async () => {
      setupRoutedMock([makeMockResult('plombier urgence paris')])
      const { rootResult, scanKeyword } = useCapitaineScan()
      await scanKeyword('plombier urgence paris', 'pilier')
      expect(rootResult.value).toBeNull()
    })
  })
})

// `articleTypeToLevel` retirée 2026-05-13 (cf. TD-DRIFT-004) — le type
// canonique côté code est désormais `ArticleLevel` (kebab-case), la conversion
// PascalCase ↔ kebab vit aux frontières DB via shared/utils/article-level.ts.

describe('extractRoot', () => {
  it('returns first 2 significant words for 3+ word keywords', () => {
    expect(extractRoot('plombier urgence paris')).toBe('plombier urgence')
  })

  it('returns shortest contiguous truncation with 2+ significant words', () => {
    // "refaire son site" has 2 significant words (refaire, site) → valid shortest root
    expect(extractRoot('refaire son site web')).toBe('refaire son site')
  })

  it('returns shortest contiguous truncation for long keywords', () => {
    // "refaire son site" → significant = [refaire, site] ≥ 2 → shortest valid root
    expect(extractRoot('refaire son site web sans changer de stratégie')).toBe('refaire son site')
  })

  it('returns null for 2-word keywords', () => {
    expect(extractRoot('seo local')).toBeNull()
  })

  it('returns null for 1-word keywords', () => {
    expect(extractRoot('seo')).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(extractRoot('')).toBeNull()
  })

  it('returns null if fewer than 2 significant words after filtering', () => {
    expect(extractRoot('le la les')).toBeNull()
  })
})

describe('extractRoots', () => {
  it('returns all progressive truncations for 5-word keyword', () => {
    expect(extractRoots('creation site web entreprise toulouse')).toEqual([
      'creation site web entreprise',
      'creation site web',
      'creation site',
    ])
  })

  it('excludes truncations with fewer than 2 significant words', () => {
    // "refaire son site" → significant = ["refaire", "site"] ≥ 2 → included
    // "refaire son" → significant = ["refaire"] < 2 → excluded
    expect(extractRoots('refaire son site web')).toEqual([
      'refaire son site',
    ])
  })

  it('returns empty array for 2-word keywords', () => {
    expect(extractRoots('seo local')).toEqual([])
  })

  it('returns empty array for all stopwords', () => {
    expect(extractRoots('le la les des')).toEqual([])
  })

  it('handles 4-word keyword correctly', () => {
    expect(extractRoots('plombier urgence paris 20')).toEqual([
      'plombier urgence paris',
      'plombier urgence',
    ])
  })

  it('handles 3-word keyword — returns single root', () => {
    expect(extractRoots('plombier urgence paris')).toEqual([
      'plombier urgence',
    ])
  })
})
