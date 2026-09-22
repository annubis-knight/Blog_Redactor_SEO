/**
 * Parcours « 8 temps » — sous-phase Radar (tech-spec-parcours-8-temps).
 *
 *   ① déclencheur   ajout d'un mot-clé à la liste d'attente, puis « Lancer le scan »
 *   ② mémoire       l'exploration relue en base restitue le même scan
 *   ③ service(s)    POST /keywords/radar/scan part
 *   ④ réponse       cartes + score global + chaleur
 *   ⑤ mise en forme score global absent → `null` (le thermomètre attend), jamais 0
 *   ⑥ sauvegarde    l'exploration Radar est relisible en base
 *   ⑦ affichage     thermomètre et cartes montrent ce que la réponse contient
 *   ⑧ décision      cocher une carte l'envoie au Capitaine
 *
 * Sources simulées : IA locale, DataForSEO en bac à sable (valeurs factices).
 * Les assertions portent sur la cohérence réponse ↔ écran, jamais sur un chiffre.
 */
import { test, expect, type Page, type Response } from '@playwright/test'
import { selectArticle, useParcours, type ParcoursLevel } from '../helpers/parcours-fixtures'

test.describe.configure({ mode: 'serial' })

const parcours = useParcours()

interface RadarCardLike {
  keyword: string
  kpis: { searchVolume: number | null; difficulty: number | null; cpc: number | null } | null
}
interface RadarScanLike {
  cards: RadarCardLike[]
  globalScore: number | null
  heatLevel: string | null
  verdict: string
  autocomplete: { suggestions: unknown[]; totalCount: number }
}

const SCAN_URL = /\/api\/keywords\/radar\/scan$/
const API = `http://localhost:${process.env.PORT ?? 3400}/api`

async function apiJson<T>(page: Page, path: string): Promise<T> {
  const res = await page.request.get(`${API}${path}`)
  expect(res.ok(), `${path} doit répondre`).toBeTruthy()
  return (await res.json()).data as T
}

/** Ouvre l'onglet Radar depuis la barre de navigation du workflow. */
async function openRadar(page: Page): Promise<void> {
  const tab = page.locator('[data-testid="wf-item-radar"]')
  await expect(tab, 'l’onglet Radar doit être présent').toBeVisible({ timeout: 15000 })
  await tab.click()
  await expect(page.locator('[data-testid="radar-keywords-preview"], [data-testid="radar-keywords-empty"]'))
    .toBeVisible({ timeout: 15000 })
}

/** Ajoute un mot-clé à la liste d'attente du Radar (temps ①). */
async function addKeyword(page: Page, keyword: string): Promise<void> {
  const zone = page.locator('[data-testid="radar-manual-add"]')
  await expect(zone, 'la zone d’ajout manuel doit être présente').toBeVisible({ timeout: 15000 })
  await zone.locator('input').fill(keyword)
  await Promise.all([
    page.waitForResponse(r => r.url().endsWith('/radar-exploration/keyword') && r.request().method() === 'POST', { timeout: 30000 }),
    zone.locator('button', { hasText: 'Ajouter' }).click(),
  ])
  await expect(page.locator('[data-testid="radar-keywords-preview"]')).toBeVisible({ timeout: 15000 })
}

const LEVELS: ParcoursLevel[] = ['pilier', 'intermediaire', 'specifique']

