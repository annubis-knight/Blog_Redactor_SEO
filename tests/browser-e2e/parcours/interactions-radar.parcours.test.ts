/**
 * Interactions internes — cartes du Radar (tech-spec-parcours-8-temps).
 *
 *   · déplier une carte → raisonnement et arbre PAA
 *   · déplier une question PAA (enfants, réponse)
 *   · survoler l'anneau de score → le détail du calcul, ou la raison de l'absence
 *   · cocher / tout cocher, trier, filtrer par CPC
 *   · suggestions longue traîne : génération, cases, report de la sélection
 *
 * Mode simulé : IA locale, DataForSEO en bac à sable (coût 0).
 */
import { test, expect, type Page } from '@playwright/test'
import { selectArticle, useParcours } from '../helpers/parcours-fixtures'

test.describe.configure({ mode: 'serial' })

const parcours = useParcours()
const RADAR_SCAN = /\/api\/keywords\/radar\/scan$/

/** Prépare l'onglet Radar avec un scan effectué (une carte au minimum). */
async function radarAvecScan(page: Page, level: 'pilier' | 'intermediaire' | 'specifique'): Promise<void> {
  const article = parcours.articles[level]
  await selectArticle(page, parcours, level)

  const tab = page.locator('[data-testid="wf-item-radar"]')
  await expect(tab).toBeVisible({ timeout: 15000 })
  await tab.click()

  // Restaure un scan déjà fait si l'écran le propose.
  const prompt = page.locator('[data-testid="tlp-load-db"]')
  if (await prompt.count() > 0) await prompt.first().click().catch(() => {})

  const cartes = page.locator('[data-testid="radar-card-checkbox"]')
  if (await cartes.count() > 0) return

  // Sinon : ajout du mot-clé puis scan.
  const zone = page.locator('[data-testid="radar-manual-add"]')
  await expect(zone).toBeVisible({ timeout: 15000 })
  await zone.locator('input').fill(article.keyword)
  await Promise.all([
    page.waitForResponse(r => r.url().endsWith('/radar-exploration/keyword') && r.request().method() === 'POST', { timeout: 30000 }),
    zone.locator('button', { hasText: 'Ajouter' }).click(),
  ])

  const scan = page.locator('button', { hasText: 'Lancer le scan' }).first()
  await expect(scan).toBeEnabled({ timeout: 15000 })
  await Promise.all([
    page.waitForResponse(r => RADAR_SCAN.test(r.url()) && r.request().method() === 'POST', { timeout: 120000 }),
    scan.click(),
  ])
  await expect(cartes.first(), 'une carte scannée doit apparaître').toBeVisible({ timeout: 60000 })
}

test('Radar — déplier une carte montre son raisonnement et ses questions', async ({ page }) => {
  test.setTimeout(240_000)
  await radarAvecScan(page, 'pilier')

  const carte = page.locator('.radar-card').first()
  await expect(carte).toBeVisible({ timeout: 30000 })

  const chevron = carte.locator('.radar-card__chevron').first()
  await chevron.click()

  const corps = carte.locator('.radar-card__body, .paa-tree, .radar-card__reasoning').first()
  await expect(corps, 'le corps de la carte se déplie').toBeVisible({ timeout: 15000 })

  // Refermer.
  await chevron.click()
  await expect(corps, 'et se replie').toBeHidden({ timeout: 15000 })
})

test('Radar — une question PAA se déplie (enfants et réponse)', async ({ page }) => {
  test.setTimeout(240_000)
  await radarAvecScan(page, 'pilier')

  const carte = page.locator('.radar-card').first()
  await carte.locator('.radar-card__chevron').first().click()

  const questions = carte.locator('.paa-question')
  if (await questions.count() === 0) {
    // Aucune question dans le corpus simulé : l'écran doit le dire.
    await expect(carte.getByText(/Aucune PAA/i).first(), 'absence de PAA annoncée explicitement')
      .toBeVisible({ timeout: 15000 })
    return
  }

  const avecEnfants = carte.locator('.paa-node', { has: page.locator('.paa-children-count') }).first()
  if (await avecEnfants.count() > 0) {
    await avecEnfants.locator('.paa-tree-chevron').first().click()
    await expect(avecEnfants.locator('.paa-child, .paa-children').first(), 'les sous-questions s’affichent')
      .toBeVisible({ timeout: 15000 })
  }

  await questions.first().click()
  // Une réponse n'existe pas toujours : on vérifie seulement que le clic ne casse rien.
  await expect(carte, 'la carte reste affichée après le clic').toBeVisible()
})

