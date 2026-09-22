// @vitest-environment node
/**
 * Contrat du scan du Capitaine (NFR-INT-DISPLAY-CONTRACTS, lot 1 pilote).
 * Forme attendue par CaptainRadarList, CaptainSidePanel, CaptainVerdictPanel,
 * VerdictBar et CaptainRootsSidebar, après la réponse de POST /keywords/:kw/scan
 * ou la relecture de l'historique en base.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  captainScanContract,
  captainScanEntryContract,
} from '../../../../shared/contracts/captain-scan.contract.js'
import {
  parseContract,
  setContractReporter,
  ContractViolationError,
  type ContractEvent,
} from '../../../../shared/contracts/core.js'

let events: ContractEvent[]
beforeEach(() => {
  events = []
  setContractReporter(e => events.push(e))
})
afterEach(() => setContractReporter(() => {}))

function goodScan(): Record<string, unknown> {
  return {
    keyword: 'création de site web toulouse',
    articleLevel: 'pilier',
    kpis: [
      { name: 'volume', rawValue: 480, color: 'orange', label: '480 rech/m', thresholds: { green: 1000, orange: 200 } },
      { name: 'kd', rawValue: 83, color: 'red', label: 'KD 83', thresholds: { green: 40, orange: 65 } },
      { name: 'cpc', rawValue: null, color: 'neutral', label: '—', thresholds: { green: 0 } },
      { name: 'paa', rawValue: 3.5, color: 'green', label: '3.5 pts', thresholds: { green: 3, orange: 1 } },
      { name: 'intent', rawValue: 0.8, color: 'green', label: '0.80', thresholds: { green: 0.7, orange: 0.4 } },
      { name: 'autocomplete', rawValue: 2, color: 'green', label: 'Position 2', thresholds: { green: 3, orange: 6 } },
    ],
    verdict: { level: 'ORANGE', greenCount: 3, totalKpis: 6, reason: 'Signaux mixtes', autoNoGo: false },
    fromCache: true,
    cachedAt: '2026-09-21T10:00:00.000Z',
    paaQuestions: [
      { question: 'Combien coûte un site internet ?', answer: null, match: 'partial', matchQuality: 'stem' },
    ],
    marketScore: { total: 52, verdict: 'ORANGE', components: [] },
    relevanceScore: null,
  }
}

describe('captainScanContract — réponse conforme', () => {
  it('passe sans modification ni alerte', () => {
    const raw = goodScan()
    expect(parseContract(captainScanContract, raw, 'client')).toEqual(raw)
    expect(events).toHaveLength(0)
  })

  it('conserve un champ inconnu (le contrat ne supprime jamais en douce)', () => {
    const raw = { ...goodScan(), futurChamp: 42 }
    expect(parseContract(captainScanContract, raw, 'client')).toMatchObject({ futurChamp: 42 })
  })
})

describe('captainScanContract — absent n’est jamais zéro', () => {
  it('un KPI illisible devient absent (« — »), pas 0', () => {
    const raw = goodScan()
    ;(raw.kpis as Array<Record<string, unknown>>)[0]!.rawValue = 'abc'
    const out = parseContract(captainScanContract, raw, 'client')
    expect(out.kpis[0]!.rawValue).toBeNull()
    expect(events[0]).toMatchObject({ kind: 'coerced', contract: 'captain-scan' })
  })

  it('une colonne NUMERIC en texte est convertie', () => {
    const raw = goodScan()
    ;(raw.kpis as Array<Record<string, unknown>>)[2]!.rawValue = '20.87'
    expect(parseContract(captainScanContract, raw, 'db').kpis[2]!.rawValue).toBe(20.87)
  })
})

describe('captainScanContract — réparations tolérantes', () => {
  it('une couleur inconnue devient neutre', () => {
    const raw = goodScan()
    ;(raw.kpis as Array<Record<string, unknown>>)[1]!.color = 'violet'
    expect(parseContract(captainScanContract, raw, 'client').kpis[1]!.color).toBe('neutral')
  })

  it('un niveau de verdict inconnu devient GRAY (neutre), jamais NO-GO', () => {
    const raw = goodScan()
    ;(raw.verdict as Record<string, unknown>).level = 'PEUT-ÊTRE'
    expect(parseContract(captainScanContract, raw, 'client').verdict.level).toBe('GRAY')
  })

  it('une question PAA vide est écartée, les autres gardées', () => {
    const raw = goodScan()
    raw.paaQuestions = [{ question: '' }, { question: 'Quel délai pour un site ?', answer: null }]
    const out = parseContract(captainScanContract, raw, 'client')
    expect(out.paaQuestions?.map(p => p.question)).toEqual(['Quel délai pour un site ?'])
    expect(events.some(e => e.kind === 'dropped')).toBe(true)
  })

  it('un score de marché cassé devient absent (le score affiche « — »)', () => {
    const raw = goodScan()
    raw.marketScore = { total: 'beaucoup' }
    expect(parseContract(captainScanContract, raw, 'client').marketScore).toBeUndefined()
  })

  it('un KPI sans nom est écarté', () => {
    const raw = goodScan()
    ;(raw.kpis as unknown[]).push({ rawValue: 1 })
    expect(parseContract(captainScanContract, raw, 'client').kpis).toHaveLength(6)
  })
})

describe('captainScanContract — refus propre', () => {
  it('sans mot-clé, la réponse est refusée', () => {
    const raw = { ...goodScan(), keyword: '' }
    expect(() => parseContract(captainScanContract, raw, 'client')).toThrow(ContractViolationError)
  })

  it('une réponse qui n’est pas un objet est refusée', () => {
    expect(() => parseContract(captainScanContract, null, 'client')).toThrow(ContractViolationError)
  })
})

describe('captainScanEntryContract — historique relu en base', () => {
  it('garde les KPI absents absents et les chaînes NUMERIC converties', () => {
    const entry = {
      keyword: 'prix création site web',
      articleLevel: 'intermediaire',
      rootKeywords: ['prix site web'],
      kpis: [
        { name: 'volume', rawValue: '480' },
        { name: 'kd', rawValue: null },
      ],
      paaQuestions: [],
      aiPanelMarkdown: null,
      exploredAt: '2026-09-21T10:00:00.000Z',
      marketScore: null,
      relevanceScore: null,
      relevanceUnavailableReason: 'no-pain',
      paaJudgment: null,
    }
    const out = parseContract(captainScanEntryContract, entry, 'db')
    expect(out.kpis).toEqual([
      { name: 'volume', rawValue: 480 },
      { name: 'kd', rawValue: null },
    ])
    expect(out.relevanceUnavailableReason).toBe('no-pain')
  })
})
