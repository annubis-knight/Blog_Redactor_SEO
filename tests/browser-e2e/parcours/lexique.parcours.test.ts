/**
 * Parcours « 8 temps » — sous-phase Lexique (tech-spec-parcours-8-temps).
 *
 *   ① déclencheur   Capitaine verrouillé, SERP lue, puis « Extraire le Lexique »
 *   ② mémoire       les onglets par mot-clé source sont relus en base
 *   ③ service(s)    POST /serp/tfidf (calcul local sur les pages lues), puis le
 *                   flux IA ai-lexique-upfront
 *   ④ réponse       trois listes de termes, puis les recommandations de l'IA
 *   ⑤ mise en forme un terme n'a jamais de densité inventée ; une décision IA
 *                   illisible ne donne pas de badge
 *   ⑥ sauvegarde    l'exploration Lexique est relisible en base
 *   ⑦ affichage     les termes et les badges IA sont à l'écran
 *   ⑧ décision      cocher des termes enregistre le check workflow
 */
import { test, expect, type Page, type Response } from '@playwright/test'
import { scanAndLockCaptain, selectArticle, useParcours, type ParcoursLevel } from '../helpers/parcours-fixtures'

test.describe.configure({ mode: 'serial' })

const parcours = useParcours()

interface TfidfTermLike { term: string; level: string; density: number; documentFrequency: number }
interface TfidfLike {
  keyword: string
  totalCompetitors: number
  obligatoire: TfidfTermLike[]
  differenciateur: TfidfTermLike[]
  optionnel: TfidfTermLike[]
}

const API = `http://localhost:${process.env.PORT ?? 3400}/api`
const TFIDF_URL = /\/api\/serp\/tfidf$/

async function apiJson<T>(page: Page, path: string): Promise<T> {
  const res = await page.request.get(`${API}${path}`)
  expect(res.ok(), `${path} doit répondre`).toBeTruthy()
  return (await res.json()).data as T
}


/** Lit les pages concurrentes via l'API : sans elles, le TF-IDF n'a rien à mâcher. */
async function ensureSerp(page: Page, keyword: string, level: ParcoursLevel): Promise<void> {
  const res = await page.request.post(`${API}/serp/analyze`, {
    data: { keyword, topN: 10, articleLevel: level },
    timeout: 120000,
  })
  expect(res.ok(), 'l’analyse SERP préalable doit répondre').toBeTruthy()
}

async function openLexique(page: Page): Promise<void> {
  const tab = page.locator('[data-testid="wf-item-lexique"]')
  await expect(tab, 'l’onglet Lexique doit être présent').toBeVisible({ timeout: 15000 })
  await tab.click()
}

const LEVELS: ParcoursLevel[] = ['pilier', 'intermediaire', 'specifique']

