/**
 * Browser E2E — Navigation Moteur (5 onglets + gate Finalisation)
 *
 * Durci le 2026-09-23 : ces tests enrobaient chaque assertion d'un
 * `if (count > 0)` parce que le socle ouvrait un cocon inexistant (clé primaire
 * au lieu de l'index) et qu'aucun article n'était sélectionnable. Le socle
 * réparé, les assertions sont désormais fermes.
 */
import { test, expect } from './helpers/test-fixtures'
import { MOTEUR_TABS, openMoteur, selectArticleByTitle, tabLocator } from './helpers/moteur-ui'

test.describe('Moteur — Charge avec un article test', () => {
  test('navigue vers /cocoon/:id/moteur sans erreur', async ({ page, ctx }) => {
    const article = await ctx.createArticle('Moteur Nav Article')
    await openMoteur(page, article.cocoonId)
    const body = await page.textContent('body')
    expect(body && body.length).toBeGreaterThan(0)
  })

  test('navigation vers /cocoon/:id/cerveau', async ({ page, ctx }) => {
    const article = await ctx.createArticle('Cerveau Nav Article')
    await page.goto(`/cocoon/${article.cocoonId}/cerveau`)
    await page.waitForLoadState('networkidle', { timeout: 15000 })
    const body = await page.textContent('body')
    expect(body && body.length).toBeGreaterThan(0)
  })

  test('navigation vers /cocoon/:id/redaction', async ({ page, ctx }) => {
    const article = await ctx.createArticle('Redaction Nav Article')
    await page.goto(`/cocoon/${article.cocoonId}/redaction`)
    await page.waitForLoadState('networkidle', { timeout: 15000 })
    const body = await page.textContent('body')
    expect(body && body.length).toBeGreaterThan(0)
  })
})

test.describe('Moteur — Onglets (gate frontend F1)', () => {
  test('les 6 onglets sont rendus une fois un article sélectionné', async ({ page, ctx }) => {
    const article = await ctx.createArticle('Tabs Article')
    await openMoteur(page, article.cocoonId)
    await selectArticleByTitle(page, article.titre)

    for (const tab of MOTEUR_TABS) {
      await expect(tabLocator(page, tab), `l'onglet ${tab} doit être rendu`)
        .toBeVisible({ timeout: 15000 })
    }
  })

  test('Discovery et Radar ne sont jamais verrouillés (F1)', async ({ page, ctx }) => {
    const article = await ctx.createArticle('F1 Article')
    await openMoteur(page, article.cocoonId)
    await selectArticleByTitle(page, article.titre)

    // F1 : accessibles quel que soit l'état du Capitaine (article neuf ici).
    await expect(tabLocator(page, 'discovery'), 'Découverte reste cliquable').toBeEnabled({ timeout: 15000 })
    await expect(tabLocator(page, 'radar'), 'Radar reste cliquable').toBeEnabled({ timeout: 15000 })
  })

  test('navigation libre : Lieutenants, Structure, Lexique et Finalisation restent ouverts (FR-MOT-FREE-NAV)', async ({ page, ctx }) => {
    const article = await ctx.createArticle('Gate Article')
    await openMoteur(page, article.cocoonId)
    await selectArticleByTitle(page, article.titre)

    // Gating souple : on peut aller voir n'importe quelle étape sur un article
    // neuf. Ce qui est gardé, ce sont les écritures — pas la visite.
    for (const tab of ['lieutenants', 'structure', 'lexique', 'finalisation'] as const) {
      await expect(tabLocator(page, tab), `l’onglet ${tab} reste visitable`)
        .toBeEnabled({ timeout: 15000 })
    }
  })

  test('le passage en Rédaction est refusé tant que les 4 verrous manquent, et dit lesquels', async ({ page, ctx }) => {
    const article = await ctx.createArticle('Final Gate Article')
    await openMoteur(page, article.cocoonId)
    await selectArticleByTitle(page, article.titre)

    await tabLocator(page, 'finalisation').click()

    // Le vrai garde-fou n'est pas l'onglet mais le bouton de sortie : il reste
    // désactivé et énumère ce qui manque (useFinalisationGating).
    const cta = page.locator('[data-testid="cta-redaction"]')
    await expect(cta, 'le bouton de passage en Rédaction est rendu').toBeVisible({ timeout: 15000 })
    await expect(cta, 'et refusé sur un article neuf').toBeDisabled()
    await expect(cta, 'en nommant les étapes restantes')
      .toHaveAttribute('title', /Capitaine à verrouiller.*Lieutenants à verrouiller.*Structure à valider.*Lexique à valider/)
  })

  test('cliquer un onglet le rend actif', async ({ page, ctx }) => {
    const article = await ctx.createArticle('Switch Article')
    await openMoteur(page, article.cocoonId)
    await selectArticleByTitle(page, article.titre)

    const radar = tabLocator(page, 'radar')
    await expect(radar).toBeEnabled({ timeout: 15000 })
    await radar.click()
    await expect(radar, 'l’onglet cliqué devient l’onglet actif')
      .toHaveAttribute('aria-selected', 'true', { timeout: 10000 })
  })
})
