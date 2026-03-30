import { describe, it, expect } from 'vitest'
import { evaluateKeywordHealth } from '../../../src/utils/keyword-health'
import type { DataForSeoCacheEntry } from '../../../shared/types/index.js'

function makeEntry(overrides: Partial<DataForSeoCacheEntry> = {}): DataForSeoCacheEntry {
  return {
    keyword: 'test keyword',
    serp: [{ position: 1, title: 'Test', url: 'https://example.com', description: '', domain: 'example.com' }],
    paa: [{ question: 'What is test?', answer: 'A test.' }],
    relatedKeywords: [],
    keywordData: {
      searchVolume: 500,
      difficulty: 40,
      cpc: 1.5,
      competition: 0.3,
      monthlySearches: [],
    },
    cachedAt: new Date().toISOString(),
    ...overrides,
  }
}

describe('evaluateKeywordHealth', () => {
  it('returns good alert when keyword is viable', () => {
    const alerts = evaluateKeywordHealth(makeEntry())
    expect(alerts).toHaveLength(1)
    expect(alerts[0].level).toBe('good')
  })

  it('returns danger for zero search volume', () => {
    const alerts = evaluateKeywordHealth(
      makeEntry({ keywordData: { searchVolume: 0, difficulty: 40, cpc: 0, competition: 0, monthlySearches: [] } }),
    )
    const danger = alerts.filter(a => a.level === 'danger')
    expect(danger.length).toBeGreaterThanOrEqual(1)
    expect(danger[0].message).toContain('Aucun volume')
  })

  it('returns danger for empty SERP', () => {
    const alerts = evaluateKeywordHealth(makeEntry({ serp: [] }))
    const danger = alerts.filter(a => a.level === 'danger')
    expect(danger.length).toBeGreaterThanOrEqual(1)
    expect(danger.some(a => a.message.includes('SERP'))).toBe(true)
  })

  it('returns warning for low search volume (1-49)', () => {
    const alerts = evaluateKeywordHealth(
      makeEntry({ keywordData: { searchVolume: 30, difficulty: 40, cpc: 1, competition: 0.3, monthlySearches: [] } }),
    )
    const warning = alerts.filter(a => a.level === 'warning')
    expect(warning.some(a => a.message.includes('30/mois'))).toBe(true)
  })

  it('returns warning for high difficulty (>70)', () => {
    const alerts = evaluateKeywordHealth(
      makeEntry({ keywordData: { searchVolume: 500, difficulty: 85, cpc: 1, competition: 0.3, monthlySearches: [] } }),
    )
    const warning = alerts.filter(a => a.level === 'warning')
    expect(warning.some(a => a.message.includes('85/100'))).toBe(true)
  })

  it('returns warning for no PAA when SERP exists', () => {
    const alerts = evaluateKeywordHealth(makeEntry({ paa: [] }))
    const warning = alerts.filter(a => a.level === 'warning')
    expect(warning.some(a => a.message.includes('PAA'))).toBe(true)
  })

  it('does not warn about PAA when SERP is also empty', () => {
    const alerts = evaluateKeywordHealth(makeEntry({ serp: [], paa: [] }))
    expect(alerts.some(a => a.message.includes('PAA'))).toBe(false)
  })

  it('does not warn about PAA when volume is zero', () => {
    const alerts = evaluateKeywordHealth(
      makeEntry({
        paa: [],
        keywordData: { searchVolume: 0, difficulty: 40, cpc: 0, competition: 0, monthlySearches: [] },
      }),
    )
    expect(alerts.some(a => a.message.includes('PAA'))).toBe(false)
  })

  it('returns multiple alerts for combined issues', () => {
    const alerts = evaluateKeywordHealth(
      makeEntry({
        serp: [],
        keywordData: { searchVolume: 0, difficulty: 85, cpc: 0, competition: 0, monthlySearches: [] },
      }),
    )
    const dangers = alerts.filter(a => a.level === 'danger')
    const warnings = alerts.filter(a => a.level === 'warning')
    expect(dangers.length).toBe(2) // zero volume + empty SERP
    expect(warnings.length).toBe(1) // high difficulty
  })

  it('does not return good alert when issues exist', () => {
    const alerts = evaluateKeywordHealth(
      makeEntry({ keywordData: { searchVolume: 0, difficulty: 40, cpc: 0, competition: 0, monthlySearches: [] } }),
    )
    expect(alerts.some(a => a.level === 'good')).toBe(false)
  })

  it('treats volume exactly 50 as viable (not warning)', () => {
    const alerts = evaluateKeywordHealth(
      makeEntry({ keywordData: { searchVolume: 50, difficulty: 40, cpc: 1, competition: 0.3, monthlySearches: [] } }),
    )
    expect(alerts).toHaveLength(1)
    expect(alerts[0].level).toBe('good')
  })

  it('treats difficulty exactly 70 as viable (not warning)', () => {
    const alerts = evaluateKeywordHealth(
      makeEntry({ keywordData: { searchVolume: 500, difficulty: 70, cpc: 1, competition: 0.3, monthlySearches: [] } }),
    )
    expect(alerts).toHaveLength(1)
    expect(alerts[0].level).toBe('good')
  })
})
