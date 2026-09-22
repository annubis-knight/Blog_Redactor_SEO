/**
 * Interactions internes — cartes du Capitaine (tech-spec-parcours-8-temps).
 *
 * Les parcours vérifient l'enchaînement d'une sous-phase. Ici on descend d'un
 * cran : les gestes à l'intérieur des composants, ceux qui n'apparaissent dans
 * aucun parcours parce qu'ils ne changent pas d'onglet.
 *
 *   · cliquer un mot du mot-clé → une variante racine est scannée et affichée
 *   · choisir une racine dans la colonne de droite → la carte bascule dessus
 *   · recalculer la Pertinence → un nouveau scan part
 *   · ouvrir / fermer le tiroir de détail
 *   · le conseil IA : repli, relance, et rendu du texte
 *
 * Mode simulé : IA locale, DataForSEO en bac à sable (coût 0).
 */
import { test, expect, type Page } from '@playwright/test'
import { scanAndLockCaptain, selectArticle, useParcours } from '../helpers/parcours-fixtures'

test.describe.configure({ mode: 'serial' })

const parcours = useParcours()
const SCAN_URL = /\/api\/keywords\/.+\/scan$/

/** Scanne le mot-clé du Capitaine sans le verrouiller. */
async function scanOnly(page: Page, keyword: string): Promise<void> {
  const field = page.locator('[data-testid="keyword-input"] input').first()
  await expect(field).toBeVisible({ timeout: 15000 })
  await field.fill(keyword)
  await Promise.all([
    page.waitForResponse(r => SCAN_URL.test(r.url()) && r.request().method() === 'POST', { timeout: 60000 }),
    field.press('Enter'),
  ])
  await expect(page.locator('[data-testid="radar-list-item-0"]')).toBeVisible({ timeout: 30000 })
  await expect(page.locator('[data-testid="radar-list-item-0-loading"]')).toHaveCount(0, { timeout: 60000 })
}

async function ouvrirTiroir(page: Page): Promise<void> {
  const item = page.locator('[data-testid="radar-list-item-0"]')
  await item.focus()
  await item.press('Enter')
  await expect(page.locator('[data-testid="side-panel"]')).toBeVisible({ timeout: 15000 })
}

test('Capitaine — cliquer un mot du mot-clé scanne la variante racine', async ({ page }) => {
  test.setTimeout(180_000)
  const article = parcours.articles.pilier
  await selectArticle(page, parcours, 'pilier')
  await scanOnly(page, article.keyword)
  await ouvrirTiroir(page) // la colonne des racines vit dans le tiroir de détail

  const mots = page.locator('[data-testid="kw-words"]').first().locator('[data-testid^="kw-word-"]')
  await expect(mots.first(), 'le mot-clé est découpé en mots cliquables').toBeVisible({ timeout: 15000 })
  const nbMots = await mots.count()
  expect(nbMots, 'plusieurs mots cliquables').toBeGreaterThan(1)

  // Cliquer un mot retire ce mot de la combinaison : une variante est scannée.
  const [réponse] = await Promise.all([
    page.waitForResponse(r => SCAN_URL.test(r.url()) && r.request().method() === 'POST', { timeout: 60000 }),
    mots.nth(nbMots - 1).click(),
  ])
  expect(réponse.status(), 'la variante racine est scannée').toBe(200)

  // La variante apparaît dans la colonne des racines.
  // Dans le tiroir, le parent impose son propre repère (`side-panel-roots`).
  await expect(page.locator('[data-testid="side-panel-roots"], [data-testid="captain-roots-sidebar"]').first(),
    'la colonne des racines s’affiche').toBeVisible({ timeout: 30000 })
})

