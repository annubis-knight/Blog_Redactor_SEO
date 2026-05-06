import type { RadarCombinedScoreBreakdown, RadarIntentType } from './types/intent.types.js'
import {
  verdictFromScore,
  INTENT_MISMATCH_MALUS,
  type RelevanceScoreInput,
  type RelevanceScoreResult,
  type RelevanceScoreBreakdown,
} from './types/scoring.types.js'

export interface CombinedScoreInput {
  searchVolume: number
  difficulty: number
  cpc: number
  paaWeightedScore: number
  autocompleteMatchCount: number
  avgSemanticScore?: number | null
  intentTypes?: RadarIntentType[]
  /** QW3 : alignement keyword ↔ painPoint (0-100). Si absent/undefined → neutre 50. */
  painAlignmentScore?: number
  /** Étape 3A : moyenne numérique 0-100 de l'alignement PAA × douleur.
   *  Si fourni, remplace `paaMatchScore` (matching lexical PAA × keyword) dans la pondération. */
  paaPainAlignmentAvg?: number
  /** Étape 3B : moyenne numérique 0-100 de l'alignement autocomplete × douleur.
   *  Si fourni, remplace `resonanceBonus` dans la pondération. */
  autocompletePainAlignmentAvg?: number
  /** Étape 3C : moyenne numérique 0-100 du combinedScore des racines (capitaine 3+ mots).
   *  Si fourni, ajoute la composante `rootsBonus`. */
  rootsAverageScore?: number
}

const INTENT_VALUES: Record<string, number> = {
  commercial: 100,
  transactional: 80,
  informational: 50,
  navigational: 20,
}

/**
 * Compute combined radar score from KPIs.
 * Single source of truth — used by both client and server.
 *
 * Deux modes de pondération :
 *
 *  • Mode "pertinence article" (quand `paaPainAlignmentAvg`, `autocompletePainAlignmentAvg`
 *    et `rootsAverageScore` sont fournis) :
 *      - Pain alignment keyword  25 %
 *      - PAA × douleur           25 %  (remplace paaMatchScore lexical)
 *      - Autocomplete × douleur  15 %  (remplace resonanceBonus)
 *      - Racines                 15 %  (nouveau)
 *      - Intent                  10 %
 *      - Opportunité             10 %
 *
 *  • Mode "fallback" (quand les champs pertinence-article manquent) :
 *      - PAA match lexical       25 %
 *      - Pain alignment keyword  20 %
 *      - Opportunité             20 %
 *      - Résonance autocomplete  15 %
 *      - Intent                  10 %
 *      - CPC                     10 %
 *    Garantit la rétrocompatibilité avec les cas sans douleur / sans racines.
 */
