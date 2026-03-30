import { ref, computed, watch, type Ref } from 'vue'
import type {
  ValidatePainResult,
  PainVerdictCategory,
  MultiSourceVerdict,
  CommunitySignal,
  AutocompleteSignal,
} from '../../shared/types/intent.types.js'

// --- Weights ---
const WEIGHTS_NO_NLP = { dataforseo: 0.4375, community: 0.375, autocomplete: 0.1875 }
const WEIGHTS_WITH_NLP = { dataforseo: 0.30, community: 0.25, autocomplete: 0.15, nlp: 0.20 }

// Long-tail: autocomplete is the primary signal (DFS rarely has data for exact long-tail phrases)
const WEIGHTS_LONGTAIL = { dataforseo: 0.15, community: 0.25, autocomplete: 0.60 }
const WEIGHTS_LONGTAIL_NLP = { dataforseo: 0.10, community: 0.15, autocomplete: 0.45, nlp: 0.30 }

// --- Verdict thresholds ---
const THRESHOLD_BRULANTE = 0.70
const THRESHOLD_CONFIRMEE = 0.55
const THRESHOLD_FROIDE = 0.20

// --- Consensus thresholds ---
const CONSENSUS_HIGH = 0.80
const CONSENSUS_MEDIUM = 0.60
const CONSENSUS_LOW = 0.50

// --- Coverage factors ---
const COVERAGE_FACTORS: Record<number, number> = { 4: 1.0, 3: 0.85, 2: 0.65, 1: 0.40 }

// --- Confidence thresholds ---
const CONFIDENCE_FORCE_UNCERTAIN = 0.25
const CONFIDENCE_SHOW_EXPLANATION = 0.70

// --- Long-tail detection ---

const FRENCH_STOPWORDS = new Set([
  'le', 'la', 'les', 'de', 'du', 'des', 'un', 'une',
  'et', 'ou', 'en', 'au', 'aux', 'pour', 'par', 'sur',
  'avec', 'dans', 'son', 'sa', 'ses', 'mon', 'ma', 'mes',
  'ce', 'cette', 'ces', 'que', 'qui', 'comment', 'pourquoi',
])

export function isLongTail(keyword: string): boolean {
  const words = keyword.trim().split(/\s+/).filter(w => !FRENCH_STOPWORDS.has(w.toLowerCase()))
  return words.length >= 3
}

// --- Normalization helpers ---

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

function logNormalize(value: number, maxRef: number): number {
  if (value <= 0) return 0
  return clamp(Math.log10(value + 1) / Math.log10(maxRef + 1), 0, 1)
}

// --- Per-source normalization ---

export function normalizeDataForSeoSignal(data: {
  searchVolume: number
  cpc: number
  difficulty: number
  relatedCount: number
} | null): number {
  if (!data) return 0

  // All zeros = no data, not "easy keyword"
  if (data.searchVolume === 0 && data.cpc === 0 && data.difficulty === 0 && data.relatedCount === 0) return 0

  const volumeScore = logNormalize(data.searchVolume, 10000)
  const cpcScore = clamp(data.cpc / 10, 0, 1)
  const kdScore = 1 - clamp(data.difficulty / 100, 0, 1) // low difficulty = good
  const relatedScore = clamp(data.relatedCount / 50, 0, 1)

  // Weighted average of sub-signals
  return volumeScore * 0.35 + cpcScore * 0.30 + kdScore * 0.15 + relatedScore * 0.20
}

export function normalizeCommunitySignal(data: CommunitySignal | null): number {
  if (!data || data.discussionsCount === 0) return 0

  const discScore = logNormalize(data.discussionsCount, 30)
  const diversityScore = clamp(data.domainDiversity / 5, 0, 1)
  const votesScore = logNormalize(data.avgVotesCount, 100)
  const freshnessScore = data.freshness === 'recent' ? 1.0 : data.freshness === 'moderate' ? 0.6 : 0.3

  return discScore * 0.30 + diversityScore * 0.25 + votesScore * 0.20 + freshnessScore * 0.25
}

