import { ref, computed, type Ref, type ComputedRef } from 'vue'
import { apiPost } from '@/services/api.service'
import { log } from '@/utils/logger'
import type { useCostLogStore } from '@/stores/ui/cost-log.store'
import type { SerpAnalysisResult, SerpCompetitor, PaaQuestion } from '@shared/types/index.js'
import type { ArticleLevel } from '@shared/types/keyword-validate.types.js'
import type { HnRecurrenceItem } from '@shared/types/serp-analysis.types.js'

/**
 * Vague 3 — Composable extrait de LieutenantsSelection.
 *
 * Encapsule l'état et l'orchestration SERP multi-keyword (Phase 1) :
 * scrape DataForSEO, agrégation par mot-clé, calcul Hn recurrence, merge final.
 *
 * NOTE : `refreshSERP()` reste au parent car il doit aussi reset l'état IA
 * (lieutenantCards, eliminatedCards, etc.) qui vit dans `useLieutenantsIa`.
 * Le parent appelle `refreshSerpInternal()` (ce composable) + reset IA séparément.
 *
 * Dépendances explicites en paramètres → testable en isolation.
 */
export interface LieutenantsSerpDeps {
  captainKeyword: Ref<string | null>
  articleLevel: Ref<ArticleLevel | null>
  selectedArticleId: Ref<number | undefined>
  canAnalyze: Ref<boolean>
  resolvedRootKeywords: Ref<string[]>
  activityLog: ReturnType<typeof useCostLogStore>
}

export interface LieutenantsSerpApi {
  /** Slider valeur 1-N pour limiter `displayedCompetitors`. */
  sliderValue: Ref<number>
  /** True pendant l'analyse SERP en cours. */
  isLoading: Ref<boolean>
  /** Erreur SERP (string) ou null. */
  error: Ref<string | null>
  /** Résultat SERP final (merge multi-keyword). */
  serpResult: Ref<SerpAnalysisResult | null>
  /** Résultats par keyword analysé (Map keyword → SerpAnalysisResult). */
  serpResultsByKeyword: Ref<Map<string, SerpAnalysisResult>>
  /** Compteur "X / N" — déjà analysés. */
  serpDoneCount: Ref<number>
  /** Compteur "X / N" — total. */
  serpTotalCount: Ref<number>
  /** Liste des keywords en file d'attente (skeleton tabs). */
  serpPendingKeywords: Ref<string[]>
  /** Keyword actuellement en cours d'analyse (null si idle). */
  serpCurrentKeyword: Ref<string | null>
  /** Tab keyword actif pour les SerpCompetitor. */
  activeSerpTab: Ref<string>
  /** Résultat SERP correspondant au activeSerpTab. */
  activeSerpTabResult: ComputedRef<SerpAnalysisResult | null>
  /** Compétiteurs limités par sliderValue. */
  displayedCompetitors: ComputedRef<SerpCompetitor[]>
  /** Hn recurrence calculée à partir de displayedCompetitors. */
  hnRecurrence: ComputedRef<HnRecurrenceItem[]>
  /** Lance l'analyse SERP multi-keyword. */
  analyzeSERP: () => Promise<void>
  /** Reset interne (utilisé par parent dans refreshSERP). Ne touche PAS à l'état IA. */
  resetSerpState: () => void
  /** Helper : calcul Hn recurrence pour une liste de competitors arbitraire. */
  computeHnRecurrenceFrom: (comps: SerpCompetitor[]) => HnRecurrenceItem[]
}

