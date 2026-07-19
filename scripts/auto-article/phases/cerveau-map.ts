/**
 * Mapping pur intake IA → payload de stratégie article (forme `ArticleStrategy`
 * partielle acceptée par PUT /api/strategy/:id) + récap pour le Gate 1.
 *
 * La forme cible est imposée par `shared/schemas/strategy.schema.ts`
 * (articleStrategySchema). On ne renvoie que les champs qu'on remplit ; le
 * backend fusionne avec le squelette vide.
 */

import type { AutoIntake, CanonicalArticleType, StrategyRecap } from '../types.js'

interface StrategyStep {
  input: string
  suggestion: string | null
  validated: string
}

export interface StrategyPayload {
  cible: StrategyStep
  douleur: StrategyStep
  aiguillage: {
    suggestedType: CanonicalArticleType | null
    suggestedParent: string | null
    suggestedChildren: string[]
    validated: boolean
  }
  angle: StrategyStep
  promesse: StrategyStep
  cta: {
    type: 'service' | 'formulaire' | 'guide' | 'autre'
    target: string
    suggestion: string | null
  }
  completedSteps: number
}

const step = (validated: string): StrategyStep => ({ input: '', suggestion: null, validated })

export function buildStrategyPayload(
  intake: AutoIntake,
  canonicalType: CanonicalArticleType,
): StrategyPayload {
  return {
    cible: step(intake.cible),
    douleur: step(intake.douleur),
    aiguillage: {
      suggestedType: canonicalType,
      suggestedParent: null,
      suggestedChildren: [],
      validated: true,
    },
    angle: step(intake.angle),
    promesse: step(intake.promesse),
    cta: { type: 'service', target: intake.cta, suggestion: null },
    completedSteps: 6,
  }
}

export function buildStrategyRecap(intake: AutoIntake): StrategyRecap {
  return {
    cible: intake.cible,
    douleur: intake.douleur,
    angle: intake.angle,
    promesse: intake.promesse,
    cta: intake.cta,
  }
}
