import { describe, it, expect } from 'vitest'
import { computeKpiScore } from '../../../shared/scoring-kpi'
import type { RadarKeywordKpis } from '../../../shared/types/intent.types'

function makeKpis(over: Partial<RadarKeywordKpis> = {}): RadarKeywordKpis {
  return {
    searchVolume: 500,
    difficulty: 25,
    cpc: 1.5,
    competition: 0.5,
    intentTypes: ['commercial'],
    intentProbability: 0.9,
    autocompleteMatchCount: 4,
    paaMatchCount: 3,
    paaWeightedScore: 2.5,
    paaTotal: 5,
    avgSemanticScore: null,
    ...over,
  }
}

describe('computeKpiScore', () => {
  it('returns 0-100 integer', () => {
    const r = computeKpiScore(makeKpis(), 'intermediaire')
    expect(r.total).toBeGreaterThanOrEqual(0)
    expect(r.total).toBeLessThanOrEqual(100)
    expect(Number.isInteger(r.total)).toBe(true)
  })

  it('returns 6 components in order', () => {
    const r = computeKpiScore(makeKpis(), 'intermediaire')
    expect(r.components.map(c => c.name)).toEqual(['volume', 'kd', 'cpc', 'intent', 'paa', 'autocomplete'])
  })

  it('weights sum to 1', () => {
    const r = computeKpiScore(makeKpis(), 'intermediaire')
    const sum = r.components.reduce((s, c) => s + c.weight, 0)
    expect(sum).toBeCloseTo(1, 5)
  })

  it('all green → total close to 100', () => {
    const kpis = makeKpis({
      searchVolume: 5000,
      difficulty: 15,
      cpc: 3,
      intentTypes: ['commercial'],
      intentProbability: 1,
      paaWeightedScore: 5,
      autocompleteMatchCount: 2,
    })
    const r = computeKpiScore(kpis, 'intermediaire')
    expect(r.total).toBeGreaterThanOrEqual(90)
  })

  it('all red → total near 0', () => {
    const kpis = makeKpis({
      searchVolume: 0,
      difficulty: 90,
      cpc: 0,
      intentTypes: [],
      intentProbability: 0,
      paaWeightedScore: 0,
      autocompleteMatchCount: 0,
    })
    const r = computeKpiScore(kpis, 'intermediaire')
    expect(r.total).toBeLessThanOrEqual(15)
  })

  it('CPC bonus counts as high', () => {
    const r = computeKpiScore(makeKpis({ cpc: 5 }), 'intermediaire')
    const cpc = r.components.find(c => c.name === 'cpc')!
    expect(cpc.color).toBe('bonus')
    expect(cpc.normalized).toBe(100)
  })

  it('missing intent types → red', () => {
    const r = computeKpiScore(makeKpis({ intentTypes: [] }), 'intermediaire')
    const intent = r.components.find(c => c.name === 'intent')!
    expect(intent.color).toBe('red')
  })

  it('different article level changes score', () => {
    const kpis = makeKpis({ searchVolume: 150 })
    const pilier = computeKpiScore(kpis, 'pilier')
    const specifique = computeKpiScore(kpis, 'specifique')
    // Volume 150 is red for pilier (needs ≥200), green for specifique (needs ≥30)
    const pilierVol = pilier.components.find(c => c.name === 'volume')!
    const specifiqueVol = specifique.components.find(c => c.name === 'volume')!
    expect(pilierVol.normalized).toBeLessThan(specifiqueVol.normalized)
  })
})
