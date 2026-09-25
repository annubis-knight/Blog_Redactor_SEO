/**
 * AUTHORITY: refs hydratées par `useArticleResults` depuis
 *            GET /articles/:id/explorations (local.capitaine.comparison)
 *            et GET /articles/:id/external-cache (autocomplete).
 * READS FROM: useArticleResults (mutation directe `intentStore.comparisonData = …`)
 * WRITES TO:  rien — le store n'appelle plus `/intent/analyze` ni `/keywords/compare-local`
 *             ni `/keywords/autocomplete` (routes supprimées avec Labo/Explorateur).
 *             Plus de `intentData` (M3, épopée qualité SEO) : il relisait
 *             `keyword_intent_analyses`, table sans producteur, et personne ne le lisait.
 * CONSUMERS: KeywordAuditTable.vue (lit `localComparisons` pour le switcher local —
 *            inactif tant qu'aucune source ne réalimente la Map).
 * RELATED FR: NFR-INT-API-WRAPPER (refs hydratées via apiGet split endpoints)
 */
import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { LocalNationalComparison, AutocompleteResult } from '@shared/types/index.js'

export const useIntentStore = defineStore('intent', () => {
  const comparisonData = ref<LocalNationalComparison | null>(null)
  const autocompleteData = ref<AutocompleteResult | null>(null)
  const localComparisons = ref(new Map<string, LocalNationalComparison>())

  function reset() {
    comparisonData.value = null
    autocompleteData.value = null
    localComparisons.value = new Map()
  }

  return {
    comparisonData, autocompleteData, localComparisons, reset,
  }
})
