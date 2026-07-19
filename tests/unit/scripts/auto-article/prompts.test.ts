import { describe, it, expect } from 'vitest'
import { resolveArticleType } from '../../../../scripts/auto-article/prompts.js'

describe('auto:prompts — resolveArticleType', () => {
  it('1 ou "pil…" = Pilier', () => {
    expect(resolveArticleType('1')).toBe('Pilier')
    expect(resolveArticleType('Pilier')).toBe('Pilier')
  })

  it('3 ou "spé…" = Spécialisé', () => {
    expect(resolveArticleType('3')).toBe('Spécialisé')
    expect(resolveArticleType('spe')).toBe('Spécialisé')
    expect(resolveArticleType('Spécialisé')).toBe('Spécialisé')
  })

  it('défaut = Intermédiaire (vide, 2, inconnu)', () => {
    expect(resolveArticleType('')).toBe('Intermédiaire')
    expect(resolveArticleType('2')).toBe('Intermédiaire')
    expect(resolveArticleType('bla')).toBe('Intermédiaire')
  })
})
