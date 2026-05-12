/**
 * Tests pour `buildTabCacheEntries`.
 *
 * Sémantique du `dbCount` (FR-MOT-CACHE-PANEL-COUNT, refonte 2026-05-12) :
 * **Tous les onglets** affichent le nombre total de mots-clés sauvegardés
 * en base, peu importe leur statut (en attente, scannés, testés, verrouillés,
 * validés). La source unique est `GET /articles/:id/explorations/counts`
 * (`ExplorationCounts`). Le snapshot UI (`TabCacheUIState`) pilote uniquement
 * les hints au survol et l'indicateur de cache mémoire (`cacheCount`).
 *
 * Historique :
 *  - <= 2026-05-07 : dbCount Capitaine/Lieutenants/Lexique = explorations DB.
 *  - 2026-05-08 → 2026-05-11 : dbCount = mots-clés verrouillés (pivot 1).
 *  - 2026-05-12+ : dbCount = total DB par onglet (pivot 2, logique base).
 *
 * Cas user déclencheur du pivot 2 (article 64) : 31 capitaines envoyés depuis
 * Radar sans verrouillage → DB Capitaine = 0 (faux) alors que 31 sont
 * persistés et visibles dans le carousel.
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
  // FR-MOT-CACHE-PANEL-COUNT (refonte 2026-05-12) — logique base
  // dbCount = total DB par onglet, peu importe l'état utilisateur.
  // ────────────────────────────────────────────────────────────────────

  it('AC.CACHEPANEL.1 : Lexique avec 2 explorations DB (0 validé) → dbCount = 2', () => {
    const counts: ExplorationCounts = { lexique: 2 }
    const ui: TabCacheUIState = { ...EMPTY_UI, validatedLexiqueCount: 0 }
    const entries = buildTabCacheEntries(counts, ui)
    expect(entries.find(e => e.tabId === 'lexique')!.dbCount).toBe(2)
  })

  it('AC.CACHEPANEL.2 : Lieutenants avec 5 propositions DB (1 verrouillé) → dbCount = 5', () => {
    const counts: ExplorationCounts = { lieutenants: 5 }
    const ui: TabCacheUIState = { ...EMPTY_UI, lockedLieutenantsCount: 1 }
    const entries = buildTabCacheEntries(counts, ui)
    expect(entries.find(e => e.tabId === 'lieutenants')!.dbCount).toBe(5)
  })

  it('AC.CACHEPANEL.3 : Capitaine avec 31 explorations DB (aucun verrouillé) → dbCount = 31', () => {
    // Reproduction exacte du bug article 64 — 31 captain_explorations sans verrou.
    const counts: ExplorationCounts = { captain: 31 }
    const ui: TabCacheUIState = { ...EMPTY_UI, isCaptaineLocked: false, captainKeyword: null }
    const entries = buildTabCacheEntries(counts, ui)
    expect(entries.find(e => e.tabId === 'capitaine')!.dbCount).toBe(31)
  })

  it('AC.CACHEPANEL.4 : Radar avec 57 keywords (12 en attente + 45 scannés) → dbCount = 57', () => {
    // Le calcul SQL côté backend somme generated_keywords + scan_result.cards.
    // La fonction frontend lit la valeur agrégée — ici on simule le total reçu.
    const counts: ExplorationCounts = { radar: 57 }
    const entries = buildTabCacheEntries(counts, EMPTY_UI)
    expect(entries.find(e => e.tabId === 'radar')!.dbCount).toBe(57)
  })

  it('AC.CACHEPANEL.5 : Radar avec aucun row radar_explorations → dbCount = 0', () => {
    const entries = buildTabCacheEntries({ radar: 0 }, EMPTY_UI)
    expect(entries.find(e => e.tabId === 'radar')!.dbCount).toBe(0)
  })

  it('AC.CACHEPANEL.6 : Verrouiller un Capitaine ne change pas dbCount (toujours 31)', () => {
    const counts: ExplorationCounts = { captain: 31 }
    // Avant verrou
    let entries = buildTabCacheEntries(counts, { ...EMPTY_UI, isCaptaineLocked: false })
    expect(entries.find(e => e.tabId === 'capitaine')!.dbCount).toBe(31)
    // Après verrou
    entries = buildTabCacheEntries(counts, {
      ...EMPTY_UI,
      isCaptaineLocked: true,
      captainKeyword: 'creation site web entreprises Toulouse',
    })
    expect(entries.find(e => e.tabId === 'capitaine')!.dbCount).toBe(31) // inchangé
  })

  it('Lexique avec 12 termes en base → dbCount = 12 (peu importe les validations)', () => {
    const counts: ExplorationCounts = { lexique: 12 }
    const ui: TabCacheUIState = { ...EMPTY_UI, validatedLexiqueCount: 3 }
    const entries = buildTabCacheEntries(counts, ui)
    expect(entries.find(e => e.tabId === 'lexique')!.dbCount).toBe(12)
  })

  it('Lieutenants avec 8 propositions DB → dbCount = 8 (peu importe les verrouillages)', () => {
    const counts: ExplorationCounts = { lieutenants: 8 }
    const ui: TabCacheUIState = { ...EMPTY_UI, lockedLieutenantsCount: 3 }
    const entries = buildTabCacheEntries(counts, ui)
    expect(entries.find(e => e.tabId === 'lieutenants')!.dbCount).toBe(8)
  })

  // ────────────────────────────────────────────────────────────────────
  // Hints — détaillent l'état verrouillé/validé en plus du total.
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

  it('hint Lexique : combine extractions + termes validés', () => {
    const ui: TabCacheUIState = { ...EMPTY_UI, validatedLexiqueCount: 8 }
    const hint = buildTabCacheEntries({ lexique: 3 }, ui).find(e => e.tabId === 'lexique')!.hint
    expect(hint).toBe('3 extractions · 8 termes validés')
  })

  // ────────────────────────────────────────────────────────────────────
  // Multi-articles, isCurrentTab, Discovery exclu, protections.
  // ────────────────────────────────────────────────────────────────────

  it('multi-articles : pas de fuite — appels séparés produisent des résultats indépendants', () => {
    const a1 = buildTabCacheEntries(
      { captain: 31, lieutenants: 12 },
      { ...EMPTY_UI, isCaptaineLocked: true, captainKeyword: 'kw1', lockedLieutenantsCount: 3 },
    )
    const a2 = buildTabCacheEntries(
      { captain: 3, lieutenants: 0 },
      { ...EMPTY_UI, isCaptaineLocked: false, captainKeyword: null, lockedLieutenantsCount: 0 },
    )
    expect(a1.find(e => e.tabId === 'capitaine')!.dbCount).toBe(31)
    expect(a2.find(e => e.tabId === 'capitaine')!.dbCount).toBe(3)
    expect(a1.find(e => e.tabId === 'lieutenants')!.dbCount).toBe(12)
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
    const entries = buildTabCacheEntries({}, EMPTY_UI)
    expect(entries.find(e => e.tabId === 'radar')!.dbCount).toBe(0)
    expect(entries.find(e => e.tabId === 'capitaine')!.dbCount).toBe(0)
    expect(entries.find(e => e.tabId === 'lieutenants')!.dbCount).toBe(0)
    expect(entries.find(e => e.tabId === 'lexique')!.dbCount).toBe(0)
  })
})