export function computeCombinedScore(input: CombinedScoreInput): RadarCombinedScoreBreakdown {
  // ---- Composantes brutes (toujours calculées) ----

  // PAA match lexical (mode fallback)
  const paaMatchScore = Math.min(100, input.paaWeightedScore * 10)

  // Resonance lexical (mode fallback)
  const autoBonus = Math.min(30, input.autocompleteMatchCount * 10)
  const semanticBonus = input.avgSemanticScore != null ? input.avgSemanticScore * 70 : 0
  const resonanceBonus = Math.min(100, autoBonus + semanticBonus)

  // Opportunité (toujours présent)
  const adjustedVol = Math.max(1, input.searchVolume * Math.max(0.01, 1 - input.difficulty / 100))
  const opportunityScore = Math.min(100, Math.log10(adjustedVol) / 5 * 100)

  // Intent
  const types = input.intentTypes ?? []
  const intentValueScore = types.length > 0
    ? Math.max(...types.map(t => INTENT_VALUES[t] ?? 50))
    : 50

  // CPC (mode fallback)
  const cpcScore = Math.min(100, Math.log10(input.cpc + 1) / Math.log10(11) * 100)

  // Pain alignment keyword (50 = neutre si absent)
  const painAlignmentScore = input.painAlignmentScore != null
    ? Math.max(0, Math.min(100, input.painAlignmentScore))
    : 50

  // Composantes "pertinence article" (nouvelles, optionnelles)
  const paaPainAlignmentScore = input.paaPainAlignmentAvg != null
    ? Math.max(0, Math.min(100, input.paaPainAlignmentAvg))
    : null
  const autocompletePainAlignmentScore = input.autocompletePainAlignmentAvg != null
    ? Math.max(0, Math.min(100, input.autocompletePainAlignmentAvg))
    : null
  const rootsBonus = input.rootsAverageScore != null
    ? Math.max(0, Math.min(100, input.rootsAverageScore))
    : null

  // ---- Pondération ----
  let total: number
  const hasRelevance = paaPainAlignmentScore != null && autocompletePainAlignmentScore != null

  if (hasRelevance) {
    // Mode "pertinence article" — 65 % signaux article + 35 % signaux marché
    // Si pas de racines, on répartit proportionnellement les 15 % sur les autres.
    if (rootsBonus != null) {
      total = Math.round(
        painAlignmentScore * 0.25 +
        paaPainAlignmentScore * 0.25 +
        autocompletePainAlignmentScore * 0.15 +
        rootsBonus * 0.15 +
        intentValueScore * 0.10 +
        opportunityScore * 0.10,
      )
    } else {
      // Sans racines : rebalance — pain keyword 30, PAA pain 30, AC pain 15, intent 10, opp 15
      total = Math.round(
        painAlignmentScore * 0.30 +
        paaPainAlignmentScore * 0.30 +
        autocompletePainAlignmentScore * 0.15 +
        intentValueScore * 0.10 +
        opportunityScore * 0.15,
      )
    }
  } else {
    // Mode fallback — formule historique
    total = Math.round(
      paaMatchScore * 0.25 +
      resonanceBonus * 0.15 +
      opportunityScore * 0.20 +
      intentValueScore * 0.10 +
      cpcScore * 0.10 +
      painAlignmentScore * 0.20,
    )
  }

  return {
    paaMatchScore: Math.round(paaPainAlignmentScore ?? paaMatchScore),
    resonanceBonus: Math.round(autocompletePainAlignmentScore ?? resonanceBonus),
    opportunityScore: Math.round(opportunityScore),
    intentValueScore: Math.round(intentValueScore),
    cpcScore: Math.round(cpcScore),
    painAlignmentScore: Math.round(painAlignmentScore),
    total: Math.min(100, Math.max(0, total)),
  }
}

// ---------------------------------------------------------------------------
// Score de Pertinence — onglet Capitaine (séparation KPI vs Pertinence, 2026-04-28)
// ---------------------------------------------------------------------------

/**
 * Pondération cible du Score de Pertinence.
 *
 * Réponse à : "Ce mot-clé parle-t-il VRAIMENT de la douleur de mon article ?"
 * Aucun signal de marché brut (volume / KD / CPC) ici — ils vivent dans `computeMarketScore`.
 */
const RELEVANCE_WEIGHTS_TARGET = {
  painKeyword: 0.30,
  paaPain:     0.25,
  acPain:      0.15,
  roots:       0.20,
  intentPain:  0.10,
} as const

type RelevanceIntentType = NonNullable<RelevanceScoreInput['intentTypes']>[number]

/**
 * Mapping qualitatif intent × douleur → score 0-100.
 * Si pas de painIntentExpected ou pas d'intentTypes → 50 neutre.
 */
function computeIntentPainAlignment(
  intentTypes: RelevanceIntentType[] | undefined,
  painIntentExpected: RelevanceIntentType | undefined,
): number {
  if (!painIntentExpected || !intentTypes || intentTypes.length === 0) return 50

  const matrix: Record<RelevanceIntentType, Record<RelevanceIntentType, number>> = {
    commercial: {
      commercial:    100,
      transactional: 80,
      informational: 30,
      navigational:  20,
    },
    transactional: {
      transactional: 100,
      commercial:    80,
      informational: 30,
      navigational:  20,
    },
    informational: {
      informational: 100,
      commercial:    50,
      transactional: 40,
      navigational:  30,
    },
    navigational: {
      navigational:  100,
      commercial:    60,
      transactional: 50,
      informational: 40,
    },
  }

  return Math.max(...intentTypes.map(t => matrix[painIntentExpected][t] ?? 50))
}

/**
 * Calcule le Score de Pertinence (0-100) — affiché dans l'onglet Capitaine.
 *
 * Composantes :
 *   - Pain alignment keyword            30 %
 *   - PAA × douleur (qualité)           25 %
 *   - Autocomplete × douleur (qualité)  15 %
 *   - Racines (cohérence sémantique)    20 %
 *   - Intent × douleur                  10 %
 *
 * Fallback racines : si `rootsAverageScore` est absent (keyword < 3 mots ou
 * pas de racines pré-validées), les 20 % sont redistribués proportionnellement
 * sur les 4 autres composantes.
 *
 * Composantes manquantes (paaPain, acPain, painAlignmentScore) → neutralisées à 50.
 */
