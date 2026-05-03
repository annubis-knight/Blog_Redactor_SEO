/**
 * Bloc 4 (mai 2026) — Détection de cannibalisation entre articles d'un cocon.
 *
 * Source de vérité : la map est indexée par `articleId` (number), cohérent
 * avec le contrat backend GET /cocoons/:name/capitaines (cf.
 * server/routes/cocoons.routes.ts). L'indexation par slug (string) qui
 * existait avant produisait des faux positifs systématiques car les clés
 * suggested/published vs les clés backend ne se croisaient jamais.
 *
 * Extrait dans un module dédié pour pouvoir le tester unitairement sans
 * monter MoteurContextRecap (composable pur, pas d'I/O).
 */

export type CapitainesMap = Record<number, string>

/**
 * Vrai si un autre article du même cocon a le même Capitaine (insensible à la
 * casse). Comparaison par `articleId` pour exclure l'article courant lui-même.
 */
export function hasCannibalization(articleId: number, map: CapitainesMap): boolean {
  if (!articleId || articleId <= 0) return false
  const cap = map[articleId]
  if (!cap) return false
  const capLower = cap.toLowerCase()
  return Object.entries(map).some(
    ([idStr, c]) => Number(idStr) !== articleId && c.toLowerCase() === capLower,
  )
}
