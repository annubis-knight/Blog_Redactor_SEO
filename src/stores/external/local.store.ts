/**
 * AUTHORITY: ref `mapsData` hydratée par `useArticleResults` depuis
 *            GET /articles/:id/explorations (local.capitaine).
 * READS FROM: useArticleResults (mutation directe `localStore.mapsData = …`)
 * WRITES TO:  rien — le store n'appelle plus `/local/maps` (route supprimée
 *             avec l'onglet Explorateur).
 * CONSUMERS: aucun composant Vue actif — `mapsData` reste exposé pour
 *            cohérence avec `useArticleResults` qui l'écrit lors de l'hydratation.
 * RELATED FR: NFR-INT-API-WRAPPER
 */
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { MapsResult } from '@shared/types/index.js'

export const useLocalStore = defineStore('local', () => {
  const mapsData = ref<MapsResult | null>(null)

  const hasLocalPack = computed(() => mapsData.value?.hasLocalPack ?? false)
  const reviewGap = computed(() => mapsData.value?.reviewGap ?? null)

  function reset() {
    mapsData.value = null
  }

  return {
    mapsData, hasLocalPack, reviewGap, reset,
  }
})
