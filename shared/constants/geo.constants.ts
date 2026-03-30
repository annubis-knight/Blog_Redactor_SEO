/** Target percentage of H2/H3 formulated as questions */
export const QUESTION_HEADINGS_TARGET = 70 as const

/** Target range for sourced statistics count */
export const SOURCED_STATS_TARGET = { min: 3, max: 5 } as const

/** GEO score factor weights (must sum to 1.0) */
export const GEO_SCORE_WEIGHTS = {
  extractibility: 0.30,
  questionHeadings: 0.25,
  answerCapsules: 0.25,
  sourcedStats: 0.20,
} as const

/** GEO score level thresholds */
export const GEO_SCORE_LEVELS = { good: 70, fair: 40 } as const

/** Maximum paragraph word count before triggering a warning (Story 5.4) */
export const MAX_PARAGRAPH_WORDS = 80 as const

/** Jargon terms with plain-language suggestions (FR44, configurable NFR13) */
export const JARGON_DICTIONARY: Record<string, string> = {
  'synergie': 'collaboration',
  'leverage': 'utiliser',
  'scalable': 'évolutif',
  'disruptif': 'innovant',
  'paradigme': 'modèle',
  'holistique': 'global',
  'best practice': 'bonne pratique',
  'pain point': 'problème',
  'game changer': 'avancée majeure',
  'win-win': 'bénéfique pour tous',
  'roadmap': 'feuille de route',
  'benchmark': 'référence',
  'onboarder': 'intégrer',
  'brainstorming': 'réflexion collective',
  'feedback': 'retour',
  'workflow': 'processus',
  'mindset': 'état d\'esprit',
  'stakeholder': 'partie prenante',
  'deliverable': 'livrable',
  'empower': 'autonomiser',
  'proactif': 'anticipé',
  'impactant': 'marquant',
  'incrémenter': 'augmenter progressivement',
  'monétiser': 'rentabiliser',
  'optimiser': 'améliorer',
} as const
