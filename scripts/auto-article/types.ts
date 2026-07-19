/**
 * Types partagés du CLI de génération automatique d'article.
 *
 * Aucune I/O ici — uniquement les contrats de données qui circulent entre
 * les phases (Cerveau → Moteur → Rédaction), l'orchestrateur et le rapport.
 */

export type RuntimeMode = 'mock' | 'real'

/** Niveau d'article dans le cocon sémantique (impacte seuils + compteurs). */
export type ArticleType = 'Pilier' | 'Intermédiaire' | 'Spécialisé'

export type PhaseName = 'cerveau' | 'moteur' | 'redaction'

/** Points de validation humaine entre les phases. */
export type GateName = 'gate1' | 'gate2'

/**
 * Décision prise par l'utilisateur à un gate.
 * - validate : on continue vers la phase suivante
 * - regenerate / rerun / edit : on rejoue la phase courante
 * - abort : on arrête le run proprement
 */
export type GateDecision = 'validate' | 'regenerate' | 'rerun' | 'edit' | 'abort'

/** Configuration résolue d'un run (après parsing des flags + défauts). */
export interface AutoRunConfig {
  mode: RuntimeMode
  baseUrl: string
  verbose: boolean
  configPath: string | null
  resumeArticleId: number | null
  nonInteractive: boolean
}

/** Saisie minimale demandée à l'utilisateur au démarrage. */
export interface InitialInput {
  topic: string
  cocoonName: string
  businessContext: string
  articleType: ArticleType
}

/** Récap des 6 étapes de stratégie du Cerveau. */
export interface StrategyRecap {
  cible?: string
  douleur?: string
  aiguillage?: string
  angle?: string
  promesse?: string
  cta?: string
}

/**
 * État mutable porté d'un bout à l'autre du pipeline. Chaque phase le remplit.
 * `articleId` reste `null` tant que le Cerveau n'a pas créé l'article.
 */
export interface AutoRunContext {
  config: AutoRunConfig
  input: InitialInput
  cocoonName: string
  articleId: number | null
  articleTitle: string
  pilierKeyword: string
  articleType: ArticleType
  painPoint: string
  strategy: StrategyRecap
  /** Brief IA brut, conservé pour la persistance après validation du Gate 1. */
  intake: AutoIntake | null
  /** Arbre SEO pré-rendu (ASCII) pour affichage au Gate 1. */
  treeRender: string
  /** Emplacement retenu (proposé par l'IA, validable/corrigeable au Gate 1). */
  placement: PlacementDecision | null
  /** Alternatives présélectionnées (avec scores), affichées au Gate 1. */
  placementOptions: PlacementOption[]
  radarCandidates: RadarCandidate[]
  capitaine: string | null
  /** Collisions de mots-clés détectées avec les articles existants du thème. */
  cannibalization: CannibalizationHit[]
  lieutenants: string[]
  lexique: string[]
  articleContent: string | null
  metaTitle: string | null
  metaDescription: string | null
  exportPath: string | null
  resume: ResumePlan
}

import type { CannibalizationHit } from './heuristics/detect-cannibalization.js'

export type { CannibalizationHit }

/** Type article canonique attendu par l'API (kebab lowercase). */
export type CanonicalArticleType = 'pilier' | 'intermediaire' | 'specifique'

/** Brief éditorial renvoyé par POST /api/generate/auto-intake. */
export interface AutoIntake {
  articleTitle: string
  pilierKeyword: string
  painPoint: string
  cible: string
  douleur: string
  angle: string
  promesse: string
  cta: string
}

/**
 * Emplacement d'un article dans l'arbre SEO (silo → cocon → niveau).
 * Proposé par le script, validé (ou corrigé) par l'utilisateur au Gate 1.
 */
export interface PlacementDecision {
  siloName: string
  cocoonName: string
  level: CanonicalArticleType
  rationale: string
  createCocoon: boolean
  /** L'IA juge le sujet étranger à l'activité — alerte au Gate 1, non bloquant. */
  outOfScope?: boolean
}

/** Emplacement candidat présenté au Gate 1, avec son score, pour audit. */
export interface PlacementOption {
  siloName: string
  cocoonName: string
  level: CanonicalArticleType
  /** Score composite 0-1 de l'heuristique de présélection. */
  score: number
  isEmpty: boolean
  /** Composition résumée : « P1 · I6 · S9 » ou « vide ». */
  summary: string
}

/** Plan de reprise (`--resume`) : quelles phases sauter car déjà réalisées. */
export interface ResumePlan {
  active: boolean
  skipCerveau: boolean
  skipMoteur: boolean
  skipRedaction: boolean
}

/** Mot-clé semence pour le scan Radar (forme attendue par l'API : objet). */
export interface RadarSeedKeyword {
  keyword: string
  reasoning: string
}

/** Candidat retenu après scan Radar (alimente la sélection Capitaine). */
export interface RadarCandidate {
  keyword: string
  reasoning: string
  marketScore: number
}

/** Forme tolérante des objets `usage` renvoyés par les endpoints IA. */
export interface ApiUsageLike {
  estimatedCost?: number
  inputTokens?: number
  outputTokens?: number
  model?: string
}

/** Un événement SSE décodé (event + data JSON si parsable, sinon string brute). */
export interface SseEvent {
  event: string
  data: unknown
}
