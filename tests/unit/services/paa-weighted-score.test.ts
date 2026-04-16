import { describe, it, expect } from 'vitest'
import { computePaaWeightedScore } from '../../../server/services/intent/intent-scan.service'
import type { ResonanceMatch, RadarMatchQuality } from '../../../shared/types/intent.types'

function item(match: ResonanceMatch, quality?: RadarMatchQuality) {
  return { match, matchQuality: quality }
}

describe('computePaaWeightedScore', () => {
  it('returns 0 for empty array', () => {
    expect(computePaaWeightedScore([])).toBe(0)
  })

  it('returns 0 for all none items', () => {
    const items = [item('none'), item('none'), item('none')]
    expect(computePaaWeightedScore(items)).toBe(0)
  })

  it('scores total+exact = 2.0 per item', () => {
    const items = [item('total', 'exact'), item('total', 'exact'), item('total', 'exact')]
    expect(computePaaWeightedScore(items)).toBe(6.0)
  })

  it('scores total+stem = 1.0 per item', () => {
    const items = [item('total', 'stem'), item('total', 'stem')]
    expect(computePaaWeightedScore(items)).toBe(2.0)
  })

  it('scores total+semantic = 1.0 per item', () => {
    const items = [item('total', 'semantic')]
    expect(computePaaWeightedScore(items)).toBe(1.0)
  })

  it('scores partial+exact = 0.5 per item', () => {
    const items = [item('partial', 'exact'), item('partial', 'exact')]
    expect(computePaaWeightedScore(items)).toBe(1.0)
  })

  it('scores partial+stem = 0.25 per item', () => {
    const items = [item('partial', 'stem'), item('partial', 'stem'), item('partial', 'stem'), item('partial', 'stem')]
    expect(computePaaWeightedScore(items)).toBe(1.0)
  })

  it('scores partial+semantic = 0.25 per item', () => {
    const items = [item('partial', 'semantic')]
    expect(computePaaWeightedScore(items)).toBe(0.25)
  })

  it('handles mixed items correctly', () => {
    // 1 total+exact (2.0) + 2 partial+stem (0.5) + 1 none (0)
    const items = [
      item('total', 'exact'),
      item('partial', 'stem'),
      item('partial', 'stem'),
      item('none'),
    ]
    expect(computePaaWeightedScore(items)).toBe(2.5)
  })

  it('uses stem as fallback when matchQuality is undefined and match is total', () => {
    const items = [{ match: 'total' as ResonanceMatch, matchQuality: undefined }]
    expect(computePaaWeightedScore(items)).toBe(1.0)
  })

  it('uses stem as fallback when matchQuality is undefined and match is partial', () => {
    const items = [{ match: 'partial' as ResonanceMatch, matchQuality: undefined }]
    expect(computePaaWeightedScore(items)).toBe(0.25)
  })

  it('ignores none items even with matchQuality', () => {
    const items = [{ match: 'none' as ResonanceMatch, matchQuality: 'exact' as RadarMatchQuality }]
    expect(computePaaWeightedScore(items)).toBe(0)
  })
})

describe('Radar normalisation', () => {
  it('normalises weighted sum to 0-100 scale (×10, cap 100)', () => {
    // 5 total+exact = 10 points → Math.min(100, 10 * 10) = 100
    const items = Array(5).fill(item('total', 'exact'))
    const score = Math.min(100, computePaaWeightedScore(items) * 10)
    expect(score).toBe(100)
  })

  it('caps at 100 even with high weighted sum', () => {
    const items = Array(10).fill(item('total', 'exact'))
    const score = Math.min(100, computePaaWeightedScore(items) * 10)
    expect(score).toBe(100)
  })

  it('produces low score for many partial+stem items', () => {
    // 4 partial+stem = 1.0 → Math.min(100, 1.0 * 10) = 10
    const items = Array(4).fill(item('partial', 'stem'))
    const score = Math.min(100, computePaaWeightedScore(items) * 10)
    expect(score).toBe(10)
  })

  it('produces 0 for all none items', () => {
    const items = Array(8).fill(item('none'))
    const score = Math.min(100, computePaaWeightedScore(items) * 10)
    expect(score).toBe(0)
  })
})
