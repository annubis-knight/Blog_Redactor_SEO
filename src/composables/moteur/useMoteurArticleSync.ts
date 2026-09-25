import { ref, watch, type Ref, type ComputedRef } from 'vue'
import { apiGet, apiDelete } from '@/services/api.service'
import { log } from '@/utils/logger'
import { useNotify } from '@/composables/ui/useNotify'
import { isGateBlocked } from '@/stores/ui/gate-alarm.store'
import type { useArticleProgressStore } from '@/stores/article/article-progress.store'
import type { useGateAlarmStore } from '@/stores/ui/gate-alarm.store'
import type { SelectedArticle } from '@shared/types/index.js'
import { MOTEUR_CAPITAINE_LOCKED } from '@shared/constants/workflow-checks.constants.js'

/**
 * AUTHORITY: PostgreSQL `articles.completed_checks` (via article-progress.store) ;
 *            les checks gardés passent par les portes du serveur (422 GATE_BLOCKED).
 * READS FROM: GET /cocoons/:name/capitaines, GET /articles/:id/explorations/counts.
 * WRITES TO: POST /articles/:id/progress/check et /uncheck (addCheck / removeCheck),
 *            DELETE /articles/:id/external-cache.
 * CONSUMERS: MoteurView (capitainesMap, explorationCounts, emitCheckCompleted, handleCheckRemoved).
 * RELATED FR: FR-MOT-CHECKS, FR-CAP-LOCK-GATE, FR-LIE-LOCK-GATE, FR-MOT-RECAP-LOCK-SYNC
 *
 * Vague 5 — Composable extrait de MoteurView.
 *
 * Encapsule la synchronisation article-side du Moteur :
 *  - `capitainesMap` : map keyword → article slug (cannibalization detection)
 *  - `explorationCounts` : counts DB par onglet (radar/captain/lieutenants/lexique)
 *  - `emitCheckCompleted` / `handleCheckRemoved` : delegate au progress store
 *    + refresh capitaines + counts
 *  - `clearExternalCacheForArticle` : DELETE api_cache pour le capitaine courant
 *  - watcher défensif sur `selectedArticle.id` qui rafraîchit les counts
 *
 * Dépendances explicites en paramètres → testable en isolation.
 */
export interface MoteurArticleSyncDeps {
  selectedArticle: Ref<SelectedArticle | null>
  cocoonName: ComputedRef<string>
  articleProgressStore: ReturnType<typeof useArticleProgressStore>
  /**
   * Alarme graduée : un check gardé par une porte et refusé par le serveur
   * (422 `GATE_BLOCKED`) l'ouvre, puis est rejoué après dérogation.
   * FR-CAP-LOCK-GATE, FR-LIE-LOCK-GATE.
   */
  gateAlarm?: Pick<ReturnType<typeof useGateAlarmStore>, 'runThroughGate'>
}

export interface MoteurArticleSyncApi {
  /**
   * Map articleId (number) → captain-keyword. Cohérent contrat backend
   * `/cocoons/:name/capitaines` : Record<number, string>.
   */
  capitainesMap: Ref<Record<number, string>>
  /** Counts persistés en DB par onglet pour l'article courant. */
  explorationCounts: Ref<{ radar?: number; captain?: number; lieutenants?: number; lexique?: number }>
  /** Recharge la map capitaines depuis l'API cocon. */
  refreshCapitainesMap: () => void
  /** Recharge les counts depuis l'API explorations. */
  refreshExplorationCounts: () => Promise<void>
  /** Émet un check complété + refresh capitaines (si capitaine_locked) + counts. */
  emitCheckCompleted: (check: string) => void
  /** Retire un check + refresh counts + capitaines (si capitaine_locked). */
  handleCheckRemoved: (check: string) => void
  /** DELETE api_cache lié au capitaine de l'article courant. */
  clearExternalCacheForArticle: () => Promise<void>
}

