/**
 * AUTHORITY: Calcul à la volée du Score Pertinence (côté store frontend).
 *            Les scores ne sont PAS persistés (FR-CAP-RELEVANCE-NO-DB-WRITE).
 * READS FROM: GET /articles/:id/captain-explorations (backend live computation)
 * WRITES TO: rien — ce store ne persiste aucune donnée
 * CONSUMERS: CaptainValidation.vue (watcher painPointSnapshot + loader)
 * RELATED FR: FR-CAP-RELEVANCE-COMPUTED-LIVE, FR-CAP-RELEVANCE-NO-CACHE,
 *             FR-CAP-RELEVANCE-UNAVAILABLE-REASON
 *
 * Ce store est le point d'entrée côté front pour forcer un recalcul Pertinence
 * (ex: l'utilisateur a modifié son painPoint). Il délègue entièrement le calcul
 * au backend (captain-relevance.service.ts) — il ne fait que déclencher le fetch
 * et exposer le statut de chargement + le snapshot du painPoint utilisé.
 *
 * Cycle de vie d'un recalcul :
 *   1. CaptainValidation.vue détecte un changement de painPoint (watcher)
 *   2. Appelle invalidateIfPainPointChanged(newPainPoint) → compare avec snapshot
 *   3. Si différent → recompute(articleId) → fetch /captain-explorations
 *   4. Le store article-keywords.store.ts merge les nouveaux résultats dans validationHistory
 *   5. Les RadarKeywordCards se mettent à jour via réactivité Pinia
 */

import { ref } from 'vue'
import { defineStore } from 'pinia'
import { apiGet } from '@/services/api.service'
import { log } from '@/utils/logger'
import type { CaptainValidationEntry } from '@shared/types/index.js'

export type RelevanceLoadingState = 'idle' | 'computing' | 'done' | 'error'

export const useCaptainRelevanceStore = defineStore('captain-relevance', () => {
  /** État de chargement du dernier recalcul Pertinence. */
  const loading = ref<RelevanceLoadingState>('idle')

  /** Snapshot du painPoint utilisé pour le dernier calcul réussi.
   *  null = aucun calcul effectué ou painPoint absent. */
  const painPointSnapshot = ref<string | null>(null)

  /** articleId du dernier calcul (pour éviter les pollutions cross-article). */
  const lastArticleId = ref<number | null>(null)

  /**
   * Déclenche un recalcul Pertinence en re-fetchant /captain-explorations.
   * Les résultats sont retournés bruts — c'est CaptainValidation.vue
   * (via article-keywords.store) qui les merge dans validationHistory.
   *
   * @returns Les nouvelles entrées, ou null en cas d'erreur.
   */
  async function recompute(articleId: number): Promise<CaptainValidationEntry[] | null> {
    loading.value = 'computing'
    lastArticleId.value = articleId
    try {
      const entries = await apiGet<CaptainValidationEntry[]>(`/articles/${articleId}/captain-explorations`)
      loading.value = 'done'
      log.debug('[captain-relevance] recomputed', { articleId, count: entries?.length ?? 0 })
      return entries ?? null
    } catch (err) {
      loading.value = 'error'
      log.error('[captain-relevance] recompute failed', { articleId, error: (err as Error).message })
      return null
    }
  }

  /**
   * Compare painPoint courant avec le snapshot du dernier calcul.
   * Retourne true si le painPoint a changé (recalcul nécessaire).
   */
  function hasPainPointChanged(currentPainPoint: string | null): boolean {
    const current = currentPainPoint?.trim() ?? null
    const snap = painPointSnapshot.value?.trim() ?? null
    return current !== snap
  }

  /**
   * Met à jour le snapshot du painPoint après un recalcul réussi.
   * À appeler par CaptainValidation.vue après avoir intégré les nouvelles entrées.
   */
  function updatePainPointSnapshot(painPoint: string | null) {
    painPointSnapshot.value = painPoint?.trim() ?? null
  }

  function reset() {
    loading.value = 'idle'
    painPointSnapshot.value = null
    lastArticleId.value = null
  }

  return {
    loading,
    painPointSnapshot,
    lastArticleId,
    recompute,
    hasPainPointChanged,
    updatePainPointSnapshot,
    reset,
  }
})
