/**
 * Tests pour `buildTabCacheEntries` — garde-fou anti-régression du fix bea9e4f.
 *
 * Le bug historique : `dbCount` était un flag binaire 0|1 calculé à partir
 * d'états métier (`isCaptaineLocked ? 1 : 0`) au lieu de refléter le vrai
 * nombre d'entrées persistées en DB. Un article avec 10 captain_explorations
 * affichait `DB 0` tant que le capitaine n'était pas verrouillé.
 *
 * Ces tests bloquent toute régression : si quelqu'un re-câble dbCount sur un
 * flag d'état, les assertions casseront.
 */
import { describe, it, expect } from 'vitest'
import {
  buildTabCacheEntries,
  type ExplorationCounts,
  type TabCacheUIState,
} from '../../../src/utils/tab-cache-entries'

const EMPTY_UI: TabCacheUIState = {
  activeTab: 'capitaine',
  discoveryCacheStatus: null,
  discoveryHasResults: false,
  radarScanResult: null,
  radarCacheStatus: null,
  isCaptaineLocked: false,
  captainKeyword: null,
  lockedLieutenantsCount: 0,
  validatedLexiqueCount: 0,
}

const EMPTY_COUNTS: ExplorationCounts = {}

describe('buildTabCacheEntries — invariants critiques', () => {
  it('retourne toujours 5 entrées dans l\'ordre attendu', () => {
    const entries = buildTabCacheEntries(EMPTY_COUNTS, EMPTY_UI)
    expect(entries.map(e => e.tabId)).toEqual(['discovery', 'radar', 'capitaine', 'lieutenants', 'lexique'])
  })

  it('counts vides → tous les dbCount à 0 (sauf discovery qui a sa propre source)', () => {
    const entries = buildTabCacheEntries(EMPTY_COUNTS, EMPTY_UI)
    expect(entries.find(e => e.tabId === 'discovery')!.dbCount).toBe(0)
    expect(entries.find(e => e.tabId === 'radar')!.dbCount).toBe(0)
    expect(entries.find(e => e.tabId === 'capitaine')!.dbCount).toBe(0)
    expect(entries.find(e => e.tabId === 'lieutenants')!.dbCount).toBe(0)
    expect(entries.find(e => e.tabId === 'lexique')!.dbCount).toBe(0)
  })

  it('counts présents → dbCount = vrai compte (PAS un flag 0|1)', () => {
    // Cas réel article 64 : radar 25, captain 10, lieutenants 12, lexique 0
    const counts: ExplorationCounts = {
      radar: 25,
      captain: 10,
      lieutenants: 12,
      lexique: 0,
    }
    const entries = buildTabCacheEntries(counts, EMPTY_UI)
    expect(entries.find(e => e.tabId === 'radar')!.dbCount).toBe(25)
    expect(entries.find(e => e.tabId === 'capitaine')!.dbCount).toBe(10)
    expect(entries.find(e => e.tabId === 'lieutenants')!.dbCount).toBe(12)
    expect(entries.find(e => e.tabId === 'lexique')!.dbCount).toBe(0)
  })

  it('REGRESSION GUARD : capitaine NON verrouillé + 10 explorations DB → dbCount = 10 (et non 0)', () => {
    // Bug historique avant bea9e4f : dbCount = isCaptaineLocked ? 1 : 0
    // → un article avec 10 explorations affichait `DB 0` si le capitaine n'était pas locked.
    const counts: ExplorationCounts = { captain: 10 }
    const ui: TabCacheUIState = { ...EMPTY_UI, isCaptaineLocked: false }
    const entries = buildTabCacheEntries(counts, ui)
    expect(entries.find(e => e.tabId === 'capitaine')!.dbCount).toBe(10)
  })

  it('REGRESSION GUARD : lieutenants NON verrouillés + 12 propositions DB → dbCount = 12', () => {
    const counts: ExplorationCounts = { lieutenants: 12 }
    const entries = buildTabCacheEntries(counts, { ...EMPTY_UI, lockedLieutenantsCount: 0 })
    expect(entries.find(e => e.tabId === 'lieutenants')!.dbCount).toBe(12)
  })

  it('hint Capitaine pluralise selon le compte', () => {
    const ui: TabCacheUIState = { ...EMPTY_UI }
    expect(buildTabCacheEntries({ captain: 0 }, ui).find(e => e.tabId === 'capitaine')!.hint).toBeUndefined()
    expect(buildTabCacheEntries({ captain: 1 }, ui).find(e => e.tabId === 'capitaine')!.hint).toBe('1 mot-clé testé')
    expect(buildTabCacheEntries({ captain: 8 }, ui).find(e => e.tabId === 'capitaine')!.hint).toBe('8 mots-clés testés')
  })

  it('hint Capitaine inclut le keyword verrouillé si applicable', () => {
    const ui: TabCacheUIState = {
      ...EMPTY_UI,
      isCaptaineLocked: true,
      captainKeyword: 'creation site web entreprises Toulouse',
    }
    const hint = buildTabCacheEntries({ captain: 10 }, ui).find(e => e.tabId === 'capitaine')!.hint
    expect(hint).toBe('10 mots-clés testés — verrouillé : creation site web entreprises Toulouse')
  })

  it('hint Lieutenants combine compte DB + nombre verrouillé', () => {
    const ui: TabCacheUIState = { ...EMPTY_UI, lockedLieutenantsCount: 5 }
    const hint = buildTabCacheEntries({ lieutenants: 12 }, ui).find(e => e.tabId === 'lieutenants')!.hint
    expect(hint).toBe('12 propositions en base · 5 verrouillés')
  })

  it('hint Lexique combine compte DB + termes validés', () => {
    const ui: TabCacheUIState = { ...EMPTY_UI, validatedLexiqueCount: 8 }
    const hint = buildTabCacheEntries({ lexique: 3 }, ui).find(e => e.tabId === 'lexique')!.hint
    expect(hint).toBe('3 extractions · 8 termes validés')
  })

  it('multi-articles : pas de fuite — appels séparés produisent des résultats indépendants', () => {
    // Simule la séquence : article 1 chargé → article 2 chargé. Chaque appel
    // doit produire des entrées strictement basées sur les counts passés.
    const a1 = buildTabCacheEntries({ captain: 10, lieutenants: 12 }, EMPTY_UI)
    const a2 = buildTabCacheEntries({ captain: 3, lieutenants: 0 }, EMPTY_UI)
    expect(a1.find(e => e.tabId === 'capitaine')!.dbCount).toBe(10)
    expect(a2.find(e => e.tabId === 'capitaine')!.dbCount).toBe(3)
    expect(a1.find(e => e.tabId === 'lieutenants')!.dbCount).toBe(12)
    expect(a2.find(e => e.tabId === 'lieutenants')!.dbCount).toBe(0)
  })

  it('isCurrentTab reflète activeTab passé en paramètre', () => {
    const entries = buildTabCacheEntries(EMPTY_COUNTS, { ...EMPTY_UI, activeTab: 'lieutenants' })
    expect(entries.find(e => e.tabId === 'lieutenants')!.isCurrentTab).toBe(true)
    expect(entries.find(e => e.tabId === 'capitaine')!.isCurrentTab).toBe(false)
  })

  it('discovery garde sa logique cache séparée (pas via /explorations/counts)', () => {
    // Discovery a sa propre table cache → on doit pouvoir afficher des counts
    // même quand le payload /explorations/counts est vide.
    const ui: TabCacheUIState = {
      ...EMPTY_UI,
      discoveryCacheStatus: { cached: true, keywordCount: 42 },
    }
    expect(buildTabCacheEntries(EMPTY_COUNTS, ui).find(e => e.tabId === 'discovery')!.dbCount).toBe(42)
  })

  it('radar : cacheCount=1 quand résultat en mémoire mais pas encore persisté', () => {
    const ui: TabCacheUIState = {
      ...EMPTY_UI,
      radarScanResult: { globalScore: 75 },
      radarCacheStatus: null,
    }
    const radar = buildTabCacheEntries(EMPTY_COUNTS, ui).find(e => e.tabId === 'radar')!
    expect(radar.cacheCount).toBe(1)
    expect(radar.hint).toBe('Score 75/100')
  })

  it('protection : counts undefined dans le payload → 0 (pas NaN)', () => {
    // Si le backend renvoie un payload partiel (ex: {captain: 5} sans radar),
    // les autres dbCount doivent être 0 et pas undefined/NaN.
    const entries = buildTabCacheEntries({ captain: 5 }, EMPTY_UI)
    expect(entries.find(e => e.tabId === 'radar')!.dbCount).toBe(0)
    expect(entries.find(e => e.tabId === 'lieutenants')!.dbCount).toBe(0)
    expect(entries.find(e => e.tabId === 'lexique')!.dbCount).toBe(0)
  })
})
