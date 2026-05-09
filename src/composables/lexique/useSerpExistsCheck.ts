/**
 * AUTHORITY: PostgreSQL `keyword_serp_scrapes` (lecture seule via endpoint
 *            pré-check léger).
 * READS FROM: GET /api/keywords/:keyword/serp/exists.
 * WRITES TO: rien.
 * CONSUMERS: LexiquePanel.vue (mount → décide CTA "Lancer l'analyse SERP" vs
 *            "Extraire le Lexique" pour éliminer la trace 404 console au mount
 *            quand le keyword n'a pas encore été scrapé).
 * RELATED FR: FR-LEX-PRECHECK-SERP (AC.LEX-PRECHECK.3..5).
 */
import { ref, watch, type Ref } from 'vue'
import { apiGet } from '@/services/api.service'
import { log } from '@/utils/logger'

interface SerpExistsResponse {
  exists: boolean
  scrapedAt: string | null
}

export function useSerpExistsCheck(keyword: Ref<string | null>) {
  // null = pas encore checké (état initial avant premier fetch)
  const exists = ref<boolean | null>(null)
  const scrapedAt = ref<string | null>(null)
  const isChecking = ref(false)
  const error = ref<string | null>(null)

  async function refetch(): Promise<void> {
    const kw = keyword.value?.trim()
    if (!kw) {
      // Pas de fetch : keyword non renseigné. Reset les valeurs au cas où.
      exists.value = null
      scrapedAt.value = null
      return
    }
    isChecking.value = true
    error.value = null
    try {
      const res = await apiGet<SerpExistsResponse>(
        `/keywords/${encodeURIComponent(kw)}/serp/exists`,
      )
      exists.value = res.exists
      scrapedAt.value = res.scrapedAt
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Erreur inconnue'
      log.warn(`[useSerpExistsCheck] check failed for "${kw}"`, { error: error.value })
    } finally {
      isChecking.value = false
    }
  }

  watch(keyword, () => {
    void refetch()
  }, { immediate: true })

  return { exists, scrapedAt, isChecking, error, refetch }
}
