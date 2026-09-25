/**
 * Parcours « 8 temps » — sous-phase Lieutenants (tech-spec-parcours-8-temps).
 *
 *   ① déclencheur   Capitaine verrouillé, puis « Analyser SERP »
 *   ② mémoire       une seconde analyse du même mot-clé répond depuis la base
 *   ③ service(s)    POST /serp/analyze (DataForSEO + lecture des pages), puis
 *                   le flux IA propose-lieutenants
 *   ④ réponse       concurrents, titres, questions PAA, puis propositions IA
 *   ⑤ mise en forme une page illisible est marquée « non lue » et sort de la
 *                   récurrence des titres ; un score IA absent vaut `null`
 *   ⑥ sauvegarde    l'analyse est relisible en base
 *   ⑦ affichage     badge « ! » sur les pages non lues, cartes Lieutenants
 *   ⑧ décision      cocher un Lieutenant enregistre le check workflow
 *
 * Sources simulées : IA locale, DataForSEO en bac à sable. Les pages lues sont
 * de vraies pages du bac à sable : certaines répondent, d'autres non — c'est
 * précisément le cas que le contrat doit rendre honnête.
 */
import { test, expect, type Page, type Response } from '@playwright/test'
import { scanAndLockCaptain, selectArticle, useParcours, type ParcoursLevel } from '../helpers/parcours-fixtures'
import { ARTICLE_TYPE_RULES } from '../../../shared/constants/article-type-rules'

test.describe.configure({ mode: 'serial' })

const parcours = useParcours()

interface CompetitorLike {
  url: string
  position: number
  headings: Array<{ level: number; text: string }>
  textContent: string
  fetchError?: string
}
interface SerpAnalysisLike {
  keyword: string
  competitors: CompetitorLike[]
  paaQuestions: Array<{ question: string }>
  fromCache: boolean
}

const API = `http://localhost:${process.env.PORT ?? 3400}/api`
const SERP_URL = /\/api\/serp\/analyze$/

async function apiJson<T>(page: Page, path: string): Promise<T> {
  const res = await page.request.get(`${API}${path}`)
  expect(res.ok(), `${path} doit répondre`).toBeTruthy()
  return (await res.json()).data as T
}


async function openLieutenants(page: Page): Promise<void> {
  const tab = page.locator('[data-testid="wf-item-lieutenants"]')
  await expect(tab, 'l’onglet Lieutenants doit être présent').toBeVisible({ timeout: 15000 })
  await tab.click()
}

const LEVELS: ParcoursLevel[] = ['pilier', 'intermediaire', 'specifique']

