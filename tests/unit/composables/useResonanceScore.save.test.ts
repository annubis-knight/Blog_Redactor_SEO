// @vitest-environment node
/**
 * FR-RAD-PERSIST, FR-RAD-DB-FIRST — un scan n'efface pas la liste d'attente
 * enregistrée (recette du 2026-09-30, MOT-10).
 *
 * En mode guidé, la liste « Mots-clés à scanner » vit dans le store (base) et
 * la liste mémoire du composable reste vide. L'enregistrement qui suit un scan
 * envoyait cette liste mémoire : `radar_explorations.generated_keywords`
 * repassait à `[]` à chaque scan, et au rechargement le Radar n'avait plus
 * rien à scanner.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useKeywordRadar } from '../../../src/composables/keyword/useResonanceScore'
import type { RadarKeyword, KeywordRadarScanResult } from '../../../shared/types/intent.types'

vi.mock('../../../src/services/api.service', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
}))
vi.mock('../../../src/utils/logger', () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))
vi.mock('vue', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue')>()
  // Composable utilisé hors composant : pas de cycle de vie à accrocher.
  return { ...actual, onBeforeUnmount: vi.fn() }
})

import { apiPost } from '../../../src/services/api.service'
const mockApiPost = vi.mocked(apiPost)

function kw(keyword: string): RadarKeyword {
  return { keyword, reasoning: '' } as RadarKeyword
}

const SCAN: KeywordRadarScanResult = {
  specificTopic: 'étapes', broadKeyword: 'recette', autocomplete: { suggestions: [], totalCount: 0 },
  cards: [], globalScore: 55, heatLevel: 'chaude', verdict: 'ok', scannedAt: '2026-09-30T01:31:11Z',
} as unknown as KeywordRadarScanResult

beforeEach(() => {
  mockApiPost.mockReset()
  mockApiPost.mockImplementation(async (url: string) => (url === '/keywords/radar/scan' ? SCAN : {}) as never)
})

describe('useKeywordRadar — l’enregistrement du scan garde la liste scannée (FR-RAD-PERSIST)', () => {
  it('mode guidé : la liste enregistrée est celle qui vient d’être scannée, pas la liste mémoire vide', async () => {
    const radar = useKeywordRadar()
    expect(radar.generatedKeywords.value).toEqual([]) // la liste vit dans le store en mode guidé

    const scanned = [kw('étapes bien démarrer guide'), kw('étapes bien démarrer comment choisir')]
    await radar.scan('recette', 'Étapes', scanned, 2, { seed: 'étapes bien démarrer', articleId: 1339, articleLevel: 'intermediaire' })
    await vi.waitFor(() => expect(mockApiPost).toHaveBeenCalledWith('/articles/1339/radar-exploration', expect.anything()))

    const [, body] = mockApiPost.mock.calls.find(([url]) => url === '/articles/1339/radar-exploration')!
    expect((body as { generatedKeywords: RadarKeyword[] }).generatedKeywords.map(k => k.keyword))
      .toEqual(['étapes bien démarrer guide', 'étapes bien démarrer comment choisir'])
    expect((body as { scanResult: KeywordRadarScanResult }).scanResult.globalScore).toBe(55)
  })
})
