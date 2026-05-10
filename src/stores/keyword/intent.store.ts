/**
 * AUTHORITY: refs hydratées par `useArticleResults` depuis
 *            GET /articles/:id/explorations (intent.capitaine + local.capitaine.comparison)
 *            et GET /articles/:id/external-cache (autocomplete).
 * READS FROM: useArticleResults (mutation directe `intentStore.intentData = …`)
 * WRITES TO:  rien — le store n'appelle plus `/intent/analyze` ni `/keywords/compare-local`
 *             ni `/keywords/autocomplete` (routes supprimées avec Labo/Explorateur).
 * CONSUMERS: KeywordAuditTable.vue (lit `localComparisons` pour le switcher local —
 *            inactif tant qu'aucune source ne réalimente la Map).
 * RELATED FR: NFR-INT-API-WRAPPER (refs hydratées via apiGet split endpoints)
 */
import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { IntentAnalysis, LocalNationalComparison, AutocompleteResult } from '@shared/types/index.js'

export const useIntentStore = defineStore('intent', () => {
  const intentData = ref<IntentAnalysis | null>(null)
  const comparisonData = ref<LocalNationalComparison | null>(null)
  const autocompleteData = ref<AutocompleteResult | null>(null)
  const localComparisons = ref(new Map<string, LocalNationalComparison>())

  function reset() {
    intentData.value = null
    comparisonData.value = null
    autocompleteData.value = null
    localComparisons.value = new Map()
  }

  return {
    intentData, comparisonData, autocompleteData, localComparisons, reset,
  }
})
