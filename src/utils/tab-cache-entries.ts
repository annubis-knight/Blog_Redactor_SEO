/**
 * Mapping pur des comptes DB + état UI vers les entrées du TabCachePanel.
 *
 * Extrait de MoteurView.vue (commit bea9e4f) pour deux raisons :
 *   1. Testabilité : un mount complet de MoteurView nécessite Pinia + Router +
 *      stores, ce qui rend les tests fragiles. Une fonction pure est triviale
 *      à tester avec 100 % de couverture sans mock.
 *   2. Garde-fou : ce code avait été cassé silencieusement par une refonte
 *      antérieure (commentaire "dbCount = vraies entrées" mais implémentation
 *      qui retournait un flag binaire 0|1). Les tests sur cette fonction
 *      bloquent toute régression future.
 *
 * Garde l'invariant : `dbCount` reflète le VRAI nombre d'entrées persistées
 * dans les tables *_explorations, pas un flag d'état métier.
 *
 * 2026-05-01 — Discovery retiré du panel : son modèle de persistance est
 * cross-article (clé `seed`, pas `articleId`), incompatible avec la notif
 * "Charger depuis DB/Cache" pilotée par l'article courant.
 */

import type { TabCacheEntry } from '@/components/moteur/TabCachePanel.vue'

/** Counts retournés par GET /articles/:id/explorations/counts. */
export interface ExplorationCounts {
  radar?: number
  captain?: number
  lieutenants?: number
  lexique?: number
  /** Champs additionnels exposés par le backend mais pas affichés dans le panel. */
  paa?: number
  intent?: number
  local?: number
  contentGap?: number
}

/** Snapshot de l'état UI nécessaire pour construire les chips. */
export interface TabCacheUIState {
  activeTab: string
  // Radar : le scan est unique (pk article_id) mais on affiche le nombre de keywords générés
  radarScanResult: { globalScore: number } | null
  radarCacheStatus: { exists: boolean; globalScore?: number } | null
  // Capitaine
  isCaptaineLocked: boolean
  captainKeyword: string | null
  // Lieutenants/Lexique : le nombre verrouillé/validé est utilisé en hint, pas en count
  lockedLieutenantsCount: number
  validatedLexiqueCount: number
}

function pluralS(n: number): string {
  return n > 1 ? 's' : ''
}

/**
 * Construit les 4 entrées du TabCachePanel (Radar, Capitaine, Lieutenants, Lexique).
 *
 * @param counts Comptes réels DB (résultat de /explorations/counts).
 *               Si l'appel a échoué, passer `{}` — toutes les sources tomberont à 0.
 * @param ui Snapshot de l'état UI (active tab, locks, results en mémoire).
 */
export function buildTabCacheEntries(
  counts: ExplorationCounts,
  ui: TabCacheUIState,
): TabCacheEntry[] {
  return [
    {
      tabId: 'radar',
      tabLabel: 'Radar',
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
      dbCount: counts.captain ?? 0,
      cacheCount: 0,
      isCurrentTab: ui.activeTab === 'capitaine',
      hint: (() => {
        const n = counts.captain ?? 0
        if (n === 0) return undefined
        // "mot-clé" en français : pluriel = "mots-clés" (les deux mots prennent le s)
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
