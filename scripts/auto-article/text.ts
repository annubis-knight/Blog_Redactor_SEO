/**
 * Utilitaires texte purs partagés par les heuristiques (normalisation,
 * tokenisation, mots vides français).
 *
 * Séparation volontaire :
 *   - `FR_STOPWORDS` ne contient que des mots **grammaticaux** (articles,
 *     pronoms, prépositions, auxiliaires). Il sert à la fois à l'affinité
 *     topique et au filtrage du lexique.
 *   - Le bruit **de domaine** (« mots », « clés »…) reste local à
 *     `pick-lexique` : ces tokens doivent compter dans l'affinité topique
 *     (« mots-clés SEO » ne doit pas passer pour du 100 % on-topic) mais ne
 *     sont pas du vocabulaire lexical exploitable.
 */

const DIACRITICS = new RegExp('[\\u0300-\\u036f]', 'g')

/** Mots grammaticaux français (pas de vocabulaire métier ici). */
export const FR_STOPWORDS = new Set([
  'le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'au', 'aux',
  'ce', 'ces', 'cet', 'cette', 'son', 'sa', 'ses', 'leur', 'leurs',
  'mon', 'ma', 'mes', 'nos', 'notre', 'vos', 'votre', 'vous', 'nous',
  'je', 'tu', 'il', 'elle', 'ils', 'elles', 'on', 'lui', 'eux',
  'et', 'ou', 'ni', 'or', 'mais', 'donc', 'car', 'que', 'qui', 'quoi',
  'dont', 'ou', 'si', 'ne', 'pas', 'plus', 'moins', 'tres', 'bien',
  'aussi', 'alors', 'ainsi', 'meme', 'tout', 'tous', 'toute', 'toutes',
  'chaque', 'autre', 'comment', 'pourquoi', 'quand', 'combien',
  'dans', 'pour', 'avec', 'sans', 'sur', 'sous', 'par', 'entre', 'chez',
  'vers', 'depuis', 'pendant', 'avant', 'apres', 'contre', 'selon',
  'etre', 'avoir', 'fait', 'faire', 'font', 'est', 'sont', 'etait', 'ete',
  'peut', 'peuvent', 'pouvez', 'pouvoir', 'doit', 'doivent', 'faut',
  'utiliser', 'trouver', 'creer', 'mettre', 'prendre', 'voir', 'savoir',
  'dire', 'aller', 'venir', 'vouloir', 'devoir', 'permet', 'permettre',
  'encore', 'deja', 'toujours', 'jamais', 'souvent', 'cela', 'ceci',
])

export const MIN_TOKEN_LENGTH = 3

/** minuscules + suppression des diacritiques. */
export function norm(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(DIACRITICS, '').trim()
}

/**
 * Tronque à la frontière de mot et ajoute une ellipse — évite les coupures
 * disgracieuses en plein mot (« le guide co »).
 */
export function truncateWords(s: string, max: number): string {
  if (s.length <= max) return s
  const cut = s.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  const base = lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut
  return base.replace(/[\s,;:.–-]+$/, '') + '…'
}

/** Singularisation naïve : retire un « s » final sur les tokens longs. */
export function singularize(token: string): string {
  return token.length > 3 && token.endsWith('s') ? token.slice(0, -1) : token
}

/**
 * Tokens signifiants d'un texte : normalisés, ≥ MIN_TOKEN_LENGTH,
 * hors mots grammaticaux, singularisés (pour que « leads » matche « lead »).
 */
export function tokenize(s: string): string[] {
  return norm(s)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= MIN_TOKEN_LENGTH && !FR_STOPWORDS.has(t))
    .map(singularize)
}

/** Longueur de préfixe commun minimale pour considérer deux tokens équivalents. */
export const MIN_COMMON_PREFIX = 5

function commonPrefixLength(a: string, b: string): number {
  const max = Math.min(a.length, b.length)
  let i = 0
  while (i < max && a[i] === b[i]) i++
  return i
}

/**
 * Deux tokens « parlent de la même chose ».
 *
 * Le français flexionne beaucoup : sans ça, « visibilité » ne matche pas
 * « visible », « locale » ne matche pas « localement », « Toulouse » ne matche
 * pas « toulousaine » — et des cocons pertinents restaient invisibles
 * (constaté au banc d'essai du 2026-07-19). Un préfixe commun d'au moins
 * MIN_COMMON_PREFIX caractères rattrape ces variantes sans introduire de
 * rapprochements absurdes (« création » / « croissance » ne partagent que 2).
 */
export function tokensMatch(a: string, b: string): boolean {
  return a === b || commonPrefixLength(a, b) >= MIN_COMMON_PREFIX
}

/**
 * Affinité topique 0-1 : part des tokens du mot-clé couverts par le sujet.
 *
 * Coverage plutôt que Jaccard : on veut savoir si le mot-clé **parle du sujet**,
 * sans le pénaliser parce que le sujet est plus riche que lui.
 */
export function topicalAffinity(keyword: string, topic: string): number {
  const kwTokens = tokenize(keyword)
  if (kwTokens.length === 0) return 0
  const topicTokens = tokenize(topic)
  let hits = 0
  for (const token of kwTokens) {
    if (topicTokens.some((t) => tokensMatch(token, t))) hits++
  }
  return hits / kwTokens.length
}
