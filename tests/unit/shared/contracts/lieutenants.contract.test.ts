// @vitest-environment node
/**
 * Contrats des Lieutenants IA et du plan Hn — NFR-INT-DISPLAY-CONTRACTS, lot 4.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  hnOutlineContract,
  proposeLieutenantsAiContract,
  proposeLieutenantsContract,
  richLieutenantSchema,
} from '../../../../shared/contracts/lieutenants.contract.js'
import { parseContract, setContractReporter, ContractViolationError, type ContractEvent } from '../../../../shared/contracts/core.js'
import { compareScores } from '../../../../shared/score/index.js'

let events: ContractEvent[]
beforeEach(() => {
  events = []
  setContractReporter(e => events.push(e))
})
afterEach(() => setContractReporter(() => {}))

function lieutenant(keyword: string, over: Record<string, unknown> = {}): Record<string, unknown> {
  return { keyword, reasoning: 'Question budget des TPE', sources: ['paa', 'serp'], suggestedHnLevel: 2, score: 82, ...over }
}

function aiOutput(): Record<string, unknown> {
  return {
    lieutenants: [lieutenant('prix création site web'), lieutenant('délai création site', { suggestedHnLevel: 3, score: 64 })],
    hnStructure: [{ level: 2, text: 'Combien coûte un site ?', children: [{ level: 3, text: 'Site vitrine' }] }],
    contentGapInsights: 'Aucun concurrent ne parle de maintenance.',
  }
}

describe('proposeLieutenantsAiContract — sortie brute de l’IA', () => {
  it('une sortie conforme passe telle quelle, sans alerte', () => {
    const raw = aiOutput()
    expect(parseContract(proposeLieutenantsAiContract, raw, 'server')).toEqual(raw)
    expect(events).toHaveLength(0)
  })

  it('score : absent → « — » (null), texte numérique lu, décimal arrondi, hors échelle → absent', () => {
    const raw = {
      ...aiOutput(),
      lieutenants: [
        lieutenant('a', { score: undefined }),
        lieutenant('b', { score: '87' }),
        lieutenant('c', { score: 71.6 }),
        lieutenant('d', { score: 140 }),
      ],
    }
    const scores = parseContract(proposeLieutenantsAiContract, raw, 'server').lieutenants.map(l => l.score)
    expect(scores).toEqual([null, 87, 72, null])
    expect(events.some(e => e.field === 'lieutenants.score' && e.detail.includes('140'))).toBe(true)
  })

  it('un score absent est trié en bas, comme à l’écran', () => {
    const raw = { ...aiOutput(), lieutenants: [lieutenant('a', { score: null }), lieutenant('b', { score: 40 })] }
    const sorted = [...parseContract(proposeLieutenantsAiContract, raw, 'server').lieutenants].sort((x, y) => compareScores(x.score, y.score))
    expect(sorted.map(l => l.keyword)).toEqual(['b', 'a'])
  })

  it('niveau Hn : « H3 » lu, niveau impossible → H2 signalé', () => {
    const raw = { ...aiOutput(), lieutenants: [lieutenant('a', { suggestedHnLevel: 'H3' }), lieutenant('b', { suggestedHnLevel: 5 })] }
    const out = parseContract(proposeLieutenantsAiContract, raw, 'server')
    expect(out.lieutenants.map(l => l.suggestedHnLevel)).toEqual([3, 2])
    expect(events.some(e => e.field === 'lieutenants.suggestedHnLevel')).toBe(true)
  })

  it('une source inconnue est écartée, les autres gardées', () => {
    const raw = { ...aiOutput(), lieutenants: [lieutenant('a', { sources: ['paa', 'intuition'] })] }
    expect(parseContract(proposeLieutenantsAiContract, raw, 'server').lieutenants[0]!.sources).toEqual(['paa'])
  })

  it('un mot-clé proposé deux fois n’apparaît qu’une fois ; un mot-clé vide est écarté', () => {
    const raw = { ...aiOutput(), lieutenants: [lieutenant('Prix site'), lieutenant('prix site '), lieutenant('  ')] }
    expect(parseContract(proposeLieutenantsAiContract, raw, 'server').lieutenants.map(l => l.keyword)).toEqual(['Prix site'])
  })

  it('sans liste de Lieutenants, la sortie est refusée avec un message lisible', () => {
    const run = () => parseContract(proposeLieutenantsAiContract, { hnStructure: [] }, 'server')
    expect(run).toThrow(ContractViolationError)
    expect(run).toThrow(/format inattendu/)
  })

  it('sans plan Hn, la liste est servie avec un plan vide', () => {
    const { hnStructure: _omitted, ...raw } = aiOutput()
    expect(parseContract(proposeLieutenantsAiContract, raw, 'server').hnStructure).toEqual([])
  })
})

describe('proposeLieutenantsContract — événement done côté écran', () => {
  it('garde la répartition retenus / éliminés et le compteur', () => {
    const raw = {
      selectedLieutenants: [lieutenant('a')], eliminatedLieutenants: [lieutenant('b', { score: null })],
      hnStructure: [], contentGapInsights: '', totalGenerated: 2,
    }
    const out = parseContract(proposeLieutenantsContract, raw, 'client')
    expect(out.selectedLieutenants).toHaveLength(1)
    expect(out.eliminatedLieutenants[0]!.score).toBeNull()
    expect(out.totalGenerated).toBe(2)
  })
})

describe('hnOutlineContract — plan Hn régénéré', () => {
  it('un titre vide est écarté ; un niveau « H3 » est lu', () => {
    const raw = {
      hnStructure: [
        { level: 2, text: 'Tarifs', children: [{ level: 'H3', text: 'Site vitrine' }, { level: 3, text: '' }] },
        { level: 2, text: ' ' },
      ],
      justification: 'Suit les questions des visiteurs.',
    }
    const out = parseContract(hnOutlineContract, raw, 'client')
    expect(out.hnStructure).toEqual([{ level: 2, text: 'Tarifs', children: [{ level: 3, text: 'Site vitrine' }] }])
  })

  it('sans liste de titres, la réponse est refusée (le plan affiché reste en place)', () => {
    expect(() => parseContract(hnOutlineContract, { justification: 'x' }, 'client')).toThrow(ContractViolationError)
  })
})

describe('richLieutenantSchema — Lieutenant relu en base', () => {
  const row = {
    keyword: 'prix création site web', status: 'locked', reasoning: '', sources: ['paa'],
    suggestedHnLevel: 2, score: null, kpis: null, exploredAt: null,
  }

  it('un score absent en base reste absent (« — »), jamais 0', () => {
    const out = richLieutenantSchema.parse(row)
    expect(out.score).toBeNull()
  })

  it('un statut inconnu est rangé « archivé » (carte masquée, comme avant)', () => {
    expect(richLieutenantSchema.parse({ ...row, status: 'maybe' }).status).toBe('archived')
  })
})
