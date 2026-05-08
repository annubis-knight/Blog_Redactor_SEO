/**
 * Tests pour `buildTabCacheEntries`.
 *
 * Sémantique du `dbCount` (FR-MOT-CACHE-PANEL-COUNT, ajout 2026-05-08) :
 *  - Radar : nombre d'explorations persistées (`radar_explorations`) — pas de
 *    notion de "verrouillage utilisateur" sur cet onglet.
 *  - Capitaine / Lieutenants / Lexique : **nombre de mots-clés verrouillés
 *    par l'utilisateur** (`article_keywords.capitaine|lieutenants|lexique`),
 *    PAS le nombre d'explorations SERP/IA persistées. Une exploration qui a
 *    produit 150 termes proposés mais 0 verrouillé doit afficher `0`.
 *
 * Historique (avant 2026-05-08) : pour Capitaine/Lieutenants/Lexique, le
 * `dbCount` reflétait le compte d'explorations (`captain_explorations`,
 * `lieutenant_explorations`, `lexique_explorations`). C'était cohérent avec
 * un usage "je veux savoir combien j'ai déjà testé" mais incohérent avec
 * l'attente utilisateur (cf. cas article 64 : 2 lexique_explorations
 * orphelines, 0 lexique verrouillé → afficher 0).
 *
 * Garde-fou historique du fix bea9e4f (dbCount n'est PAS un flag binaire 0|1
 * calculé à partir d'un état métier flou) : conservé pour Radar uniquement.
 *
 * 2026-05-01 — Discovery retiré du panel (modèle de persistance cross-article
 * incompatible avec la notif "Charger DB/Cache" pilotée par articleId).
 */
import { describe, it, expect } from 'vitest'
import {
  buildTabCacheEntries,
  type ExplorationCounts,
  type TabCacheUIState,
} from '../../../src/utils/tab-cache-entries'

const EMPTY_UI: TabCacheUIState = {
  activeTab: 'capitaine',
  radarScanResult: null,
  radarCacheStatus: null,
  isCaptaineLocked: false,
  captainKeyword: null,
  lockedLieutenantsCount: 0,
  validatedLexiqueCount: 0,
}

const EMPTY_COUNTS: ExplorationCounts = {}

