/**
 * Tests de caractérisation pour keyword-modifiers.store.
 *
 * S2.2 — Sprint 2 stabilisation. On fige le comportement actuel :
 * - getEffective renvoie l'override si présent, sinon detectModifiers auto
 * - setModifier crée un override par (articleId + keyword) — sans persistance backend
 * - resetKeyword efface l'override d'un mot-clé spécifique
 * - resetAll efface tous les overrides
 * - hasOverrides reflète la présence d'au moins un override
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useKeywordModifiersStore } from '@/stores/article/keyword-modifiers.store'

describe('moteur:keyword-modifiers:initial state', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('starts with empty overrides and hasOverrides=false', () => {
    const store = useKeywordModifiersStore()
    expect(store.overrides).toEqual({})
    expect(store.hasOverrides).toBe(false)
  })
})

describe('moteur:keyword-modifiers:getEffective (no override)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('falls back to detectModifiers (auto detection) when no override set', () => {
    const store = useKeywordModifiersStore()
    // detectModifiers retourne un tableau aligné sur les mots du keyword
    const result = store.getEffective(1, 'erp cloud')
    expect(Array.isArray(result)).toBe(true)
    expect(result).toHaveLength(2) // 2 mots
  })

  it('returns same array length as keyword word count', () => {
    const store = useKeywordModifiersStore()
    expect(store.getEffective(1, 'mot')).toHaveLength(1)
    expect(store.getEffective(1, 'a b c d e')).toHaveLength(5)
  })

  it('handles articleId=null (treats as bucket 0)', () => {
    const store = useKeywordModifiersStore()
    expect(() => store.getEffective(null, 'seo')).not.toThrow()
  })
})

describe('moteur:keyword-modifiers:setModifier', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('creates an override array on first setModifier call', () => {
    const store = useKeywordModifiersStore()
    store.setModifier(1, 'erp cloud', 0, 'specific')
    const eff = store.getEffective(1, 'erp cloud')
    expect(eff[0]).toBe('specific')
    expect(store.hasOverrides).toBe(true)
  })

  it('subsequent calls update existing override (not replace whole array)', () => {
    const store = useKeywordModifiersStore()
    store.setModifier(1, 'erp cloud', 0, 'specific')
    store.setModifier(1, 'erp cloud', 1, 'modifier')
    const eff = store.getEffective(1, 'erp cloud')
    expect(eff[0]).toBe('specific')
    expect(eff[1]).toBe('modifier')
  })

  it('isolates overrides per articleId', () => {
    const store = useKeywordModifiersStore()
    store.setModifier(1, 'erp', 0, 'specific')
    store.setModifier(2, 'erp', 0, 'modifier')
    expect(store.getEffective(1, 'erp')[0]).toBe('specific')
    expect(store.getEffective(2, 'erp')[0]).toBe('modifier')
  })

  it('isolates overrides per keyword (case insensitive)', () => {
    const store = useKeywordModifiersStore()
    store.setModifier(1, 'erp', 0, 'specific')
    // Normalisation: même articleId, même keyword en lower → même bucket
    expect(store.getEffective(1, 'ERP')[0]).toBe('specific')
  })

  it('ignores out-of-range wordIndex (no throw)', () => {
    const store = useKeywordModifiersStore()
    expect(() => store.setModifier(1, 'mot', 99, 'specific')).not.toThrow()
    // No override created
    const eff = store.getEffective(1, 'mot')
    // Either auto-detected or null — but no error
    expect(eff).toHaveLength(1)
  })

  it('null kind removes the tag at that position', () => {
    const store = useKeywordModifiersStore()
    store.setModifier(1, 'erp cloud', 0, 'specific')
    store.setModifier(1, 'erp cloud', 0, null)
    expect(store.getEffective(1, 'erp cloud')[0]).toBeNull()
  })
})

describe('moteur:keyword-modifiers:resetKeyword', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('removes override and falls back to auto detection', () => {
    const store = useKeywordModifiersStore()
    store.setModifier(1, 'seo audit', 0, 'specific')
    expect(store.hasOverrides).toBe(true)
    store.resetKeyword(1, 'seo audit')
    expect(store.hasOverrides).toBe(false)
  })

  it('does nothing when no override exists for the keyword', () => {
    const store = useKeywordModifiersStore()
    expect(() => store.resetKeyword(1, 'unknown')).not.toThrow()
    expect(store.hasOverrides).toBe(false)
  })

  it('only resets the targeted keyword (other overrides preserved)', () => {
    const store = useKeywordModifiersStore()
    store.setModifier(1, 'k1', 0, 'specific')
    store.setModifier(1, 'k2', 0, 'specific')
    store.resetKeyword(1, 'k1')
    expect(store.hasOverrides).toBe(true) // k2 still here
  })
})

describe('moteur:keyword-modifiers:resetAll', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('clears all overrides across articleIds and keywords', () => {
    const store = useKeywordModifiersStore()
    store.setModifier(1, 'k1', 0, 'specific')
    store.setModifier(2, 'k2', 0, 'modifier')
    store.resetAll()
    expect(store.overrides).toEqual({})
    expect(store.hasOverrides).toBe(false)
  })
})
