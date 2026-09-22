/**
 * Interactions internes — cartes Lieutenants et plan Hn (tech-spec-parcours-8-temps).
 *
 *   · une carte Lieutenant : score, niveau Hn, sources, case à cocher
 *   · la section « Autres candidats » se déplie
 *   · le tri A-Z / Score IA réordonne sans perdre de carte
 *   · un titre du plan Hn se verrouille, et survit à une régénération
 *   · le panneau « Suggestions IA Lieutenants » se replie et se relance
 *
 * Mode simulé : IA locale, DataForSEO en bac à sable (coût 0).
 */
import { test, expect, type Page } from '@playwright/test'
import { scanAndLockCaptain, selectArticle, useParcours } from '../helpers/parcours-fixtures'

test.describe.configure({ mode: 'serial' })

const parcours = useParcours()
const SERP_URL = /\/api\/serp\/analyze$/

/** Amène l'onglet Lieutenants au stade « propositions IA affichées ». */
async function lieutenantsAvecPropositions(page: Page, level: 'pilier' | 'intermediaire' | 'specifique'): Promise<void> {
  const article = parcours.articles[level]
  await selectArticle(page, parcours, level)

  // L'état du Capitaine se lit en base : l'écran peut rouvrir un autre onglet.
  const progression = await page.request.get(`http://localhost:${process.env.PORT ?? 3400}/api/articles/${article.id}/progress`)
  const checks = progression.ok() ? ((await progression.json()).data?.completedChecks ?? []) : []
  if (!checks.includes('moteur:capitaine_locked')) {
    await page.locator('[data-testid="wf-item-capitaine"]').click()
    await scanAndLockCaptain(page, article.keyword)
  }

  await page.locator('[data-testid="wf-item-lieutenants"]').click()

  const cartes = page.locator('[data-testid="lieutenant-cards-list"]')
  if (await cartes.count() > 0) return

  const analyser = page.locator('.btn-analyze', { hasText: 'Analyser SERP' }).first()
  await expect(analyser).toBeEnabled({ timeout: 30000 })
  await Promise.all([
    page.waitForResponse(r => SERP_URL.test(r.url()) && r.request().method() === 'POST', { timeout: 120000 }),
    analyser.click(),
  ])
  await expect(cartes, 'les propositions IA doivent arriver').toBeVisible({ timeout: 180000 })
}

test('Lieutenants — une carte montre son score, son niveau Hn et ses sources', async ({ page }) => {
  test.setTimeout(300_000)
  await lieutenantsAvecPropositions(page, 'pilier')

  const carte = page.locator('[data-testid="lieutenant-cards-list"] .lt-card').first()
  await expect(carte).toBeVisible({ timeout: 30000 })

  const score = (await carte.locator('.lt-card__score').innerText()).trim()
  expect(score, 'un score IA, ou « — » s’il n’a pas été fourni').toMatch(/^(\d+|—)$/)

  const niveau = (await carte.locator('.lt-card__hn-tag').innerText()).trim()
  expect(niveau, 'le niveau proposé est H2 ou H3').toMatch(/^H[23]$/)

  const sources = carte.locator('.lt-source')
  if (await sources.count() > 0) {
    const libellé = (await sources.first().innerText()).trim()
    expect(['paa', 'serp', 'group', 'root', 'content-gap'], 'une source connue').toContain(libellé)
  }

  // Cocher verrouille, décocher libère — sans rechargement.
  const caseÀCocher = carte.locator('[data-testid="lt-card-checkbox"]')
  expect(await caseÀCocher.isChecked(), 'une proposition arrive à valider').toBe(false)
  await caseÀCocher.check()
  expect(await caseÀCocher.isChecked()).toBe(true)
  await caseÀCocher.uncheck()
  expect(await caseÀCocher.isChecked()).toBe(false)
})

