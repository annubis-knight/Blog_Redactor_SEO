/**
 * Bascule des sources externes pour toute la suite de tests, une seule fois.
 *
 * Le mode (simulé / réel) est un état **global au serveur**, pas une donnée par
 * fichier de test. Le poser dans chaque suite fonctionnait à l'unité mais pas
 * en exécution complète : les fichiers tournent en parallèle, et le premier à
 * terminer rendait la main aux vraies API pendant que les autres travaillaient
 * encore. DataForSEO repassait alors en production, le garde-fou de budget
 * (2 $ / 30 min) se déclenchait, et une douzaine de tests viraient au rouge en
 * HTTP 429 — sans qu'aucune ligne de code n'ait changé.
 *
 * Le serveur visé est souvent le serveur de développement de l'utilisateur
 * (épopée qualité SEO, T8). On ne lui prend donc jamais la main :
 *   - s'il est forcé en mode réel, on n'y touche pas (les tests HTTP le voient
 *     alors comme indisponible, cf. `isServerUp`) ;
 *   - sinon on le passe en simulé, et on RESTAURE son réglage d'origine à la
 *     fin, au lieu de l'effacer.
 *
 * `TESTS_REELS=1` rend la main aux vraies API pour éprouver le parcours
 * nominal de bout en bout, en acceptant d'en payer le coût.
 */
const API = process.env.TEST_BASE_URL
  ?? process.env.TEST_API_BASE_URL
  ?? `http://localhost:${process.env.PORT ?? 3400}/api`

type Mode = 'mock' | 'real' | null

/** Réglage d'origine du serveur, à restaurer ; `undefined` = on n'a rien touché. */
let origine: Mode | undefined

async function lire(): Promise<{ override: Mode } | null> {
  try {
    const res = await fetch(`${API}/runtime-mode`, { signal: AbortSignal.timeout(2000) })
    if (!res.ok) return null
    const json = await res.json() as { data?: { override?: Mode } }
    return { override: json.data?.override ?? null }
  } catch {
    // Serveur non démarré : les tests HTTP se sauteront d'eux-mêmes.
    return null
  }
}

async function poser(mode: Mode): Promise<boolean> {
  try {
    const res = await fetch(`${API}/runtime-mode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode }),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function setup(): Promise<void> {
  const etat = await lire()
  if (!etat) return
  const reel = process.env.TESTS_REELS === '1'
  if (!reel && etat.override === 'real') {
    console.warn(`\n[tests] ${API} est forcé en mode réel par quelqu'un d'autre : on n'y touche pas, et les tests HTTP l'ignorent.\n`)
    return
  }
  origine = etat.override
  if (!(await poser(reel ? 'real' : 'mock'))) {
    origine = undefined
    return
  }
  if (reel) {
    console.warn('\n[tests] TESTS_REELS=1 — les appels partent vers les vraies API, et sont facturés.\n')
  } else {
    console.info('[tests] sources externes simulées (IA locale, DataForSEO en bac à sable)')
  }
}

export async function teardown(): Promise<void> {
  if (origine !== undefined) await poser(origine)
}
