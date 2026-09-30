/**
 * AUTHORITY: PostgreSQL `captain_explorations` (écrite côté serveur par
 *            POST /keywords/:kw/scan quand `articleId` est fourni) et
 *            `keyword_metrics` (mesures partagées entre articles).
 * READS FROM: POST /keywords/:kw/scan (étude d'un candidat, de ses racines) ;
 *             historique relu par CaptainPanel (`restoreFromHistory`, sans appel).
 * WRITES TO: rien directement : l'étude enregistre l'exploration côté serveur.
 * CONSUMERS: CaptainPanel.vue (liste des candidats, racines, avis IA).
 * RELATED FR: FR-CAP-INPUT, FR-CAP-SCAN, FR-CAP-ROOTS, FR-MOT-NO-AUTO-ACTION.
 */
import { ref, computed } from 'vue'
import { apiPost } from '@/services/api.service'
import { extractRoots } from '@/composables/keyword/useCapitaineScan'
import { log } from '@/utils/logger'
import { computeCombinedScore } from '@shared/scoring.js'
import { getThresholds, scoreKpi, computeVerdict } from '@shared/kpi-scoring.js'
import type { ScanResponse, ArticleLevel, VerdictLevel } from '@shared/types/index.js'
import type { CaptainScanEntry, RichRootKeyword } from '@shared/types/keyword.types.js'
import type { RadarCard, RadarPaaItem, KeywordRootVariant } from '@shared/types/intent.types.js'
import { captainScanContract } from '@shared/contracts/captain-scan.contract.js'
import { candidatesFromHistory } from '@shared/captain-candidates.js'

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
 * Score historique déprécié (`combinedScore`) : sa formule exige des nombres,
 * l'absence y vaut donc 0 par construction. Il n'est ni affiché comme valeur
 * de KPI ni utilisé pour trier au Capitaine (tri par pertinence) : ce zéro ne
 * sort jamais à l'écran comme une donnée.
 */
function absentAsZeroForLegacyScore(value: number | null | undefined): number {
  return typeof value === 'number' ? value : 0
}

