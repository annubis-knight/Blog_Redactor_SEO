// @vitest-environment node
/**
 * Contrat du jugement Haiku des questions PAA (NFR-INT-DISPLAY-CONTRACTS).
 * Sortie d'IA : c'est la frontière la plus exposée (l'IA peut répondre de travers).
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  paaJudgmentBlockContract,
  captainPaaJudgeContract,
} from '../../../../shared/contracts/captain-paa-judge.contract.js'
import { parseContract, setContractReporter, ContractViolationError, type ContractEvent } from '../../../../shared/contracts/core.js'

let events: ContractEvent[]
beforeEach(() => {
  events = []
  setContractReporter(e => events.push(e))
})
afterEach(() => setContractReporter(() => {}))

function block(): Record<string, unknown> {
  return {
    paaJudgments: [
      { paaIndex: 0, badge: 'pertinent', paaScore: 85, reasonShort: 'Prix = douleur' },
      { paaIndex: 1, badge: 'hors-sujet', paaScore: 10, reasonShort: 'Emploi' },
    ],
    overallPaaScore: 48,
    summary: 'Une question sur deux colle à la douleur.',
  }
}

describe('paaJudgmentBlockContract — sortie brute de Haiku', () => {
  it('un jugement conforme passe tel quel', () => {
    const raw = block()
    expect(parseContract(paaJudgmentBlockContract, raw, 'server')).toEqual(raw)
    expect(events).toHaveLength(0)
  })

  it('un badge inventé par l’IA est écarté, les autres jugements gardés', () => {
    const raw = block()
    ;(raw.paaJudgments as unknown[]).push({ paaIndex: 2, badge: 'génial', paaScore: 99, reasonShort: '' })
    const out = parseContract(paaJudgmentBlockContract, raw, 'server')
    expect(out.paaJudgments).toHaveLength(2)
    expect(events.some(e => e.kind === 'dropped')).toBe(true)
  })

  it('un score hors bornes est ramené entre 0 et 100', () => {
    const raw = block()
    ;(raw.paaJudgments as Array<Record<string, unknown>>)[0]!.paaScore = 130
    raw.overallPaaScore = -5
    const out = parseContract(paaJudgmentBlockContract, raw, 'server')
    expect(out.paaJudgments[0]!.paaScore).toBe(100)
    expect(out.overallPaaScore).toBe(0)
  })

  it('sans score global, le bloc est refusé (chemin « Haiku indisponible »)', () => {
    const raw = { ...block(), overallPaaScore: 'bon' }
    expect(() => parseContract(paaJudgmentBlockContract, raw, 'server')).toThrow(ContractViolationError)
  })
})

describe('captainPaaJudgeContract — réponse de POST /articles/:id/captain/judge-paa', () => {
  it('un mot-clé au jugement cassé est écarté, les autres servis', () => {
    const raw = {
      judgments: { 'prix site web': block(), 'site vitrine': { summary: 42 } },
      relevanceScores: {
        'prix site web': { total: 72, verdict: 'GO', breakdown: {}, rootsContext: {}, unavailableReason: null },
        'site vitrine': { total: null, verdict: null, breakdown: null, rootsContext: null, unavailableReason: 'no-pain' },
      },
    }
    const out = parseContract(captainPaaJudgeContract, raw, 'client')
    expect(Object.keys(out.judgments)).toEqual(['prix site web'])
    expect(out.relevanceScores['site vitrine']!.total).toBeNull()
  })

  it('une réponse sans dictionnaires donne des dictionnaires vides (l’écran ne plante pas)', () => {
    const out = parseContract(captainPaaJudgeContract, {}, 'client')
    expect(out).toEqual({ judgments: {}, relevanceScores: {} })
  })
})
