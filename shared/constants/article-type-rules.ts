/**
 * Règles par type d'article — source unique (FR-INFRA-TYPE-RULES-SSOT).
 *
 * Avant l'épopée qualité SEO, ces règles vivaient en plusieurs exemplaires qui
 * se contredisaient : 2 500 mots pour un pilier dans le code, « 2 000-3 000 »
 * dans un prompt, « 6-8 H2 » ici, « 6-12 H2 » là. Les valeurs ci-dessous
 * reprennent celles que le code appliquait réellement (cibles de rédaction,
 * bornes de la recommandation de longueur, fourchettes du prompt de sommaire).
 * Tout lecteur (prompts, calculs, vérificateurs) passe par ce module.
 */
import type { ArticleLevel } from '../types/keyword-validate.types.js'

export interface ArticleTypeRules {
  /** Libellé affiché. */
  label: 'Pilier' | 'Intermédiaire' | 'Spécialisé'
  /** Longueur visée par défaut (mots). */
  targetWords: number
  /** Bornes admises pour une longueur recommandée (mots). */
  wordsMin: number
  wordsMax: number
  /** Nombre de H2 du sommaire. */
  h2Min: number
  h2Max: number
  /** Nombre minimum de lieutenants pour couvrir les recherches voisines. */
  minLieutenants: number
}

export const ARTICLE_TYPE_RULES: Record<ArticleLevel, ArticleTypeRules> = {
  pilier: { label: 'Pilier', targetWords: 2500, wordsMin: 1800, wordsMax: 3500, h2Min: 6, h2Max: 8, minLieutenants: 3 },
  intermediaire: { label: 'Intermédiaire', targetWords: 1800, wordsMin: 1200, wordsMax: 2500, h2Min: 4, h2Max: 6, minLieutenants: 2 },
  specifique: { label: 'Spécialisé', targetWords: 1200, wordsMin: 800, wordsMax: 1500, h2Min: 3, h2Max: 5, minLieutenants: 1 },
}

/** Longueur par défaut quand le type est inconnu. */
export const DEFAULT_TARGET_WORDS_FALLBACK = 2000
