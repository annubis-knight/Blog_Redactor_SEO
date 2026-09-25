/**
 * Règles par type d'article — source unique (FR-INFRA-TYPE-RULES-SSOT).
 *
 * Avant l'épopée qualité SEO, ces règles vivaient en plusieurs exemplaires qui
 * se contredisaient : 2 500 mots pour un pilier dans le code, « 2 000-3 000 »
 * dans un prompt, « 6-8 H2 » ici, « 6-12 H2 » là ; l'écran recommandait 2 650
 * mots quand la rédaction en visait 2 500. Tout lecteur passe par ce module :
 * les prompts (`{{type_rules}}`, via `describeTypeRules`), les calculs
 * (recommandation de longueur, budget de rédaction, filtre des lieutenants) et
 * les vérificateurs. Un test (`type-rules-ssot.test.ts`) échoue si une autre
 * table de nombres par type réapparaît.
 */
import type { ArticleLevel } from '../types/keyword-validate.types.js'

export interface ArticleTypeRules {
  /** Libellé affiché. */
  label: 'Pilier' | 'Intermédiaire' | 'Spécialisé'
  /** Longueur visée par défaut (mots) : recommandation sans SERP, budget de rédaction. */
  targetWords: number
  /** Bornes admises pour une longueur recommandée (mots). */
  wordsMin: number
  wordsMax: number
  /** En dessous, le contenu est trop mince (alerte SEO « contenu mince »). */
  wordsFloor: number
  /** Nombre de H2 du sommaire. */
  h2Min: number
  h2Max: number
  /** En dessous, l'alerte SEO « trop peu de chapitres » se déclenche. */
  h2Floor: number
  /** H3 par H2, quand une sous-section a du sens. */
  h3PerH2Min: number
  h3PerH2Max: number
  /** Nombre minimum de lieutenants pour couvrir les recherches voisines. */
  minLieutenants: number
  /** Lieutenants gardés après le tri de l'IA. */
  maxLieutenants: number
  /** Taille du lot de candidats que l'IA propose avant ce tri. */
  lieutenantCandidatesMin: number
  lieutenantCandidatesMax: number
  /** Questions de la FAQ ajoutée par la passe d’enrichissement (FR-RED-ENRICH-PASSES). */
  faqMin: number
  faqMax: number
  /** H2 qui peuvent citer la ville : au-delà, le sommaire sent le bourrage local. */
  localH2Max: number
}

export const ARTICLE_TYPE_RULES: Record<ArticleLevel, ArticleTypeRules> = {
  pilier: {
    label: 'Pilier',
    targetWords: 2500, wordsMin: 1800, wordsMax: 3500, wordsFloor: 1500,
    h2Min: 6, h2Max: 8, h2Floor: 5, h3PerH2Min: 2, h3PerH2Max: 3,
    minLieutenants: 3, maxLieutenants: 5, lieutenantCandidatesMin: 8, lieutenantCandidatesMax: 12,
    faqMin: 4, faqMax: 6, localH2Max: 2,
  },
  intermediaire: {
    label: 'Intermédiaire',
    targetWords: 1800, wordsMin: 1200, wordsMax: 2500, wordsFloor: 900,
    h2Min: 4, h2Max: 6, h2Floor: 3, h3PerH2Min: 2, h3PerH2Max: 3,
    minLieutenants: 2, maxLieutenants: 5, lieutenantCandidatesMin: 6, lieutenantCandidatesMax: 10,
    faqMin: 3, faqMax: 5, localH2Max: 0,
  },
  specifique: {
    label: 'Spécialisé',
    targetWords: 1200, wordsMin: 800, wordsMax: 1500, wordsFloor: 500,
    h2Min: 3, h2Max: 5, h2Floor: 2, h3PerH2Min: 2, h3PerH2Max: 3,
    minLieutenants: 1, maxLieutenants: 4, lieutenantCandidatesMin: 4, lieutenantCandidatesMax: 8,
    faqMin: 3, faqMax: 4, localH2Max: 0,
  },
}

/** Longueur par défaut quand le type est inconnu. */
export const DEFAULT_TARGET_WORDS_FALLBACK = 2000

/** Longueur visée pour un type, ou la valeur par défaut si le type est inconnu. */
export function targetWordsFor(level: string | null | undefined): number {
  return (level && level in ARTICLE_TYPE_RULES)
    ? ARTICLE_TYPE_RULES[level as ArticleLevel].targetWords
    : DEFAULT_TARGET_WORDS_FALLBACK
}

const n = (value: number): string => value.toLocaleString('fr-FR')

/**
 * Les règles d'un type, rédigées pour un prompt (`{{type_rules}}`). Les prompts
 * n'écrivent plus aucun nombre par type : ils citent ce texte.
 */
export function describeTypeRules(level: ArticleLevel): string {
  const r = ARTICLE_TYPE_RULES[level]
  return [
    `Règles du type ${r.label} (à respecter strictement) :`,
    `- Longueur : entre ${n(r.wordsMin)} et ${n(r.wordsMax)} mots, cible ${n(r.targetWords)} mots.`,
    `- Sommaire : ${r.h2Min} à ${r.h2Max} H2 ; ${r.h3PerH2Min} à ${r.h3PerH2Max} H3 par H2, seulement quand une sous-section a du sens.`,
    `- Lieutenants : ${r.lieutenantCandidatesMin} à ${r.lieutenantCandidatesMax} candidats proposés, ${r.minLieutenants} au minimum et ${r.maxLieutenants} au maximum retenus.`,
    `- FAQ : ${r.faqMin} à ${r.faqMax} questions, ajoutées par la passe d’enrichissement.`,
    r.localH2Max === 0
      ? '- SEO local : aucun H2 ne cite la ville (elle reste dans le H1 et le texte).'
      : `- SEO local : au plus ${r.localH2Max} H2 citent la ville ; les autres restent thématiques.`,
  ].join('\n')
}

/**
 * Consigne de FAQ quand le type de l'article est inconnu : la fourchette qui
 * couvre tous les types, annoncée comme telle. Sans elle, le prompt ne donnait
 * aucun nombre de questions (suite C5b).
 */
export function describeUnknownTypeFaq(): string {
  const all = Object.values(ARTICLE_TYPE_RULES)
  const min = Math.min(...all.map(r => r.faqMin))
  const max = Math.max(...all.map(r => r.faqMax))
  return `Type d’article inconnu : règle la plus large.\n- FAQ : ${min} à ${max} questions, ajoutées par la passe d’enrichissement.`
}
