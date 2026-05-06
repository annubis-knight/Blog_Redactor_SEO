import { ref, computed } from 'vue'
import { apiPost } from '@/services/api.service'
import { extractRoots } from '@/composables/keyword/useCapitaineScan'
import { log } from '@/utils/logger'
import { computeCombinedScore } from '@shared/scoring.js'
import { getThresholds, scoreKpi, computeVerdict } from '@shared/kpi-scoring.js'
import type { ScanResponse, ArticleLevel, VerdictLevel } from '@shared/types/index.js'
import type { CaptainScanEntry, RichRootKeyword } from '@shared/types/keyword.types.js'
import type { RadarCard, RadarPaaItem, KeywordRootVariant } from '@shared/types/intent.types.js'

export interface ExploredKeywordEntry {
  card: RadarCard
  originalCard: RadarCard
  validation: ScanResponse | null
  isLoading: boolean
  error: string | null
  rootVariants: Map<string, KeywordRootVariant>
  isLoadingRoots: boolean
  /** F4 — indices des mots actifs dans `originalCard.keyword.split(/\s+/)`. Ordre croissant. */
  activeWordIndices: number[]
  failedRoots: string[]
  /** Combinaisons en cours de validation async (user-triggered via word-toggle). */
  pendingVariants: Set<string>
}

/**
 * Convert a ScanResponse into a fully hydrated RadarCard.
 *
 * 2026-05-02 — Propage `marketScore` et `relevanceScore` du backend vers la
 * card. Avant ce fix, ces deux scores étaient perdus, forçant l'UI Capitaine
 * à fallback sur `combinedScore` (legacy hybride) et brisant la séparation
 * KPI / Pertinence documentée dans docs/scoring-kpi-vs-relevance.md.
 */
export function hydrateCardFromValidation(keyword: string, response: ScanResponse): RadarCard {
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

  const out: RadarCard = {
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
    // 2026-05-02 — Scores backend propagés. Onglet Radar consomme `marketScore`,
    // onglet Capitaine consomme `relevanceScore`. Voir scoring-kpi-vs-relevance.md.
    marketScore: response.marketScore,
    relevanceScore: response.relevanceScore ?? null,
  }

  // Log debug pour traçabilité du flux de scoring (à retirer si bruyant en prod).
  log.debug('[hydrateCardFromValidation]', {
    keyword,
    hasMarket: !!response.marketScore,
    hasRelevance: !!response.relevanceScore,
    relevanceTotal: response.relevanceScore?.total ?? 'n/a',
  })

  return out
}

function createEntry(card: RadarCard): ExploredKeywordEntry {
  const wordCount = card.keyword.trim().split(/\s+/).length
  return {
    card,
    originalCard: card,
    validation: null,
    isLoading: true,
    error: null,
    rootVariants: new Map(),
    isLoadingRoots: false,
    activeWordIndices: Array.from({ length: wordCount }, (_, i) => i),
    failedRoots: [],
    pendingVariants: new Set(),
  }
}

