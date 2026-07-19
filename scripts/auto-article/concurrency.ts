/**
 * Exécution parallèle bornée — PURE (aucune I/O propre).
 *
 * Les scans Capitaine étaient séquentiels : 8 appels à la file = principal poste
 * de latence du run (audit défaut n°12). On les parallélise sans lever la
 * couverture (les 8 candidats restent scannés), mais avec une borne : DataForSEO
 * applique des rate-limits et le cost-guard raisonne par fenêtre glissante.
 *
 * L'ordre des résultats suit l'ordre d'entrée, indépendamment de l'ordre
 * d'achèvement — les heuristiques en aval doivent rester déterministes.
 */

export const DEFAULT_CONCURRENCY = 3

export async function mapLimit<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const effective = Math.max(1, Math.floor(limit))
  const results = Array.from({ length: items.length }) as R[]
  let cursor = 0

  async function worker(): Promise<void> {
    for (;;) {
      const index = cursor++
      if (index >= items.length) return
      results[index] = await fn(items[index] as T, index)
    }
  }

  const workers = Array.from({ length: Math.min(effective, items.length) }, () => worker())
  await Promise.all(workers)
  return results
}
