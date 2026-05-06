import { ref, computed, type Ref, type ComputedRef } from 'vue'
import { apiPut } from '@/services/api.service'
import { hnToOutline } from '@/stores/article/outline.store'
import { log } from '@/utils/logger'
import type { useArticleKeywordsStore } from '@/stores/article/article-keywords.store'
import type { SelectedArticle, SerpAnalysisResult, SerpCompetitor } from '@shared/types/index.js'
import type { ProposeLieutenantsHnNode, HnRecurrenceItem } from '@shared/types/serp-analysis.types.js'

/**
 * Vague 3 — Composable extrait de LieutenantsPanel.
 *
 * Encapsule la gestion de la Structure Hn :
 *  - tab actif sur les concurrents Hn (`__all__` ou par keyword)
 *  - calcul de `activeHnRecurrence` (depuis le composable SERP)
 *  - persistance via PUT articles/{id}.outline.
 *
 * Dépendances explicites en paramètres → testable en isolation.
 *
 * NOTE : `hnStructure` est partagé avec `useLieutenantsIa` qui le mute via
 * `proposeLieutenants.onDone`. Ce composable le LIT pour `saveHnStructure`.
 */
export interface LieutenantsHnDeps {
  selectedArticle: Ref<SelectedArticle | null>
  serpResultsByKeyword: Ref<Map<string, SerpAnalysisResult>>
  hnRecurrence: Ref<HnRecurrenceItem[]>
  hnStructure: Ref<ProposeLieutenantsHnNode[]>
  articleKeywordsStore: ReturnType<typeof useArticleKeywordsStore>
  computeHnRecurrenceFrom: (comps: SerpCompetitor[]) => HnRecurrenceItem[]
}

export interface LieutenantsHnApi {
  /** Tab keyword actif pour la Hn ('__all__' = vue mergée). */
  activeHnTab: Ref<string>
  /** Hn recurrence pour le tab actif. */
  activeHnRecurrence: ComputedRef<HnRecurrenceItem[]>
  /** True pendant la sauvegarde Hn. */
  isSavingHn: Ref<boolean>
  /** Flash message "saved" (true 2s puis revient à false). */
  hnSaved: Ref<boolean>
  /** Persiste la structure Hn dans articles/{id}.outline. */
  saveHnStructure: () => Promise<void>
  /** Reset de l'état Hn (utilisé au switch d'article). */
  resetHnState: () => void
}

export function useLieutenantsHn(deps: LieutenantsHnDeps): LieutenantsHnApi {
  const { selectedArticle, serpResultsByKeyword, hnRecurrence, hnStructure, articleKeywordsStore, computeHnRecurrenceFrom } = deps

  const activeHnTab = ref<string>('__all__')

  const activeHnRecurrence = computed<HnRecurrenceItem[]>(() => {
    if (activeHnTab.value === '__all__') return hnRecurrence.value
    const result = serpResultsByKeyword.value.get(activeHnTab.value)
    if (!result) return []
    return computeHnRecurrenceFrom(result.competitors)
  })

  const hnSaved = ref(false)
  const isSavingHn = ref(false)

  async function saveHnStructure(): Promise<void> {
    const id = selectedArticle.value?.id
    const title = selectedArticle.value?.title
    if (!id || !title || !articleKeywordsStore.keywords || hnStructure.value.length === 0) return

    isSavingHn.value = true
    // Save outline directly to articles/{id}.json (single source of truth)
    const outline = hnToOutline(hnStructure.value, title)
    await apiPut(`/articles/${id}`, { outline })
    // Also keep hnStructure in keywords for backward compat
    articleKeywordsStore.keywords.hnStructure = hnStructure.value
    await articleKeywordsStore.saveDecisions(id)
    hnSaved.value = true
    isSavingHn.value = false
    setTimeout(() => { hnSaved.value = false }, 2000)
    log.info('[useLieutenantsHn] Outline saved from HN structure', { sections: outline.sections.length })
  }

  function resetHnState(): void {
    activeHnTab.value = '__all__'
    hnSaved.value = false
    isSavingHn.value = false
  }

  return {
    activeHnTab,
    activeHnRecurrence,
    isSavingHn,
    hnSaved,
    saveHnStructure,
    resetHnState,
  }
}
