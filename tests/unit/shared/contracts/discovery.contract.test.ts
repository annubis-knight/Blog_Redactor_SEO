// @vitest-environment node
/**
 * Contrats de la Découverte (NFR-INT-DISPLAY-CONTRACTS, lot 6) et schéma de
 * sauvegarde du cache de découverte.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  discoveryAnalysisContract,
  discoveryCacheEntryContract,
  domainDiscoveryContract,
  keywordDiscoveryContract,
  relevanceScoreContract,
  suggestAllContract,
} from '../../../../shared/contracts/discovery.contract.js'
import { parseContract, setContractReporter, type ContractEvent } from '../../../../shared/contracts/core.js'
import { saveDiscoveryCacheSchema } from '../../../../shared/schemas/discovery-cache.schema.js'

let events: ContractEvent[]
beforeEach(() => {
  events = []
  setContractReporter(e => events.push(e))
})
afterEach(() => setContractReporter(() => {}))

function classified(keyword: string, over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    keyword, type: 'Longue traine',
    searchVolume: 90, difficulty: 12, cpc: 3.4, competition: 0.3, wordsCount: 4,
    intent: 'commercial', intentProbability: 0.8,
    compositeScore: { volume: 40, difficultyInverse: 88, cpc: 60, competitionInverse: 70, total: 62 },
    source: 'ideas',
    ...over,
  }
}

describe('suggestAllContract — Google Suggest', () => {
  it('une suggestion vide est écartée ; une stratégie absente devient vide', () => {
    const raw = {
      alphabet: { items: [{ query: 'création site web a', source: 'alphabet:a' }, { query: '', source: 'alphabet:b' }], count: 2 },
      questions: { items: [], count: 0 },
      intents: { items: [], count: 0 },
      totalUnique: 1,
    }
    const out = parseContract(suggestAllContract, raw, 'client')
    expect(out.alphabet.items.map(i => i.query)).toEqual(['création site web a'])
    expect(out.prepositions).toEqual({ items: [], count: 0 })
  })
})

describe('keywordDiscoveryContract / domainDiscoveryContract — DataForSEO', () => {
  it('une découverte conforme passe telle quelle, sans alerte', () => {
    const raw = { seed: 'création site web', keywords: [classified('prix site vitrine toulouse')], totalBeforeDedup: 3, totalAfterDedup: 1, apiCost: 0.121 }
    expect(parseContract(keywordDiscoveryContract, raw, 'server')).toEqual(raw)
    expect(events).toHaveLength(0)
  })

  it('KPI absent → « — » (null), jamais 0 ; KPI en texte (cache) → nombre', () => {
    const raw = {
      seed: 'x', totalBeforeDedup: 1, totalAfterDedup: 1, apiCost: 0,
      keywords: [classified('a', { difficulty: null, cpc: '1.80', searchVolume: undefined })],
    }
    const kw = parseContract(keywordDiscoveryContract, raw, 'server').keywords[0]!
    expect(kw.difficulty).toBeNull()
    expect(kw.searchVolume).toBeNull()
    expect(kw.cpc).toBe(1.8)
  })

  it('un score composite illisible devient entièrement absent (trié en bas)', () => {
    const raw = { seed: 'x', totalBeforeDedup: 1, totalAfterDedup: 1, apiCost: 0, keywords: [classified('a', { compositeScore: 'n/a' })] }
    expect(parseContract(keywordDiscoveryContract, raw, 'server').keywords[0]!.compositeScore.total).toBeNull()
  })

  it('un mot-clé au type inconnu est écarté, les autres servis', () => {
    const raw = { domain: 'agence.fr', total: 2, apiCost: 0, keywords: [classified('a'), classified('b', { type: 'Géant' })] }
    expect(parseContract(domainDiscoveryContract, raw, 'server').keywords.map(k => k.keyword)).toEqual(['a'])
  })
})

describe('discoveryAnalysisContract — sélection IA', () => {
  it('priorité illisible → « low » (vert, comme avant) ; mot-clé vide écarté ; coût conservé', () => {
    const usage = { model: 'claude-haiku-4-5-20251001', inputTokens: 900, outputTokens: 300, cacheReadTokens: 0, cacheCreationTokens: 0, estimatedCost: 0.002 }
    const raw = {
      keywords: [
        { keyword: 'prix site vitrine', reasoning: 'Budget', priority: 'urgent' },
        { keyword: '', reasoning: 'x', priority: 'high' },
      ],
      summary: 'Cibler le budget.',
      usage,
    }
    const out = parseContract(discoveryAnalysisContract, raw, 'client')
    expect(out.keywords).toEqual([{ keyword: 'prix site vitrine', reasoning: 'Budget', priority: 'low' }])
    expect(out.usage).toEqual(usage)
  })
})

describe('relevanceScoreContract — tri IA pertinent / hors sujet', () => {
  it('un score hors de 0-1 est écarté (mot-clé non évalué) ; « fallback » absent → false', () => {
    const out = parseContract(relevanceScoreContract, { scores: { 'site vitrine': 1, 'site croissance plante': 0, bizarre: 7 } }, 'client')
    expect(out.scores).toEqual({ 'site vitrine': 1, 'site croissance plante': 0 })
    expect(out.fallback).toBe(false)
  })
})

describe('discoveryCacheEntryContract — cache relu en base', () => {
  const entry = () => ({
    seed: 'création site web',
    context: { cocoonName: 'Création de site internet à Toulouse', seedKeyword: 'création site web' },
    suggestAlphabet: [{ keyword: 'création site web a', source: 'suggest-alphabet', sourceDetail: 'alphabet:a' }],
    suggestQuestions: [], suggestIntents: [], suggestPrepositions: [], aiKeywords: [],
    dataforseoKeywords: [{ keyword: 'prix site vitrine', source: 'dataforseo', searchVolume: 90, difficulty: null, cpc: 2.1 }],
    relevanceScores: { 'prix site vitrine': 1 },
    wordGroups: [{ word: 'prix', count: 4, normalized: 'prix' }],
    analysisResult: null,
    cachedAt: '2026-09-22T10:00:00.000Z',
    expiresAt: '2026-10-22T10:00:00.000Z',
  })

  it('pas de cache → null ; un cache conforme passe tel quel (KPI absent gardé « — »)', () => {
    expect(parseContract(discoveryCacheEntryContract, null, 'db')).toBeNull()
    const raw = entry()
    expect(parseContract(discoveryCacheEntryContract, raw, 'db')).toEqual(raw)
    expect(events).toHaveLength(0)
  })

  it('une sélection IA illisible devient « pas d’analyse » (null), le reste est servi', () => {
    const out = parseContract(discoveryCacheEntryContract, { ...entry(), analysisResult: 'corrompu' }, 'db')
    expect(out?.analysisResult).toBeNull()
    expect(out?.dataforseoKeywords).toHaveLength(1)
  })
})

describe('saveDiscoveryCacheSchema — sauvegarde du cache', () => {
  it('accepte un KPI absent (`null`) : la sauvegarde n’échoue plus sur un mot-clé sans difficulté', () => {
    const { cachedAt: _c, expiresAt: _e, ...body } = {
      seed: 'création site web',
      context: { cocoonName: 'Cocon', seedKeyword: 'création site web' },
      suggestAlphabet: [], suggestQuestions: [], suggestIntents: [], suggestPrepositions: [], aiKeywords: [],
      dataforseoKeywords: [{ keyword: 'prix site vitrine', source: 'dataforseo', searchVolume: 90, difficulty: null, cpc: null }],
      relevanceScores: {}, wordGroups: [], analysisResult: null, cachedAt: '', expiresAt: '',
    }
    expect(saveDiscoveryCacheSchema.safeParse(body).success).toBe(true)
  })
})
