import { ref, computed } from 'vue'
import { apiPost } from '@/services/api.service'
import { extractRoots } from '@/composables/useCapitaineValidation'
import { log } from '@/utils/logger'
import { computeCombinedScore } from '@shared/scoring.js'
import { getThresholds, scoreKpi, computeVerdict } from '@shared/kpi-scoring.js'
import type { ValidateResponse, ArticleLevel, VerdictLevel } from '@shared/types/index.js'
import type { CaptainValidationEntry, RichRootKeyword } from '@shared/types/keyword.types.js'
import type { RadarCard, RadarPaaItem, KeywordRootVariant } from '@shared/types/intent.types.js'

export interface CarouselEntry {
  card: RadarCard
  originalCard: RadarCard
  validation: ValidateResponse | null
  isLoading: boolean
  error: string | null
  rootVariants: Map<string, KeywordRootVariant>
  isLoadingRoots: boolean
  activeWordCount: number
  failedRoots: string[]
}

/** Convert a ValidateResponse into a fully hydrated RadarCard */
export function hydrateCardFromValidation(keyword: string, response: ValidateResponse): RadarCard {
  const kpiMap = Object.fromEntries(response.kpis.map(k => [k.name, k]))

  const paaItems: RadarPaaItem[] = (response.paaQuestions || []).map(p => ({
    question: p.question,
    answer: p.answer ?? undefined,
    depth: 0,
    match: p.match || 'none',
    matchQuality: p.matchQuality,
  }))

  const scoreBreakdown = computeCombinedScore({
    searchVolume: kpiMap.volume?.rawValue ?? 0,
    difficulty: kpiMap.kd?.rawValue ?? 0,
    cpc: kpiMap.cpc?.rawValue ?? 0,
    paaWeightedScore: kpiMap.paa?.rawValue ?? 0,
    autocompleteMatchCount: kpiMap.autocomplete?.rawValue ?? 0,
  })

  return {
    keyword,
    kpis: {
      searchVolume: kpiMap.volume?.rawValue ?? 0,
      difficulty: kpiMap.kd?.rawValue ?? 0,
      cpc: kpiMap.cpc?.rawValue ?? 0,
      competition: 0,
      paaWeightedScore: kpiMap.paa?.rawValue ?? 0,
      autocompleteMatchCount: kpiMap.autocomplete?.rawValue ?? 0,
      paaTotal: paaItems.length,
      paaMatchCount: paaItems.filter(p => p.match !== 'none').length,
      intentTypes: [],
      intentProbability: null,
      avgSemanticScore: null,
    },
    paaItems,
    combinedScore: scoreBreakdown.total,
    scoreBreakdown,
    reasoning: '',
    cachedPaa: false,
  }
}

