/**
 * Saisie interactive initiale. `resolveArticleType` est pure et testée ;
 * `promptInitialInput` enrobe le readline autour.
 */

import type { Io } from './io.js'
import { resolveCocoonAnswer } from './cocoon.js'
import type { ArticleType, InitialInput } from './types.js'

export function resolveArticleType(raw: string): ArticleType {
  const v = raw.trim().toLowerCase()
  if (v === '1' || v.startsWith('pil')) return 'Pilier'
  if (v === '3' || v.startsWith('spé') || v.startsWith('spe')) return 'Spécialisé'
  return 'Intermédiaire'
}

export const COCOON_QUESTION = 'Cocon cible (optionnel — nom d\'un cocon existant ; [Entrée] laisse le script proposer) › '

export interface InitialInputOptions {
  /** Noms des cocons existants : une réponse doit en nommer un. `null` : liste indisponible. */
  cocoonNames: readonly string[] | null
  /** Cocon imposé par `--cocoon` : la question n'est pas posée. */
  forcedCocoon?: string | null
  /** Message affiché quand la réponse ne désigne aucun cocon. */
  warn: (message: string) => void
}

/**
 * « Cocon cible » : une réponse qui nomme un cocon existant impose
 * l'emplacement (recette du 2026-09-30, PU-06 : la réponse était ignorée et le
 * robot créait l'article ailleurs). Un nom inconnu est dit, et la question
 * revient ; Entrée laisse le script proposer.
 */
async function askCocoon(io: Io, opts: InitialInputOptions): Promise<string> {
  if (opts.forcedCocoon) return opts.forcedCocoon
  for (;;) {
    const answer = (await io.question(COCOON_QUESTION)).trim()
    if (!answer || opts.cocoonNames === null) return answer
    const resolved = resolveCocoonAnswer(opts.cocoonNames, answer)
    if (resolved.kind === 'none') return ''
    if (resolved.kind === 'found') return resolved.name
    if (resolved.kind === 'ambiguous') {
      opts.warn(`Plusieurs cocons s'appellent ainsi : ${resolved.names.map(n => `« ${n} »`).join(', ')}. Tape le nom exact, majuscules comprises.`)
    } else {
      opts.warn(`Aucun cocon ne s'appelle « ${answer} ». Cocons existants : ${opts.cocoonNames.join(', ') || '(aucun)'}.`)
    }
  }
}

export async function promptInitialInput(io: Io, opts: InitialInputOptions = { cocoonNames: null, warn: () => {} }): Promise<InitialInput> {
  const topic = (await io.question('Sujet de l\'article (une phrase, même vague) › ')).trim()
  const cocoonName = await askCocoon(io, opts)
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
