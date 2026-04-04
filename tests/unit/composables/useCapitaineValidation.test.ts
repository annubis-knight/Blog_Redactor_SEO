import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../../src/services/api.service', () => ({
  apiPost: vi.fn(),
}))

vi.mock('../../../src/utils/logger', () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { apiPost } from '../../../src/services/api.service'
import { useCapitaineValidation, articleTypeToLevel, extractRoot } from '../../../src/composables/useCapitaineValidation'
import type { ValidateResponse } from '../../../shared/types/keyword-validate.types'

const mockApiPost = vi.mocked(apiPost)

function makeMockResult(keyword: string, verdict = 'GO' as const): ValidateResponse {
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
 * - /validate → returns from validateResults queue
 */
function setupRoutedMock(validateResults: ValidateResponse[], radarResult = EMPTY_RADAR_RESULT) {
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

describe('useCapitaineValidation', () => {
  it('starts with null result, not loading, no error', () => {
    const { result, isLoading, error, radarCard } = useCapitaineValidation()
    expect(result.value).toBeNull()
    expect(isLoading.value).toBe(false)
    expect(error.value).toBeNull()
    expect(radarCard.value).toBeNull()
  })

  it('validates keyword and returns result', async () => {
    setupRoutedMock([makeMockResult('seo')])
    const { result, validateKeyword } = useCapitaineValidation()
    await validateKeyword('seo', 'pilier')
    expect(mockApiPost).toHaveBeenCalledWith('/keywords/seo/validate', { level: 'pilier' })
    expect(result.value?.keyword).toBe('seo')
  })

  it('calls radar scan in parallel', async () => {
    setupRoutedMock([makeMockResult('seo')])
    const { validateKeyword } = useCapitaineValidation()
    await validateKeyword('seo', 'pilier', 'Mon article SEO')
    expect(mockApiPost).toHaveBeenCalledWith('/keywords/radar/scan', {
      broadKeyword: 'seo',
      specificTopic: 'Mon article SEO',
      keywords: [{ keyword: 'seo', reasoning: '' }],
      depth: 1,
    })
  })

  it('uses keyword as specificTopic when no articleTitle', async () => {
    setupRoutedMock([makeMockResult('seo')])
    const { validateKeyword } = useCapitaineValidation()
    await validateKeyword('seo', 'pilier')
    expect(mockApiPost).toHaveBeenCalledWith('/keywords/radar/scan', expect.objectContaining({
      specificTopic: 'seo',
    }))
  })

  it('populates radarCard from scan result', async () => {
    const mockCard = {
      keyword: 'seo', reasoning: '', combinedScore: 72,
      kpis: { searchVolume: 1500, difficulty: 30, cpc: 2.5, competition: 0.5, intentTypes: [], intentProbability: null, autocompleteMatchCount: 0, paaMatchCount: 0, paaTotal: 0, avgSemanticScore: null },
      paaItems: [], scoreBreakdown: { paaMatchScore: 0, resonanceBonus: 0, opportunityScore: 0, intentValueScore: 0, cpcScore: 0, total: 72 },
      cachedPaa: false,
    }
    setupRoutedMock([makeMockResult('seo')], { ...EMPTY_RADAR_RESULT, cards: [mockCard] })
    const { radarCard, validateKeyword } = useCapitaineValidation()
    await validateKeyword('seo', 'pilier')
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
    const { error, radarCard, validateKeyword } = useCapitaineValidation()
    await validateKeyword('seo', 'pilier')
    expect(error.value).toBeNull()
    expect(radarCard.value).toBeNull()
  })

  it('encodes keyword in URL', async () => {
    setupRoutedMock([makeMockResult('mot clé')])
    const { validateKeyword } = useCapitaineValidation()
    await validateKeyword('mot clé', 'pilier')
    expect(mockApiPost).toHaveBeenCalledWith(`/keywords/${encodeURIComponent('mot clé')}/validate`, { level: 'pilier' })
  })

  it('sets error on API failure', async () => {
    mockApiPost.mockImplementation((url: string) => {
      if (url.includes('/radar/scan')) return Promise.resolve(EMPTY_RADAR_RESULT)
      return Promise.reject(new Error('Network error'))
    })
    const { error, validateKeyword } = useCapitaineValidation()
    await validateKeyword('seo', 'pilier')
    expect(error.value).toBe('Network error')
  })

  it('reset clears all state including radarCard', async () => {
    setupRoutedMock([makeMockResult('seo')])
    const { result, history, forceGo, radarCard, validateKeyword, reset } = useCapitaineValidation()
    await validateKeyword('seo', 'pilier')
    reset()
    expect(result.value).toBeNull()
    expect(history.value).toHaveLength(0)
    expect(forceGo.value).toBe(false)
    expect(radarCard.value).toBeNull()
  })

  describe('history', () => {
    it('unshifts results to history (newest first)', async () => {
      setupRoutedMock([makeMockResult('seo'), makeMockResult('seo local')])
      const { history, validateKeyword } = useCapitaineValidation()
      await validateKeyword('seo', 'pilier')
      await validateKeyword('seo local', 'pilier')
      expect(history.value).toHaveLength(2)
      expect(history.value[0].keyword).toBe('seo local')
      expect(history.value[1].keyword).toBe('seo')
    })

    it('deduplicates by keyword', async () => {
      setupRoutedMock([makeMockResult('seo'), makeMockResult('seo local'), makeMockResult('seo')])
      const { history, validateKeyword } = useCapitaineValidation()
      await validateKeyword('seo', 'pilier')
      await validateKeyword('seo local', 'pilier')
      await validateKeyword('seo', 'pilier')
      expect(history.value).toHaveLength(2)
      expect(history.value[0].keyword).toBe('seo')
      expect(history.value[1].keyword).toBe('seo local')
    })

    it('caps history at 20 entries', async () => {
      const results = Array.from({ length: 25 }, (_, i) => makeMockResult(`kw-${i}`))
      setupRoutedMock(results)
      const { history, validateKeyword } = useCapitaineValidation()
      for (let i = 0; i < 25; i++) {
        await validateKeyword(`kw-${i}`, 'pilier')
      }
      expect(history.value.length).toBeLessThanOrEqual(20)
      expect(history.value[0].keyword).toBe('kw-24')
    })

    it('navigates history without API call', async () => {
      setupRoutedMock([makeMockResult('seo'), makeMockResult('seo local')])
      const { currentResult, historyIndex, validateKeyword, navigateHistory } = useCapitaineValidation()
      await validateKeyword('seo', 'pilier')
      await validateKeyword('seo local', 'pilier')
      expect(currentResult.value?.keyword).toBe('seo local')

      const callsBefore = mockApiPost.mock.calls.length
      navigateHistory(1)
      expect(historyIndex.value).toBe(1)
      expect(currentResult.value?.keyword).toBe('seo')
      expect(mockApiPost).toHaveBeenCalledTimes(callsBefore) // No additional call
    })

    it('historyIndex tracks latest entry at 0', async () => {
      setupRoutedMock([makeMockResult('a'), makeMockResult('b')])
      const { historyIndex, validateKeyword } = useCapitaineValidation()
      await validateKeyword('a', 'pilier')
      expect(historyIndex.value).toBe(0)
      await validateKeyword('b', 'pilier')
      expect(historyIndex.value).toBe(0)
    })
  })

  describe('forceGo', () => {
    it('toggles forceGo', () => {
      const { forceGo, toggleForceGo } = useCapitaineValidation()
      expect(forceGo.value).toBe(false)
      toggleForceGo()
      expect(forceGo.value).toBe(true)
      toggleForceGo()
      expect(forceGo.value).toBe(false)
    })

    it('resets forceGo on new validation', async () => {
      setupRoutedMock([makeMockResult('seo')])
      const { forceGo, toggleForceGo, validateKeyword } = useCapitaineValidation()
      toggleForceGo()
      expect(forceGo.value).toBe(true)
      await validateKeyword('seo', 'pilier')
      expect(forceGo.value).toBe(false)
    })
  })

  describe('root analysis', () => {
    it('fetches root for long-tail with weak volume', async () => {
      const weakResult = makeMockResult('plombier urgence paris')
      weakResult.kpis[0] = { ...weakResult.kpis[0], color: 'orange', rawValue: 100 }
      const rootResponse = makeMockResult('plombier urgence')

      setupRoutedMock([weakResult, rootResponse])

      const { rootResult, validateKeyword } = useCapitaineValidation()
      await validateKeyword('plombier urgence paris', 'pilier')

      expect(rootResult.value).not.toBeNull()
      expect(rootResult.value?.keyword).toBe('plombier urgence')
    })

    it('does NOT fetch root for short keywords', async () => {
      setupRoutedMock([makeMockResult('seo')])
      const { rootResult, validateKeyword } = useCapitaineValidation()
      await validateKeyword('seo', 'pilier')
      expect(rootResult.value).toBeNull()
    })

    it('does NOT fetch root when volume is green', async () => {
      setupRoutedMock([makeMockResult('plombier urgence paris')])
      const { rootResult, validateKeyword } = useCapitaineValidation()
      await validateKeyword('plombier urgence paris', 'pilier')
      expect(rootResult.value).toBeNull()
    })
  })
})

describe('articleTypeToLevel', () => {
  it('maps Pilier to pilier', () => { expect(articleTypeToLevel('Pilier')).toBe('pilier') })
  it('maps Intermédiaire to intermediaire', () => { expect(articleTypeToLevel('Intermédiaire')).toBe('intermediaire') })
  it('maps Spécialisé to specifique', () => { expect(articleTypeToLevel('Spécialisé')).toBe('specifique') })
})

describe('extractRoot', () => {
  it('returns first 2 significant words for 3+ word keywords', () => {
    expect(extractRoot('plombier urgence paris')).toBe('plombier urgence')
  })

  it('skips French stopwords', () => {
    expect(extractRoot('refaire son site web')).toBe('refaire site')
  })

  it('skips multiple stopwords', () => {
    expect(extractRoot('refaire son site web sans changer de stratégie')).toBe('refaire site')
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
