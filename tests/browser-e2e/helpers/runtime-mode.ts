/**
 * Bascule du serveur en mode simulé pour les tests navigateur.
 *
 * En mode simulé : IA locale (fixtures, sans réseau) et DataForSEO sur son
 * bac à sable (`sandbox.dataforseo.com`, coût 0). Aucun test navigateur ne
 * doit dépenser un centime — d'où l'appel systématique dans les deux socles.
 */
const API = process.env.TEST_BASE_URL ?? `http://localhost:${process.env.PORT ?? 3400}/api`

/** Bascule le serveur. `null` rend la main à la configuration d'origine. */
export async function setMockMode(mode: 'mock' | 'real' | null): Promise<void> {
  const res = await fetch(`${API}/runtime-mode`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode }),
  })
  if (!res.ok) throw new Error(`runtime-mode ${mode} refusé (HTTP ${res.status})`)
}

/** Mode effectif vu par le serveur — sert de garde-fou « aucun appel payant ». */
export async function effectiveMode(): Promise<string> {
  const res = await fetch(`${API}/runtime-mode`)
  const json = await res.json().catch(() => null)
  return json?.data?.effective ?? 'inconnu'
}
