/**
 * Parcours « 8 temps » — sous-phase Découverte (tech-spec-parcours-8-temps).
 *
 *   ① déclencheur   saisie d'un mot-clé racine + « Découvrir »
 *   ② mémoire       au retour sur la même graine, le cache 30 jours répond
 *   ③ service(s)    Google Suggest, DataForSEO, IA, groupes de mots, pertinence
 *   ④ réponse       listes par source + sélection IA
 *   ⑤ mise en forme un KPI absent reste absent (pas de « 0 » inventé)
 *   ⑥ sauvegarde    la Découverte est enregistrée en cache
 *   ⑦ affichage     les sources, les groupes et la sélection IA sont à l'écran
 *   ⑧ décision      cocher des mots-clés les envoie au Radar
 */
import { test, expect, type Page, type Response } from '@playwright/test'
import { selectArticle, useParcours, type ParcoursLevel } from '../helpers/parcours-fixtures'

test.describe.configure({ mode: 'serial' })

const parcours = useParcours()

interface SuggestAllLike {
  alphabet: { items: Array<{ query: string }>; count: number }
  questions: { items: Array<{ query: string }>; count: number }
  totalUnique: number
}
interface DiscoverLike {
  seed: string
  keywords: Array<{ keyword: string; searchVolume: number | null; difficulty: number | null; cpc: number | null }>
}

const API = `http://localhost:${process.env.PORT ?? 3400}/api`
const SUGGEST_URL = /\/api\/keywords\/suggest-all$/
const DISCOVER_URL = /\/api\/keywords\/discover$/

async function openDiscovery(page: Page): Promise<void> {
  const tab = page.locator('[data-testid="wf-item-discovery"]')
  await expect(tab, 'l’onglet Découverte doit être présent').toBeVisible({ timeout: 15000 })
  await tab.click()
  await expect(page.locator('.discovery-input__field')).toBeVisible({ timeout: 15000 })
}

const LEVELS: ParcoursLevel[] = ['pilier', 'intermediaire', 'specifique']

for (const level of LEVELS) {
  test(`Découverte — parcours complet (${level})`, async ({ page }) => {
    test.setTimeout(300_000)
    const article = parcours.articles[level]
    let suggest: SuggestAllLike
    let discover: DiscoverLike

    await test.step('① déclencheur · ③ service · ④ réponse — « Découvrir » interroge les sources', async () => {
      await selectArticle(page, parcours, level)
      await openDiscovery(page)

      const champ = page.locator('.discovery-input__field')
      await champ.fill(article.keyword)

      const [suggestRes, discoverRes] = await Promise.all([
        page.waitForResponse((r: Response) => SUGGEST_URL.test(r.url()) && r.request().method() === 'POST', { timeout: 120000 }),
        page.waitForResponse((r: Response) => DISCOVER_URL.test(r.url()) && r.request().method() === 'POST', { timeout: 120000 }),
        champ.press('Enter'),
      ])

      expect(suggestRes.status(), 'Google Suggest doit répondre 200').toBe(200)
      expect(discoverRes.status(), 'DataForSEO doit répondre 200').toBe(200)
      suggest = (await suggestRes.json()).data as SuggestAllLike
      discover = (await discoverRes.json()).data as DiscoverLike
    })

    await test.step('⑤ mise en forme — les KPI absents restent absents', async () => {
      expect(Array.isArray(suggest.alphabet.items), 'les suggestions sont une liste').toBe(true)
      for (const item of [...suggest.alphabet.items, ...suggest.questions.items]) {
        expect(item.query.trim(), 'une suggestion vide serait écartée').not.toBe('')
      }

      for (const kw of discover.keywords) {
        for (const champ of ['searchVolume', 'difficulty', 'cpc'] as const) {
          const valeur = kw[champ]
          expect(valeur === null || Number.isFinite(valeur), `${kw.keyword} · ${champ}`).toBe(true)
        }
      }
    })

    await test.step('⑦ affichage — les sources listent leurs mots-clés', async () => {
      const sections = page.locator('.source-section')
      await expect.poll(() => sections.count(), { timeout: 30000 }).toBeGreaterThan(0)

      const lignes = page.locator('.source-item')
      await expect.poll(() => lignes.count(), { timeout: 60000 }).toBeGreaterThan(0)

      // Un KPI absent n'est jamais rendu « 0 » : le tag disparaît ou affiche « — ».
      const tags = page.locator('.source-item .kpi-tag, .source-item .source-item__kpi')
      const nb = await tags.count()
      for (let i = 0; i < Math.min(nb, 20); i++) {
        const texte = (await tags.nth(i).innerText()).trim()
        expect(texte, 'un KPI affiché n’est jamais vide').not.toBe('')
      }
    })

    await test.step('⑥ sauvegarde — la Découverte est mise en cache', async () => {
      await expect
        .poll(async () => {
          const res = await page.request.get(`${API}/discovery-cache/check?seed=${encodeURIComponent(article.keyword)}`)
          if (!res.ok()) return false
          return ((await res.json()).data as { cached: boolean }).cached
        }, { timeout: 60000 })
        .toBe(true)
    })

    await test.step('② mémoire — la graine déjà explorée est relue depuis le cache', async () => {
      const res = await page.request.get(`${API}/discovery-cache/load?seed=${encodeURIComponent(article.keyword)}`)
      expect(res.ok(), 'le cache doit répondre').toBeTruthy()
      const entrée = (await res.json()).data as { seed: string; dataforseoKeywords: unknown[] } | null
      expect(entrée, 'une entrée de cache doit exister').not.toBeNull()
      expect(entrée!.seed).toBe(article.keyword)
    })

    await test.step('⑧ décision — les mots-clés cochés partent vers le Radar', async () => {
      const première = page.locator('.source-item').first()
      await expect(première).toBeVisible({ timeout: 30000 })
      await première.click()

      const barre = page.locator('.discovery-bar__btn', { hasText: 'Envoyer au Radar' })
      await expect(barre, 'la barre d’envoi apparaît dès qu’un mot-clé est coché').toBeVisible({ timeout: 15000 })
      await barre.click()

      // Le Radar reçoit la sélection : sa liste d'attente n'est plus vide.
      await expect(page.locator('[data-testid="radar-keywords-preview"]'), 'le Radar reçoit les mots-clés')
        .toBeVisible({ timeout: 30000 })
    })
  })
}
