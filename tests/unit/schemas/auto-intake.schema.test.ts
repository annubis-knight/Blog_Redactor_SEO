import { describe, it, expect } from 'vitest'
import { autoIntakeRequestSchema, autoIntakeResponseSchema } from '../../../shared/schemas/auto-intake.schema.js'

describe('auto-intake schema — request', () => {
  it('accepte un topic seul (défauts appliqués)', () => {
    const parsed = autoIntakeRequestSchema.parse({ topic: 'sujet' })
    expect(parsed.businessContext).toBe('')
    expect(parsed.cocoonName).toBe('')
  })

  it('rejette un topic vide', () => {
    expect(autoIntakeRequestSchema.safeParse({ topic: '' }).success).toBe(false)
  })

  it('valide le type article canonique', () => {
    expect(autoIntakeRequestSchema.safeParse({ topic: 'x', articleType: 'pilier' }).success).toBe(true)
    expect(autoIntakeRequestSchema.safeParse({ topic: 'x', articleType: 'Pilier' }).success).toBe(false)
  })
})

describe('auto-intake schema — response', () => {
  const valid = {
    articleTitle: 'T', pilierKeyword: 'k', painPoint: 'p',
    cible: 'c', douleur: 'd', angle: 'a', promesse: 'pr', cta: 'cta',
  }

  it('accepte une réponse complète', () => {
    expect(autoIntakeResponseSchema.safeParse(valid).success).toBe(true)
  })

  it('rejette un champ manquant', () => {
    const { angle: _angle, ...incomplete } = valid
    expect(autoIntakeResponseSchema.safeParse(incomplete).success).toBe(false)
  })

  it('rejette un champ vide', () => {
    expect(autoIntakeResponseSchema.safeParse({ ...valid, cta: '' }).success).toBe(false)
  })
})
