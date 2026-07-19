import { describe, it, expect } from 'vitest'
import { buildStrategyPayload, buildStrategyRecap } from '../../../../scripts/auto-article/phases/cerveau-map.js'
import type { AutoIntake } from '../../../../scripts/auto-article/types.js'

const intake: AutoIntake = {
  articleTitle: 'Titre',
  pilierKeyword: 'seo local',
  painPoint: 'pas de leads',
  cible: 'TPE locales',
  douleur: 'invisible sur Google',
  angle: 'pédagogique',
  promesse: 'top 3 en 90j',
  cta: 'audit offert',
}

describe('auto:cerveau-map — buildStrategyPayload', () => {
  it('remplit les 6 étapes et marque completedSteps=6', () => {
    const p = buildStrategyPayload(intake, 'pilier')
    expect(p.completedSteps).toBe(6)
    expect(p.cible).toEqual({ input: '', suggestion: null, validated: 'TPE locales' })
    expect(p.angle.validated).toBe('pédagogique')
  })

  it('aiguillage reprend le type canonique et est validé', () => {
    const p = buildStrategyPayload(intake, 'specifique')
    expect(p.aiguillage.suggestedType).toBe('specifique')
    expect(p.aiguillage.validated).toBe(true)
    expect(p.aiguillage.suggestedChildren).toEqual([])
  })

  it('cta est de type service avec la cible en target', () => {
    const p = buildStrategyPayload(intake, 'intermediaire')
    expect(p.cta).toEqual({ type: 'service', target: 'audit offert', suggestion: null })
  })
})

describe('auto:cerveau-map — buildStrategyRecap', () => {
  it('extrait les 5 champs pour le Gate 1', () => {
    expect(buildStrategyRecap(intake)).toEqual({
      cible: 'TPE locales',
      douleur: 'invisible sur Google',
      angle: 'pédagogique',
      promesse: 'top 3 en 90j',
      cta: 'audit offert',
    })
  })
})
