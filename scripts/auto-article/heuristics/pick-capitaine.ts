/**
 * Heuristique PURE — choix du Capitaine (§7.2 epic).
 *
 * Historique des révisions (piloté par les runs réels) :
 *
 * v1 « meilleur relevance parmi les GO » → dérive hors-sujet : le verdict GO est
 *    piloté par le marché (volume/KD/CPC), donc un générique à fort volume gagne.
 *
 * v2 « composite 0.6×relevance + 0.4×market » sur valeurs brutes → inefficace :
 *    les deux scores ne sont pas à la même échelle (relevance observée 0-20,
 *    market 20-95), le marché écrasait la pondération.
 *
 * v3 (actuelle) — deux corrections :
 *    a) **Affinité topique** calculée côté CLI (recouvrement lexical mot-clé ↔
 *       titre + pilier + douleur). Nécessaire car le `relevanceScore` du produit
 *       s'est révélé **non-discriminant** en run réel (les 8 candidats scoraient
 *       tous exactement 6/100) — il ne peut donc pas départager à lui seul.
 *    b) **Normalisation min-max** de relevance et market *dans le pool de
 *       candidats*, pour que les poids soient réellement respectés.
 */

import { topicalAffinity } from '../text.js'

export interface CapitaineInput {
  keyword: string
  verdict: string
  relevance: number | null
  market: number | null
}

export interface CapitaineChoice {
  keyword: string
  /** true quand le verdict retenu n'est pas GO (on passe outre le marché). */
  forced: boolean
  verdict: string
  relevance: number | null
  market: number | null
  /** Affinité topique 0-1 retenue (diagnostic + log). */
  affinity: number
}

export interface Weights {
  affinity: number
  relevance: number
  market: number
}

/**
 * Pondérations **par niveau d'article** (v4, 2026-07-19).
 *
 * v3 était agnostique au niveau, ce qui a produit un pilier ciblant « zone de
 * chalandise » — un terme de niche — alors que « référencement local » et
 * « visibilité locale » figuraient parmi les candidats. Or les trois niveaux
 * n'ont pas le même métier :
 *   - un **pilier** vise le terme de tête : l'ampleur (marché) prime ;
 *   - un **spécifique** vise une requête précise : la proximité au sujet prime ;
 *   - l'**intermédiaire** équilibre les deux.
 */
export const WEIGHTS_BY_LEVEL: Record<string, Weights> = {
  pilier: { affinity: 0.35, relevance: 0.15, market: 0.5 },
  intermediaire: { affinity: 0.5, relevance: 0.2, market: 0.3 },
  specifique: { affinity: 0.6, relevance: 0.25, market: 0.15 },
}

export const DEFAULT_WEIGHTS: Weights = WEIGHTS_BY_LEVEL.intermediaire

/** @deprecated conservés pour compatibilité — voir WEIGHTS_BY_LEVEL. */
export const AFFINITY_WEIGHT = DEFAULT_WEIGHTS.affinity
export const RELEVANCE_WEIGHT = DEFAULT_WEIGHTS.relevance
export const MARKET_WEIGHT = DEFAULT_WEIGHTS.market

interface Scored extends CapitaineInput {
  affinity: number
  composite: number
}

/** Normalise une valeur dans [0,1] selon les bornes du pool (0 si pool plat). */
function normalize(value: number | null, min: number, max: number): number {
  if (value == null) return 0
  if (max <= min) return 0
  return (value - min) / (max - min)
}

function toChoice(c: Scored): CapitaineChoice {
  return {
    keyword: c.keyword,
    forced: c.verdict !== 'GO',
    verdict: c.verdict,
    relevance: c.relevance,
    market: c.market,
    affinity: c.affinity,
  }
}

/**
 * Tous les candidats, du meilleur au moins bon. Garde anti-dérive : un
 * mot-clé totalement hors-sujet passe après tous ceux qui touchent le sujet.
 *
 * @param candidates mots-clés scannés
 * @param topic texte du sujet (titre + mot-clé pilier + point de douleur)
 */
export function rankCapitaines(
  candidates: CapitaineInput[],
  topic = '',
  level = 'intermediaire',
): CapitaineChoice[] {
  if (candidates.length === 0) return []
  const w = WEIGHTS_BY_LEVEL[level] ?? DEFAULT_WEIGHTS

  const relValues = candidates.map((c) => c.relevance ?? 0)
  const mktValues = candidates.map((c) => c.market ?? 0)
  const relMin = Math.min(...relValues)
  const relMax = Math.max(...relValues)
  const mktMin = Math.min(...mktValues)
  const mktMax = Math.max(...mktValues)

  const scored: Scored[] = candidates.map((c) => {
    const affinity = topicalAffinity(c.keyword, topic)
    const composite =
      w.affinity * affinity +
      w.relevance * normalize(c.relevance, relMin, relMax) +
      w.market * normalize(c.market, mktMin, mktMax)
    return { ...c, affinity, composite }
  })

  const ranked = scored.sort((a, b) => {
    const diff = b.composite - a.composite
    if (diff !== 0) return diff
    return (b.market ?? -1) - (a.market ?? -1)
  })

  // Garde anti-dérive : ne jamais préférer un mot-clé totalement hors-sujet
  // s'il existe un candidat qui touche le sujet.
  const onTopic = ranked.filter((c) => c.affinity > 0)
  const offTopic = ranked.filter((c) => c.affinity === 0)
  return (onTopic.length > 0 ? [...onTopic, ...offTopic] : ranked).map(toChoice)
}

/** Le meilleur candidat du classement (`rankCapitaines`). */
export function pickCapitaine(
  candidates: CapitaineInput[],
  topic = '',
  level = 'intermediaire',
): CapitaineChoice | null {
  return rankCapitaines(candidates, topic, level)[0] ?? null
}

/** Candidats soumis à la porte capitaine avant de renoncer : chaque évaluation est gratuite (base). */
export const MAX_GATE_TRIES = 5

/**
 * Le premier candidat du classement que la porte capitaine accepte sans
 * aucune alerte (C8 : un pilier doit passer sans dérogation). `evaluate` rend
 * les alertes de la porte pour un mot-clé. Aucun candidat propre : le premier
 * du classement — la porte le refusera et le run s'arrêtera en le disant,
 * plutôt que de déroger à la place de l'utilisateur.
 */
export async function chooseThroughGate(
  ranked: CapitaineChoice[],
  evaluate: (keyword: string) => Promise<string[]>,
  maxTries = MAX_GATE_TRIES,
): Promise<{ choice: CapitaineChoice; clean: boolean; rejected: Array<{ keyword: string; issues: string[] }> } | null> {
  if (ranked.length === 0) return null
  const rejected: Array<{ keyword: string; issues: string[] }> = []
  for (const candidate of ranked.slice(0, maxTries)) {
    const issues = await evaluate(candidate.keyword)
    if (issues.length === 0) return { choice: candidate, clean: true, rejected }
    rejected.push({ keyword: candidate.keyword, issues })
  }
  return { choice: ranked[0]!, clean: false, rejected }
}