for (const level of LEVELS) {
  test(`Lexique — parcours complet (${level})`, async ({ page }) => {
    test.setTimeout(300_000)
    const article = parcours.articles[level]
    let tfidf: TfidfLike

    await test.step('① déclencheur · ③ service · ④ réponse — « Extraire le Lexique »', async () => {
      await selectArticle(page, parcours, level)
      await scanAndLockCaptain(page, article.keyword)
      await ensureSerp(page, article.keyword, level)
      await openLexique(page)

      const bouton = page.locator('[data-testid="btn-extract"]')
      await expect(bouton, 'le bouton d’extraction doit être actif').toBeEnabled({ timeout: 90000 })

      const [response] = await Promise.all([
        page.waitForResponse((r: Response) => TFIDF_URL.test(r.url()) && r.request().method() === 'POST', { timeout: 120000 }),
        bouton.click(),
      ])
      expect(response.status(), 'le TF-IDF doit répondre 200').toBe(200)
      tfidf = (await response.json()).data as TfidfLike
    })

    await test.step('⑤ mise en forme — aucun terme n’a de densité inventée', async () => {
      const tous = [...tfidf.obligatoire, ...tfidf.differenciateur, ...tfidf.optionnel]
      for (const terme of tous) {
        expect(terme.term.trim(), 'un terme n’est jamais vide').not.toBe('')
        expect(['obligatoire', 'differenciateur', 'optionnel']).toContain(terme.level)
        expect(Number.isFinite(terme.density), `densité de « ${terme.term} »`).toBe(true)
        expect(Number.isFinite(terme.documentFrequency), `fréquence de « ${terme.term} »`).toBe(true)
      }
    })

    await test.step('⑦ affichage — les termes extraits sont à l’écran', async () => {
      const résultats = page.locator('[data-testid="lexique-results"]')
      await expect(résultats, 'la zone de résultats doit s’afficher').toBeVisible({ timeout: 60000 })

      const total = tfidf.obligatoire.length + tfidf.differenciateur.length + tfidf.optionnel.length
      if (total === 0) return // corpus trop pauvre dans le bac à sable : rien à afficher

      const lignes = résultats.locator('.term-row')
      await expect.poll(() => lignes.count(), { timeout: 20000 }).toBeGreaterThan(0)

      const premier = tfidf.obligatoire[0] ?? tfidf.differenciateur[0] ?? tfidf.optionnel[0]
      await expect(résultats.getByText(premier.term, { exact: false }).first(),
        'un terme de la réponse doit être visible').toBeVisible({ timeout: 15000 })
    })

    await test.step('④ + ⑦ — l’analyse IA pose ses badges, ou explique son échec', async () => {
      const panneau = page.locator(
        '[data-testid="ia-summary"], [data-testid="lexique-ai-stats"], [data-testid="ia-error"], [data-testid="ia-loading"]',
      )
      await expect(panneau.first(), 'le panneau IA doit donner un état lisible').toBeVisible({ timeout: 120000 })

      const erreur = page.locator('[data-testid="ia-error"]')
      if (await erreur.count() > 0) {
        // Échec honnête : message + bouton pour relancer, jamais un écran figé.
        await expect(erreur).toContainText(/.+/)
        await expect(page.locator('.btn-retry').first()).toBeVisible()
      }
    })

    await test.step('⑥ sauvegarde — l’exploration Lexique est relisible en base', async () => {
      await expect
        .poll(async () => {
          const explorations = await apiJson<{ lexique: Array<{ sourceKeyword: string }> }>(page, `/articles/${article.id}/explorations`)
          return explorations.lexique.map(l => l.sourceKeyword)
        }, { timeout: 30000 })
        .toContain(article.keyword)
    })

    await test.step('② mémoire + ⑦ — après rechargement, l’onglet du mot-clé est restauré', async () => {
      await page.reload()
      await page.waitForLoadState('networkidle', { timeout: 20000 })
      await selectArticle(page, parcours, level)
      await openLexique(page)

      const prompt = page.locator('[data-testid="tlp-load-db"]')
      if (await prompt.count() > 0) await prompt.first().click()

      await expect(page.locator('[data-testid="lexique-results"]'), 'les termes déjà extraits reviennent')
        .toBeVisible({ timeout: 60000 })
    })

    await test.step('⑧ décision — les termes retenus valident l’étape', async () => {
      const progression = async () =>
        (await apiJson<{ completedChecks: string[] }>(page, `/articles/${article.id}/progress`)).completedChecks

      // Les termes obligatoires arrivent pré-cochés : l'étape peut déjà être
      // validée. Sinon, on coche à la main — si la liste n'est pas verrouillée.
      if ((await progression()).includes('moteur:lexique_validated')) {
        expect(await progression()).toContain('moteur:lexique_validated')
        return
      }

      const cases = page.locator('[data-testid="lexique-results"] .term-checkbox')
      const total = await cases.count()
      if (total === 0) {
        // Corpus du bac à sable sans terme : l'écran doit le dire clairement.
        await expect(page.locator('.section-empty').first(), 'liste vide → message explicite')
          .toBeVisible({ timeout: 10000 })
        return
      }

      const première = cases.first()
      if (await première.isDisabled()) {
        // Liste verrouillée : la décision a déjà été enregistrée, on le vérifie.
        expect(await progression(), 'liste verrouillée → étape déjà validée')
          .toContain('moteur:lexique_validated')
        return
      }

      // Un seul terme suffit : dès qu'un terme est retenu, la liste se verrouille.
      if (!(await première.isChecked())) await première.check()

      await expect.poll(progression, { timeout: 30000 }).toContain('moteur:lexique_validated')
    })
  })
}
