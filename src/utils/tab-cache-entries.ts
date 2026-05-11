/**
 * AUTHORITY: PostgreSQL `article_keywords.{capitaine,lieutenants,lexique}`
 *            (sources de verite des mots-cles verrouilles utilisateur).
 *            PostgreSQL `radar_explorations` (pour Radar uniquement).
 * READS FROM: ExplorationCounts (issu de GET /articles/:id/explorations/counts,
 *             FR-MOT-EXPLORATION-COUNTS, utilise pour Radar et pour les hints).
 *             TabCacheUIState (snapshot UI : isCaptaineLocked, captainKeyword,
 *             lockedLieutenantsCount, validatedLexiqueCount).
 * CONSUMERS: src/views/MoteurView.vue (computed `tabCacheEntries`), TabCachePanel.vue.
 * RELATED FR: FR-MOT-CACHE-PANEL-COUNT (source unique compteur),
 *             FR-MOT-EXPLORATION-COUNTS (counts explorations).
 *
 * Mapping pur comptes DB + état UI vers entrées TabCachePanel.
 * Sémantique dbCount : Radar (explorations), Capitaine (1|0 locked),
 * Lieutenants (locked count), Lexique (validated count).
 * Radar conservation "explorations", autres = état utilisateur.
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
  /**
   * Nombre de keywords actuellement dans `radar_explorations.generated_keywords`
   * pour l'article courant, **réactif** (lu depuis le store Pinia DB-first).
   * Si fourni (≥ 0), prime sur `counts.radar` (qui n'est rafraîchi qu'au switch
   * d'article et aux check completed/removed, donc devient périmé après un
   * ajout via input manuel ou Discovery).
   */
  radarGeneratedKeywordsCount?: number
  // Capitaine : verrouillage et mot-clé pour le hint
  isCaptaineLocked: boolean
  captainKeyword: string | null
  // Lieutenants : nombre de lieutenants avec status='locked' dans richLieutenants
  lockedLieutenantsCount: number
  // Lexique : taille de article_keywords.lexique (TEXT[])
  validatedLexiqueCount: number
}

function pluralS(n: number): string {
  return n > 1 ? 's' : ''
}

/**
 * Construit les 4 entrées du TabCachePanel (Radar, Capitaine, Lieutenants, Lexique).
 *
 * @param counts Comptes d'explorations DB. Utilisés pour Radar (dbCount) et
 *               pour enrichir les hints des autres onglets.
 * @param ui Snapshot de l'état UI : verrouillages utilisateur (source du
 *           dbCount pour Capitaine/Lieutenants/Lexique).
 */
export function buildTabCacheEntries(
  counts: ExplorationCounts,
  ui: TabCacheUIState,
): TabCacheEntry[] {
  // Pour Radar : `radarGeneratedKeywordsCount` (réactif via store DB-first) prime
  // sur `counts.radar` (fetché ponctuellement et non rafraîchi sur ajout/suppression
  // unitaire de keyword). Cf. bug observé : ajouter un keyword via l'input manuel
  // ou via Discovery → store mis à jour mais counts.radar reste périmé jusqu'au
  // prochain switch d'article ou check workflow.
  const radarDbCount = ui.radarGeneratedKeywordsCount ?? counts.radar ?? 0
  return [
    {
      tabId: 'radar',
      tabLabel: 'Radar',
      dbCount: radarDbCount,
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
      // FR-MOT-CACHE-PANEL-COUNT : 1 si verrouillé, 0 sinon (pas le count d'explorations).
      dbCount: ui.isCaptaineLocked && ui.captainKeyword ? 1 : 0,
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
      // FR-MOT-CACHE-PANEL-COUNT : nombre de lieutenants verrouillés (status='locked').
      dbCount: ui.lockedLieutenantsCount,
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
      // FR-MOT-CACHE-PANEL-COUNT : taille de article_keywords.lexique (termes verrouillés).
      dbCount: ui.validatedLexiqueCount,
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
