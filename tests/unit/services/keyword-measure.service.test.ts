// @vitest-environment node
/**
 * FR-CER-KEYWORD-REAL-DATA — les candidats d'un nouvel article sont mesurés sur
 * des données réelles, base d'abord (CLAUDE.md §3.6) : volume, difficulté,
 * intention, et les premiers résultats de leur SERP.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const m = vi.hoisted(() => ({
  getKeywordMetrics: vi.fn(),
  isKeywordMetricsFresh: vi.fn(),
  upsertKeywordKpis: vi.fn(),
  fetchKeywordOverviewBatch: vi.fn(),
  fetchSearchIntentBatch: vi.fn(),
  getSerpResultsFresh: vi.fn(),
  upsertSerpResults: vi.fn(),
  fetchSerp: vi.fn(),
}))

vi.mock('../../../server/services/keyword/keyword-metrics.service', () => ({
  getKeywordMetrics: m.getKeywordMetrics,
  isKeywordMetricsFresh: m.isKeywordMetricsFresh,
  upsertKeywordKpis: m.upsertKeywordKpis,
}))
vi.mock('../../../server/services/keyword/keyword-serp.service', () => ({
  getSerpResultsFresh: m.getSerpResultsFresh,
  upsertSerpResults: m.upsertSerpResults,
}))
vi.mock('../../../server/services/external/dataforseo.service', () => ({
  fetchKeywordOverviewBatch: m.fetchKeywordOverviewBatch,
  fetchSearchIntentBatch: m.fetchSearchIntentBatch,
  fetchSerp: m.fetchSerp,
}))

import { measureKeywords } from '../../../server/services/keyword/keyword-measure.service'

const row = (keyword: string, searchVolume: number | null) => ({
  keyword, searchVolume, keywordDifficulty: 20, cpc: 1.2, competition: 0.3, intentRaw: 0.8, intentLabel: 'informational', fetchedAt: '2026-09-25',
})

beforeEach(() => {
  vi.resetAllMocks()
  m.isKeywordMetricsFresh.mockReturnValue(true)
  m.getSerpResultsFresh.mockResolvedValue([
    { position: 1, title: 'Guide complet', domain: 'guide.fr', url: 'https://guide.fr/a', fetchedAt: '2026-09-25' },
    { position: 2, title: 'Agence X', domain: 'agence.fr', url: 'https://agence.fr', fetchedAt: '2026-09-25' },
    { position: 3, title: 'Forum', domain: 'forum.fr', url: 'https://forum.fr', fetchedAt: '2026-09-25' },
    { position: 4, title: 'Encore', domain: 'x.fr', url: 'https://x.fr', fetchedAt: '2026-09-25' },
  ])
})

describe('measureKeywords', () => {
  it('tout est en base et frais : aucun appel payant', async () => {
    m.getKeywordMetrics.mockImplementation(async (k: string) => row(k, 320))
    const result = await measureKeywords(['isolation combles'])
    expect(m.fetchKeywordOverviewBatch).not.toHaveBeenCalled()
    expect(m.fetchSerp).not.toHaveBeenCalled()
    expect(result.get('isolation combles')).toEqual({
      metrics: { searchVolume: 320, keywordDifficulty: 20, cpc: 1.2, intent: 'informational' },
      serp: [
        { position: 1, title: 'Guide complet', domain: 'guide.fr', url: 'https://guide.fr/a' },
        { position: 2, title: 'Agence X', domain: 'agence.fr', url: 'https://agence.fr' },
        { position: 3, title: 'Forum', domain: 'forum.fr', url: 'https://forum.fr' },
      ],
    })
  })

  it('les mots-clés absents sont mesurés en UN appel groupé, puis enregistrés', async () => {
    const enBase = new Map([['isolation combles', row('isolation combles', 320)]])
    m.getKeywordMetrics.mockImplementation(async (k: string) => enBase.get(k) ?? null)
    m.fetchKeywordOverviewBatch.mockResolvedValue(new Map([
      ['laine soufflee', { searchVolume: 90, difficulty: 12, cpc: 0.8, competition: 0.1, monthlySearches: [] }],
      ['isolant mince', { searchVolume: 0, difficulty: null, cpc: null, competition: null, monthlySearches: [] }],
    ]))
    m.fetchSearchIntentBatch.mockResolvedValue(new Map([['laine soufflee', { intent: 'commercial', intentProbability: 0.7 }]]))
    m.upsertKeywordKpis.mockImplementation(async (k: string, kpis: { searchVolume: number | null }) => {
      enBase.set(k, row(k, kpis.searchVolume))
    })

    const result = await measureKeywords(['isolation combles', 'laine soufflee', 'isolant mince'])
    expect(m.fetchKeywordOverviewBatch).toHaveBeenCalledTimes(1)
    expect(m.fetchKeywordOverviewBatch).toHaveBeenCalledWith(['laine soufflee', 'isolant mince'])
    expect(m.upsertKeywordKpis).toHaveBeenCalledWith('laine soufflee', expect.objectContaining({ searchVolume: 90, keywordDifficulty: 12, intentLabel: 'commercial' }))
    expect(result.get('laine soufflee')!.metrics!.searchVolume).toBe(90)
    expect(result.get('isolant mince')!.metrics!.searchVolume).toBe(0)
  })

  it('DataForSEO en panne : les mots-clés non mesurés restent sans mesure (jamais inventée)', async () => {
    m.getKeywordMetrics.mockResolvedValue(null)
    m.fetchKeywordOverviewBatch.mockRejectedValue(new Error('429'))
    m.fetchSearchIntentBatch.mockRejectedValue(new Error('429'))
    m.getSerpResultsFresh.mockResolvedValue(null)
    m.fetchSerp.mockRejectedValue(new Error('429'))
    const result = await measureKeywords(['laine soufflee'])
    expect(m.upsertKeywordKpis).not.toHaveBeenCalled()
    expect(result.get('laine soufflee')).toEqual({ metrics: null, serp: [] })
  })

  it('SERP absente de la base : récupérée, enregistrée, puis lue', async () => {
    m.getKeywordMetrics.mockImplementation(async (k: string) => row(k, 50))
    m.getSerpResultsFresh.mockResolvedValue(null)
    m.fetchSerp.mockResolvedValue([{ position: 1, title: 'Un guide', url: 'https://g.fr', domain: 'g.fr', description: '' }])
    const result = await measureKeywords(['laine de roche'])
    expect(m.upsertSerpResults).toHaveBeenCalledWith('laine de roche', [{ position: 1, url: 'https://g.fr', title: 'Un guide', domain: 'g.fr' }])
    expect(result.get('laine de roche')!.serp).toEqual([{ position: 1, title: 'Un guide', domain: 'g.fr', url: 'https://g.fr' }])
  })
})
