import { computed, type Ref, type ComputedRef } from 'vue'
import type { useArticleProgressStore } from '@/stores/article/article-progress.store'
import type { useKeywordsStore } from '@/stores/keyword/keywords.store'
import type { SelectedArticle } from '@shared/types/index.js'
import {
  isFinalisationUnlocked,
  finalisationButtonTitle as buildFinalisationButtonTitle,
} from '@/composables/moteur/useFinalisationGating'

/**
 * Vague 3 — Composable extrait de MoteurView.
 *
 * Gating souple ("soft gating") des onglets Phase ② et ③ du Moteur (cf.
 * FR-MOT-FREE-NAV : navigation libre, gating sur écritures uniquement).
 *
 * Encapsule les computeds qui dérivent l'état de verrouillage / validation
 * de chaque onglet depuis le store `articleProgressStore`.
 *
 * Dépendances explicites en paramètres → testable en isolation
 * (cf. tech-spec V3 risque 3.3).
 */
export interface MoteurSoftGatingDeps {
  selectedArticle: Ref<SelectedArticle | null>
  articleProgressStore: ReturnType<typeof useArticleProgressStore>
  keywordsStore: ReturnType<typeof useKeywordsStore>
}

export interface MoteurSoftGatingApi {
  /** True si le check `capitaine_locked` est posé pour l'article courant. */
  isCaptaineLocked: ComputedRef<boolean>
  /** True si le check `lieutenants_locked` est posé pour l'article courant. */
  isLieutenantsLocked: ComputedRef<boolean>
  /** True si le check `lexique_validated` est posé pour l'article courant. */
  isLexiqueValidated: ComputedRef<boolean>
  /** True si les 3 checks Phase ② sont posés (capitaine + lieutenants + lexique). */
  finalisationUnlocked: ComputedRef<boolean>
  /** Tooltip du bouton Finalisation : énumère les checks manquants. */
  finalisationButtonTitle: ComputedRef<string>
  /**
   * True si Discovery/Radar sont accessibles pour l'article courant.
   * Faux dès que le keyword article a un statut autre que 'suggested'
   * dans `keywordsStore` (= mots-clés validés au niveau cocon).
   */
  isDiscoveryAllowed: ComputedRef<boolean>
}

export function useMoteurSoftGating(deps: MoteurSoftGatingDeps): MoteurSoftGatingApi {
  const { selectedArticle, articleProgressStore, keywordsStore } = deps

  function hasCheck(check: string): boolean {
    const id = selectedArticle.value?.id
    if (!id) return false
    return articleProgressStore.getProgress(id)?.completedChecks?.includes(check) ?? false
  }

  const isCaptaineLocked = computed(() => hasCheck('capitaine_locked'))
  const isLieutenantsLocked = computed(() => hasCheck('lieutenants_locked'))
  const isLexiqueValidated = computed(() => hasCheck('lexique_validated'))

  const finalisationChecksInput = computed(() => ({
    capitaineLocked: isCaptaineLocked.value,
    lieutenantsLocked: isLieutenantsLocked.value,
    lexiqueValidated: isLexiqueValidated.value,
  }))

  const finalisationUnlocked = computed(() => isFinalisationUnlocked(finalisationChecksInput.value))
  const finalisationButtonTitle = computed(() => buildFinalisationButtonTitle(finalisationChecksInput.value))

  const isDiscoveryAllowed = computed(() => {
    if (!selectedArticle.value) return true
    const articleKw = selectedArticle.value.keyword
    if (!articleKw) return true
    const kw = keywordsStore.keywords.find(
      k => k.keyword.toLowerCase() === articleKw.toLowerCase(),
    )
    return !kw || kw.status === 'suggested'
  })

  return {
    isCaptaineLocked,
    isLieutenantsLocked,
    isLexiqueValidated,
    finalisationUnlocked,
    finalisationButtonTitle,
    isDiscoveryAllowed,
  }
}
