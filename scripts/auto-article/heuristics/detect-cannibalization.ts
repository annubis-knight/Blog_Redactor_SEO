/**
 * Heuristique PURE — détection de cannibalisation (§P2-1 de l'audit).
 *
 * Risque propre au mode auto : produire en volume sans garde-fou revient à
 * s'auto-concurrencer sur Google (deux articles visant le même mot-clé).
 *
 * Mesure : indice de Jaccard sur les tokens signifiants des mots-clés Capitaine.
 * Symétrique (on compare deux mots-clés de même nature), contrairement à
 * l'affinité topique qui, elle, mesure la couverture d'un mot-clé par un sujet.
 *
 * Politique retenue (choix produit) : **jamais bloquant**. En dessous du seuil
 * d'affichage on ne dit rien ; au-dessus on signale ; au-dessus du seuil de
 * confirmation on demande une validation explicite (uniquement en interactif —
 * un run non-interactif se contente d'un avertissement appuyé).
 */

import { tokenize } from '../text.js'

export interface ExistingCapitaine {
  articleId: number
  keyword: string
}

export interface CannibalizationHit {
  articleId: number
  keyword: string
  /** 0-1 */
  similarity: number
  similarityPercent: number
}

/** En dessous, on ne signale rien (bruit). */
export const REPORT_THRESHOLD = 0.5
/** Au-dessus, on demande une confirmation explicite en interactif. */
export const CONFIRM_THRESHOLD = 0.85

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0
  let inter = 0
  for (const token of a) if (b.has(token)) inter++
  const union = a.size + b.size - inter
  return union === 0 ? 0 : inter / union
}

export function detectCannibalization(
  capitaine: string,
  existing: ExistingCapitaine[],
  reportThreshold = REPORT_THRESHOLD,
): CannibalizationHit[] {
  const target = new Set(tokenize(capitaine))
  if (target.size === 0) return []

  return existing
    .map((e) => {
      const similarity = jaccard(target, new Set(tokenize(e.keyword)))
      return {
        articleId: e.articleId,
        keyword: e.keyword,
        similarity,
        similarityPercent: Math.round(similarity * 100),
      }
    })
    .filter((h) => h.similarity >= reportThreshold)
    .sort((a, b) => b.similarity - a.similarity)
}

/** Vrai si au moins une collision dépasse le seuil de confirmation. */
export function requiresConfirmation(hits: CannibalizationHit[]): boolean {
  return hits.some((h) => h.similarity >= CONFIRM_THRESHOLD)
}