test('Radar — l’anneau de score explique sa valeur, ou son absence', async ({ page }) => {
  test.setTimeout(240_000)
  await radarAvecScan(page, 'pilier')

  const anneau = page.locator('.radar-card__score-ring').first()
  await expect(anneau).toBeVisible({ timeout: 30000 })

  const valeur = (await anneau.locator('.score-ring__value').innerText()).trim()
  expect(valeur, 'un score, ou « — » quand il manque').toMatch(/^(\d+|—)$/)

  await anneau.hover()
  const infobulle = anneau.locator('.score-tooltip')
  await expect(infobulle, 'le survol explique le score').toBeVisible({ timeout: 10000 })

  if (valeur === '—') {
    await expect(infobulle, 'un score absent est expliqué, pas laissé vide').toContainText(/indisponible|longue|douleur|PAA|autocomplete/i)
  } else {
    await expect(infobulle, 'un score présent détaille son calcul').toContainText(/Total/i)
  }
})

test('Radar — cocher, tout cocher, trier et filtrer par CPC', async ({ page }) => {
  test.setTimeout(240_000)
  await radarAvecScan(page, 'intermediaire')

  const cases = page.locator('[data-testid="radar-card-checkbox"]')
  const total = await cases.count()
  expect(total, 'au moins une carte').toBeGreaterThan(0)

  await cases.first().check()
  expect(await cases.first().isChecked(), 'la carte est retenue').toBe(true)
  await cases.first().uncheck()
  expect(await cases.first().isChecked(), 'et se décoche').toBe(false)

  const toutCocher = page.locator('.check-all-toggle input').first()
  if (await toutCocher.count() > 0) {
    await toutCocher.check()
    await expect.poll(async () => cases.first().isChecked(), { timeout: 10000 }).toBe(true)
    await toutCocher.uncheck()
  }

  // Tri : le bouton « Score KPI » réordonne sans casser la liste.
  const tri = page.locator('button', { hasText: 'Score KPI' }).first()
  if (await tri.count() > 0) {
    await tri.click()
    await expect(cases.first(), 'la liste reste affichée après tri').toBeVisible({ timeout: 10000 })
  }

  // Filtre CPC : « Sans CPC » puis retour.
  const sansCpc = page.locator('button', { hasText: 'Sans CPC' }).first()
  if (await sansCpc.count() > 0) {
    await sansCpc.click()
    await expect(page.locator('.radar-cards'), 'la zone des cartes reste rendue').toBeVisible({ timeout: 10000 })
    await sansCpc.click()
  }
})

test('Radar — les suggestions longue traîne se génèrent et se cochent', async ({ page }) => {
  test.setTimeout(300_000)
  await radarAvecScan(page, 'specifique')

  const section = page.locator('[data-testid="radar-long-tail-section"]')
  if (await section.count() === 0) {
    return // moins de 2 mots-clés racines : la section n'a pas lieu d'être
  }

  const bouton = section.locator('[data-testid="btn-suggest-longtail"], [data-testid="btn-regenerate-longtail"]').first()
  await expect(bouton, 'le bouton de suggestion doit être là').toBeVisible({ timeout: 15000 })
  await bouton.click()

  const liste = section.locator('[data-testid="longtail-list"]')
  const erreur = section.locator('.longtail-error')
  await expect(liste.or(erreur).first(), 'une liste ou un message d’erreur, jamais rien').toBeVisible({ timeout: 120000 })

  if (await liste.count() > 0) {
    const cases = liste.locator('input[type="checkbox"]')
    const nb = await cases.count()
    expect(nb, 'des suggestions sont proposées').toBeGreaterThan(0)
    // Les meilleures arrivent pré-cochées : on vérifie que le clic bascule bien.
    const état = await cases.first().isChecked()
    await cases.first().setChecked(!état)
    expect(await cases.first().isChecked(), 'la case bascule').toBe(!état)
  }
})