for (const level of LEVELS) {
  test(`Lieutenants — parcours complet (${level})`, async ({ page }) => {
    test.setTimeout(300_000)
    const article = parcours.articles[level]
    let serp: SerpAnalysisLike

    await test.step('① déclencheur — Capitaine verrouillé puis « Analyser SERP »', async () => {
      await selectArticle(page, parcours, level)
      await scanAndLockCaptain(page, article.keyword)
      await openLieutenants(page)

      // L'analyse porte sur le Capitaine ET ses mots-clés racines : on collecte
      // toutes les réponses, car la récurrence des titres les agrège.
      const collectées: SerpAnalysisLike[] = []
      page.on('response', async r => {
        if (SERP_URL.test(r.url()) && r.request().method() === 'POST' && r.status() === 200) {
          try { collectées.push((await r.json()).data as SerpAnalysisLike) } catch { /* réponse illisible : ignorée */ }
        }
      })

      const bouton = page.locator('.btn-analyze', { hasText: 'Analyser SERP' }).first()
      await expect(bouton, 'le bouton d’analyse SERP doit être actif').toBeEnabled({ timeout: 20000 })

      const [response] = await Promise.all([
        page.waitForResponse((r: Response) => SERP_URL.test(r.url()) && r.request().method() === 'POST', { timeout: 120000 }),
        bouton.click(),
      ])
      expect(response.status(), 'l’analyse SERP doit répondre 200').toBe(200)
      serp = (await response.json()).data as SerpAnalysisLike

      // Laisse les analyses des mots-clés racines se terminer.
      await expect.poll(() => collectées.length, { timeout: 120000 }).toBeGreaterThan(0)
      await page.waitForLoadState('networkidle', { timeout: 120000 })
    })

    await test.step('④ réponse — des concurrents et leurs titres', async () => {
      expect(serp.keyword).toBe(article.keyword)
      expect(serp.competitors.length, 'au moins un concurrent').toBeGreaterThan(0)
      for (const c of serp.competitors) {
        expect(c.url, 'un concurrent a toujours une adresse').toBeTruthy()
        expect(Array.isArray(c.headings)).toBe(true)
      }
    })

    await test.step('⑤ mise en forme — une page illisible est marquée « non lue »', async () => {
      for (const c of serp.competitors) {
        const vide = c.headings.length === 0 && c.textContent.trim() === ''
        if (vide) {
          expect(c.fetchError, `page vide (${c.url}) → marquée non lue`).toBeTruthy()
        }
        // Une page lue n'a pas d'erreur de lecture.
        if (c.headings.length > 0) {
          expect(c.fetchError, `page lue (${c.url}) → pas d'erreur`).toBeFalsy()
        }
      }
    })

    await test.step('⑦ affichage — les pages non lues portent leur badge', async () => {
      const urls = page.locator('[data-testid="serp-urls"]')
      await expect(urls, 'la liste des concurrents doit s’afficher').toBeVisible({ timeout: 30000 })

      const nonLues = serp.competitors.filter(c => c.fetchError).length
      const badges = urls.locator('.serp-url-error-badge')
      await expect.poll(async () => badges.count(), { timeout: 15000 }).toBe(nonLues)
    })

    await test.step('⑤ + ⑦ — les pages non lues ne sont pas comptées comme concurrents', async () => {
      // Le résumé de l'onglet actif affiche le nombre de concurrents RÉELLEMENT
      // lus : il doit donc valoir « lignes affichées − pages non lues ».
      const urls = page.locator('[data-testid="serp-urls"]')
      const lignes = await urls.locator('.serp-url-item').count()
      const nonLues = await urls.locator('.serp-url-error-badge').count()

      const résumé = page.locator('.serp-tab-summary').first()
      await expect(résumé).toBeVisible({ timeout: 15000 })
      const texte = (await résumé.innerText()).replace(/\s+/g, ' ')
      const annoncés = Number(texte.match(/(\d+)\s+concurrents/)?.[1] ?? -1)

      expect(annoncés, 'le résumé annonce les concurrents lus').toBe(lignes - nonLues)
    })

    await test.step('② mémoire — une seconde analyse répond depuis la base', async () => {
      const res = await page.request.post(`${API}/serp/analyze`, {
        data: { keyword: article.keyword, topN: 10, articleLevel: level === 'pilier' ? 'pilier' : level === 'intermediaire' ? 'intermediaire' : 'specifique' },
      })
      expect(res.ok()).toBeTruthy()
      const second = (await res.json()).data as SerpAnalysisLike
      expect(second.fromCache, 'la seconde analyse ne relit pas les pages').toBe(true)
    })

    await test.step('⑥ sauvegarde — l’analyse est relisible en base', async () => {
      const explorations = await apiJson<{ lexique: unknown[] }>(page, `/articles/${article.id}/explorations`)
      expect(explorations, 'les explorations de l’article doivent répondre').toBeTruthy()
    })

    await test.step('④ + ⑦ — l’IA propose des Lieutenants et l’écran les affiche', async () => {
      const cartes = page.locator('[data-testid="lieutenant-cards-list"]')
      await expect(cartes, 'les propositions IA doivent apparaître').toBeVisible({ timeout: 120000 })
      await expect(cartes.locator('[data-testid="lt-card-checkbox"]').first()).toBeVisible({ timeout: 30000 })
    })

    await test.step('⑤ — un score IA absent s’affiche « — », jamais « 0 »', async () => {
      const scores = page.locator('[data-testid="lieutenant-cards-list"] .lt-card__score')
      const total = await scores.count()
      expect(total, 'au moins une carte Lieutenant').toBeGreaterThan(0)
      for (let i = 0; i < total; i++) {
        const texte = (await scores.nth(i).innerText()).trim()
        expect(texte, 'un score est soit un nombre, soit « — »').toMatch(/^(\d+|—)$/)
        if (texte === '—') {
          const titre = await scores.nth(i).getAttribute('title')
          expect(titre, 'le « — » est expliqué en info-bulle').toContain('non fourni')
        }
      }
    })

    await test.step('⑧ décision — les Lieutenants requis par le type et un plan Hn enregistré valident l’étape', async () => {
      const cases = page.locator('[data-testid="lt-card-checkbox"]')
      await expect(cases.first()).toBeVisible({ timeout: 30000 })
      // L'IA propose, l'utilisateur valide : les cartes arrivent décochées.
      expect(await cases.first().isChecked(), 'une proposition n’est pas validée d’office').toBe(false)
      // La porte (FR-LIE-LOCK-GATE) attend le minimum du type : 3 pour un
      // pilier, 2 pour un intermédiaire, 1 pour un spécialisé.
      const requis = ARTICLE_TYPE_RULES[level].minLieutenants
      expect(await cases.count(), `au moins ${requis} proposition(s) à retenir`).toBeGreaterThanOrEqual(requis)
      for (let i = 0; i < requis; i++) await cases.nth(i).check()

      // Le clic doit se traduire en base : statut « locked » sur le Lieutenant.
      await expect
        .poll(async () => {
          const kw = await apiJson<{ richLieutenants?: Array<{ status: string }> } | null>(page, `/articles/${article.id}/keywords`)
          return kw?.richLieutenants?.filter(lt => lt.status === 'locked').length ?? 0
        }, { timeout: 20000 })
        .toBe(requis)

      // Ce que la Rédaction et la porte lisent (la liste « plate ») doit être
      // exactement ce que l'utilisateur a coché — ni plus, ni moins.
      await expect
        .poll(async () => {
          const kw = await apiJson<{ lieutenants: string[]; richLieutenants?: Array<{ keyword: string; status: string }> } | null>(
            page, `/articles/${article.id}/keywords`)
          const coches = (kw?.richLieutenants ?? []).filter(lt => lt.status === 'locked').map(lt => lt.keyword).sort()
          const plate = [...(kw?.lieutenants ?? [])].sort()
          return { identiques: JSON.stringify(plate) === JSON.stringify(coches), plate, coches }
        }, { timeout: 20000, message: 'liste plate = lieutenants cochés' })
        .toMatchObject({ identiques: true })

      // La règle du workflow demande aussi un plan Hn : on le génère s'il manque…
      const vide = page.locator('[data-testid="hn-structure-empty"]')
      if (await vide.count() > 0) {
        const générer = page.locator('[data-testid="hn-generate-btn"]')
        await expect(générer).toBeEnabled({ timeout: 15000 })
        await générer.click()
      }
      await expect(page.locator('.hn-structure-item').first(), 'un plan Hn doit s’afficher')
        .toBeVisible({ timeout: 120000 })

      // …puis on l'enregistre : c'est ce geste qui clôt la sous-phase.
      const sauvegarder = page.locator('.btn-save-hn')
      await expect(sauvegarder).toBeEnabled({ timeout: 15000 })
      await sauvegarder.click()
      await expect(page.locator('.hn-saved-badge'), 'le plan doit être marqué sauvegardé')
        .toBeVisible({ timeout: 30000 })

      await expect
        .poll(async () => (await apiJson<{ completedChecks: string[] }>(page, `/articles/${article.id}/progress`)).completedChecks,
          { timeout: 30000 })
        .toContain('moteur:lieutenants_locked')
    })
  })
}
