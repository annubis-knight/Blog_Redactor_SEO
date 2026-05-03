/**
 * Bloc 5 (mai 2026) — Score lexical d'alignement texte vs painPoint (0-100).
 *
 * Utilisé en fallback dans /keywords/:keyword/validate quand le cache Radar
 * est absent / vide. Réutilise `matchResonanceDetailed` (déjà testé) pour
 * rester déterministe et mock-friendly (pas d'embeddings, pas d'appel
 * externe). Permet d'afficher un relevanceScore en Capitaine même quand
 * l'utilisateur n'a pas lancé de scan Radar préalable.
 *
 * Échelle :
 *   - 'total' (chevauchement fort) → 100
 *   - 'partial' exact (mots identiques) → 60
 *   - 'partial' stem (variantes morphologiques) → 50
 *   - 'none' → 0
 */

import { matchResonanceDetailed } from '../intent/intent-scan.service.js'

export function lexicalPainAlignment(text: string, painWords: string[]): number {
  if (!text || painWords.length === 0) return 0
  const detailed = matchResonanceDetailed(text, painWords)
  if (detailed.match === 'total') return 100
  if (detailed.match === 'partial') return detailed.quality === 'exact' ? 60 : 50
  return 0
}

export function avgLexicalPainAlignment(texts: string[], painWords: string[]): number | null {
  if (texts.length === 0 || painWords.length === 0) return null
  const sum = texts.reduce((acc, t) => acc + lexicalPainAlignment(t, painWords), 0)
  return Math.round(sum / texts.length)
}
