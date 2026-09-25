/**
 * Ce qui ne fait pas un lexique métier (FR-LEX-METIER-ONLY) — source unique
 * pour le calcul TF-IDF, le vérificateur de lexique et le mode automatique.
 *
 * Deux familles, toujours comparées SANS accents ni majuscules : le lexique du
 * pilier 1013 contenait « être » parce que la liste disait « etre » et que le
 * mot comparé gardait son accent.
 *
 *  - mots grammaticaux : articles, pronoms, possessifs, prépositions,
 *    adverbes et verbes génériques (« être », « voir », « permet ») ;
 *  - décor de page : menus, pieds de page, bandeaux cookies, réseaux sociaux
 *    (« cookies », « mentions », « newsletter »), aspirés avec le texte des
 *    pages concurrentes.
 *
 * Volontairement absents : les mots ambigus qui sont du métier pour certains
 * sites (« site », « blog », « article », « recherche »).
 */

const DIACRITICS = /[̀-ͯ]/g

/** minuscules, sans accents, espaces de bord retirés. */
export function normalizeTerm(term: string): string {
  return term.toLowerCase().normalize('NFD').replace(DIACRITICS, '').trim()
}

const GRAMMATICAL = [
  // Articles, déterminants
  'le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'au', 'aux',
  'ce', 'ces', 'cet', 'cette', 'chaque', 'autre', 'autres', 'plusieurs', 'certains', 'certaines', 'quelques',
  // Pronoms, possessifs
  'je', 'tu', 'il', 'elle', 'ils', 'elles', 'on', 'lui', 'eux', 'nous', 'vous', 'leur', 'leurs',
  'mon', 'ma', 'mes', 'ton', 'ta', 'tes', 'son', 'sa', 'ses', 'notre', 'nos', 'votre', 'vos',
  'cela', 'ceci', 'celui', 'celle', 'ceux', 'celles', 'rien', 'tout', 'tous', 'toute', 'toutes',
  // Relatifs, interrogatifs, conjonctions
  'qui', 'que', 'quoi', 'dont', 'comment', 'pourquoi', 'quand', 'combien', 'quel', 'quelle', 'quels', 'quelles',
  'et', 'ou', 'ni', 'or', 'mais', 'donc', 'car', 'si', 'comme', 'lorsque', 'puisque', 'afin', 'sinon',
  // Prépositions
  'dans', 'pour', 'avec', 'sans', 'sur', 'sous', 'par', 'entre', 'chez', 'vers', 'depuis', 'pendant',
  'avant', 'apres', 'contre', 'selon', 'parmi', 'grace',
  // Adverbes
  'ne', 'pas', 'plus', 'moins', 'tres', 'trop', 'peu', 'beaucoup', 'bien', 'mieux', 'aussi', 'alors',
  'ainsi', 'meme', 'encore', 'deja', 'toujours', 'jamais', 'souvent', 'ici', 'voici', 'voila', 'puis',
  'vraiment', 'surtout', 'notamment', 'egalement',
  // Verbes génériques (et leurs formes courantes)
  'etre', 'est', 'sont', 'etait', 'ete', 'sera', 'seront', 'soit',
  'avoir', 'ont', 'avait', 'aura',
  'faire', 'fait', 'font', 'faut', 'peut', 'peuvent', 'pouvez', 'pouvoir', 'doit', 'doivent', 'devoir',
  'dire', 'aller', 'venir', 'vouloir', 'voir', 'savoir', 'mettre', 'prendre', 'donner', 'rendre',
  'utiliser', 'trouver', 'creer', 'permet', 'permettent', 'permettre', 'obtenir', 'decouvrir', 'suivre',
]

const PAGE_DECOR = [
  'cookie', 'cookies', 'consentement', 'accepter', 'refuser', 'parametrer', 'personnaliser',
  'accueil', 'menu', 'mentions', 'legales', 'confidentialite', 'rgpd', 'cgv', 'cgu', 'copyright', 'reserves',
  'newsletter', 'inscription', 'connexion', 'panier', 'partager',
  'facebook', 'instagram', 'linkedin', 'twitter', 'youtube', 'pinterest', 'tiktok',
  'cliquez', 'cliquer', 'lire', 'etc',
]

const GENERIC = new Set([...GRAMMATICAL, ...PAGE_DECOR].map(normalizeTerm))

/** Mot vide ou mot de décor de page (un seul mot, accents indifférents). */
export function isGenericWord(word: string): boolean {
  const w = normalizeTerm(word)
  return w.length < 3 || /^\d+$/.test(w) || GENERIC.has(w)
}

/**
 * Un terme (un ou plusieurs mots) est générique si TOUS ses mots le sont :
 * « vos cookies » l'est, « vos combles » non.
 */
export function isGenericTerm(term: string): boolean {
  const words = normalizeTerm(term).split(/[\s'’]+/).filter(Boolean)
  // Un terme vide n'a aucun mot : `every` renvoie vrai, il est générique.
  return words.every(isGenericWord)
}
