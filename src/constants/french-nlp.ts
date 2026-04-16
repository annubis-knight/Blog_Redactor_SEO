/**
 * Union de tous les stopwords français du projet.
 * Sources : keyword-matcher.ts, useCapitaineValidation.ts, useMultiSourceVerdict.ts
 */
export const FRENCH_STOPWORDS = new Set([
  // Articles & déterminants
  'le', 'la', 'les', 'l', 'de', 'du', 'des', 'd', 'un', 'une',
  // Pronoms personnels
  'je', 'tu', 'il', 'elle', 'on', 'nous', 'vous', 'ils', 'elles',
  'me', 'te', 'lui', 'se', 'y',
  // Possessifs
  'mon', 'ma', 'mes', 'ton', 'ta', 'tes', 'son', 'sa', 'ses',
  'notre', 'nos', 'votre', 'vos', 'leur', 'leurs',
  // Démonstratifs
  'ce', 'cet', 'cette', 'ces',
  // Relatifs & interrogatifs
  'qui', 'que', 'qu', 'dont', 'où', 'comment', 'pourquoi',
  // Prépositions
  'à', 'au', 'aux', 'en', 'par', 'pour', 'sur', 'dans',
  'avec', 'sans', 'sous', 'vers', 'entre',
  // Conjonctions
  'et', 'ou', 'mais', 'donc', 'car', 'or', 'ni', 'si',
  // Négation & adverbes
  'ne', 'pas', 'plus', 'très', 'aussi', 'bien',
  'tout', 'tous', 'toute', 'toutes',
  // Verbes courants
  'est', 'sont', 'a', 'ont', 'fait',
  'être', 'avoir', 'faire', 'dire', 'aller', 'voir',
])
