// @vitest-environment node
/**
 * FR-INFRA-KPI-SCORING-NULLSAFE — « Un verdict sur un mot-clé sans aucune
 * donnée est neutre (GRAY), pas négatif. » Une donnée absente reste absente
 * (`rawValue: null`, affichée « — ») : elle ne devient jamais un zéro qui
 * déclencherait un faux NO-GO.
 */
import { describe, it, expect } from 'vitest'
import { getThresholds, scoreKpi, computeVerdict } from '../../../shared/kpi-scoring.js'

const config = getThresholds('pilier')

describe('scoreKpi — une donnée absente reste absente', () => {
  it.each(['volume', 'kd', 'cpc', 'paa', 'intent', 'autocomplete'])('%s absent → rawValue null, « — », neutre', name => {
    const kpi = scoreKpi(name, null, config)
    expect(kpi.rawValue).toBeNull()
    expect(kpi.label).toBe('—')
    expect(kpi.color).toBe('neutral')
  })

  it('un vrai zéro reste un zéro', () => {
    expect(scoreKpi('volume', 0, config).rawValue).toBe(0)
  })
})

describe('computeVerdict — absent n’est pas zéro', () => {
  it('volume, PAA et autocomplétion absents → GRAY « Données insuffisantes », jamais NO-GO', () => {
    const kpis = [
      scoreKpi('volume', null, config),
      scoreKpi('kd', null, config),
      scoreKpi('cpc', null, config),
      scoreKpi('paa', null, config),
      scoreKpi('intent', 0.5, config),
      scoreKpi('autocomplete', null, config),
    ]
    const verdict = computeVerdict(kpis)
    expect(verdict.level).toBe('GRAY')
    expect(verdict.autoNoGo).toBe(false)
  })

  it('les trois signaux réellement à 0 → NO-GO « Aucun signal détecté »', () => {
    const kpis = [
      scoreKpi('volume', 0, config),
      scoreKpi('kd', 10, config),
      scoreKpi('cpc', 0, config),
      scoreKpi('paa', 0, config),
      scoreKpi('intent', 0.5, config),
      scoreKpi('autocomplete', 0, config),
    ]
    const verdict = computeVerdict(kpis)
    expect(verdict.level).toBe('NO-GO')
    expect(verdict.autoNoGo).toBe(true)
  })

  it('volume absent + PAA et autocomplétion à 0 → pas de NO-GO automatique', () => {
    const kpis = [
      scoreKpi('volume', null, config),
      scoreKpi('kd', 10, config),
      scoreKpi('cpc', 1, config),
      scoreKpi('paa', 0, config),
      scoreKpi('intent', 0.8, config),
      scoreKpi('autocomplete', 0, config),
    ]
    expect(computeVerdict(kpis).autoNoGo).toBe(false)
  })

  it('un KPI absent ne compte ni comme vert ni comme rouge', () => {
    const kpis = [
      scoreKpi('volume', 5000, config),
      scoreKpi('kd', null, config),
      scoreKpi('cpc', 3, config),
      scoreKpi('paa', 4, config),
      scoreKpi('intent', 0.9, config),
      scoreKpi('autocomplete', 1, config),
    ]
    const verdict = computeVerdict(kpis)
    expect(verdict.greenCount).toBe(5)
    expect(verdict.level).toBe('GO')
  })
})