describe('buildTabCacheEntries — invariants critiques', () => {
  it('retourne 4 entrées dans l\'ordre attendu (Discovery exclu)', () => {
    const entries = buildTabCacheEntries(EMPTY_COUNTS, EMPTY_UI)
    expect(entries.map(e => e.tabId)).toEqual(['radar', 'capitaine', 'lieutenants', 'lexique'])
  })

  it('counts/state vides → tous les dbCount à 0', () => {
    const entries = buildTabCacheEntries(EMPTY_COUNTS, EMPTY_UI)
    expect(entries.find(e => e.tabId === 'radar')!.dbCount).toBe(0)
    expect(entries.find(e => e.tabId === 'capitaine')!.dbCount).toBe(0)
    expect(entries.find(e => e.tabId === 'lieutenants')!.dbCount).toBe(0)
    expect(entries.find(e => e.tabId === 'lexique')!.dbCount).toBe(0)
  })

  // ────────────────────────────────────────────────────────────────────
  // FR-MOT-CACHE-PANEL-COUNT (2026-05-08) — Capitaine/Lieutenants/Lexique
  // dbCount = nombre de mots-clés verrouillés par l'utilisateur.
  // ────────────────────────────────────────────────────────────────────

  it('AC.CACHEPANEL.1 : Lexique avec 2 explorations DB mais 0 terme verrouillé → dbCount = 0', () => {
    // Reproduction exacte du bug article 64 : lexique_explorations a 2 lignes
    // orphelines (sourceKeyword ≠ capitaine actuel), article_keywords.lexique = [].
    // Le compteur doit refléter l'état utilisateur (0), pas les explorations (2).
    const counts: ExplorationCounts = { lexique: 2 }
    const ui: TabCacheUIState = { ...EMPTY_UI, validatedLexiqueCount: 0 }
    const entries = buildTabCacheEntries(counts, ui)
    expect(entries.find(e => e.tabId === 'lexique')!.dbCount).toBe(0)
  })

  it('AC.CACHEPANEL.2 : Lieutenants avec 5 explorations DB mais 1 verrouillé → dbCount = 1', () => {
    const counts: ExplorationCounts = { lieutenants: 5 }
    const ui: TabCacheUIState = { ...EMPTY_UI, lockedLieutenantsCount: 1 }
    const entries = buildTabCacheEntries(counts, ui)
    expect(entries.find(e => e.tabId === 'lieutenants')!.dbCount).toBe(1)
  })

  it('AC.CACHEPANEL.3 : Capitaine avec 3 explorations DB mais aucun verrouillé → dbCount = 0', () => {
    const counts: ExplorationCounts = { captain: 3 }
    const ui: TabCacheUIState = { ...EMPTY_UI, isCaptaineLocked: false, captainKeyword: null }
    const entries = buildTabCacheEntries(counts, ui)
    expect(entries.find(e => e.tabId === 'capitaine')!.dbCount).toBe(0)
  })

  it('Capitaine verrouillé → dbCount = 1', () => {
    const counts: ExplorationCounts = { captain: 10 }
    const ui: TabCacheUIState = {
      ...EMPTY_UI,
      isCaptaineLocked: true,
      captainKeyword: 'creation site web Toulouse',
    }
    const entries = buildTabCacheEntries(counts, ui)
    expect(entries.find(e => e.tabId === 'capitaine')!.dbCount).toBe(1)
  })

  it('Lexique avec 12 termes verrouillés → dbCount = 12 (peu importe les explorations)', () => {
    const counts: ExplorationCounts = { lexique: 1 } // une seule exploration
    const ui: TabCacheUIState = { ...EMPTY_UI, validatedLexiqueCount: 12 }
    const entries = buildTabCacheEntries(counts, ui)
    expect(entries.find(e => e.tabId === 'lexique')!.dbCount).toBe(12)
  })

  it('Lieutenants avec 8 verrouillés → dbCount = 8 (peu importe les propositions DB)', () => {
    const counts: ExplorationCounts = { lieutenants: 25 }
    const ui: TabCacheUIState = { ...EMPTY_UI, lockedLieutenantsCount: 8 }
    const entries = buildTabCacheEntries(counts, ui)
    expect(entries.find(e => e.tabId === 'lieutenants')!.dbCount).toBe(8)
  })

  // ────────────────────────────────────────────────────────────────────
  // Radar — comportement inchangé : dbCount = explorations persistées.
  // ────────────────────────────────────────────────────────────────────

  it('Radar : dbCount = counts.radar (compte d\'explorations, sémantique inchangée)', () => {
    const counts: ExplorationCounts = { radar: 25 }
    const entries = buildTabCacheEntries(counts, EMPTY_UI)
    expect(entries.find(e => e.tabId === 'radar')!.dbCount).toBe(25)
  })

  it('Radar : dbCount n\'est PAS un flag 0|1 (régression guard bea9e4f)', () => {
    const counts: ExplorationCounts = { radar: 7 }
    const entries = buildTabCacheEntries(counts, EMPTY_UI)
    expect(entries.find(e => e.tabId === 'radar')!.dbCount).toBe(7)
  })

  // ────────────────────────────────────────────────────────────────────
  // Hints — informatifs, mentionnent les explorations dispos.
  // ────────────────────────────────────────────────────────────────────

  it('hint Capitaine : 0 verrouillé + 8 explorations → "8 mots-clés testés"', () => {
    const ui: TabCacheUIState = { ...EMPTY_UI }
    expect(buildTabCacheEntries({ captain: 0 }, ui).find(e => e.tabId === 'capitaine')!.hint).toBeUndefined()
    expect(buildTabCacheEntries({ captain: 1 }, ui).find(e => e.tabId === 'capitaine')!.hint).toBe('1 mot-clé testé')
    expect(buildTabCacheEntries({ captain: 8 }, ui).find(e => e.tabId === 'capitaine')!.hint).toBe('8 mots-clés testés')
  })

  it('hint Capitaine : verrouillé → mentionne le mot-clé', () => {
    const ui: TabCacheUIState = {
      ...EMPTY_UI,
      isCaptaineLocked: true,
      captainKeyword: 'creation site web entreprises Toulouse',
    }
    const hint = buildTabCacheEntries({ captain: 10 }, ui).find(e => e.tabId === 'capitaine')!.hint
    expect(hint).toBe('10 mots-clés testés — verrouillé : creation site web entreprises Toulouse')
  })

  it('hint Lieutenants : combine propositions DB + verrouillés', () => {
    const ui: TabCacheUIState = { ...EMPTY_UI, lockedLieutenantsCount: 5 }
    const hint = buildTabCacheEntries({ lieutenants: 12 }, ui).find(e => e.tabId === 'lieutenants')!.hint
    expect(hint).toBe('12 propositions en base · 5 verrouillés')
  })

  it('hint Lexique : combine extractions + termes verrouillés', () => {
    const ui: TabCacheUIState = { ...EMPTY_UI, validatedLexiqueCount: 8 }
    const hint = buildTabCacheEntries({ lexique: 3 }, ui).find(e => e.tabId === 'lexique')!.hint
    expect(hint).toBe('3 extractions · 8 termes validés')
  })

  // ────────────────────────────────────────────────────────────────────
  // Multi-articles, isCurrentTab, Discovery exclu, protections.
  // ────────────────────────────────────────────────────────────────────

  it('multi-articles : pas de fuite — appels séparés produisent des résultats indépendants', () => {
    const a1 = buildTabCacheEntries(
      { captain: 10, lieutenants: 12 },
      { ...EMPTY_UI, isCaptaineLocked: true, captainKeyword: 'kw1', lockedLieutenantsCount: 3 },
    )
    const a2 = buildTabCacheEntries(
      { captain: 3, lieutenants: 0 },
      { ...EMPTY_UI, isCaptaineLocked: false, captainKeyword: null, lockedLieutenantsCount: 0 },
    )
    expect(a1.find(e => e.tabId === 'capitaine')!.dbCount).toBe(1) // verrouillé
    expect(a2.find(e => e.tabId === 'capitaine')!.dbCount).toBe(0) // pas verrouillé
    expect(a1.find(e => e.tabId === 'lieutenants')!.dbCount).toBe(3)
    expect(a2.find(e => e.tabId === 'lieutenants')!.dbCount).toBe(0)
  })

  it('isCurrentTab reflète activeTab passé en paramètre', () => {
    const entries = buildTabCacheEntries(EMPTY_COUNTS, { ...EMPTY_UI, activeTab: 'lieutenants' })
    expect(entries.find(e => e.tabId === 'lieutenants')!.isCurrentTab).toBe(true)
    expect(entries.find(e => e.tabId === 'capitaine')!.isCurrentTab).toBe(false)
  })

  it('Discovery est exclu du panel (modèle cross-article seed-based)', () => {
    const entries = buildTabCacheEntries(EMPTY_COUNTS, EMPTY_UI)
    expect(entries.find(e => e.tabId === 'discovery')).toBeUndefined()
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
    const entries = buildTabCacheEntries({ captain: 5 }, EMPTY_UI)
    expect(entries.find(e => e.tabId === 'radar')!.dbCount).toBe(0)
    expect(entries.find(e => e.tabId === 'lieutenants')!.dbCount).toBe(0)
    expect(entries.find(e => e.tabId === 'lexique')!.dbCount).toBe(0)
    // Capitaine : isCaptaineLocked=false → dbCount=0 même si captain count présent
    expect(entries.find(e => e.tabId === 'capitaine')!.dbCount).toBe(0)
  })
})
