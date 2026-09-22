// @vitest-environment node
/**
 * Contrats de l'analyse SERP (Lieutenants) et du TF-IDF (Lexique) —
 * NFR-INT-DISPLAY-CONTRACTS, lot 3.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { serpAnalysisContract, tfidfResultContract, UNREAD_PAGE_MESSAGE } from '../../../../shared/contracts/serp.contract.js'
import { parseContract, setContractReporter, ContractViolationError, type ContractEvent } from '../../../../shared/contracts/core.js'

let events: ContractEvent[]
beforeEach(() => {
  events = []
  setContractReporter(e => events.push(e))
})
afterEach(() => setContractReporter(() => {}))

function competitor(position: number, over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    position,
    title: `Agence ${position}`,
    url: `https://agence-${position}.fr/creation-site`,
    domain: `agence-${position}.fr`,
    headings: [{ level: 2, text: 'Combien coûte un site ?' }],
    textContent: 'Texte de la page concurrente.',
    isBlog: false,
    ...over,
  }
}

function analysis(): Record<string, unknown> {
  return {
    keyword: 'création de site web toulouse',
    articleLevel: 'pilier',
    competitors: [competitor(1), competitor(2)],
    paaQuestions: [{ question: 'Quel prix pour un site ?', answer: null }],
    maxScraped: 2,
    cachedAt: '2026-09-22T10:00:00.000Z',
    fromCache: true,
  }
}

describe('serpAnalysisContract', () => {
  it('une analyse conforme passe telle quelle, sans alerte', () => {
    const raw = analysis()
    expect(parseContract(serpAnalysisContract, raw, 'client')).toEqual(raw)
    expect(events).toHaveLength(0)
  })

  it('une page concurrente sans titre ni texte est marquée « non lue » (badge « ! » à l’écran)', () => {
    const raw = { ...analysis(), competitors: [competitor(1), competitor(2, { headings: [], textContent: null })] }
    const out = parseContract(serpAnalysisContract, raw, 'db')
    expect(out.competitors[0]!.fetchError).toBeUndefined()
    expect(out.competitors[1]!.fetchError).toBe(UNREAD_PAGE_MESSAGE)
    expect(out.competitors[1]!.textContent).toBe('')
  })

  it('une erreur de lecture transmise est conservée telle quelle', () => {
    const raw = { ...analysis(), competitors: [competitor(1, { headings: [], textContent: '', fetchError: 'Timeout 10s' })] }
    expect(parseContract(serpAnalysisContract, raw, 'server').competitors[0]!.fetchError).toBe('Timeout 10s')
  })

  it('`isBlog: null` relu en base devient « inconnu » (undefined)', () => {
    const raw = { ...analysis(), competitors: [competitor(1, { isBlog: null })] }
    expect(parseContract(serpAnalysisContract, raw, 'db').competitors[0]!.isBlog).toBeUndefined()
  })

  it('un titre Hn vide est écarté, le concurrent reste', () => {
    const raw = { ...analysis(), competitors: [competitor(1, { headings: [{ level: 2, text: '' }, { level: 3, text: 'Délais' }] })] }
    const out = parseContract(serpAnalysisContract, raw, 'client')
    expect(out.competitors[0]!.headings).toEqual([{ level: 3, text: 'Délais' }])
  })

  it('un concurrent sans adresse est écarté', () => {
    const raw = { ...analysis(), competitors: [competitor(1), competitor(2, { url: '' })] }
    expect(parseContract(serpAnalysisContract, raw, 'client').competitors).toHaveLength(1)
  })

  it('sans mot-clé, l’analyse est refusée', () => {
    expect(() => parseContract(serpAnalysisContract, { ...analysis(), keyword: '' }, 'client')).toThrow(ContractViolationError)
  })
})

describe('tfidfResultContract', () => {
  const term = (t: string, level = 'obligatoire') => ({
    term: t, level, documentFrequency: 0.8, density: 1.2, competitorCount: 8, totalCompetitors: 10,
  })

  it('un résultat conforme passe tel quel', () => {
    const raw = { keyword: 'création site web', totalCompetitors: 10, obligatoire: [term('hébergement')], differenciateur: [], optionnel: [] }
    expect(parseContract(tfidfResultContract, raw, 'client')).toEqual(raw)
  })

  it('un terme vide ou au niveau inconnu est écarté, les autres gardés', () => {
    const raw = {
      keyword: 'création site web', totalCompetitors: 10,
      obligatoire: [term('hébergement'), term(''), term('domaine', 'crucial')],
      differenciateur: [], optionnel: [],
    }
    expect(parseContract(tfidfResultContract, raw, 'client').obligatoire.map(t => t.term)).toEqual(['hébergement'])
  })

  it('une densité ou une fréquence illisible écarte le terme (jamais « ×0/page · 0 % » inventé)', () => {
    const raw = {
      keyword: 'création site web', totalCompetitors: 10,
      obligatoire: [term('hébergement'), { ...term('maintenance'), density: null }, { ...term('domaine'), documentFrequency: 'n/a' }],
      differenciateur: [], optionnel: [],
    }
    expect(parseContract(tfidfResultContract, raw, 'db').obligatoire.map(t => t.term)).toEqual(['hébergement'])
  })

  it('une liste absente devient vide (l’écran ne plante pas)', () => {
    const raw = { keyword: 'x', totalCompetitors: 0 }
    const out = parseContract(tfidfResultContract, raw, 'client')
    expect(out.obligatoire).toEqual([])
    expect(out.optionnel).toEqual([])
  })
})