for (const level of LEVELS) {
  test(`Radar — parcours complet (${level})`, async ({ page }) => {
    test.setTimeout(240_000)
    const article = parcours.articles[level]
    let scan: RadarScanLike

    await test.step('① déclencheur — le mot-clé rejoint la liste d’attente', async () => {
      await selectArticle(page, parcours, level)
      await openRadar(page)
      await addKeyword(page, article.keyword)
    })

    await test.step('③ service · ④ réponse — « Lancer le scan » interroge les sources', async () => {
      const bouton = page.locator('button', { hasText: 'Lancer le scan' }).first()
      await expect(bouton, 'le bouton de scan doit être actif').toBeEnabled({ timeout: 15000 })

      const [response] = await Promise.all([
        page.waitForResponse((r: Response) => SCAN_URL.test(r.url()) && r.request().method() === 'POST', { timeout: 120000 }),
        bouton.click(),
      ])
      expect(response.status(), 'le scan Radar doit répondre 200').toBe(200)
      scan = (await response.json()).data as RadarScanLike

      expect(scan.cards.length, 'au moins une carte scannée').toBeGreaterThan(0)
      expect(scan.cards.map(c => c.keyword)).toContain(article.keyword)
    })

    await test.step('⑤ mise en forme — score global et KPI absents restent absents', async () => {
      expect(scan.globalScore === null || Number.isFinite(scan.globalScore), 'score global : valeur ou absence').toBe(true)
      expect(
        scan.heatLevel === null || ['brulante', 'chaude', 'tiede', 'froide'].includes(scan.heatLevel),
        'chaleur : valeur connue ou absence, jamais inventée',
      ).toBe(true)

      for (const card of scan.cards) {
        if (card.kpis === null) continue // longue traîne sans KPI : explicite
        for (const [nom, valeur] of Object.entries(card.kpis)) {
          if (['searchVolume', 'difficulty', 'cpc'].includes(nom)) {
            expect(valeur === null || Number.isFinite(valeur), `${card.keyword} · ${nom}`).toBe(true)
          }
        }
      }
    })

    await test.step('⑦ affichage — le thermomètre dit la même chose que la réponse', async () => {
      const score = page.locator('.thermo-score').first()
      await expect(score).toBeVisible({ timeout: 20000 })
      const affiché = (await score.innerText()).trim()
      if (scan.globalScore === null) {
        expect(affiché, 'sans score global, le thermomètre affiche « —/100 »').toBe('—/100')
      } else {
        expect(affiché, 'avec score global, le thermomètre affiche la valeur').toMatch(/^\d+\/100$/)
      }

      const carte = page.locator('.radar-cards').getByText(article.keyword, { exact: false }).first()
      await expect(carte, 'la carte scannée doit être à l’écran').toBeVisible({ timeout: 15000 })
    })

    await test.step('⑥ sauvegarde — l’exploration Radar est relisible en base', async () => {
      const exploration = await apiJson<{ scanResult: { cards: Array<{ keyword: string }> } } | null>(
        page, `/articles/${article.id}/radar-exploration`,
      )
      expect(exploration, 'une exploration Radar doit exister').not.toBeNull()
      expect(exploration!.scanResult.cards.map(c => c.keyword)).toContain(article.keyword)
    })

    await test.step('② mémoire + ⑦ — après rechargement, l’écran réaffiche le même scan', async () => {
      await page.reload()
      await page.waitForLoadState('networkidle', { timeout: 20000 })
      await selectArticle(page, parcours, level)
      await openRadar(page)

      const prompt = page.locator('[data-testid="tlp-load-db"]')
      if (await prompt.count() > 0) await prompt.first().click()

      // La restauration est asynchrone : on laisse l'écran se stabiliser.
      const score = page.locator('.thermo-score').first()
      await expect(score).toBeVisible({ timeout: 20000 })
      const attendu = scan.globalScore === null ? /^—\/100$/ : /^\d+\/100$/
      await expect.poll(async () => (await score.innerText()).trim(), { timeout: 20000 })
        .toMatch(attendu)
    })

    await test.step('⑧ décision — une carte cochée part vers le Capitaine', async () => {
      const cases = page.locator('[data-testid="radar-card-checkbox"]')
      await expect(cases.first(), 'les cartes doivent être cochables').toBeVisible({ timeout: 20000 })
      await cases.first().check()

      const envoi = page.locator('button', { hasText: 'Envoyer au Capitaine' }).first()
      await expect(envoi, 'le bouton d’envoi doit apparaître').toBeVisible({ timeout: 10000 })
      await envoi.click()

      await expect(page.locator('[data-testid="captain-layout"]'), 'l’onglet Capitaine reçoit la main')
        .toBeVisible({ timeout: 20000 })
    })
  })
}
