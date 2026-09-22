/**
 * Capitaine — « absent n'est pas zéro », du scan jusqu'à la carte affichée
 * (NFR-INT-DISPLAY-CONTRACTS, FR-INFRA-KPI-NULLABLE, FR-INFRA-KPI-SCORING-NULLSAFE).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ScanResponse } from '../../../shared/types/index'
import type { CaptainScanEntry } from '../../../shared/types/keyword.types'

const mockApiPost = vi.fn()
vi.mock('../../../src/services/api.service', () => ({
  apiPost: (...args: unknown[]) => mockApiPost(...args),
}))
vi.mock('../../../src/utils/logger', () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { hydrateCardFromValidation, useExploredKeywords } from '../../../src/composables/keyword/useExploredKeywords'

beforeEach(() => mockApiPost.mockReset())

function scanWithoutMarketData(): ScanResponse {
  return {
    keyword: 'site vitrine plombier',
    articleLevel: 'specifique',
    kpis: [
      { name: 'volume', rawValue: null, color: 'neutral', label: '—', thresholds: { green: 0 } },
      { name: 'kd', rawValue: null, color: 'neutral', label: '—', thresholds: { green: 0 } },
      { name: 'cpc', rawValue: null, color: 'neutral', label: '—', thresholds: { green: 0 } },
      { name: 'paa', rawValue: 1.5, color: 'green', label: '1.5 pts', thresholds: { green: 1, orange: 0.25 } },
      { name: 'intent', rawValue: 0.8, color: 'green', label: '0.80', thresholds: { green: 0.7, orange: 0.4 } },
      { name: 'autocomplete', rawValue: 2, color: 'green', label: 'Position 2', thresholds: { green: 5, orange: 8 } },
    ],
    verdict: { level: 'ORANGE', greenCount: 3, totalKpis: 6, autoNoGo: false },
    fromCache: false,
    cachedAt: null,
  }
}

describe('hydrateCardFromValidation — les absents restent absents', () => {
  it('volume, KD et CPC absents arrivent absents sur la carte (affichés « — »)', () => {
    const card = hydrateCardFromValidation('site vitrine plombier', scanWithoutMarketData())
    expect(card.kpis?.searchVolume).toBeNull()
    expect(card.kpis?.difficulty).toBeNull()
    expect(card.kpis?.cpc).toBeNull()
  })

  it('la concurrence, que le scan ne transporte pas, est inconnue et non 0', () => {
    const card = hydrateCardFromValidation('site vitrine plombier', scanWithoutMarketData())
    expect(card.kpis?.competition).toBeNull()
  })

  it('une donnée présente passe telle quelle, vrai zéro compris', () => {
    const scan = scanWithoutMarketData()
    scan.kpis[0] = { name: 'volume', rawValue: 0, color: 'red', label: '0 rech/m', thresholds: { green: 30, orange: 5 } }
    expect(hydrateCardFromValidation('x', scan).kpis?.searchVolume).toBe(0)
  })
})

describe('addEntry — un mot saisi à la main montre « — » en attendant son scan', () => {
  it('avant la réponse du scan, les KPI marché sont absents, pas à 0', async () => {
    let resolveScan: (value: ScanResponse) => void = () => {}
    mockApiPost.mockReturnValue(new Promise<ScanResponse>(r => { resolveScan = r }))
    const c = useExploredKeywords()
    const pending = c.addEntry('site vitrine plombier', 'specifique')
    const kpis = c.entries.value[0]!.card.kpis
    expect(kpis?.searchVolume).toBeNull()
    expect(kpis?.difficulty).toBeNull()
    expect(kpis?.cpc).toBeNull()
    resolveScan(scanWithoutMarketData())
    await pending
  })
})

describe('restoreFromHistory — le rechargement ne ment pas', () => {
  it('un historique sans aucune donnée donne un verdict GRAY, jamais NO-GO', () => {
    const history: CaptainScanEntry[] = [{
      keyword: 'mot sans données',
      articleLevel: 'pilier',
      rootKeywords: [],
      kpis: [
        { name: 'volume', rawValue: null },
        { name: 'kd', rawValue: null },
        { name: 'cpc', rawValue: null },
        { name: 'intent', rawValue: null },
        { name: 'autocomplete', rawValue: null },
        { name: 'paa', rawValue: null },
      ],
    }]
    const c = useExploredKeywords()
    c.restoreFromHistory(history, 'pilier')
    const verdict = c.entries.value[0]!.validation!.verdict
    expect(verdict.level).toBe('GRAY')
    expect(verdict.autoNoGo).toBe(false)
  })
})
