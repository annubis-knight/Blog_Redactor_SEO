import { describe, it, expect } from 'vitest'
import { parseGateInput } from '../../../../scripts/auto-article/gate.js'

describe('auto:gate — parseGateInput', () => {
  it('entrée vide = validate (défaut sûr)', () => {
    expect(parseGateInput('', 'gate1')).toBe('validate')
    expect(parseGateInput('   ', 'gate2')).toBe('validate')
  })

  it('reconnaît validate et abort quel que soit le gate', () => {
    expect(parseGateInput('v', 'gate1')).toBe('validate')
    expect(parseGateInput('oui', 'gate2')).toBe('validate')
    expect(parseGateInput('a', 'gate1')).toBe('abort')
    expect(parseGateInput('quit', 'gate2')).toBe('abort')
  })

  it('gate1 : r = regenerate, e = edit', () => {
    expect(parseGateInput('r', 'gate1')).toBe('regenerate')
    expect(parseGateInput('e', 'gate1')).toBe('edit')
  })

  it('gate2 : r = rerun, pas de edit', () => {
    expect(parseGateInput('r', 'gate2')).toBe('rerun')
    expect(parseGateInput('e', 'gate2')).toBeNull()
  })

  it('insensible à la casse', () => {
    expect(parseGateInput('VALIDER', 'gate1')).toBe('validate')
  })

  it('retourne null si non reconnu', () => {
    expect(parseGateInput('xyz', 'gate1')).toBeNull()
  })
})
