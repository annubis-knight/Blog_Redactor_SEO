import { describe, it, expect } from 'vitest'
import { toCanonicalType } from '../../../../scripts/auto-article/canonical.js'

describe('auto:canonical — toCanonicalType', () => {
  it('mappe les 3 types affichés vers le canonique API', () => {
    expect(toCanonicalType('Pilier')).toBe('pilier')
    expect(toCanonicalType('Intermédiaire')).toBe('intermediaire')
    expect(toCanonicalType('Spécialisé')).toBe('specifique')
  })
})