export function normalizeAutocompleteSignal(data: AutocompleteSignal | null, keyword?: string): number {
  if (!data || data.suggestionsCount === 0) return 0

  const countScore = clamp(data.suggestionsCount / 10, 0, 1)
  const keywordBonus = data.hasKeyword ? 0.3 : 0
  const positionScore = data.position ? clamp(1 - (data.position - 1) / 9, 0, 1) : 0

  // Prefix match: if the keyword is the prefix of many suggestions, strong signal
  let prefixBonus = 0
  if (!data.hasKeyword && keyword && data.suggestions.length > 0) {
    const kwLower = keyword.toLowerCase()
    const prefixCount = data.suggestions.filter(s => s.toLowerCase().startsWith(kwLower)).length
    const prefixRatio = prefixCount / data.suggestions.length
    if (prefixRatio >= 0.5) prefixBonus = 0.25
  }

  return clamp(countScore * 0.5 + keywordBonus + prefixBonus + positionScore * 0.2, 0, 1)
}

// --- Composite scoring ---

export function computeCompositeScore(
  scores: { dataforseo: number; community: number; autocomplete: number; nlp?: number },
  nlpAvailable: boolean,
  longTail: boolean = false,
): number {
  const baseWeights = longTail
    ? (nlpAvailable ? WEIGHTS_LONGTAIL_NLP : WEIGHTS_LONGTAIL)
    : (nlpAvailable ? WEIGHTS_WITH_NLP : WEIGHTS_NO_NLP)

  // Collect sources with positive scores for weight redistribution
  const entries: { key: string; score: number; weight: number }[] = [
    { key: 'dataforseo', score: scores.dataforseo, weight: baseWeights.dataforseo },
    { key: 'community', score: scores.community, weight: baseWeights.community },
    { key: 'autocomplete', score: scores.autocomplete, weight: baseWeights.autocomplete },
  ]
  if (nlpAvailable && scores.nlp !== undefined) {
    entries.push({ key: 'nlp', score: scores.nlp, weight: WEIGHTS_WITH_NLP.nlp })
  }

  const positiveEntries = entries.filter(e => e.score > 0)
  if (positiveEntries.length === 0) return 0

  // Redistribute weight from zero-score sources to positive-score sources
  const totalWeight = entries.reduce((s, e) => s + e.weight, 0)
  const positiveWeight = positiveEntries.reduce((s, e) => s + e.weight, 0)
  const scaleFactor = totalWeight / positiveWeight

  let composite = 0
  for (const e of positiveEntries) {
    composite += e.score * e.weight * scaleFactor
  }

  return clamp(composite, 0, 1)
}

// --- Special case detection ---

export function detectSpecialCase(
  dataforseo: { searchVolume: number; relatedCount: number } | null,
  community: CommunitySignal | null,
): PainVerdictCategory | null {
  const volume = dataforseo?.searchVolume ?? 0
  const discCount = community?.discussionsCount ?? 0
  const relatedCount = dataforseo?.relatedCount ?? 0

  // Latente: zero volume but lots of community discussion
  if (volume === 0 && discCount >= 10) return 'latente'
  // Émergente: low volume but growing signals
  if (volume < 200 && (discCount >= 5 || relatedCount > 5)) return 'emergente'

  return null
}

// --- Consensus ---

type Direction = 'strong' | 'medium' | 'weak'

function scoreDirection(score: number): Direction {
  if (score >= 0.6) return 'strong'
  if (score >= 0.3) return 'medium'
  return 'weak'
}

export function computeConsensus(scores: Record<string, number>): number {
  // Only count sources with meaningful signal (> 0) for consensus
  // A source returning 0 means "no data found", not "data says weak"
  const meaningfulScores = Object.values(scores).filter(s => s > 0)
  if (meaningfulScores.length <= 1) return 1 // single source = no disagreement

  const directions = meaningfulScores.map(scoreDirection)
  // Find most common direction
  const counts: Record<Direction, number> = { strong: 0, medium: 0, weak: 0 }
  for (const d of directions) counts[d]++

  const maxAgreement = Math.max(counts.strong, counts.medium, counts.weak)
  return maxAgreement / meaningfulScores.length
}

// --- Verdict classification ---