export function useLieutenantsSerp(deps: LieutenantsSerpDeps): LieutenantsSerpApi {
  const { captainKeyword, articleLevel, selectedArticleId, canAnalyze, resolvedRootKeywords, activityLog } = deps

  const sliderValue = ref(10)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const serpResult = ref<SerpAnalysisResult | null>(null)
  const serpResultsByKeyword = ref<Map<string, SerpAnalysisResult>>(new Map())
  const serpDoneCount = ref(0)
  const serpTotalCount = ref(0)
  const serpPendingKeywords = ref<string[]>([])
  const serpCurrentKeyword = ref<string | null>(null)
  const activeSerpTab = ref<string>('')

  const activeSerpTabResult = computed(() => {
    if (!activeSerpTab.value) return null
    return serpResultsByKeyword.value.get(activeSerpTab.value) ?? null
  })

  const displayedCompetitors = computed(() => {
    if (!serpResult.value) return []
    return serpResult.value.competitors.slice(0, sliderValue.value)
  })

  /** Compute Hn recurrence from a list of competitors */
  function computeHnRecurrenceFrom(comps: SerpCompetitor[]): HnRecurrenceItem[] {
    const valid = comps.filter(c => !c.fetchError)
    const total = valid.length
    if (total === 0) return []

    const freqMap = new Map<string, { level: number; text: string; count: number }>()

    for (const comp of valid) {
      const seen = new Set<string>()
      for (const h of comp.headings) {
        const key = `${h.level}:${h.text.toLowerCase().trim()}`
        if (seen.has(key)) continue
        seen.add(key)

        const existing = freqMap.get(key)
        if (existing) {
          existing.count++
        } else {
          freqMap.set(key, { level: h.level, text: h.text, count: 1 })
        }
      }
    }

    return Array.from(freqMap.values())
      .map(item => ({ ...item, total, percent: Math.round(item.count / total * 100) }))
      .sort((a, b) => b.percent - a.percent || a.level - b.level)
  }

  const hnRecurrence = computed<HnRecurrenceItem[]>(() => {
    return computeHnRecurrenceFrom(displayedCompetitors.value)
  })

  /** Merge multiple SerpAnalysisResult — dedup competitors by URL, PAA by question */
  function mergeSerpResults(results: SerpAnalysisResult[]): SerpAnalysisResult {
    if (results.length === 1) return results[0]!

    const base = results[0]!
    const seenUrls = new Set<string>()
    const mergedCompetitors: SerpCompetitor[] = []
    const seenPaa = new Set<string>()
    const mergedPaa: PaaQuestion[] = []

    for (const r of results) {
      for (const c of r.competitors) {
        if (!seenUrls.has(c.url)) {
          seenUrls.add(c.url)
          mergedCompetitors.push(c)
        }
      }
      for (const p of r.paaQuestions) {
        const key = p.question.toLowerCase().trim()
        if (!seenPaa.has(key)) {
          seenPaa.add(key)
          mergedPaa.push(p)
        }
      }
    }

    return {
      ...base,
      competitors: mergedCompetitors,
      paaQuestions: mergedPaa,
      maxScraped: mergedCompetitors.length,
    }
  }

  async function analyzeSERP(): Promise<void> {
    if (!captainKeyword.value || !canAnalyze.value) return

    isLoading.value = true
    error.value = null
    serpResultsByKeyword.value = new Map()

    // Build list of keywords: captain + root keywords (deduped)
    const allKeywords = [captainKeyword.value]
    const captainLower = captainKeyword.value.toLowerCase().trim()
    for (const rk of resolvedRootKeywords.value) {
      if (rk.toLowerCase().trim() !== captainLower && !allKeywords.includes(rk)) {
        allKeywords.push(rk)
      }
    }

    serpTotalCount.value = allKeywords.length
    serpDoneCount.value = 0
    log.info(`[useLieutenantsSerp] Multi-SERP analysis: ${allKeywords.length} keywords`, allKeywords)

    activityLog.addMessage(
      'info',
      `Analyse SERP lancée (${allKeywords.length} mot${allKeywords.length > 1 ? 's' : ''}-clé${allKeywords.length > 1 ? 's' : ''})`,
      `Scraping ~${allKeywords.length * 10} URLs via DataForSEO. Cela peut prendre quelques secondes.`,
    )

    try {
      const results: SerpAnalysisResult[] = []
      // Sprint 4.1 — Publish the full queue upfront so the UI can show skeleton
      // tabs for pending keywords (not just the one currently running).
      serpPendingKeywords.value = [...allKeywords]

      // Analyze each keyword sequentially for visible progress
      for (const kw of allKeywords) {
        serpCurrentKeyword.value = kw
        const result = await apiPost<SerpAnalysisResult>('/serp/analyze', {
          keyword: kw,
          topN: 10,
          articleLevel: articleLevel.value ?? 'intermediaire',
          articleId: selectedArticleId.value ?? undefined,
        })
        results.push(result)
        serpResultsByKeyword.value = new Map(serpResultsByKeyword.value).set(kw, result)
        serpDoneCount.value++
        serpPendingKeywords.value = serpPendingKeywords.value.filter(k => k !== kw)
        log.info(`[useLieutenantsSerp] SERP ${serpDoneCount.value}/${allKeywords.length}: "${kw}" → ${result.competitors.length} comp, ${result.paaQuestions.length} PAA`)
      }
      serpCurrentKeyword.value = null

      const merged = mergeSerpResults(results)
      serpResult.value = merged
      log.info(`[useLieutenantsSerp] Multi-SERP merged: ${merged.competitors.length} competitors, ${merged.paaQuestions.length} PAA`)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Erreur inconnue'
      log.error(`[useLieutenantsSerp] SERP analysis failed`, { error: error.value })
    } finally {
      isLoading.value = false
    }
  }

  function resetSerpState(): void {
    serpResult.value = null
    serpResultsByKeyword.value = new Map()
    error.value = null
    sliderValue.value = 10
    serpDoneCount.value = 0
    serpTotalCount.value = 0
    activeSerpTab.value = ''
  }

  return {
    sliderValue,
    isLoading,
    error,
    serpResult,
    serpResultsByKeyword,
    serpDoneCount,
    serpTotalCount,
    serpPendingKeywords,
    serpCurrentKeyword,
    activeSerpTab,
    activeSerpTabResult,
    displayedCompetitors,
    hnRecurrence,
    analyzeSERP,
    resetSerpState,
    computeHnRecurrenceFrom,
  }
}
