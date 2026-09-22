// @vitest-environment node
/**
 * Contrats du lot 8 (NFR-INT-DISPLAY-CONTRACTS) : réponses affichées repérées
 * par l'inventaire des composants — liste d'attente du Radar, groupes de mots,
 * état du cache de Découverte, existence du scrape SERP (Lexique).
 */
import { describe, it, expect, afterEach } from 'vitest'
import {
  radarKeywordAddedContract,
  radarKeywordRemovedContract,
  radarKeywordsBatchContract,
} from '../../../../shared/contracts/radar.contract.js'
import { discoveryCacheStatusContract, wordGroupsContract } from '../../../../shared/contracts/discovery.contract.js'
import { serpExistsContract } from '../../../../shared/contracts/serp.contract.js'
import { parseContract, setContractReporter, ContractViolationError } from '../../../../shared/contracts/core.js'

afterEach(() => setContractReporter(() => {}))

const exploration = () => ({
  articleId: 1012,
  seed: 'création site web',
  context: { broadKeyword: 'création site web', specificTopic: 'Guide', painPoint: 'budget', depth: 2 },
  generatedKeywords: [{ keyword: 'prix site vitrine', reasoning: 'budget' }],
  scanResult: {},
  scannedAt: '2026-09-22T10:00:00.000Z',
})

describe('Liste d’attente du Radar (ajout / retrait)', () => {
  it('l’exploration renvoyée est mise en forme ; un mot-clé vide est écarté', () => {
    const raw = { entry: { ...exploration(), generatedKeywords: [{ keyword: 'prix site vitrine' }, { keyword: '' }] }, added: true }
    const out = parseContract(radarKeywordAddedContract, raw, 'client')
    expect(out.added).toBe(true)
    expect(out.entry.generatedKeywords.map(k => k.keyword)).toEqual(['prix site vitrine'])
    expect(out.entry.scanResult.globalScore).toBeNull()
  })

  it('ajout groupé : un compteur illisible devient 0 ; sans exploration, la réponse est refusée', () => {
    expect(parseContract(radarKeywordsBatchContract, { entry: exploration(), added: 'trois' }, 'client').added).toBe(0)
    expect(() => parseContract(radarKeywordsBatchContract, { added: 2 }, 'client')).toThrow(ContractViolationError)
  })

  it('exploration pas encore scannée (`scanResult: {}`) : état normal, aucune alerte au journal', () => {
    const events: unknown[] = []
    setContractReporter(e => events.push(e))
    const out = parseContract(radarKeywordAddedContract, { entry: exploration(), added: true }, 'db')
    expect(out.entry.scanResult.cards).toEqual([])
    expect(out.entry.scanResult.heatLevel).toBeNull()
    expect(events).toEqual([])
  })

  it('retrait du dernier mot-clé : `entry: null` est une réponse valide', () => {
    expect(parseContract(radarKeywordRemovedContract, { entry: null }, 'client').entry).toBeNull()
  })
})

describe('Groupes de mots et état du cache de Découverte', () => {
  it('un groupe sans mot est écarté ; un compteur illisible devient 0', () => {
    const out = parseContract(wordGroupsContract, { groups: [{ word: 'prix', count: 4, normalized: 'prix' }, { word: '', count: 2 }, { word: 'site', count: 'x', normalized: 'site' }] }, 'client')
    expect(out.groups).toEqual([{ word: 'prix', count: 4, normalized: 'prix' }, { word: 'site', count: 0, normalized: 'site' }])
  })

  it('état du cache : « pas de cache » passe tel quel ; un statut illisible devient « pas de cache »', () => {
    expect(parseContract(discoveryCacheStatusContract, { cached: false }, 'client')).toEqual({ cached: false })
    expect(parseContract(discoveryCacheStatusContract, { cached: 'oui' }, 'client').cached).toBe(false)
  })
})

describe('Existence du scrape SERP (pré-contrôle du Lexique)', () => {
  it('une réponse lisible passe telle quelle', () => {
    const raw = { exists: true, scrapedAt: '2026-09-21T08:00:00.000Z' }
    expect(parseContract(serpExistsContract, raw, 'client')).toEqual(raw)
  })

  it('illisible → « inconnu » (null) : l’écran garde « Extraire » plutôt que de proposer un scrape payant', () => {
    expect(parseContract(serpExistsContract, { exists: 'peut-être' }, 'client')).toEqual({ exists: null, scrapedAt: null })
  })
})
