import { describe, it, expect } from 'vitest'

// Extract the logic from MoteurView's computeSmartTab for unit testing
type Tab = 'discovery' | 'radar' | 'capitaine' | 'lieutenants' | 'lexique'

function computeSmartTab(completedChecks: string[]): Tab {
  if (completedChecks.length === 0) return 'capitaine'
  if (completedChecks.includes('capitaine_locked') && completedChecks.includes('lieutenants_locked') && completedChecks.includes('lexique_validated')) return 'capitaine'
  if (completedChecks.includes('lieutenants_locked')) return 'lexique'
  if (completedChecks.includes('capitaine_locked')) return 'lieutenants'
  return 'capitaine'
}

describe('computeSmartTab — smart navigation', () => {
  it('AC 9: no checks → capitaine', () => {
    expect(computeSmartTab([])).toBe('capitaine')
  })

  it('AC 7: capitaine_locked → lieutenants', () => {
    expect(computeSmartTab(['capitaine_locked'])).toBe('lieutenants')
  })

  it('AC 8: capitaine_locked + lieutenants_locked → lexique', () => {
    expect(computeSmartTab(['capitaine_locked', 'lieutenants_locked'])).toBe('lexique')
  })

  it('AC 10: all Phase 2 checks → capitaine (review from start)', () => {
    expect(computeSmartTab([
      'capitaine_locked',
      'lieutenants_locked',
      'lexique_validated',
    ])).toBe('capitaine')
  })

  it('discovery_done only → capitaine (Phase 1 checks do not affect Phase 2 nav)', () => {
    expect(computeSmartTab(['discovery_done'])).toBe('capitaine')
  })

  it('discovery_done + radar_done → capitaine', () => {
    expect(computeSmartTab(['discovery_done', 'radar_done'])).toBe('capitaine')
  })

  it('discovery + capitaine_locked → lieutenants', () => {
    expect(computeSmartTab(['discovery_done', 'radar_done', 'capitaine_locked'])).toBe('lieutenants')
  })
})
