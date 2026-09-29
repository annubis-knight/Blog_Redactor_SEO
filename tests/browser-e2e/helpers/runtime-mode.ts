/**
 * Bascule du serveur en mode simulé pour les tests navigateur.
 *
 * En mode simulé : IA locale (fixtures, sans réseau) et DataForSEO sur son
 * bac à sable (`sandbox.dataforseo.com`, coût 0). Aucun test navigateur ne
 * doit dépenser un centime — d'où l'appel systématique dans les deux socles.
 */
const API = process.env.TEST_BASE_URL ?? `http://localhost:${process.env.PORT ?? 3400}/api`

/**
 * Attend que l'API réponde. En développement le serveur redémarre à chaque
 * modification du back : une requête lancée pendant ce battement échoue avec
 * un « fetch failed » qui n'a rien à voir avec ce qu'on teste.
 */
async function attendreLApi(timeoutMs = 60_000): Promise<void> {
  const limite = Date.now() + timeoutMs
  let derniere: unknown = null
  while (Date.now() < limite) {
    try {
      const res = await fetch(`${API}/runtime-mode`)
      if (res.ok) return
      derniere = `HTTP ${res.status}`
    } catch (err) {
      derniere = (err as Error).message
    }
    await new Promise(r => setTimeout(r, 500))
  }
  throw new Error(`l'API ne répond pas après ${timeoutMs} ms (${String(derniere)})`)
}

/**
 * Bascule le serveur. `null` rend la main à la configuration d'origine.
 *
 * Refuse de passer en simulé un serveur que quelqu'un a forcé en mode réel
 * (checklist T8) : c'est le signe que les tests visent un serveur partagé, et
 * basculer son mode perturberait la personne qui travaille dessus.
 */
export async function setMockMode(mode: 'mock' | 'real' | null): Promise<void> {
  await attendreLApi()
  if (mode === 'mock') {
    const actuel = await fetch(`${API}/runtime-mode`).then(r => r.json()).catch(() => null)
    if (actuel?.data?.override === 'real') {
      throw new Error(
        `le serveur ${API} est forcé en mode réel par quelqu'un d'autre : les tests ne le basculent pas. `
        + 'Lancez-les sur leurs ports dédiés (E2E_SERVER_PORT / E2E_CLIENT_PORT, par défaut 3410 / 5410).',
      )
    }
  }
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
