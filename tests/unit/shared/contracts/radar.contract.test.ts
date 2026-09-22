// @vitest-environment node
/**
 * Contrats du Radar (NFR-INT-DISPLAY-CONTRACTS, lot 2) : scan, génération IA,
 * exploration relue en base (anciens instantanés JSONB compris).
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  radarScanResultContract,
  radarGenerateContract,
  radarExplorationContract,
} from '../../../../shared/contracts/radar.contract.js'
import { parseContract, setContractReporter, ContractViolationError, type ContractEvent } from '../../../../shared/contracts/core.js'

let events: ContractEvent[]
beforeEach(() => {
  events = []
  setContractReporter(e => events.push(e))
})
afterEach(() => setContractReporter(() => {}))

function card(keyword = 'prix création site web'): Record<string, unknown> {
  return {
    keyword,
    reasoning: 'Question budget',
    kpis: {
      searchVolume: 480, difficulty: 13, cpc: 20.87, competition: 0.4,
      intentTypes: ['commercial'], intentProbability: 0.8,
      autocompleteMatchCount: 3, paaMatchCount: 2, paaWeightedScore: 2.5, paaTotal: 4, avgSemanticScore: 0.61,
    },
    paaItems: [{ question: 'Combien coûte un site vitrine ?', depth: 1, match: 'total', matchQuality: 'exact' }],
    combinedScore: 64,
    scoreBreakdown: { paaMatchScore: 25, resonanceBonus: 30, opportunityScore: 50, intentValueScore: 80, cpcScore: 100, painAlignmentScore: 50, total: 64 },
    cachedPaa: false,
    marketScore: { total: 71, verdict: 'GO', components: [] },
    relevanceScore: null,
  }
}

function scan(): Record<string, unknown> {
  return {
    specificTopic: 'Création de site web à Toulouse',
    broadKeyword: 'création site web',
    autocomplete: { suggestions: [{ text: 'création site web prix', query: 'création site web', position: 1 }], totalCount: 1 },
    cards: [card()],
    globalScore: 64,
    heatLevel: 'chaude',
    verdict: 'Sujet porteur',
    scannedAt: '2026-09-22T10:00:00.000Z',
  }
}

describe('radarScanResultContract', () => {
  it('un scan conforme passe tel quel, sans alerte', () => {
    const raw = scan()
    expect(parseContract(radarScanResultContract, raw, 'client')).toEqual(raw)
    expect(events).toHaveLength(0)
  })

  it('un volume illisible devient absent (« — »), pas 0', () => {
    const raw = scan()
    ;((raw.cards as Array<Record<string, unknown>>)[0]!.kpis as Record<string, unknown>).searchVolume = 'beaucoup'
    const out = parseContract(radarScanResultContract, raw, 'client')
    expect(out.cards[0]!.kpis?.searchVolume).toBeNull()
  })

  it('une carte longue traîne sans KPI garde `kpis: null`', () => {
    const raw = scan()
    raw.cards = [{ ...card('site vitrine artisan toulouse'), kpis: null, source: 'longtail', preferenceScore: 8 }]
    const out = parseContract(radarScanResultContract, raw, 'client')
    expect(out.cards[0]!.kpis).toBeNull()
    expect(out.cards[0]!.source).toBe('longtail')
  })

  it('une question PAA vide est écartée, la carte reste', () => {
    const raw = scan()
    ;(raw.cards as Array<Record<string, unknown>>)[0]!.paaItems = [{ question: '', depth: 1, match: 'none' }, { question: 'Quel délai ?', depth: 1, match: 'none' }]
    const out = parseContract(radarScanResultContract, raw, 'client')
    expect(out.cards).toHaveLength(1)
    expect(out.cards[0]!.paaItems.map(p => p.question)).toEqual(['Quel délai ?'])
  })

  it('une carte sans mot-clé est écartée, les autres servies', () => {
    const raw = scan()
    raw.cards = [card(), { ...card(), keyword: '' }]
    expect(parseContract(radarScanResultContract, raw, 'client').cards).toHaveLength(1)
  })

  it('sans score global (longue traîne sans scan), le thermomètre reçoit « absent »', () => {
    const raw = { ...scan(), cards: [], globalScore: null, heatLevel: null }
    const out = parseContract(radarScanResultContract, raw, 'client')
    expect(out.globalScore).toBeNull()
    expect(out.heatLevel).toBeNull()
  })

  it('une chaleur inconnue devient absente, jamais « froide » inventée', () => {
    const raw = { ...scan(), heatLevel: 'volcanique' }
    expect(parseContract(radarScanResultContract, raw, 'client').heatLevel).toBeNull()
  })
})

describe('radarGenerateContract — idées de mots-clés produites par l’IA', () => {
  it('garde les idées conformes, écarte les vides', () => {
    const raw = {
      articleTitle: 'Guide', articleKeyword: 'création site web', painPoint: 'budget',
      keywords: [{ keyword: 'prix site vitrine', reasoning: 'budget' }, { keyword: '', reasoning: 'x' }],
      generatedAt: '2026-09-22T10:00:00.000Z',
    }
    const out = parseContract(radarGenerateContract, raw, 'client')
    expect(out.keywords.map(k => k.keyword)).toEqual(['prix site vitrine'])
  })
})

describe('radarExplorationContract — exploration relue en base', () => {
  it('« aucune exploration » (null) est valide', () => {
    expect(parseContract(radarExplorationContract, null, 'db')).toBeNull()
  })

  it('un ancien instantané JSONB est mis en forme sans être refusé', () => {
    const raw = {
      articleId: 1012, seed: 'création site web',
      context: { broadKeyword: 'création site web', specificTopic: 'Guide', painPoint: 'budget', depth: 2 },
      generatedKeywords: [{ keyword: 'prix site vitrine', reasoning: '' }],
      scanResult: { ...scan(), cards: [{ ...card(), kpis: { ...(card().kpis as object), cpc: '1.20' } }] },
      scannedAt: '2026-09-22T10:00:00.000Z',
    }
    const out = parseContract(radarExplorationContract, raw, 'db')
    expect(out?.scanResult.cards[0]!.kpis?.cpc).toBe(1.2)
  })

  it('sans identifiant d’article, l’exploration est refusée', () => {
    expect(() => parseContract(radarExplorationContract, { seed: 'x' }, 'db')).toThrow(ContractViolationError)
  })
})
