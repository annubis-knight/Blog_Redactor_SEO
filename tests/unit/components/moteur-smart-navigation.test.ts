import { describe, it, expect } from 'vitest'

// Extract the logic from MoteurView's computeSmartTab for unit testing
type Tab = 'discovery' | 'radar' | 'capitaine' | 'lieutenants' | 'lexique'

function computeSmartTab(completedChecks: string[]): Tab {
  if (completedChecks.length === 0) return 'capitaine'
  if (completedChecks.includes('moteur:capitaine_locked') && completedChecks.includes('moteur:lieutenants_locked') && completedChecks.includes('moteur:lexique_validated')) return 'capitaine'
  if (completedChecks.includes('moteur:lieutenants_locked')) return 'lexique'
  if (completedChecks.includes('moteur:capitaine_locked')) return 'lieutenants'
  return 'capitaine'
}

describe('computeSmartTab — smart navigation', () => {
  it('AC 9: no checks → capitaine', () => {
    expect(computeSmartTab([])).toBe('capitaine')
  })

  it('AC 7: capitaine_locked → lieutenants', () => {
    expect(computeSmartTab(['moteur:capitaine_locked'])).toBe('lieutenants')
  })

  it('AC 8: capitaine_locked + lieutenants_locked → lexique', () => {
    expect(computeSmartTab(['moteur:capitaine_locked', 'moteur:lieutenants_locked'])).toBe('lexique')
  })

  it('AC 10: all Phase 2 checks → capitaine (review from start)', () => {
    expect(computeSmartTab([
      'moteur:capitaine_locked',
      'moteur:lieutenants_locked',
      'moteur:lexique_validated',
    ])).toBe('capitaine')
  })

  it('discovery_done only → capitaine (Phase 1 checks do not affect Phase 2 nav)', () => {
    expect(computeSmartTab(['moteur:discovery_done'])).toBe('capitaine')
  })

  it('discovery_done + radar_done → capitaine', () => {
    expect(computeSmartTab(['moteur:discovery_done', 'moteur:radar_done'])).toBe('capitaine')
  })

  it('discovery + capitaine_locked → lieutenants', () => {
    expect(computeSmartTab(['moteur:discovery_done', 'moteur:radar_done', 'moteur:capitaine_locked'])).toBe('lieutenants')
  })
})
