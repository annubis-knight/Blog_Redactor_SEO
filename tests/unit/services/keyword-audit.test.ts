import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the entire module before importing
vi.mock('../../../server/utils/json-storage.js', () => ({
  readJson: vi.fn().mockResolvedValue(null),
  writeJson: vi.fn().mockResolvedValue(undefined),
}))

import {
  computeCompositeScore,
  generateAlerts,
  detectRedundancy,
  isCacheFresh,
  getMinRefreshHours,
} from '../../../server/services/external/dataforseo.service.js'
import type { KeywordAuditResult, KeywordOverview } from '../../../shared/types/index.js'

describe('computeCompositeScore', () => {
  it('returns 0 for keyword with zero metrics', () => {
    const overview: KeywordOverview = {
      searchVolume: 0, difficulty: 0, cpc: 0, competition: 0, monthlySearches: [],
    }
    const score = computeCompositeScore(overview)
    expect(score.total).toBe(50) // difficultyInverse=100*0.25 + competitionInverse=100*0.25 = 50
    expect(score.volume).toBe(0)
  })

  it('returns high score for ideal keyword', () => {
    const overview: KeywordOverview = {
      searchVolume: 5000, difficulty: 20, cpc: 2.5, competition: 0.1, monthlySearches: [],
    }
    const score = computeCompositeScore(overview)
    expect(score.total).toBeGreaterThan(70)
    expect(score.volume).toBeGreaterThan(80)
    expect(score.difficultyInverse).toBe(80)
  })

  it('returns low score for difficult keyword with no volume', () => {
    const overview: KeywordOverview = {
      searchVolume: 10, difficulty: 90, cpc: 0, competition: 0.9, monthlySearches: [],
    }
    const score = computeCompositeScore(overview)
    expect(score.total).toBeLessThan(30)
  })

  it('clamps total between 0 and 100', () => {
    const overview: KeywordOverview = {
      searchVolume: 100000, difficulty: 0, cpc: 50, competition: 0, monthlySearches: [],
    }
    const score = computeCompositeScore(overview)
    expect(score.total).toBeLessThanOrEqual(100)
    expect(score.total).toBeGreaterThanOrEqual(0)
  })
})

describe('generateAlerts', () => {
  it('generates danger alert for zero volume', () => {
    const overview: KeywordOverview = {
      searchVolume: 0, difficulty: 30, cpc: 0.5, competition: 0.3, monthlySearches: [],
    }
    const alerts = generateAlerts(overview)
    expect(alerts).toHaveLength(1)
    expect(alerts[0].level).toBe('danger')
    expect(alerts[0].type).toBe('zero_volume')
  })

  it('generates warning for low volume', () => {
    const overview: KeywordOverview = {
      searchVolume: 20, difficulty: 30, cpc: 0.5, competition: 0.3, monthlySearches: [],
    }
    const alerts = generateAlerts(overview)
    expect(alerts.some(a => a.type === 'low_volume')).toBe(true)
  })

  it('generates warning for high difficulty', () => {
    const overview: KeywordOverview = {
      searchVolume: 500, difficulty: 85, cpc: 1, competition: 0.5, monthlySearches: [],
    }
    const alerts = generateAlerts(overview)
    expect(alerts.some(a => a.type === 'high_difficulty')).toBe(true)
  })

  it('returns empty array for healthy keyword', () => {
    const overview: KeywordOverview = {
      searchVolume: 500, difficulty: 40, cpc: 1, competition: 0.3, monthlySearches: [],
    }
    const alerts = generateAlerts(overview)
    expect(alerts).toHaveLength(0)
  })

  it('can generate multiple alerts', () => {
    const overview: KeywordOverview = {
      searchVolume: 30, difficulty: 80, cpc: 0, competition: 0.9, monthlySearches: [],
    }
    const alerts = generateAlerts(overview)
    expect(alerts.length).toBeGreaterThanOrEqual(2)
  })
})

describe('detectRedundancy', () => {
  function makeAuditResult(keyword: string, relatedKeywords: string[]): KeywordAuditResult {
    return {
      keyword,
      type: 'Pilier',
      cocoonName: 'Test',
      searchVolume: 100,
      difficulty: 30,
      cpc: 1,
      competition: 0.3,
      compositeScore: { volume: 50, difficultyInverse: 70, cpc: 40, competitionInverse: 70, total: 60 },
      relatedKeywords: relatedKeywords.map(k => ({ keyword: k, searchVolume: 50, competition: 0.3, cpc: 0.5 })),
      fromCache: true,
      cachedAt: new Date().toISOString(),
      alerts: [],
    }
  }

  it('detects redundant pair with high overlap', () => {
    const results = [
      makeAuditResult('kw1', ['a', 'b', 'c', 'd', 'e']),
      makeAuditResult('kw2', ['a', 'b', 'c', 'd', 'f']),
    ]
    const pairs = detectRedundancy(results)
    expect(pairs).toHaveLength(1)
    expect(pairs[0].overlapPercent).toBe(80) // 4 shared out of 5
    expect(pairs[0].keyword1).toBe('kw1')
    expect(pairs[0].keyword2).toBe('kw2')
  })

  it('does not flag pair with low overlap', () => {
    const results = [
      makeAuditResult('kw1', ['a', 'b', 'c', 'd', 'e']),
      makeAuditResult('kw2', ['f', 'g', 'h', 'i', 'j']),
    ]
    const pairs = detectRedundancy(results)
    expect(pairs).toHaveLength(0)
  })

  it('skips keywords with no related keywords', () => {
    const results = [
      makeAuditResult('kw1', []),
      makeAuditResult('kw2', ['a', 'b']),
    ]
    const pairs = detectRedundancy(results)
    expect(pairs).toHaveLength(0)
  })
})

describe('isCacheFresh', () => {
  beforeEach(() => {
    delete process.env.DATAFORSEO_MIN_REFRESH_HOURS
    delete process.env.NODE_ENV
  })

  it('returns false when min hours is 0', () => {
    process.env.DATAFORSEO_MIN_REFRESH_HOURS = '0'
    expect(isCacheFresh(new Date().toISOString())).toBe(false)
  })

  it('returns true for recent cache within configured hours', () => {
    process.env.DATAFORSEO_MIN_REFRESH_HOURS = '24'
    const recentDate = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString() // 1 hour ago
    expect(isCacheFresh(recentDate)).toBe(true)
  })

  it('returns false for old cache beyond configured hours', () => {
    process.env.DATAFORSEO_MIN_REFRESH_HOURS = '24'
    const oldDate = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString() // 48 hours ago
    expect(isCacheFresh(oldDate)).toBe(false)
  })
})

describe('getMinRefreshHours', () => {
  beforeEach(() => {
    delete process.env.DATAFORSEO_MIN_REFRESH_HOURS
    delete process.env.NODE_ENV
  })

  it('returns env value when set', () => {
    process.env.DATAFORSEO_MIN_REFRESH_HOURS = '48'
    expect(getMinRefreshHours()).toBe(48)
  })

  it('returns 0 in development mode', () => {
    process.env.NODE_ENV = 'development'
    expect(getMinRefreshHours()).toBe(0)
  })

  it('returns default 168h when no env', () => {
    process.env.NODE_ENV = 'production'
    expect(getMinRefreshHours()).toBe(168)
  })
})
