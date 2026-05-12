/**
 * AUTHORITY: PostgreSQL `radar_explorations`, `captain_explorations`,
 *            `lieutenant_explorations`, `lexique_explorations`
 *            (sources de vérité des keywords sauvegardés par onglet).
 * READS FROM: ExplorationCounts (issu de GET /articles/:id/explorations/counts,
 *             FR-MOT-EXPLORATION-COUNTS). C'est la source unique du `dbCount`.
 *             TabCacheUIState (snapshot UI : verrouillages, scan en mémoire) —
 *             utilisé UNIQUEMENT pour les hints au survol et les indicateurs
 *             de cache mémoire (`cacheCount`), pas pour le `dbCount`.
 * CONSUMERS: src/views/MoteurView.vue (computed `tabCacheEntries`),
 *            TabCachePanel.vue.
 * RELATED FR: FR-MOT-CACHE-PANEL-COUNT (refonte 2026-05-12 : sémantique
 *             "total DB sauvegardé" pour tous les onglets, pas "verrouillé").
 *             FR-MOT-EXPLORATION-COUNTS (calcul SQL des totaux).
 *
 * Mapping pur `counts` (totaux DB) → entrées TabCachePanel.
 * Sémantique `dbCount` : nombre de keywords sauvegardés en base pour l'onglet,
 * tous statuts confondus (en attente, scannés, testés, verrouillés, validés).
 * Les hints au survol détaillent l'état utilisateur (verrouillé, en attente).
 */

import type { TabCacheEntry } from '@/components/moteur/TabCachePanel.vue'

/** Counts retournés par GET /articles/:id/explorations/counts. */
export interface ExplorationCounts {
  /** Radar = SUM(generated_keywords + scan_result.cards) — total keywords du Radar. */
  radar?: number
  /** Capitaine = COUNT(captain_explorations) — total keywords envoyés/testés. */
  captain?: number
  /** Lieutenants = COUNT(lieutenant_explorations) — total propositions persistées. */
  lieutenants?: number
  /** Lexique = COUNT(lexique_explorations) — total termes extraits. */
  lexique?: number
  /** Champs additionnels exposés par le backend mais pas affichés dans le panel. */
  paa?: number
  intent?: number
  local?: number
  contentGap?: number
}

/**
 * Snapshot de l'état UI utilisé pour enrichir les hints et le `cacheCount`.
 * Ne pilote PAS `dbCount` (cf. FR-MOT-CACHE-PANEL-COUNT refonte 2026-05-12).
 */
export interface TabCacheUIState {
  activeTab: string
  /** Radar : indicateur de scan en mémoire pas encore persisté. */
  radarScanResult: { globalScore: number } | null
  radarCacheStatus: { exists: boolean; globalScore?: number } | null
  /** Capitaine verrouillé : pilote le hint au survol, pas le compteur. */
  isCaptaineLocked: boolean
  captainKeyword: string | null
  /** Lieutenants verrouillés : pilote le hint au survol, pas le compteur. */
  lockedLieutenantsCount: number
  /** Lexique validé : pilote le hint au survol, pas le compteur. */
  validatedLexiqueCount: number
}

function pluralS(n: number): string {
  return n > 1 ? 's' : ''
}

/**
 * Construit les 4 entrées du TabCachePanel (Radar, Capitaine, Lieutenants, Lexique).
 *
 * @param counts Totaux DB par onglet — pilotent `dbCount`.
 * @param ui Snapshot de l'état UI — pilote les hints et `cacheCount`.
 */
export function buildTabCacheEntries(
  counts: ExplorationCounts,
  ui: TabCacheUIState,
): TabCacheEntry[] {
  return [
    {
      tabId: 'radar',
      tabLabel: 'Radar',
      // Total DB : generated_keywords + scan_result.cards (calcul SQL côté backend).
      dbCount: counts.radar ?? 0,
      cacheCount: ui.radarScanResult !== null && !ui.radarCacheStatus?.exists ? 1 : 0,
      isCurrentTab: ui.activeTab === 'radar',
      hint: ui.radarScanResult
        ? `Score ${ui.radarScanResult.globalScore}/100`
        : ui.radarCacheStatus?.exists
          ? `Score ${ui.radarCacheStatus.globalScore}/100 (cache)`
          : undefined,
    },
    {
      tabId: 'capitaine',
      tabLabel: 'Capitaine',
      // Total DB : nombre de keywords envoyés/testés au Capitaine, verrouillés ou non.
      dbCount: counts.captain ?? 0,
      cacheCount: 0,
      isCurrentTab: ui.activeTab === 'capitaine',
      hint: (() => {
        const n = counts.captain ?? 0
        if (n === 0) return undefined
        const motCle = n > 1 ? 'mots-clés' : 'mot-clé'
        if (ui.isCaptaineLocked && ui.captainKeyword) {
          return `${n} ${motCle} testé${pluralS(n)} — verrouillé : ${ui.captainKeyword}`
        }
        return `${n} ${motCle} testé${pluralS(n)}`
      })(),
    },
    {
      tabId: 'lieutenants',
      tabLabel: 'Lieutenants',
      // Total DB : toutes les propositions persistées, verrouillées ou non.
      dbCount: counts.lieutenants ?? 0,
      cacheCount: 0,
      isCurrentTab: ui.activeTab === 'lieutenants',
      hint: (() => {
        const n = counts.lieutenants ?? 0
        if (n === 0) return undefined
        const locked = ui.lockedLieutenantsCount
        return locked > 0
          ? `${n} proposition${pluralS(n)} en base · ${locked} verrouillé${pluralS(locked)}`
          : `${n} proposition${pluralS(n)} en base`
      })(),
    },
    {
      tabId: 'lexique',
      tabLabel: 'Lexique',
      // Total DB : tous les termes extraits, validés ou non.
      dbCount: counts.lexique ?? 0,
      cacheCount: 0,
      isCurrentTab: ui.activeTab === 'lexique',
      hint: (() => {
        const n = counts.lexique ?? 0
        if (n === 0) return undefined
        const validated = ui.validatedLexiqueCount
        return validated > 0
          ? `${n} extraction${pluralS(n)} · ${validated} terme${pluralS(validated)} validé${pluralS(validated)}`
          : `${n} extraction${pluralS(n)}`
      })(),
    },
  ]
}