export function useMoteurArticleSync(deps: MoteurArticleSyncDeps): MoteurArticleSyncApi {
  const { selectedArticle, cocoonName, articleProgressStore, gateAlarm } = deps

  const capitainesMap = ref<Record<number, string>>({})

  function refreshCapitainesMap(): void {
    if (!cocoonName.value) return
    apiGet<Record<number, string>>(`/cocoons/${encodeURIComponent(cocoonName.value)}/capitaines`)
      .then(data => { capitainesMap.value = data })
      .catch(err => { log.warn('[useMoteurArticleSync] refreshCapitainesMap failed', { error: err }) })
  }

  async function clearExternalCacheForArticle(): Promise<void> {
    const id = selectedArticle.value?.id
    if (!id) return
    try {
      const res = await apiDelete<{ cleared: number }>(`/articles/${id}/external-cache`)
      log.info('[useMoteurArticleSync] external cache cleared', { articleId: id, cleared: res.cleared })
    } catch (err) {
      log.warn('[useMoteurArticleSync] clearExternalCacheForArticle failed', { articleId: id, error: err })
    }
  }

  const explorationCounts = ref<{
    radar?: number
    captain?: number
    lieutenants?: number
    lexique?: number
  }>({})

  async function refreshExplorationCounts(): Promise<void> {
    const id = selectedArticle.value?.id
    if (!id) {
      explorationCounts.value = {}
      return
    }
    try {
      const counts = await apiGet<Record<string, number>>(`/articles/${id}/explorations/counts`)
      explorationCounts.value = counts
      log.debug('[useMoteurArticleSync] exploration counts refreshed', { articleId: id, counts })
    } catch (err) {
      log.warn('[useMoteurArticleSync] refreshExplorationCounts failed', { articleId: id, error: err })
    }
  }

  // Watch défensif : si `selectedArticle` mute par un autre chemin que
  // handleSelectArticle (refresh de page, navigation profonde), on rafraîchit
  // quand même les counts. `immediate: true` couvre le cas du mount initial.
  watch(
    () => selectedArticle.value?.id ?? null,
    () => { refreshExplorationCounts() },
    { immediate: true },
  )

  function emitCheckCompleted(check: string): void {
    const id = selectedArticle.value?.id
    if (!id) return
    const addCheck = () => articleProgressStore.addCheck(id, check)
    const attempt = gateAlarm
      ? gateAlarm.runThroughGate(id, addCheck)
      : addCheck().then(() => ({ ok: true as const }))
    attempt
      .then((res) => {
        if (!res.ok) log.info('[useMoteurArticleSync] étape non validée : porte refusée', { articleId: id, check })
      })
      .catch((err) => {
        log.warn('[useMoteurArticleSync] addCheck failed', { articleId: id, check, error: err })
        // Refusée même après la décision de l'utilisateur (les données ont bougé
        // entre-temps) : il doit le savoir, pas croire l'étape validée.
        if (isGateBlocked(err)) {
          try { useNotify().warning(`Étape toujours refusée : ${err.details.blocking.length} point(s) à revoir.`) } catch { /* hors contexte Pinia */ }
        }
      })
      // La carte des capitaines et les compteurs relisent la base : on attend
      // la réponse du serveur, qui a pu refuser l'étape.
      .finally(() => {
        // Compare check constant (moteur:capitaine_locked, pas 'capitaine_locked').
        if (check === MOTEUR_CAPITAINE_LOCKED) refreshCapitainesMap()
        refreshExplorationCounts()
      })
  }

  function handleCheckRemoved(check: string): void {
    const id = selectedArticle.value?.id
    if (!id) return
    articleProgressStore.removeCheck(id, check).catch(err =>
      log.warn('[useMoteurArticleSync] removeCheck failed', { articleId: id, check, error: err }),
    )
    refreshExplorationCounts()
    if (check === MOTEUR_CAPITAINE_LOCKED) refreshCapitainesMap()
  }

  return {
    capitainesMap,
    explorationCounts,
    refreshCapitainesMap,
    refreshExplorationCounts,
    emitCheckCompleted,
    handleCheckRemoved,
    clearExternalCacheForArticle,
  }
}
