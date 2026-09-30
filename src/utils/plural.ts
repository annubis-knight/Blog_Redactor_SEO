/**
 * Le nom d'un compteur, accordé à son nombre selon la règle française :
 * singulier pour 0 et 1, pluriel à partir de 2 (« 1 article », « 2 articles »).
 * Seul le nom est rendu : l'appelant écrit le nombre dans le format qu'il veut.
 *
 * `plural(n, 'mot-clé', 'mots-clés')` pour un pluriel composé ou irrégulier.
 * Garde : `tests/unit/architecture/screen-text-counters.test.ts` (NFR-UX-SCREEN-TEXT).
 */
export function plural(n: number, singular: string, pluralForm = `${singular}s`): string {
  return Math.abs(n) >= 2 ? pluralForm : singular
}