// Hydrate RadarCard from ScanResponse with marketScore and relevanceScore propagation
export function hydrateCardFromValidation(keyword: string, response: ScanResponse): RadarCard {
  const kpiMap = Object.fromEntries(response.kpis.map(k => [k.name, k]))
  // Une donnée absente reste absente jusqu'à l'affichage (« — »), FR-INFRA-KPI-NULLABLE.
  const valueOf = (name: string): number | null => kpiMap[name]?.rawValue ?? null

  const paaItems: RadarPaaItem[] = (response.paaQuestions || []).map(p => ({
    question: p.question,
    answer: p.answer ?? undefined,
    depth: 0,
    match: p.match || 'none',
    matchQuality: p.matchQuality,
  }))

  const scoreBreakdown = computeCombinedScore({
    searchVolume: absentAsZeroForLegacyScore(valueOf('volume')),
    difficulty: absentAsZeroForLegacyScore(valueOf('kd')),
    cpc: absentAsZeroForLegacyScore(valueOf('cpc')),
    paaWeightedScore: absentAsZeroForLegacyScore(valueOf('paa')),
    autocompleteMatchCount: absentAsZeroForLegacyScore(valueOf('autocomplete')),
  })

  const out: RadarCard = {
    keyword,
    kpis: {
      searchVolume: valueOf('volume'),
      difficulty: valueOf('kd'),
      cpc: valueOf('cpc'),
      // La réponse du scan ne transporte pas la concurrence : inconnue, pas nulle.
      competition: null,
      // Compteurs : « pas de question » et « question inconnue » se confondent ici
      // (types non nullables du Radar) — traité au lot Radar.
      paaWeightedScore: absentAsZeroForLegacyScore(valueOf('paa')),
      autocompleteMatchCount: absentAsZeroForLegacyScore(valueOf('autocomplete')),
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
    marketScore: response.marketScore,
    relevanceScore: response.relevanceScore ?? null,
  }

  log.debug('[hydrateCardFromValidation]', {
    keyword,
    hasMarket: !!response.marketScore,
    hasRelevance: !!response.relevanceScore,
    relevanceTotal: response.relevanceScore?.total ?? 'n/a',
  })

  return out
}

/**
 * Une variante racine est « mesurée » quand son étude a rendu ses indicateurs.
 * Les racines relues de la base arrivent sans indicateurs (liste vide) : il
 * faut les étudier avant de les afficher (FR-CAP-ROOTS).
 */
export function isVariantMeasured(variant: KeywordRootVariant): boolean {
  return variant.validation.kpis.length > 0
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

  /**
   * Études (`POST /keywords/:kw/scan`) en cours, par mot-clé normalisé. Un
   * double-clic sur « Analyser » envoyait deux études du même mot-clé, payées
   * deux fois en réel si la première n'avait pas encore rempli le cache
   * (recette 2026-09-30, Capitaine point 3) : la seconde demande est ignorée.
   */
  const scansInFlight = new Set<string>()
  const normalizeKeyword = (keyword: string) => keyword.trim().toLowerCase()

  function isScanning(keyword: string): boolean {
    return scansInFlight.has(normalizeKeyword(keyword))
  }

  /** Une étude, marquée « en cours » jusqu'à sa réponse (réussie ou non). */
  async function scanOnce(keyword: string, body: Record<string, unknown>): Promise<ScanResponse> {
    const key = normalizeKeyword(keyword)
    scansInFlight.add(key)
    try {
      return await apiPost<ScanResponse>(
        `/keywords/${encodeURIComponent(keyword)}/scan`,
        body,
        { contract: captainScanContract },
      )
    } finally {
      scansInFlight.delete(key)
    }
  }

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
          const rootResponse = await scanOnce(
            rootKw,
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
          const response = await scanOnce(
            card.keyword,
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

  // Add single keyword to carousel and validate, with deduplication by keyword
  async function addEntry(keyword: string, level: ArticleLevel, articleTitle?: string, articleId?: number, painPoint?: string) {
    const normalizedKeyword = normalizeKeyword(keyword)
    if (scansInFlight.has(normalizedKeyword)) {
      log.debug('[useExploredKeywords] addEntry ignoré : étude déjà en cours pour ce mot-clé', { keyword })
      return
    }
    const thisVersion = ++loadVersion

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
        const response = await scanOnce(
          keyword,
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

    // Build a minimal RadarCard for a manually-entered keyword.
    // KPI marché inconnus tant que le scan n'a pas répondu : absents (« — »), pas 0.
    const card: RadarCard = {
      keyword,
      combinedScore: 0,
      scoreBreakdown: { paaMatchScore: 0, resonanceBonus: 0, opportunityScore: 0, intentValueScore: 0, cpcScore: 0, painAlignmentScore: 0, total: 0 },
      kpis: { searchVolume: null, difficulty: null, cpc: null, competition: null, paaTotal: 0, paaMatchCount: 0, paaWeightedScore: 0, intentTypes: [], intentProbability: null, autocompleteMatchCount: 0, avgSemanticScore: null },
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
      const response = await scanOnce(
        keyword,
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

    const existing = entry.rootVariants.get(newRootKeyword)
    if (existing && isVariantMeasured(existing)) {
      entries.value[entryIndex] = {
        ...entry,
        card: existing.card,
        validation: existing.validation,
        activeWordIndices: activeIndices,
      }
      return
    }
    // Racine relue de la base sans ses mesures (FR-CAP-ROOTS) : on l'étudie
    // comme une combinaison nouvelle. L'afficher telle quelle montrait « — »
    // partout sans rien dire, et un échec d'étude restait muet (recette
    // 2026-09-30, CAP-20 geste 4).

    const pending = new Set(entry.pendingVariants)
    pending.add(newRootKeyword)
    patch(entryIndex, { pendingVariants: pending, activeWordIndices: activeIndices })

    const thisVersion = loadVersion

    try {
      const response = await scanOnce(
        newRootKeyword,
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

    // Une étude enregistrée qui est la racine d'un autre candidat reste rangée
    // sous lui, jamais en carte à part (FR-CAP-LOCK-INTEGRITY) ; ses mesures
    // enregistrées servent à sa ligne de racine (FR-CAP-ROOTS).
    const studied = new Map(dedupedHistory.map(h => [h.keyword.trim().toLowerCase(), h]))
    entries.value = candidatesFromHistory(dedupedHistory).map(h => {
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

      // Restore root variants if available
      const rootVariants = new Map<string, KeywordRootVariant>()
      const rootsForKeyword = richRootKeywords?.filter(r => r.parentKeyword === h.keyword) ?? []
      for (const root of rootsForKeyword) {
        const ownStudy = root.kpis.length === 0 ? studied.get(root.keyword.trim().toLowerCase()) : undefined
        const rootKpis = (ownStudy?.kpis ?? root.kpis).map(s => scoreKpi(s.name, s.rawValue, config))
        const rootVerdict = computeVerdict(rootKpis)
        const rootResponse: ScanResponse = {
          keyword: root.keyword,
          articleLevel: root.articleLevel,
          kpis: rootKpis,
          verdict: rootVerdict,
          fromCache: true,
          cachedAt: null,
          ...(ownStudy
            ? { paaQuestions: ownStudy.paaQuestions, marketScore: ownStudy.marketScore ?? undefined, relevanceScore: ownStudy.relevanceScore ?? null }
            : {}),
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
    isScanning,
    addRootVariantToEntry,
    restoreFromHistory,
    next,
    prev,
    goTo,
    effectiveVerdict,
    reset,
  }
}
