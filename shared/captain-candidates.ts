import type { CaptainScanEntry } from './types/keyword.types.js'

/**
 * Les candidats d'un historique d'études du Capitaine : sans les études qui
 * sont la racine d'un autre candidat de ce même historique. Une racine reste
 * rangée sous son mot-clé long ; elle ne devient jamais un candidat d'office,
 * même si une ancienne version l'a enregistrée comme tel
 * (FR-CAP-LOCK-INTEGRITY, recette du 2026-09-30).
 *
 * Deux mots-clés se comparent sans tenir compte de la casse ni des espaces
 * autour.
 */
export function candidatesFromHistory(history: CaptainScanEntry[]): CaptainScanEntry[] {
  const norm = (keyword: string): string => keyword.trim().toLowerCase()
  const rootOfAnother = new Set<string>()
  for (const entry of history) {
    for (const root of entry.rootKeywords ?? []) {
      if (norm(root) !== norm(entry.keyword)) rootOfAnother.add(norm(root))
    }
  }
  return history.filter(entry => !rootOfAnother.has(norm(entry.keyword)))
}
