/**
 * Saisie interactive initiale. `resolveArticleType` est pure et testée ;
 * `promptInitialInput` enrobe le readline autour.
 */

import type { Io } from './io.js'
import type { ArticleType, InitialInput } from './types.js'

export function resolveArticleType(raw: string): ArticleType {
  const v = raw.trim().toLowerCase()
  if (v === '1' || v.startsWith('pil')) return 'Pilier'
  if (v === '3' || v.startsWith('spé') || v.startsWith('spe')) return 'Spécialisé'
  return 'Intermédiaire'
}

export async function promptInitialInput(io: Io): Promise<InitialInput> {
  const topic = (await io.question('Sujet de l\'article (une phrase, même vague) › ')).trim()
  const cocoonName = (await io.question('Cocon cible (optionnel — [Entrée] laisse le script proposer) › ')).trim()
  const businessContext = (await io.question('Contexte business (optionnel) › ')).trim()
  // Le niveau n'est plus saisi : il est proposé par le gate d'emplacement en
  // fonction de l'arbre (trous du cocon) et validable là-bas.
  return {
    topic,
    cocoonName,
    businessContext,
    articleType: 'Intermédiaire',
  }
}
