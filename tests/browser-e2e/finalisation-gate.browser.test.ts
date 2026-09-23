/**
 * Browser E2E — Onglet Finalisation : récapitulatif et sortie vers la Rédaction.
 *
 * Durci le 2026-09-23. Les trois tests d'origine vérifiaient l'absence de
 * repères — dont un (`cta-goto-finalisation`) qui n'existe nulle part dans
 * `src/` : l'assertion `0 === 0` ne pouvait pas échouer. Le troisième portait
 * un nom décrivant un gating dur abandonné depuis (FR-MOT-FREE-NAV : la
 * navigation est libre, ce sont les écritures qui sont gardées).
 */
import { test, expect } from './helpers/test-fixtures'
import { openMoteur, selectArticleByTitle, tabLocator } from './helpers/moteur-ui'

test.describe('Finalisation — récapitulatif', () => {
  test('le panneau récapitule les trois sous-phases, vides comprises', async ({ page, ctx }) => {
    const article = await ctx.createArticle('FinalGate Browser')
    await openMoteur(page, article.cocoonId)
    await selectArticleByTitle(page, article.titre)
    await tabLocator(page, 'finalisation').click()

    await expect(page.locator('[data-testid="finalisation-panel"]'), 'le panneau se rend')
      .toBeVisible({ timeout: 15000 })

    for (const section of ['capitaine', 'lieutenants', 'lexique']) {
      await expect(page.locator(`[data-testid="finalisation-${section}"]`), `la section ${section} est présente`)
        .toBeVisible({ timeout: 10000 })
    }
  })

  test('sur un article neuf, le récapitulatif dit ce qui manque plutôt que de rester vide', async ({ page, ctx }) => {
    const article = await ctx.createArticle('FinalEmpty Browser')
    await openMoteur(page, article.cocoonId)
    await selectArticleByTitle(page, article.titre)
    await tabLocator(page, 'finalisation').click()

    const panel = page.locator('[data-testid="finalisation-panel"]')
    await expect(panel).toBeVisible({ timeout: 15000 })

    // Aucune décision prise : l'écran l'annonce explicitement (pas de zone muette).
    await expect(panel, 'les Lieutenants manquants sont annoncés').toContainText('Aucun lieutenant verrouillé')
    await expect(panel, 'le Lexique manquant est annoncé').toContainText('Aucun terme validé')
    // Le Capitaine absent s'affiche « — », jamais un vide ni un zéro inventé.
    await expect(page.locator('.finalisation__keyword'), 'le Capitaine absent s’affiche « — »')
      .toHaveText('—', { timeout: 10000 })

    // FR-MOT-FINAL-CTA-GATED — l'en-tête ne promet pas ce que le contenu dément.
    await expect(page.locator('[data-testid="finalisation-title"]'), 'l’en-tête reste honnête')
      .toContainText('Préparation en cours')
  })

  test('les deux portes vers la Rédaction obéissent à la même règle', async ({ page, ctx }) => {
    const article = await ctx.createArticle('FinalCTA Browser')
    await openMoteur(page, article.cocoonId)
    await selectArticleByTitle(page, article.titre)
    await tabLocator(page, 'finalisation').click()

    // Celle du panneau…
    const ctaPanneau = page.locator('[data-testid="finalisation-cta-redaction"]')
    await expect(ctaPanneau).toBeVisible({ timeout: 15000 })
    await expect(ctaPanneau, 'le bouton du panneau est fermé').toBeDisabled()

    // …et celle du bas de page.
    const ctaBas = page.locator('[data-testid="cta-redaction"]')
    await expect(ctaBas, 'le bouton du bas aussi').toBeDisabled()

    // Ni l'une ni l'autre n'a emmené l'utilisateur ailleurs.
    await ctaPanneau.click({ force: true })
    expect(page.url(), 'on reste sur le Moteur').toContain('/moteur')
  })
})
