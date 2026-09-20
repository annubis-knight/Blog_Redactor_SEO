/**
 * Outils de reconnaissance du français, partagés front / back / CLI.
 *
 * ## Le piège du `\b`
 *
 * En JavaScript, `\b` (frontière de mot) ne connaît que `[A-Za-z0-9_]`.
 * Une lettre accentuée n'est PAS un caractère de mot : un motif comme
 * `où\b` ou `augmenté\b` ne matche donc **jamais**, silencieusement.
 *
 * Deux détecteurs de question du projet en souffraient (audit 2026-09-19,
 * corrigé le 20/09) : les titres commençant par « Où … » n'étaient comptés
 * ni dans le score GEO, ni dans les données structurées FAQ de l'export.
 *
 * `FRENCH_WORD_END` remplace `\b` en fin de motif : une anticipation négative
 * Unicode, à utiliser avec le drapeau `u`.
 */

/** Fin de mot tolérante aux accents. À utiliser avec le drapeau `u`. */
export const FRENCH_WORD_END = '(?![\\p{L}\\p{N}_])'

/**
 * Mots par lesquels commence une question en français.
 *
 * Volontairement sans « ou » (conjonction) : seul « où » avec accent est
 * interrogatif, sinon « Ouvrir une boutique » passerait pour une question.
 */
const QUESTION_WORDS = [
  'comment',
  'pourquoi',
  'quand',
  'où',
  'quel',
  'quelle',
  'quels',
  'quelles',
  'combien',
  'est-ce que',
  "qu'est-ce",
  'que faire',
  'qui',
  'quoi',
]

const QUESTION_PREFIX_RE = new RegExp(
  `^(?:${QUESTION_WORDS.join('|')})${FRENCH_WORD_END}`,
  'iu',
)

/**
 * Le texte commence-t-il par un mot interrogatif ?
 *
 * Ne regarde pas le point d'interrogation : chaque appelant décide de sa
 * propre règle là-dessus (l'export accepte un « ? » n'importe où, le score
 * GEO exige qu'il termine le titre).
 *
 * Les apostrophes typographiques sont acceptées : « Qu’est-ce que » comme
 * « Qu'est-ce que ».
 */
export function startsWithQuestionWord(text: string): boolean {
  if (!text) return false
  const normalized = text.trim().replace(/[’‘‛]/g, "'")
  return QUESTION_PREFIX_RE.test(normalized)
}