export function classifyVerdict(
  compositeScore: number,
  consensus: number,
): PainVerdictCategory {
  if (consensus < CONSENSUS_LOW) return 'incertaine'
  if (compositeScore >= THRESHOLD_BRULANTE && consensus >= CONSENSUS_HIGH) return 'brulante'
  if (compositeScore >= THRESHOLD_CONFIRMEE && consensus >= CONSENSUS_MEDIUM) return 'confirmee'
  if (compositeScore >= 0.35) return 'emergente'
  if (compositeScore < THRESHOLD_FROIDE) return 'froide'
  return 'incertaine'
}

// --- Confidence ---

export function computeConfidence(
  baseScore: number,
  sourcesActive: number,
  sourcesTotal: number,
  agreementRatio: number,
  longTail: boolean = false,
): { confidence: number; forceUncertain: boolean } {
  const coverageFactor = COVERAGE_FACTORS[sourcesActive] ?? 0.40
  const confidence = clamp(baseScore * coverageFactor * agreementRatio, 0, 1)

  // Long-tail: don't require 2 sources — DFS returning 0 is expected, not a failure
  const forceUncertain = longTail
    ? confidence < CONFIDENCE_FORCE_UNCERTAIN
    : (confidence < CONFIDENCE_FORCE_UNCERTAIN || sourcesActive < 2)

  return { confidence: Math.round(confidence * 100) / 100, forceUncertain }
}

function isConflict2v2(scores: Record<string, number>): boolean {
  const directions = Object.values(scores)
    .filter(s => s >= 0)
    .map(scoreDirection)

  if (directions.length < 4) return false

  const counts: Record<Direction, number> = { strong: 0, medium: 0, weak: 0 }
  for (const d of directions) counts[d]++

  // 2v2 conflict: 2 strong and 2 weak (ignoring medium)
  return counts.strong === 2 && counts.weak === 2
}

// --- Explanation ---

export function generateExplanation(
  confidence: number,
  signals: {
    nlpAvailable: boolean
    freshness?: string
    sourcesActive: number
    consensus: number
  },
): string | null {
  if (confidence >= CONFIDENCE_SHOW_EXPLANATION) return null

  const reasons: string[] = []

  if (!signals.nlpAvailable) reasons.push('NLP désactivé (4e source non disponible)')
  if (signals.freshness === 'old') reasons.push('Discussions anciennes (> 12 mois)')
  if (signals.consensus < CONSENSUS_LOW) reasons.push('Sources en conflit')
  if (signals.sourcesActive < 3) reasons.push(`Peu de sources actives (${signals.sourcesActive}/4)`)

  let explanation = reasons.length > 0
    ? `Confiance réduite : ${reasons.join(' · ')}`
    : 'Confiance modérée'

  if (confidence < CONFIDENCE_FORCE_UNCERTAIN) {
    explanation += ' — Vérification manuelle recommandée'
  }

  return explanation
}

// --- Main composable ---

export interface VerdictResult {
  keyword: string
  verdict: MultiSourceVerdict
  explanation: string | null
  perSourceScores: Record<string, number>
  longTail: boolean
}

