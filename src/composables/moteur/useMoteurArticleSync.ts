import { ref, watch, type Ref, type ComputedRef } from 'vue'
import { apiGet, apiDelete } from '@/services/api.service'
import { log } from '@/utils/logger'
import type { useArticleProgressStore } from '@/stores/article/article-progress.store'
import type { SelectedArticle } from '@shared/types/index.js'
import { MOTEUR_CAPITAINE_LOCKED } from '@shared/constants/workflow-checks.constants.js'

/**
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
  const { selectedArticle, cocoonName, articleProgressStore } = deps

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
    articleProgressStore.addCheck(id, check).catch(err =>
      log.warn('[useMoteurArticleSync] addCheck failed', { articleId: id, check, error: err }),
    )
    // Compare check constant (moteur:capitaine_locked, pas 'capitaine_locked').
    if (check === MOTEUR_CAPITAINE_LOCKED) refreshCapitainesMap()
    refreshExplorationCounts()
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
