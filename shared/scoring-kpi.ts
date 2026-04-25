import type { ArticleLevel } from './types/keyword-validate.types.js'
import type { RadarIntentType, RadarKeywordKpis } from './types/intent.types.js'
import { getThresholds, scoreKpi } from './kpi-scoring.js'

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

const WEIGHTS = {
  volume:       0.30,
  kd:           0.25,
  cpc:          0.15,
  intent:       0.15,
  paa:          0.10,
  autocomplete: 0.05,
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

  const total = Math.round(
    components.reduce((sum, c) => sum + c.normalized * c.weight, 0),
  )

  return { total, components }
}