export function computeRelevanceScore(input: RelevanceScoreInput): RelevanceScoreResult {
  const painKeywordNorm = clampScore(input.painAlignmentScore, 50)
  const paaPainNorm = clampScore(input.paaPainAlignmentAvg, 50)
  const acPainNorm = clampScore(input.autocompletePainAlignmentAvg, 50)

  const expectedIntent = input.painIntentExpected
  let intentPainNorm = computeIntentPainAlignment(input.intentTypes, expectedIntent)

  // Malus intégré directement dans la composante `intentPain.normalized`
  // (pas en variable séparée). Pattern extensible : si on veut malus sur
  // d'autres composantes (cannibalisation sur painKeyword, etc.), on adapte
  // de la même manière le `normalized` de la composante concernée.
  if (input.intentTypes && input.intentTypes.length > 0 && expectedIntent) {
    const realMatchesExpected = input.intentTypes.includes(expectedIntent)
    if (!realMatchesExpected) {
      intentPainNorm = Math.max(0, intentPainNorm - INTENT_MISMATCH_MALUS)
    }
  }

  const hasRoots = input.rootsAverageScore != null
  const rootsNorm = hasRoots ? clampScore(input.rootsAverageScore, 50) : 0

  const weights: { painKeyword: number; paaPain: number; acPain: number; roots: number; intentPain: number } = {
    painKeyword: RELEVANCE_WEIGHTS_TARGET.painKeyword,
    paaPain:     RELEVANCE_WEIGHTS_TARGET.paaPain,
    acPain:      RELEVANCE_WEIGHTS_TARGET.acPain,
    roots:       RELEVANCE_WEIGHTS_TARGET.roots,
    intentPain:  RELEVANCE_WEIGHTS_TARGET.intentPain,
  }
  if (!hasRoots) {
    const remaining = 1 - RELEVANCE_WEIGHTS_TARGET.roots
    const factor = 1 / remaining
    weights.painKeyword = RELEVANCE_WEIGHTS_TARGET.painKeyword * factor
    weights.paaPain     = RELEVANCE_WEIGHTS_TARGET.paaPain * factor
    weights.acPain      = RELEVANCE_WEIGHTS_TARGET.acPain * factor
    weights.roots       = 0
    weights.intentPain  = RELEVANCE_WEIGHTS_TARGET.intentPain * factor
  }

  const breakdown: RelevanceScoreBreakdown = {
    painKeyword: makeComponent(weights.painKeyword, painKeywordNorm),
    paaPain:     makeComponent(weights.paaPain, paaPainNorm),
    acPain:      makeComponent(weights.acPain, acPainNorm),
    roots:       makeComponent(weights.roots, rootsNorm),
    intentPain:  makeComponent(weights.intentPain, intentPainNorm),
  }

  const total = Math.round(
    breakdown.painKeyword.contribution +
    breakdown.paaPain.contribution +
    breakdown.acPain.contribution +
    breakdown.roots.contribution +
    breakdown.intentPain.contribution,
  )

  const clampedTotal = Math.min(100, Math.max(0, total))

  return {
    total: clampedTotal,
    verdict: verdictFromScore(clampedTotal),
    breakdown,
    rootsContext: {
      rootsAverageScore: hasRoots ? rootsNorm : null,
      fallbackApplied: !hasRoots,
    },
  }
}

export { verdictFromScore }

function clampScore(value: number | null | undefined, fallback: number): number {
  if (value == null || Number.isNaN(value)) return fallback
  return Math.max(0, Math.min(100, value))
}

function makeComponent(weight: number, normalized: number) {
  return {
    weight,
    normalized,
    contribution: weight * normalized,
  }
}

// ---------------------------------------------------------------------------
// Score racines — Sprint S4 (gestion fine doublons / divergence / absence)
// ---------------------------------------------------------------------------

export interface RootScoreInput {
  /** keyword de la racine + son score relevance individuel (0-100). */
  keyword: string
  relevance: number
}

