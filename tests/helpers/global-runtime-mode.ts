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
 * `TESTS_REELS=1` rend la main aux vraies API pour éprouver le parcours
 * nominal de bout en bout, en acceptant d'en payer le coût.
 */
const API = process.env.TEST_API_BASE_URL ?? `http://localhost:${process.env.PORT ?? 3400}/api`

async function poser(mode: 'mock' | 'real' | null): Promise<boolean> {
  try {
    const res = await fetch(`${API}/runtime-mode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode }),
    })
    return res.ok
  } catch {
    // Serveur non démarré : les tests HTTP se sauteront d'eux-mêmes.
    return false
  }
}

export async function setup(): Promise<void> {
  const reel = process.env.TESTS_REELS === '1'
  const ok = await poser(reel ? 'real' : 'mock')
  if (!ok) return
  if (reel) {
    console.warn('\n[tests] TESTS_REELS=1 — les appels partent vers les vraies API, et sont facturés.\n')
  } else {
    console.info('[tests] sources externes simulées (IA locale, DataForSEO en bac à sable)')
  }
}

export async function teardown(): Promise<void> {
  await poser(null)
}