function createEntry(card: RadarCard): CarouselEntry {
  return {
    card,
    originalCard: card,
    validation: null,
    isLoading: true,
    error: null,
    rootVariants: new Map(),
    isLoadingRoots: false,
    activeWordCount: card.keyword.trim().split(/\s+/).length,
    failedRoots: [],
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

  /** Validate root variants for a long-tail keyword with weak volume (best-effort, capped at 5) */
  async function validateRoots(
    keyword: string,
    response: ValidateResponse,
    entryIndex: number,
    level: ArticleLevel,
    articleTitle: string | undefined,
    thisVersion: number,
  ) {
    const roots = extractRoots(keyword).slice(0, 5)
    if (roots.length === 0 || response.kpis.find(k => k.name === 'volume')?.color === 'green') return

    patch(entryIndex, { isLoadingRoots: true })
    const variants = new Map<string, KeywordRootVariant>()
    const failed: string[] = []
    await Promise.allSettled(
      roots.map(async (rootKw) => {
        try {
          const rootResponse = await apiPost<ValidateResponse>(
            `/keywords/${encodeURIComponent(rootKw)}/validate`,
            { level, articleTitle },
          )
          if (thisVersion !== loadVersion) return
          const rootCard = hydrateCardFromValidation(rootKw, rootResponse)
          variants.set(rootKw, { keyword: rootKw, card: rootCard, validation: rootResponse })
        } catch {
          failed.push(rootKw)
        }
      }),
    )
    if (thisVersion === loadVersion) {
      patch(entryIndex, { rootVariants: variants, isLoadingRoots: false, failedRoots: failed })
    }
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
            { level, articleTitle },
          )
          if (thisVersion !== loadVersion) return
          patch(i, { validation: response, originalCard: card, isLoading: false })

          log.debug('[useRadarCarousel] Validated', { keyword: card.keyword, verdict: response.verdict.level })

          await validateRoots(card.keyword, response, i, level, articleTitle, thisVersion)
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

  function effectiveVerdict(entry: CarouselEntry): VerdictLevel | null {
    if (!entry.validation) return null
    return entry.validation.verdict.level
  }

  /** Add a single keyword as a new carousel entry and validate it */
  async function addEntry(keyword: string, level: ArticleLevel, articleTitle?: string) {
    const thisVersion = ++loadVersion
    // Build a minimal RadarCard for a manually-entered keyword
    const card: RadarCard = {
      keyword,
      combinedScore: 0,
      scoreBreakdown: { paaMatchScore: 0, resonanceBonus: 0, opportunityScore: 0, intentValueScore: 0, cpcScore: 0, total: 0 },
      kpis: { searchVolume: 0, difficulty: 0, cpc: 0, competition: 0, paaTotal: 0, paaMatchCount: 0, paaWeightedScore: 0, intentTypes: [], intentProbability: null, autocompleteMatchCount: 0, avgSemanticScore: null },
      paaItems: [],
      reasoning: '',
      cachedPaa: false,
    }
    const newEntry = createEntry(card)
    entries.value = [...entries.value, newEntry]
    const entryIndex = entries.value.length - 1
    currentIndex.value = entryIndex

    // Validate
    try {
      const response = await apiPost<ValidateResponse>(
        `/keywords/${encodeURIComponent(keyword)}/validate`,
        { level, articleTitle },
      )
      if (thisVersion !== loadVersion) return
      const hydratedCard = hydrateCardFromValidation(keyword, response)
      patch(entryIndex, { card: hydratedCard, originalCard: hydratedCard, validation: response, isLoading: false })
      log.debug('[useRadarCarousel] addEntry validated', { keyword, verdict: response.verdict.level })

      await validateRoots(keyword, response, entryIndex, level, articleTitle, thisVersion)
    } catch (err) {
      if (thisVersion !== loadVersion) return
      patch(entryIndex, { error: (err as Error).message, isLoading: false })
      log.warn('[useRadarCarousel] addEntry failed', { keyword, error: (err as Error).message })
    }
  }

  /** Restore carousel entries from persisted validation history (no API calls) */
  function restoreFromHistory(
    history: CaptainValidationEntry[],
    level: ArticleLevel,
    richRootKeywords?: RichRootKeyword[],
  ) {
    ++loadVersion
    const config = getThresholds(level)

    entries.value = history.map(h => {
      const kpis = h.kpis.map(s => scoreKpi(s.name, s.rawValue, config))
      const verdict = computeVerdict(kpis)

      const response: ValidateResponse = {
        keyword: h.keyword,
        articleLevel: h.articleLevel,
        kpis,
        verdict,
        fromCache: true,
        cachedAt: null,
        paaQuestions: h.paaQuestions,
      }
      const card = hydrateCardFromValidation(h.keyword, response)

      // Restore root variants if available
      const rootVariants = new Map<string, KeywordRootVariant>()
      const rootsForKeyword = richRootKeywords?.filter(r => r.parentKeyword === h.keyword) ?? []
      for (const root of rootsForKeyword) {
        const rootKpis = root.kpis.map(s => scoreKpi(s.name, s.rawValue, config))
        const rootVerdict = computeVerdict(rootKpis)
        const rootResponse: ValidateResponse = {
          keyword: root.keyword,
          articleLevel: root.articleLevel,
          kpis: rootKpis,
          verdict: rootVerdict,
          fromCache: true,
          cachedAt: null,
        }
        const rootCard = hydrateCardFromValidation(root.keyword, rootResponse)
        rootVariants.set(root.keyword, { keyword: root.keyword, card: rootCard, validation: rootResponse })
      }

      return {
        card,
        originalCard: card,
        validation: response,
        isLoading: false,
        error: null,
        rootVariants,
        isLoadingRoots: false,
        activeWordCount: h.keyword.trim().split(/\s+/).length,
        failedRoots: [],
      } satisfies CarouselEntry
    })

    currentIndex.value = 0
    log.debug('[useRadarCarousel] Restored from history', { count: history.length })
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
    restoreFromHistory,
    next,
    prev,
    goTo,
    effectiveVerdict,
    reset,
  }
}