export interface RootsRelevanceResult {
  /** Score 0-100 à injecter dans `RelevanceScoreInput.rootsAverageScore`. */
  total: number
  /** Nombre de racines avant déduplication. */
  rootsCount: number
  /** Nombre de racines uniques après détection des doublons. */
  uniqueRootsCount: number
  /** Liste des paires (kw1, kw2) considérées comme doublons. */
  duplicates: Array<{ a: string; b: string; jaccard: number }>
}

/** Seuil Jaccard au-delà duquel deux racines sont considérées comme doublons. */
export const ROOTS_DUPLICATE_THRESHOLD = 0.75

/**
 * Jaccard lexical entre deux strings normalisées (lowercase, sans accents,
 * tokens ≥ 4 caractères pour ignorer les stopwords courts).
 * Sortie ∈ [0, 1].
 */
function jaccardLexical(a: string, b: string): number {
  const tokenize = (s: string) =>
    s.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length >= 4)
  const setA = new Set(tokenize(a))
  const setB = new Set(tokenize(b))
  if (setA.size === 0 || setB.size === 0) return 0
  let inter = 0
  for (const w of setA) if (setB.has(w)) inter++
  return inter / (setA.size + setB.size - inter)
}

/**
 * Calcule le Score Racines pour le `relevanceScore` (Sprint S4).
 *
 * Trois cas explicites distingués :
 *   🟢 Cas 1 — racines diverses + fortes : score = moyenne des relevances individuelles
 *   🟡 Cas 2 — doublons détectés (Jaccard ≥ 0.75) : on déduplique en gardant
 *               le meilleur scorant de chaque cluster, puis on calcule la moyenne
 *               sur les uniques. Cela évite de gonfler artificiellement le score
 *               racines avec des variantes redondantes.
 *   ⚫ Cas 3 — liste vide : retourne null (le caller laisse `computeRelevanceScore`
 *               appliquer le fallback de redistribution proportionnelle).
 *
 * Stratégie de détection (Piste 3 hybride — décision produit S4-1) :
 *   - Jaccard lexical d'abord (rapide, pas d'appel embedding).
 *   - Le seuil ROOTS_DUPLICATE_THRESHOLD vit en constante exportée pour pouvoir
 *     l'ajuster sans toucher la logique.
 *
 * Note : la version V1 ne fait QUE du Jaccard. Une story future pourra ajouter
 *        un fallback embedding cosine pour les cas Jaccard ∈ [0.5, 0.75]
 *        (zone d'ambiguïté lexicale).
 */
export function computeRootsRelevanceScore(roots: RootScoreInput[]): RootsRelevanceResult | null {
  if (!roots || roots.length === 0) return null

  // 1. Détection des paires en doublon
  const duplicates: Array<{ a: string; b: string; jaccard: number }> = []
  const isDuplicate = new Map<number, number>() // index → index du représentant choisi
  for (let i = 0; i < roots.length; i++) {
    const ri = roots[i]!
    for (let j = i + 1; j < roots.length; j++) {
      const rj = roots[j]!
      const sim = jaccardLexical(ri.keyword, rj.keyword)
      if (sim >= ROOTS_DUPLICATE_THRESHOLD) {
        duplicates.push({ a: ri.keyword, b: rj.keyword, jaccard: Math.round(sim * 100) / 100 })
        // On marque j comme doublon de i (ou du représentant de i si déjà mappé)
        const root = isDuplicate.get(i) ?? i
        isDuplicate.set(j, root)
      }
    }
  }

  // 2. Pour chaque cluster, on garde la racine avec la meilleure relevance.
  //    Les racines non-doublon restent telles quelles.
  const clusterBest = new Map<number, number>() // representant → meilleure relevance vue
  const seenIndices = new Set<number>()
  for (let i = 0; i < roots.length; i++) {
    const rep = isDuplicate.get(i) ?? i
    seenIndices.add(rep)
    const current = clusterBest.get(rep)
    const r = roots[i]!
    if (current === undefined || r.relevance > current) {
      clusterBest.set(rep, r.relevance)
    }
  }

  // 3. Score = moyenne des bests par cluster (= moyenne sur les uniques).
  const uniques = Array.from(clusterBest.values())
  const total = uniques.length === 0
    ? 0
    : Math.round(uniques.reduce((sum, v) => sum + v, 0) / uniques.length)

  return {
    total,
    rootsCount: roots.length,
    uniqueRootsCount: uniques.length,
    duplicates,
  }
}
