/**
 * Tests du merger `mergeRadarPayload` du composable `useKeywordRadar`. Garantit
 * l'invariant clé : aucun doublon dans `generatedKeywords` après un merge,
 * peu importe l'overlap entre l'état mémoire et le payload entrant.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useKeywordRadar } from '../../../src/composables/keyword/useResonanceScore'
import type { RadarKeyword, KeywordRadarScanResult } from '../../../shared/types/intent.types'

vi.mock('../../../src/services/api.service', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
}))

import { apiGet } from '../../../src/services/api.service'
const mockApiGet = vi.mocked(apiGet)

beforeEach(() => {
  mockApiGet.mockReset()
})

function kw(keyword: string): RadarKeyword {
  return { keyword, intent: 'informational', reasoning: '' } as unknown as RadarKeyword
}

function scanResultStub(score = 75): KeywordRadarScanResult {
  return {
    globalScore: score,
    heatLevel: 'tiede',
    cards: [],
  } as unknown as KeywordRadarScanResult
}

describe('useKeywordRadar — mergeRadarPayload', () => {
  it('ajoute uniquement les keywords absents (clé = lowercased trim)', () => {
    const radar = useKeywordRadar()
    radar.generatedKeywords.value = [kw('SEO local'), kw('audit SEO')]

    radar.mergeRadarPayload({
      generatedKeywords: [kw('seo local'), kw(' Audit SEO  '), kw('netlinking')],
      scanResult: scanResultStub(),
    })

    expect(radar.generatedKeywords.value).toHaveLength(3)
    const set = new Set(radar.generatedKeywords.value.map(k => k.keyword.trim().toLowerCase()))
    expect(set.size).toBe(3)
    expect(set.has('netlinking')).toBe(true)
  })

  it('adopte scanResult uniquement si la mémoire est vide', () => {
    const radar = useKeywordRadar()
    expect(radar.scanResult.value).toBeNull()

    radar.mergeRadarPayload({
      generatedKeywords: [],
      scanResult: scanResultStub(80),
    })
    expect(radar.scanResult.value?.globalScore).toBe(80)

    radar.mergeRadarPayload({
      generatedKeywords: [],
      scanResult: scanResultStub(50),
    })
    // pas écrasé
    expect(radar.scanResult.value?.globalScore).toBe(80)
  })

  it('ne modifie pas l\'ordre des keywords existants', () => {
    const radar = useKeywordRadar()
    radar.generatedKeywords.value = [kw('first'), kw('second')]

    radar.mergeRadarPayload({
      generatedKeywords: [kw('first'), kw('third')],
      scanResult: scanResultStub(),
    })

    expect(radar.generatedKeywords.value.map(k => k.keyword)).toEqual(['first', 'second', 'third'])
  })
})

describe('useKeywordRadar — mergeFromRadarSource', () => {
  it('charge depuis l\'endpoint article si articleId numérique', async () => {
    mockApiGet.mockResolvedValue({
      articleId: 42,
      seed: 's',
      context: { broadKeyword: 'b', specificTopic: 't', painPoint: '', depth: 1 },
      generatedKeywords: [kw('alpha')],
      scanResult: scanResultStub(60),
      scannedAt: '2026-04-30',
    })
    const radar = useKeywordRadar()
    const ok = await radar.mergeFromRadarSource(42)
    expect(ok).toBe(true)
    expect(mockApiGet).toHaveBeenCalledWith('/articles/42/radar-exploration')
    expect(radar.generatedKeywords.value).toHaveLength(1)
  })

  it('charge depuis legacy radar-cache si seed string', async () => {
    mockApiGet.mockResolvedValue({
      articleId: 0,
      seed: 'creation site',
      context: { broadKeyword: 'b', specificTopic: 't', painPoint: '', depth: 1 },
      generatedKeywords: [kw('beta')],
      scanResult: scanResultStub(),
      scannedAt: '',
    })
    const radar = useKeywordRadar()
    const ok = await radar.mergeFromRadarSource('creation site')
    expect(ok).toBe(true)
    expect(mockApiGet).toHaveBeenCalledWith('/radar-cache/load?seed=creation%20site')
  })

  it('retourne false si payload vide', async () => {
    mockApiGet.mockResolvedValue(null)
    const radar = useKeywordRadar()
    const ok = await radar.mergeFromRadarSource(99)
    expect(ok).toBe(false)
  })

  it('retourne false en cas d\'erreur réseau', async () => {
    mockApiGet.mockRejectedValue(new Error('boom'))
    const radar = useKeywordRadar()
    const ok = await radar.mergeFromRadarSource(99)
    expect(ok).toBe(false)
  })
})
