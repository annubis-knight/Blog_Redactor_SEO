// @vitest-environment node
/**
 * Contrat « Mots-clés d'un article » (NFR-INT-DISPLAY-CONTRACTS) — ce que les
 * onglets du Moteur relisent au rechargement.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { articleKeywordsContract } from '../../../../shared/contracts/article-keywords.contract.js'
import { parseContract, setContractReporter, ContractViolationError, type ContractEvent } from '../../../../shared/contracts/core.js'

let events: ContractEvent[]
beforeEach(() => {
  events = []
  setContractReporter(e => events.push(e))
})
afterEach(() => setContractReporter(() => {}))

function payload(): Record<string, unknown> {
  return {
    articleId: 1012,
    capitaine: 'création de site web toulouse',
    lieutenants: ['prix création site web', 'devis création site web'],
    lexique: ['hébergement', 'nom de domaine'],
    rootKeywords: [],
    hnStructure: [{ level: 2, text: 'Combien coûte un site ?' }],
    richCaptain: {
      keyword: 'création de site web toulouse',
      status: 'locked',
      exploredKeywords: [
        { keyword: 'création de site web toulouse', articleLevel: 'pilier', rootKeywords: [], kpis: [{ name: 'volume', rawValue: 480 }] },
      ],
      aiPanelMarkdown: null,
    },
    richRootKeywords: [],
    richLieutenants: [{
      keyword: 'prix création site web', status: 'locked', reasoning: 'Question budget', sources: ['paa', 'serp'],
      suggestedHnLevel: 2, score: 82, kpis: null, exploredAt: '2026-09-22T10:00:00.000Z',
    }],
  }
}

describe('articleKeywordsContract', () => {
  it('une réponse conforme passe telle quelle, sans alerte', () => {
    const raw = payload()
    expect(parseContract(articleKeywordsContract, raw, 'client')).toEqual(raw)
    expect(events).toHaveLength(0)
  })

  it('« rien encore » (null) est une réponse valide', () => {
    expect(parseContract(articleKeywordsContract, null, 'client')).toBeNull()
  })

  it('une entrée d’historique abîmée est écartée, les autres servies', () => {
    const raw = payload()
    const captain = raw.richCaptain as { exploredKeywords: unknown[] }
    captain.exploredKeywords.push({ keyword: '', articleLevel: 'pilier', rootKeywords: [], kpis: [] })
    const out = parseContract(articleKeywordsContract, raw, 'client')
    expect(out?.richCaptain?.exploredKeywords).toHaveLength(1)
    expect(events.some(e => e.kind === 'dropped')).toBe(true)
  })

  it('un Lieutenant non textuel est écarté de la liste des décisions', () => {
    const raw = { ...payload(), lieutenants: ['prix création site web', 42] }
    expect(parseContract(articleKeywordsContract, raw, 'client')?.lieutenants).toEqual(['prix création site web'])
  })

  it('sans identifiant d’article, la réponse est refusée', () => {
    const raw = { ...payload(), articleId: undefined }
    expect(() => parseContract(articleKeywordsContract, raw, 'client')).toThrow(ContractViolationError)
  })
})