export function useExploredKeywords() {
  const entries = ref<ExploredKeywordEntry[]>([])
  const currentIndex = ref(0)
  let loadVersion = 0

  const isActive = computed(() => entries.value.length > 0)
  const count = computed(() => entries.value.length)
  const currentEntry = computed(() => entries.value[currentIndex.value] ?? null)

  function patch(i: number, updates: Partial<ExploredKeywordEntry>) {
    const current = entries.value[i]
    if (!current) return
    entries.value[i] = { ...current, ...updates }
  }

  /** Validate root variants for a long-tail keyword with weak volume (best-effort, capped at 5) */
  async function validateRoots(
    keyword: string,
    response: ScanResponse,
    entryIndex: number,
    level: ArticleLevel,
    articleTitle: string | undefined,
    thisVersion: number,
    articleId?: number,
    painPoint?: string,
  ) {
    const roots = extractRoots(keyword).slice(0, 5)
    const volumeColor = response.kpis.find(k => k.name === 'volume')?.color
    log.debug('[useExploredKeywords] validateRoots — évaluation', {
      keyword,
      roots,
      volumeColor,
      willValidate: roots.length > 0 && volumeColor !== 'green',
    })
    if (roots.length === 0 || volumeColor === 'green') return

    patch(entryIndex, { isLoadingRoots: true })
    const variants = new Map<string, KeywordRootVariant>()
    const failed: string[] = []
    await Promise.allSettled(
      roots.map(async (rootKw) => {
        try {
          const rootResponse = await apiPost<ScanResponse>(
            `/keywords/${encodeURIComponent(rootKw)}/scan`,
            { level, articleTitle, ...(articleId ? { articleId } : {}), ...(painPoint ? { painPoint } : {}) },
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

  async function loadCards(cards: RadarCard[], level: ArticleLevel, articleTitle?: string, articleId?: number, painPoint?: string) {
    const thisVersion = ++loadVersion
    // Sprint 17 (Bug B) — Dédup les cards d'entrée par keyword (case-insensitive).
    // Conserve la première occurrence rencontrée. Sans cette dédup, un Radar
    // qui retourne 2 fois le même mot-clé créerait 2 entries identiques.
    const dedupedCards = Array.from(
      new Map(cards.map(c => [c.keyword.trim().toLowerCase(), c])).values(),
    )
    if (dedupedCards.length !== cards.length) {
      log.warn('[useExploredKeywords] loadCards — duplicates filtered', {
        before: cards.length,
        after: dedupedCards.length,
      })
    }
    log.debug('[useExploredKeywords] loadCards — démarrage', {
      count: dedupedCards.length,
      keywords: dedupedCards.map(c => c.keyword),
      level,
      articleId,
      hasPainPoint: !!painPoint,
    })
    entries.value = dedupedCards.map(createEntry)
    currentIndex.value = 0

    await Promise.allSettled(
      dedupedCards.map(async (card, i) => {
        try {
          const response = await apiPost<ScanResponse>(
            `/keywords/${encodeURIComponent(card.keyword)}/scan`,
            { level, articleTitle, ...(articleId ? { articleId } : {}), ...(painPoint ? { painPoint } : {}) },
          )
          if (thisVersion !== loadVersion) return
          patch(i, { validation: response, originalCard: card, isLoading: false })

          log.debug('[useExploredKeywords] Validated', { keyword: card.keyword, verdict: response.verdict.level })

          await validateRoots(card.keyword, response, i, level, articleTitle, thisVersion, articleId, painPoint)
        } catch (err) {
          if (thisVersion !== loadVersion) return
          patch(i, { error: (err as Error).message, isLoading: false })
          log.warn('[useExploredKeywords] Validation failed', { keyword: card.keyword, error: (err as Error).message })
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

  function effectiveVerdict(entry: ExploredKeywordEntry): VerdictLevel | null {
    if (!entry.validation) return null
    return entry.validation.verdict.level
  }

  /** Add a single keyword as a new carousel entry and validate it.
   *
   * Sprint 17 (Bug B) — Déduplication par originalCard.keyword. Si le mot-clé
   * existe déjà dans `entries` (même casse normalisée), on ne crée pas une
   * nouvelle entrée : on pointe `currentIndex` sur l'entry existante et on
   * relance la validation pour rafraîchir les scores. Avant ce fix, locker /
   * déverrouiller un mot-clé dupliquait la card via le watcher
   * `keywords.capitaine` qui appelait `addEntry` sans vérifier l'existence.
   */
  async function addEntry(keyword: string, level: ArticleLevel, articleTitle?: string, articleId?: number, painPoint?: string) {
    const thisVersion = ++loadVersion
    const normalizedKeyword = keyword.trim().toLowerCase()

    // Sprint 17 — dédup : si une entry existe déjà pour ce keyword, la réutiliser.
    const existingIndex = entries.value.findIndex(
      e => e.originalCard.keyword.trim().toLowerCase() === normalizedKeyword,
    )
    if (existingIndex !== -1) {
      log.debug('[useExploredKeywords] addEntry — entry existante, refresh in-place', {
        keyword,
        existingIndex,
      })
      currentIndex.value = existingIndex
      // Re-scan pour rafraîchir les scores (le caller s'attend à une validation fraîche).
      try {
        const response = await apiPost<ScanResponse>(
          `/keywords/${encodeURIComponent(keyword)}/scan`,
          { level, articleTitle, ...(articleId ? { articleId } : {}), ...(painPoint ? { painPoint } : {}) },
        )
        if (thisVersion !== loadVersion) return
        const hydratedCard = hydrateCardFromValidation(keyword, response)
        patch(existingIndex, { card: hydratedCard, originalCard: hydratedCard, validation: response, isLoading: false })
      } catch (err) {
        if (thisVersion !== loadVersion) return
        log.warn('[useExploredKeywords] addEntry refresh failed', { keyword, error: (err as Error).message })
      }
      return
    }

    // Build a minimal RadarCard for a manually-entered keyword
    const card: RadarCard = {
      keyword,
      combinedScore: 0,
      scoreBreakdown: { paaMatchScore: 0, resonanceBonus: 0, opportunityScore: 0, intentValueScore: 0, cpcScore: 0, painAlignmentScore: 0, total: 0 },
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
      const response = await apiPost<ScanResponse>(
        `/keywords/${encodeURIComponent(keyword)}/scan`,
        { level, articleTitle, ...(articleId ? { articleId } : {}), ...(painPoint ? { painPoint } : {}) },
      )
      if (thisVersion !== loadVersion) return
      const hydratedCard = hydrateCardFromValidation(keyword, response)
      patch(entryIndex, { card: hydratedCard, originalCard: hydratedCard, validation: response, isLoading: false })
      log.debug('[useExploredKeywords] addEntry validated', { keyword, verdict: response.verdict.level })

      await validateRoots(keyword, response, entryIndex, level, articleTitle, thisVersion, articleId, painPoint)
    } catch (err) {
      if (thisVersion !== loadVersion) return
      patch(entryIndex, { error: (err as Error).message, isLoading: false })
      log.warn('[useExploredKeywords] addEntry failed', { keyword, error: (err as Error).message })
    }
  }

  /**
   * Validate an arbitrary sub-keyword and attach it as a root variant of an existing entry,
   * without creating a new carousel slot. Activates rootVariants so KeywordWords becomes
   * interactive for the new combination, and swaps the displayed card to show its KPIs.
   * Throws on API error so the caller can restore activeWordIndices + show a toast.
   */
  async function addRootVariantToEntry(
    entryIndex: number,
    newRootKeyword: string,
    activeIndices: number[],
    level: ArticleLevel,
    articleTitle?: string,
    articleId?: number,
    painPoint?: string,
  ): Promise<void> {
    const entry = entries.value[entryIndex]
    if (!entry) throw new Error('Entry introuvable')

    if (entry.rootVariants.has(newRootKeyword)) {
      const existing = entry.rootVariants.get(newRootKeyword)!
      entries.value[entryIndex] = {
        ...entry,
        card: existing.card,
        validation: existing.validation,
        activeWordIndices: activeIndices,
      }
      return
    }

    const pending = new Set(entry.pendingVariants)
    pending.add(newRootKeyword)
    patch(entryIndex, { pendingVariants: pending, activeWordIndices: activeIndices })

    const thisVersion = loadVersion

    try {
      const response = await apiPost<ScanResponse>(
        `/keywords/${encodeURIComponent(newRootKeyword)}/scan`,
        { level, articleTitle, ...(articleId ? { articleId } : {}), ...(painPoint ? { painPoint } : {}) },
      )
      if (thisVersion !== loadVersion) return

      const current = entries.value[entryIndex]
      if (!current) return

      const variantCard = hydrateCardFromValidation(newRootKeyword, response)
      const variants = new Map(current.rootVariants)
      variants.set(newRootKeyword, { keyword: newRootKeyword, card: variantCard, validation: response })

      const nextPending = new Set(current.pendingVariants)
      nextPending.delete(newRootKeyword)

      entries.value[entryIndex] = {
        ...current,
        rootVariants: variants,
        pendingVariants: nextPending,
        card: variantCard,
        validation: response,
        activeWordIndices: activeIndices,
      }

      log.info('[useExploredKeywords] Root variant added in-place', { parent: current.originalCard.keyword, variant: newRootKeyword })
    } catch (err) {
      const current = entries.value[entryIndex]
      if (current) {
        const nextPending = new Set(current.pendingVariants)
        nextPending.delete(newRootKeyword)
        patch(entryIndex, { pendingVariants: nextPending })
      }
      throw err
    }
  }

  /** Restore carousel entries from persisted validation history (no API calls) */
  function restoreFromHistory(
    history: CaptainScanEntry[],
    level: ArticleLevel,
    richRootKeywords?: RichRootKeyword[],
  ) {
    ++loadVersion
    const config = getThresholds(level)

    // Sprint 17 (Bug B) — Dédup l'historique par keyword (case-insensitive).
    // Le backend ne devrait pas retourner de doublons (UNIQUE constraint sur
    // captain_explorations) mais cette dédup défensive protège contre tout
    // payload malformé ou bug régression côté serveur.
    const dedupedHistory = Array.from(
      new Map(history.map(h => [h.keyword.trim().toLowerCase(), h])).values(),
    )
    if (dedupedHistory.length !== history.length) {
      log.warn('[useExploredKeywords] restoreFromHistory — duplicates filtered', {
        before: history.length,
        after: dedupedHistory.length,
      })
    }

    entries.value = dedupedHistory.map(h => {
      const kpis = h.kpis.map(s => scoreKpi(s.name, s.rawValue, config))
      const verdict = computeVerdict(kpis)

      const response: ScanResponse = {
        keyword: h.keyword,
        articleLevel: h.articleLevel,
        kpis,
        verdict,
        fromCache: true,
        cachedAt: null,
        paaQuestions: h.paaQuestions,
        // 2026-05-02 — Propage les scores hydratés par le backend
        // (getCaptainExplorations rapatrie depuis radar_explorations).
        // Sans ça, hydrateCardFromValidation produit relevanceScore=null
        // et la card Capitaine affiche "—" au reload.
        marketScore: h.marketScore ?? undefined,
        relevanceScore: h.relevanceScore ?? null,
      }
      log.debug('[useExploredKeywords] restoreFromHistory entry', {
        keyword: h.keyword,
        hasMarketScore: !!h.marketScore,
        hasRelevanceScore: !!h.relevanceScore,
        relevanceTotal: h.relevanceScore?.total ?? 'n/a',
      })
      const card = hydrateCardFromValidation(h.keyword, response)
      // FR-CAP-RELEVANCE-UNAVAILABLE-REASON : propage la cause typée backend
      if (h.relevanceUnavailableReason !== undefined) {
        card.relevanceUnavailableReason = h.relevanceUnavailableReason
      }

      // Restore root variants if available.
      // Note 2026-05-02 : `RichRootKeyword` n'inclut pas marketScore/relevanceScore
      // (limitation persistance). Les root cards affichées dans CaptainRootsSidebar
      // n'ont donc pas de score Pertinence individuel après restore — le ScoreRing
      // affichera 0. Le scoring backend recalcule à la prochaine validation.
      const rootVariants = new Map<string, KeywordRootVariant>()
      const rootsForKeyword = richRootKeywords?.filter(r => r.parentKeyword === h.keyword) ?? []
      for (const root of rootsForKeyword) {
        const rootKpis = root.kpis.map(s => scoreKpi(s.name, s.rawValue, config))
        const rootVerdict = computeVerdict(rootKpis)
        const rootResponse: ScanResponse = {
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
        activeWordIndices: Array.from({ length: h.keyword.trim().split(/\s+/).length }, (_, i) => i),
        failedRoots: [],
        pendingVariants: new Set(),
      } satisfies ExploredKeywordEntry
    })

    currentIndex.value = 0
    const withRelevance = entries.value.filter(e => (e.card.relevanceScore?.total ?? null) !== null).length
    const withRoots = entries.value.filter(e => e.rootVariants.size > 0).length
    log.debug('[useExploredKeywords] restoreFromHistory — terminé', {
      total: dedupedHistory.length,
      withRelevance,
      withRoots,
      withUnavailableReason: entries.value.filter(e => e.card.relevanceUnavailableReason).length,
    })
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
    addRootVariantToEntry,
    restoreFromHistory,
    next,
    prev,
    goTo,
    effectiveVerdict,
    reset,
  }
}
