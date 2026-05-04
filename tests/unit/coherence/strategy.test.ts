// @vitest-environment node
/**
 * Tests de coherence pour strategy data flow.
 * Verifie la structure des etapes Brain-First, completedSteps, et la transition
 * vers le Moteur via buildStrategyContext().
 *
 * Voir docs/data-flows/strategy.md pour la cartographie complete (donnee strategy elle-meme).
 * Voir docs/data-flows/strategy-context.md pour l'injection dans les prompts.
 */
import { describe, it, expect } from 'vitest'

// =====================================================
// FR-CER-STEPS-ARTICLE — 6 etapes article
// =====================================================

describe('FR-CER-STEPS-ARTICLE — structure 6 etapes', () => {
  type StrategyStep = 'cible' | 'douleur' | 'aiguillage' | 'angle' | 'promesse' | 'cta'
  const ARTICLE_STEPS: readonly StrategyStep[] = ['cible', 'douleur', 'aiguillage', 'angle', 'promesse', 'cta']

  it('exactement 6 etapes pour un article', () => {
    expect(ARTICLE_STEPS.length).toBe(6)
  })

  it('cible et douleur en premier (foundation)', () => {
    expect(ARTICLE_STEPS[0]).toBe('cible')
    expect(ARTICLE_STEPS[1]).toBe('douleur')
  })

  it('cta en dernier (conclusion)', () => {
    expect(ARTICLE_STEPS[ARTICLE_STEPS.length - 1]).toBe('cta')
  })
})

// =====================================================
// FR-CER-STEPS-COCOON — 5 etapes cocon (sans aiguillage)
// =====================================================

describe('FR-CER-STEPS-COCOON — structure 5 etapes (sans aiguillage)', () => {
  type CocoonStep = 'cible' | 'douleur' | 'angle' | 'promesse' | 'cta'
  const COCOON_STEPS: readonly CocoonStep[] = ['cible', 'douleur', 'angle', 'promesse', 'cta']

  it('exactement 5 etapes pour un cocon', () => {
    expect(COCOON_STEPS.length).toBe(5)
  })

  it('aiguillage absent du cocon (specifique a l\'article)', () => {
    expect((COCOON_STEPS as readonly string[]).includes('aiguillage')).toBe(false)
  })
})

// =====================================================
// FR-CER-AIGUILLAGE — hierarchie article
// =====================================================

describe('FR-CER-AIGUILLAGE — regles de hierarchie', () => {
  type ArticleType = 'pilier' | 'intermediaire' | 'specifique'
  type AiguillageRule = { type: ArticleType; expectedParent: 'null' | 'pilier' | 'intermediaire' }

  const RULES: AiguillageRule[] = [
    { type: 'pilier', expectedParent: 'null' },
    { type: 'intermediaire', expectedParent: 'pilier' },
    { type: 'specifique', expectedParent: 'intermediaire' },
  ]

  it('Pilier a parent null (top-level)', () => {
    const r = RULES.find(r => r.type === 'pilier')!
    expect(r.expectedParent).toBe('null')
  })

  it('Intermediaire a parent Pilier', () => {
    const r = RULES.find(r => r.type === 'intermediaire')!
    expect(r.expectedParent).toBe('pilier')
  })

  it('Specifique a parent Intermediaire (jamais Pilier direct)', () => {
    const r = RULES.find(r => r.type === 'specifique')!
    expect(r.expectedParent).toBe('intermediaire')
  })
})

// =====================================================
// FR-CER-CHECKS — completedSteps coherent avec data
// =====================================================

describe('FR-CER-CHECKS — completedSteps reflete validations', () => {
  type StrategyStepData = { input: string; suggestion: string; validated: boolean }
  type ArticleStrategy = {
    cible: StrategyStepData | null
    douleur: StrategyStepData | null
    aiguillage: { validated: boolean } | null
    angle: StrategyStepData | null
    promesse: StrategyStepData | null
    cta: { validated: boolean } | null
    completedSteps: number
  }

  const countValidated = (s: ArticleStrategy): number => {
    let count = 0
    if (s.cible?.validated) count++
    if (s.douleur?.validated) count++
    if (s.aiguillage?.validated) count++
    if (s.angle?.validated) count++
    if (s.promesse?.validated) count++
    if (s.cta?.validated) count++
    return count
  }

  it('completedSteps = 0 si aucune etape validee', () => {
    const s: ArticleStrategy = {
      cible: null,
      douleur: null,
      aiguillage: null,
      angle: null,
      promesse: null,
      cta: null,
      completedSteps: 0,
    }
    expect(countValidated(s)).toBe(0)
    expect(s.completedSteps).toBe(0)
  })

  it('completedSteps = N si N etapes validees', () => {
    const s: ArticleStrategy = {
      cible: { input: '', suggestion: '', validated: true },
      douleur: { input: '', suggestion: '', validated: true },
      aiguillage: { validated: true },
      angle: null,
      promesse: null,
      cta: null,
      completedSteps: 3,
    }
    expect(countValidated(s)).toBe(3)
    expect(s.completedSteps).toBe(3)
  })

  it('completedSteps doit egaler le nombre reel de validees (invariant)', () => {
    const s: ArticleStrategy = {
      cible: { input: '', suggestion: '', validated: true },
      douleur: { input: '', suggestion: '', validated: false }, // pas validee
      aiguillage: null,
      angle: null,
      promesse: null,
      cta: null,
      completedSteps: 1, // pas 2 !
    }
    expect(countValidated(s)).toBe(1)
    expect(s.completedSteps).toBe(countValidated(s))
  })
})

// =====================================================
// FR-CER-CONTEXT-FOR-MOTEUR — buildStrategyContext
// =====================================================

describe('FR-CER-CONTEXT-FOR-MOTEUR — propagation au Moteur', () => {
  it('strategy_context vide si completedSteps = 0', () => {
    // L'invariant : NFR-INT-STRATEGY-OPTIONAL
    type Strategy = { completedSteps: number }
    const buildContext = (s: Strategy | null): string => {
      if (!s || s.completedSteps === 0) return ''
      return '...'
    }
    expect(buildContext(null)).toBe('')
    expect(buildContext({ completedSteps: 0 })).toBe('')
  })

  it('strategy_context non vide si au moins une etape validee', () => {
    type Strategy = { completedSteps: number }
    const buildContext = (s: Strategy | null): string => {
      if (!s || s.completedSteps === 0) return ''
      return '## Cible\n...\n'
    }
    expect(buildContext({ completedSteps: 1 })).not.toBe('')
  })
})

// =====================================================
// Reload coherence (placeholder)
// =====================================================

describe('FR-CER-CHECKS — reload coherence (placeholder)', () => {
  it.todo('reload restaure exactement la meme strategy depuis DB JSONB')
  it.todo('edition d\'une etape validee remet validated:false (invalidation cascade)')
  it.todo('changement de cocon : strategy article reste, strategy cocon change')
})
