// @vitest-environment node
/**
 * Contrats du Lexique IA et de l'agrégat des explorations relues en base —
 * NFR-INT-DISPLAY-CONTRACTS, lot 5.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { lexiqueAnalysisContract, lexiqueExplorationSchema } from '../../../../shared/contracts/lexique.contract.js'
import { articleExplorationsContract } from '../../../../shared/contracts/article-explorations.contract.js'
import { parseContract, setContractReporter, ContractViolationError, type ContractEvent } from '../../../../shared/contracts/core.js'

let events: ContractEvent[]
beforeEach(() => {
  events = []
  setContractReporter(e => events.push(e))
})
afterEach(() => setContractReporter(() => {}))

const tfidf = {
  keyword: 'création site web',
  totalCompetitors: 10,
  obligatoire: [{ term: 'hébergement', level: 'obligatoire', documentFrequency: 0.8, density: 1.2, competitorCount: 8, totalCompetitors: 10 }],
  differenciateur: [],
  optionnel: [],
}

describe('lexiqueAnalysisContract — recommandations de l’IA', () => {
  const analysis = () => ({
    recommendations: [
      { term: 'hébergement', aiRecommended: true, aiReason: 'Question récurrente des TPE' },
      { term: 'responsive', aiRecommended: false, aiReason: 'Trop technique pour la cible' },
    ],
    missingTerms: ['nom de domaine'],
    summary: 'Couvrir le budget et la maintenance.',
  })

  it('une analyse conforme passe telle quelle, sans alerte', () => {
    const raw = analysis()
    expect(parseContract(lexiqueAnalysisContract, raw, 'server')).toEqual(raw)
    expect(events).toHaveLength(0)
  })

  it('une décision illisible est écartée : le terme reste sans badge, pas « recommandé » inventé', () => {
    const raw = { ...analysis(), recommendations: [...analysis().recommendations, { term: 'SEO', aiRecommended: 'peut-être' }] }
    const out = parseContract(lexiqueAnalysisContract, raw, 'server')
    expect(out.recommendations.map(r => r.term)).toEqual(['hébergement', 'responsive'])
    expect(events.some(e => e.kind === 'dropped')).toBe(true)
  })

  it('sans liste de recommandations, la réponse est refusée (message et « Relancer » à l’écran)', () => {
    expect(() => parseContract(lexiqueAnalysisContract, { summary: 'x' }, 'server')).toThrow(ContractViolationError)
  })

  it('un terme manquant vide est écarté ; un résumé absent devient vide', () => {
    const { summary: _omitted, ...raw } = { ...analysis(), missingTerms: ['nom de domaine', ' '] }
    const out = parseContract(lexiqueAnalysisContract, raw, 'client')
    expect(out.missingTerms).toEqual(['nom de domaine'])
    expect(out.summary).toBe('')
  })
})

describe('lexiqueExplorationSchema — exploration Lexique relue en base', () => {
  const row = {
    articleId: 1012, sourceKeyword: 'création site web', tfidfTerms: tfidf,
    aiRecommendations: [], aiMissingTerms: [], aiSummary: null, exploredAt: '2026-09-22T10:00:00.000Z',
  }

  it('une exploration conforme passe telle quelle', () => {
    expect(lexiqueExplorationSchema.parse(row)).toEqual(row)
  })

  it('un TF-IDF illisible devient « pas encore extrait » (null), l’onglet reste', () => {
    expect(lexiqueExplorationSchema.parse({ ...row, tfidfTerms: 'corrompu' }).tfidfTerms).toBeNull()
  })
})

describe('articleExplorationsContract — tout ce que l’article a déjà exploré', () => {
  const payload = () => ({
    capitaineKeyword: 'création site web toulouse',
    radar: null,
    captain: [],
    lieutenants: [],
    intent: { capitaine: { dominant: 'commercial' }, all: [] },
    local: { capitaine: { hasLocalPack: true, listings: [], comparison: { gap: 2 } }, all: [] },
    contentGap: { capitaine: null, all: [] },
    lexique: [{
      articleId: 1012, sourceKeyword: 'création site web', tfidfTerms: tfidf,
      aiRecommendations: [], aiMissingTerms: [], aiSummary: null, exploredAt: '2026-09-22T10:00:00.000Z',
    }],
  })

  it('un agrégat conforme passe tel quel, analyses des autres onglets comprises', () => {
    const raw = payload()
    expect(parseContract(articleExplorationsContract, raw, 'db')).toEqual(raw)
    expect(events).toHaveLength(0)
  })

  it('un ancien scan Radar sans score : le thermomètre reçoit « absent », jamais 0', () => {
    const raw = {
      ...payload(),
      radar: {
        articleId: 1012, seed: 'création site web',
        context: { broadKeyword: 'création site web', specificTopic: '', painPoint: '', depth: 1 },
        generatedKeywords: [], scanResult: {}, scannedAt: '2026-09-22T10:00:00.000Z',
      },
    }
    const out = parseContract(articleExplorationsContract, raw, 'db')
    expect(out.radar?.scanResult.globalScore).toBeNull()
    expect(out.radar?.scanResult.heatLevel).toBeNull()
  })

  it('une exploration Lexique sans mot-clé source est écartée, les autres servies', () => {
    const raw = payload()
    raw.lexique = [...raw.lexique, { ...raw.lexique[0]!, sourceKeyword: '' }]
    expect(parseContract(articleExplorationsContract, raw, 'db').lexique).toHaveLength(1)
  })

  it('un bloc d’analyse manquant devient vide au lieu de faire planter l’écran', () => {
    const { contentGap: _omitted, ...raw } = payload()
    expect(parseContract(articleExplorationsContract, raw, 'db').contentGap).toEqual({ capitaine: null, all: [] })
  })
})