export function useMultiSourceVerdict(
  results: Ref<ValidatePainResult[]>,
  nlpSignals?: Ref<Record<string, number> | null>,
) {
  const verdicts = ref<VerdictResult[]>([])

  function compute() {
    const data = results.value
    if (!data || data.length === 0) {
      verdicts.value = []
      return
    }

    const nlpAvailable = !!(nlpSignals?.value && Object.keys(nlpSignals.value).length > 0)

    verdicts.value = data.map(item => {
      const longTail = isLongTail(item.keyword)
      const dfScore = normalizeDataForSeoSignal(item.dataforseo)
      const commScore = normalizeCommunitySignal(item.community)
      const autoScore = normalizeAutocompleteSignal(item.autocomplete, item.keyword)
      const nlpScore = nlpAvailable && nlpSignals?.value ? (nlpSignals.value[item.keyword] ?? 0) : 0

      const scores: Record<string, number> = {
        dataforseo: dfScore,
        community: item.community ? commScore : -1, // -1 means unavailable
        autocomplete: item.autocomplete ? autoScore : -1,
      }
      if (nlpAvailable) scores.nlp = nlpScore

      // Active scores (available sources)
      const activeScores: Record<string, number> = {}
      for (const [k, v] of Object.entries(scores)) {
        if (v >= 0) activeScores[k] = v
      }

      const sourcesActive = Object.keys(activeScores).length
      const sourcesTotal = nlpAvailable ? 4 : 3

      // Check special cases first
      const specialCase = detectSpecialCase(item.dataforseo, item.community)

      // Composite score (long-tail uses autocomplete-heavy weights)
      const compositeScore = computeCompositeScore(
        { dataforseo: dfScore, community: Math.max(0, commScore), autocomplete: Math.max(0, autoScore), nlp: nlpScore },
        nlpAvailable,
        longTail,
      )

      // Consensus
      const consensus = computeConsensus(activeScores)

      // Verdict
      let category: PainVerdictCategory
      if (specialCase) {
        category = specialCase
      } else {
        category = classifyVerdict(compositeScore, consensus)
      }

      // Confidence (long-tail: don't require 2 sources)
      const { confidence, forceUncertain } = computeConfidence(
        compositeScore,
        sourcesActive,
        sourcesTotal,
        consensus,
        longTail,
      )

      // Force uncertain if needed
      if (forceUncertain || isConflict2v2(activeScores)) {
        category = 'incertaine'
      }

      // Long-tail safety net: if autocomplete confirms the query exists,
      // don't let missing DFS/Community drag it to froide/incertaine
      if (longTail && autoScore >= 0.4 && (category === 'froide' || category === 'incertaine')) {
        category = 'emergente'
      }

      // Build per-source breakdown
      const weights = longTail
        ? (nlpAvailable ? WEIGHTS_LONGTAIL_NLP : WEIGHTS_LONGTAIL)
        : (nlpAvailable ? WEIGHTS_WITH_NLP : WEIGHTS_NO_NLP)
      const perSourceBreakdown: Record<string, { score: number; weight: number; available: boolean }> = {
        dataforseo: { score: dfScore, weight: weights.dataforseo, available: true },
        community: { score: commScore, weight: weights.community, available: item.community !== null },
        autocomplete: { score: autoScore, weight: weights.autocomplete, available: item.autocomplete !== null },
      }
      if (nlpAvailable) {
        perSourceBreakdown.nlp = { score: nlpScore, weight: WEIGHTS_WITH_NLP.nlp, available: true }
      }

      const verdict: MultiSourceVerdict = {
        category,
        confidence,
        consensusAgreement: Math.round(consensus * 100) / 100,
        sourcesAvailable: sourcesActive,
        sourcesTotal,
        perSourceBreakdown,
      }

      const explanation = generateExplanation(confidence, {
        nlpAvailable,
        freshness: item.community?.freshness,
        sourcesActive,
        consensus,
      })

      return {
        keyword: item.keyword,
        verdict,
        explanation,
        perSourceScores: Object.fromEntries(
          Object.entries(activeScores).map(([k, v]) => [k, Math.round(v * 100) / 100]),
        ),
        longTail,
      }
    })
  }

  watch(results, compute, { immediate: true, deep: true })
  if (nlpSignals) watch(nlpSignals, compute, { deep: true })

  const averageConfidence = computed(() => {
    if (verdicts.value.length === 0) return 0
    const sum = verdicts.value.reduce((s, v) => s + v.verdict.confidence, 0)
    return Math.round((sum / verdicts.value.length) * 100) / 100
  })

  const verdictDistribution = computed(() => {
    const dist: Record<PainVerdictCategory, number> = {
      brulante: 0, confirmee: 0, emergente: 0, latente: 0, froide: 0, incertaine: 0,
    }
    for (const v of verdicts.value) {
      dist[v.verdict.category]++
    }
    return dist
  })

  const isComplete = computed(() => {
    return verdicts.value.length > 0 && verdicts.value.every(v => v.verdict.sourcesAvailable >= 2)
  })

  return { verdicts, averageConfidence, verdictDistribution, isComplete }
}