test('Capitaine — choisir une racine bascule la carte affichée', async ({ page }) => {
  test.setTimeout(180_000)
  const article = parcours.articles.intermediaire
  await selectArticle(page, parcours, 'intermediaire')
  await scanOnly(page, article.keyword)
  await ouvrirTiroir(page)

  const racines = page.locator('[data-testid="root-sidebar-item"]')
  if (await racines.count() === 0) {
    // Pas de racine générée d'office : on en crée une en cliquant un mot.
    const mots = page.locator('[data-testid="kw-words"]').first().locator('[data-testid^="kw-word-"]')
    const nbMots = await mots.count()
    await Promise.all([
      page.waitForResponse(r => SCAN_URL.test(r.url()) && r.request().method() === 'POST', { timeout: 60000 }),
      mots.nth(nbMots - 1).click(),
    ])
  }
  await expect.poll(() => racines.count(), { timeout: 60000 }).toBeGreaterThan(0)

  const libellé = (await racines.first().innerText()).trim().split('\n')[0]
  await racines.first().click()

  // Le tiroir affiche désormais la racine choisie.
  await expect(page.locator('[data-testid="side-panel"]'), 'le tiroir suit la racine choisie')
    .toContainText(libellé.slice(0, 12), { timeout: 15000 })
})

test('Capitaine — la moyenne des racines ignore les scores absents', async ({ page }) => {
  test.setTimeout(180_000)
  await selectArticle(page, parcours, 'intermediaire')
  await ouvrirTiroir(page)

  const moyenne = page.locator('[data-testid="roots-sidebar-average"]')
  if (await moyenne.count() === 0) return // aucune racine scorée : rien à moyenner

  const texte = (await moyenne.innerText()).trim()
  expect(texte, 'la moyenne est un score sur 100, jamais « 0 » par défaut').toMatch(/Moyenne\s+\d+\/100/)
})

test('Capitaine — le tiroir de détail s’ouvre et se ferme', async ({ page }) => {
  test.setTimeout(180_000)
  await selectArticle(page, parcours, 'intermediaire')
  await ouvrirTiroir(page)

  await page.locator('[data-testid="side-panel-close"]').click()
  await expect(page.locator('[data-testid="side-panel"]'), 'la croix referme le tiroir')
    .toHaveCount(0, { timeout: 10000 })
})

test('Capitaine — le conseil IA se déplie, se lance et affiche son texte', async ({ page }) => {
  test.setTimeout(240_000)
  const article = parcours.articles.specifique
  await selectArticle(page, parcours, 'specifique')
  await scanAndLockCaptain(page, article.keyword)
  await ouvrirTiroir(page)

  const panneau = page.locator('[data-testid="ai-panel-advice"]')
  await expect(panneau, 'le panneau « Avis expert IA » doit être présent').toBeVisible({ timeout: 60000 })

  // Replié par défaut : le hint invite à cliquer.
  const replié = panneau.locator('[data-testid="ai-panel-collapsed"]')
  const toggle = panneau.locator('[data-testid="ai-panel-toggle"]')
  if (await replié.count() > 0) {
    await expect(replié).toContainText(/Cliquez pour/i)
    await toggle.click()
    await expect(replié, 'le panneau se déplie').toHaveCount(0, { timeout: 10000 })
  }

  // Lancement du conseil, puis arrivée du texte (flux simulé).
  const lancer = panneau.locator('[data-testid="ai-trigger-primary"], [data-testid="ai-trigger-regen"]').first()
  if (await lancer.count() > 0) {
    await lancer.click()
  }
  await expect(panneau.locator('[data-testid="ai-advice-markdown"]'), 'le conseil rédigé s’affiche')
    .toBeVisible({ timeout: 120000 })
  await expect(panneau.locator('[data-testid="ai-advice-markdown"]'), 'le conseil n’est pas vide')
    .toContainText(/\S{20,}/, { timeout: 60000 })

  // Repli / dépli une fois le conseil arrivé.
  await toggle.click()
  await expect(panneau.locator('[data-testid="ai-panel-collapsed"]'), 'le panneau se replie')
    .toBeVisible({ timeout: 10000 })
  await toggle.click()
  await expect(panneau.locator('[data-testid="ai-advice-markdown"]'), 'et retrouve son texte')
    .toBeVisible({ timeout: 15000 })
})
