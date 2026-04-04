import { ref, computed } from 'vue'
import { apiPost } from '@/services/api.service'
import { extractRoot } from '@/composables/useCapitaineValidation'
import { log } from '@/utils/logger'
import type { ValidateResponse, ArticleLevel, VerdictLevel } from '@shared/types/index.js'
import type { RadarCard } from '@shared/types/intent.types.js'

export interface CarouselEntry {
  card: RadarCard
  validation: ValidateResponse | null
  isLoading: boolean
  error: string | null
  forceGo: boolean
  rootResult: ValidateResponse | null
  isLoadingRoot: boolean
}

function createEntry(card: RadarCard): CarouselEntry {
  return {
    card,
    validation: null,
    isLoading: true,
    error: null,
    forceGo: false,
    rootResult: null,
    isLoadingRoot: false,
  }
}

export function useRadarCarousel() {
  const entries = ref<CarouselEntry[]>([])
  const currentIndex = ref(0)
  let loadVersion = 0

  const isActive = computed(() => entries.value.length > 0)
  const count = computed(() => entries.value.length)
  const currentEntry = computed(() => entries.value[currentIndex.value] ?? null)

  function patch(i: number, updates: Partial<CarouselEntry>) {
    const current = entries.value[i]
    if (!current) return
    entries.value[i] = { ...current, ...updates }
  }

  async function loadCards(cards: RadarCard[], level: ArticleLevel, articleTitle?: string) {
    const thisVersion = ++loadVersion
    entries.value = cards.map(createEntry)
    currentIndex.value = 0

    await Promise.allSettled(
      cards.map(async (card, i) => {
        try {
          const response = await apiPost<ValidateResponse>(
            `/keywords/${encodeURIComponent(card.keyword)}/validate`,
            { level },
          )
          if (thisVersion !== loadVersion) return
          patch(i, { validation: response, isLoading: false })

          log.debug('[useRadarCarousel] Validated', { keyword: card.keyword, verdict: response.verdict.level })

          // Auto root analysis for long-tail keywords with weak volume
          const root = extractRoot(card.keyword)
          if (root && response.kpis.find(k => k.name === 'volume')?.color !== 'green') {
            patch(i, { isLoadingRoot: true })
            try {
              const rootResponse = await apiPost<ValidateResponse>(
                `/keywords/${encodeURIComponent(root)}/validate`,
                { level },
              )
              if (thisVersion !== loadVersion) return
              patch(i, { rootResult: rootResponse, isLoadingRoot: false })
            } catch {
              if (thisVersion === loadVersion) patch(i, { isLoadingRoot: false })
            }
          }
        } catch (err) {
          if (thisVersion !== loadVersion) return
          patch(i, { error: (err as Error).message, isLoading: false })
          log.warn('[useRadarCarousel] Validation failed', { keyword: card.keyword, error: (err as Error).message })
        }
      }),
    )
  }

  function next() {
    if (currentIndex.value < entries.value.length - 1) {
      currentIndex.value++
    }
  }

  function prev() {
    if (currentIndex.value > 0) {
      currentIndex.value--
    }
  }

  function goTo(index: number) {
    if (index >= 0 && index < entries.value.length) {
      currentIndex.value = index
    }
  }

  function toggleForceGo(index?: number) {
    const idx = index ?? currentIndex.value
    const entry = entries.value[idx]
    if (entry) {
      entries.value[idx] = { ...entry, forceGo: !entry.forceGo }
    }
  }

  function effectiveVerdict(entry: CarouselEntry): VerdictLevel | null {
    if (!entry.validation) return null
    if (entry.forceGo) return 'GO'
    return entry.validation.verdict.level
  }

  /** Add a single keyword as a new carousel entry and validate it */
  async function addEntry(keyword: string, level: ArticleLevel, articleTitle?: string) {
    // Build a minimal RadarCard for a manually-entered keyword
    const card: RadarCard = {
      keyword,
      combinedScore: 0,
      scoreBreakdown: { paaMatchScore: 0, resonanceBonus: 0, opportunityScore: 0, intentValueScore: 0, cpcScore: 0, total: 0 },
      kpis: { searchVolume: 0, difficulty: 0, cpc: 0, competition: 0, paaTotal: 0, paaMatchCount: 0, intentTypes: [], intentProbability: null, autocompleteMatchCount: 0, avgSemanticScore: null },
      paaItems: [],
      reasoning: '',
      cachedPaa: false,
    }
    const newEntry = createEntry(card)
    entries.value = [...entries.value, newEntry]
    const newIndex = entries.value.length - 1
    currentIndex.value = newIndex

    // Validate
    try {
      const response = await apiPost<ValidateResponse>(
        `/keywords/${encodeURIComponent(keyword)}/validate`,
        { level },
      )
      patch(newIndex, { validation: response, isLoading: false })
      log.debug('[useRadarCarousel] addEntry validated', { keyword, verdict: response.verdict.level })

      // Auto root analysis for long-tail
      const root = extractRoot(keyword)
      if (root && response.kpis.find(k => k.name === 'volume')?.color !== 'green') {
        patch(newIndex, { isLoadingRoot: true })
        try {
          const rootResponse = await apiPost<ValidateResponse>(
            `/keywords/${encodeURIComponent(root)}/validate`,
            { level },
          )
          patch(newIndex, { rootResult: rootResponse, isLoadingRoot: false })
        } catch {
          patch(newIndex, { isLoadingRoot: false })
        }
      }
    } catch (err) {
      patch(newIndex, { error: (err as Error).message, isLoading: false })
      log.warn('[useRadarCarousel] addEntry failed', { keyword, error: (err as Error).message })
    }
  }

  function reset() {
    loadVersion++
    entries.value = []
    currentIndex.value = 0
  }

  return {
    entries,
    currentIndex,
    currentEntry,
    isActive,
    count,
    loadCards,
    addEntry,
    next,
    prev,
    goTo,
    toggleForceGo,
    effectiveVerdict,
    reset,
  }
}
