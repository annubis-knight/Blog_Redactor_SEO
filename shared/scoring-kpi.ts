import type { ArticleLevel } from './types/keyword-validate.types.js'
import type { RadarIntentType, RadarKeywordKpis } from './types/intent.types.js'
import { getThresholds, scoreKpi } from './kpi-scoring.js'
import { verdictFromScore, type MarketScoreResult } from './types/scoring.types.js'

export interface KpiScoreComponent {
  name: 'volume' | 'kd' | 'cpc' | 'intent' | 'paa' | 'autocomplete'
  label: string
  rawLabel: string
  normalized: number
  weight: number
  color: 'green' | 'orange' | 'red' | 'neutral' | 'bonus'
}

export interface KpiScoreBreakdown {
  total: number
  components: KpiScoreComponent[]
}

/**
 * Pondération du Score KPI / Marché (cf. docs/scoring-kpi-vs-relevance.md).
 *
 *   Volume       30 %   ← cœur du marché
 *   KD           20 %   ← filtre de difficulté SEO
 *   Intent       15 %   ← type d'intent (pas l'alignement douleur)
 *   PAA          10 %   ← QUANTITÉ de questions PAA (pas la qualité)
 *   Autocomplete 10 %   ← QUANTITÉ de matches (pas la qualité)
 *   CPC          10 %   ← proxy valeur commerciale
 *
 * Total = 95 %, score plafonné à 100. Le 5 % laisse une marge symbolique.
 * Les signaux d'alignement avec le point de douleur n'apparaissent PAS ici —
 * ils vivent dans `computeRelevanceScore` (shared/scoring.ts).
 */
const WEIGHTS = {
  volume:       0.30,
  kd:           0.20,
  intent:       0.15,
  paa:          0.10,
  autocomplete: 0.10,
  cpc:          0.10,
} as const

function normalizeFromColor(color: KpiScoreComponent['color']): number {
  if (color === 'green' || color === 'bonus') return 100
  if (color === 'orange') return 50
  if (color === 'red') return 0
  return 50
}

function intentValueToPseudoScore(intentTypes: RadarIntentType[], prob: number | null): number {
  if (!intentTypes.length) return 0
  const INTENT_VALUES: Record<RadarIntentType, number> = {
    commercial:    1.0,
    transactional: 0.8,
    informational: 0.5,
    navigational:  0.2,
  }
  const maxVal = Math.max(...intentTypes.map(t => INTENT_VALUES[t] ?? 0))
  const confidence = prob ?? 1
  return maxVal * confidence
}

export function computeKpiScore(kpis: RadarKeywordKpis, level: ArticleLevel): KpiScoreBreakdown {
  const thresholds = getThresholds(level)

  // FR-INFRA-KPI-NULLABLE : on passe le null tel quel à scoreKpi, qui retourne
  // color='neutral' + label='—' pour un rawValue null. La pondération du total
  // (FR-INFRA-KPI-SCORING-NULLSAFE) exclut ces composantes pour ne pas
  // contaminer le score par un "50" arbitraire (couleur neutre).
  const volumeResult = scoreKpi('volume', kpis.searchVolume, thresholds)
  const kdResult = scoreKpi('kd', kpis.difficulty, thresholds)
  const cpcResult = scoreKpi('cpc', kpis.cpc, thresholds)
  const paaResult = scoreKpi('paa', kpis.paaWeightedScore, thresholds)
  const autocompleteResult = scoreKpi('autocomplete', kpis.autocompleteMatchCount, thresholds)

  const intentPseudo = intentValueToPseudoScore(kpis.intentTypes, kpis.intentProbability)
  const intentResult = scoreKpi('intent', intentPseudo, thresholds)

  const components: KpiScoreComponent[] = [
    { name: 'volume',       label: 'Volume',       rawLabel: volumeResult.label,       normalized: normalizeFromColor(volumeResult.color),       weight: WEIGHTS.volume,       color: volumeResult.color },
    { name: 'kd',           label: 'KD',           rawLabel: kdResult.label,           normalized: normalizeFromColor(kdResult.color),           weight: WEIGHTS.kd,           color: kdResult.color },
    { name: 'cpc',          label: 'CPC',          rawLabel: cpcResult.label,          normalized: normalizeFromColor(cpcResult.color),          weight: WEIGHTS.cpc,          color: cpcResult.color },
    { name: 'intent',       label: 'Intent',       rawLabel: kpis.intentTypes.join(', ') || 'inconnu', normalized: normalizeFromColor(intentResult.color), weight: WEIGHTS.intent, color: intentResult.color },
    { name: 'paa',          label: 'PAA',          rawLabel: paaResult.label,          normalized: normalizeFromColor(paaResult.color),          weight: WEIGHTS.paa,          color: paaResult.color },
    { name: 'autocomplete', label: 'Autocomplete', rawLabel: autocompleteResult.label, normalized: normalizeFromColor(autocompleteResult.color), weight: WEIGHTS.autocomplete, color: autocompleteResult.color },
  ]

  // Renormalisation null-safe : exclure les composantes dont le KPI source est
  // absent (rawLabel === '—'). Si toutes sont absentes → total = 0 (signal
  // « pas de marché exploitable »). Sinon : moyenne pondérée sur les poids
  // effectifs uniquement, ramenée à 100.
  const effective = components.filter(c => c.rawLabel !== '—')
  const totalWeight = effective.reduce((sum, c) => sum + c.weight, 0)
  const total = effective.length === 0 || totalWeight === 0
    ? 0
    : Math.round(
      effective.reduce((sum, c) => sum + c.normalized * c.weight, 0) / totalWeight,
    )

  return { total, components }
}

/**
 * Score KPI / Marché (0-100) prêt à être consommé par le frontend onglet Radar.
 *
 * Wrapper sur `computeKpiScore` qui ajoute un verdict (GO / ORANGE / NOGO).
 * Le verdict est purement informatif : il NE bloque PAS la progression du moteur.
 */
export function computeMarketScore(kpis: RadarKeywordKpis, level: ArticleLevel): MarketScoreResult {
  const breakdown = computeKpiScore(kpis, level)
  return {
    total: breakdown.total,
    verdict: verdictFromScore(breakdown.total),
    components: breakdown.components,
  }
}