test('Lieutenants — la section « Autres candidats » se déplie', async ({ page }) => {
  test.setTimeout(300_000)
  await lieutenantsAvecPropositions(page, 'pilier')

  const section = page.locator('[data-testid="eliminated-section"]')
  if (await section.count() === 0) return // aucun candidat éliminé

  await expect(page.locator('[data-testid="eliminated-cards-list"]'), 'repliée par défaut')
    .toHaveCount(0)
  await section.locator('.eliminated-toggle').click()
  await expect(page.locator('[data-testid="eliminated-cards-list"]'), 'dépliée au clic')
    .toBeVisible({ timeout: 10000 })
})

test('Lieutenants — le tri réordonne sans perdre de carte', async ({ page }) => {
  test.setTimeout(300_000)
  await lieutenantsAvecPropositions(page, 'intermediaire')

  const cartes = page.locator('[data-testid="lieutenant-cards-list"] .lt-card')
  const avant = await cartes.count()
  expect(avant, 'des cartes sont affichées').toBeGreaterThan(0)

  const tri = page.locator('[data-testid="ia-proposal-section"] button', { hasText: 'Score IA' }).first()
  if (await tri.count() === 0) return

  await tri.click()
  await expect.poll(() => cartes.count(), { timeout: 10000 }).toBe(avant)
  await tri.click()
  await expect.poll(() => cartes.count(), { timeout: 10000 }).toBe(avant)
})

test('Lieutenants — un titre verrouillé survit à la régénération du plan', async ({ page }) => {
  test.setTimeout(300_000)
  await lieutenantsAvecPropositions(page, 'specifique')

  // Il faut au moins un Lieutenant coché pour pouvoir (re)générer.
  const cases = page.locator('[data-testid="lt-card-checkbox"]')
  await expect(cases.first()).toBeVisible({ timeout: 30000 })
  if (!(await cases.first().isChecked())) await cases.first().check()

  const vide = page.locator('[data-testid="hn-structure-empty"]')
  if (await vide.count() > 0) {
    await page.locator('[data-testid="hn-generate-btn"]').click()
  }
  const titres = page.locator('.hn-structure-item')
  await expect(titres.first(), 'un plan Hn est affiché').toBeVisible({ timeout: 180000 })

  const premierTitre = (await titres.first().locator('.hn-text').first().innerText()).trim()
  const cadenas = titres.first().locator('.hn-lock-btn').first()
  await cadenas.click()
  await expect(cadenas, 'le titre est verrouillé').toHaveAttribute('aria-pressed', 'true', { timeout: 10000 })

  await page.locator('[data-testid="hn-regenerate-btn"]').click()
  await expect(titres.first(), 'le plan est reconstruit').toBeVisible({ timeout: 180000 })

  await expect
    .poll(async () => (await page.locator('.hn-structure-section, [data-testid="hn-structure-section"]').innerText()), { timeout: 60000 })
    .toContain(premierTitre)
})

test('Lieutenants — le panneau IA rend compte de sa génération et propose de relancer', async ({ page }) => {
  test.setTimeout(300_000)
  await lieutenantsAvecPropositions(page, 'pilier')

  const panneau = page.locator('[data-testid="ai-panel-suggestion"]', { hasText: 'Suggestions IA Lieutenants' }).first()
  await expect(panneau, 'le panneau « Suggestions IA Lieutenants » doit être là').toBeVisible({ timeout: 30000 })

  // Après génération : soit le content-gap, soit le compte des propositions —
  // jamais un panneau muet.
  await expect(panneau, 'le panneau dit où en est la génération')
    .toContainText(/proposition|Content-gap|Aucune génération|Analyse IA/i, { timeout: 120000 })

  const erreur = panneau.locator('[data-testid="ai-retry-btn"]')
  if (await erreur.count() > 0) {
    // Échec honnête : message lisible + bouton pour relancer.
    await expect(panneau.locator('.lap__error')).toContainText(/.+/)
    await expect(erreur).toBeEnabled()
    return
  }

  const relance = panneau.locator('[data-testid="ai-regen-btn"]')
  await expect(relance, 'on peut relancer la suggestion').toBeVisible({ timeout: 15000 })
  await expect(relance).toBeEnabled()
  await expect(relance).toContainText(/Régénérer les suggestions|Lancer une suggestion IA/i)
})
