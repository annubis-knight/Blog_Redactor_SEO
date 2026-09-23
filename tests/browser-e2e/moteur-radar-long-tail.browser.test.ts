/**
 * Browser E2E — Moteur · Radar · Suggestions longue traîne.
 *
 * La section n'apparaît qu'à partir de 2 mots-clés racines scannés : sur un
 * article neuf, elle doit rester absente — et ne pas fuir sur un autre onglet.
 *
 * Durci le 2026-09-23. L'en-tête d'origine notait que « la fixture browser
 * actuelle ne permet pas la sélection d'article via MoteurContextRecap » : le
 * socle pose désormais la stratégie du cocon, donc les onglets sont réellement
 * atteignables et les vérifications se font sur l'onglet concerné.
 *
 * Le golden-path complet (scan → 3 cartes → suggérer → cocher → envoi au
 * Capitaine) est couvert par `parcours/interactions-radar.parcours.test.ts`.
 */
import { test, expect } from './helpers/test-fixtures'
import { openMoteur, selectArticleByTitle, tabLocator } from './helpers/moteur-ui'

test.describe('Moteur Radar — Suggestions longue traîne (structure)', () => {
  test('charge MoteurView avec onglet Radar sans pageerror', async ({ page, ctx }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))

    const article = await ctx.createArticle('RadarLT Browser')
    await openMoteur(page, article.cocoonId)
    await selectArticleByTitle(page, article.titre)
    await tabLocator(page, 'radar').click()

    expect(errors).toEqual([])
  })

  test('section longue traîne absente tant qu’il y a moins de 2 racines scannées', async ({ page, ctx }) => {
    const article = await ctx.createArticle('RadarLT NoScan')
    await openMoteur(page, article.cocoonId)
    await selectArticleByTitle(page, article.titre)

    const tab = tabLocator(page, 'radar')
    await tab.click()
    await expect(tab, 'on est bien sur l’onglet Radar').toHaveAttribute('aria-selected', 'true', { timeout: 10000 })
    await expect(page.locator('[data-testid="radar-manual-add"]'), 'l’onglet Radar est rendu')
      .toBeVisible({ timeout: 20000 })

    await expect(page.locator('[data-testid="radar-long-tail-section"]'), 'section cachée sans scan')
      .toHaveCount(0)
    await expect(page.locator('[data-testid="btn-suggest-longtail"]'), 'et son bouton avec')
      .toHaveCount(0)
  })

  test('la longue traîne ne fuit pas sur l’onglet Découverte (isolation)', async ({ page, ctx }) => {
    const article = await ctx.createArticle('RadarLT Iso')
    await openMoteur(page, article.cocoonId)
    await selectArticleByTitle(page, article.titre)

    const discovery = tabLocator(page, 'discovery')
    await discovery.click()
    await expect(discovery, 'on est bien sur Découverte').toHaveAttribute('aria-selected', 'true', { timeout: 10000 })
    await expect(page.locator('[data-testid="discovery-ai-panel"]'), 'le panneau Découverte est rendu')
      .toBeVisible({ timeout: 20000 })

    await expect(page.locator('[data-testid="radar-long-tail-section"]'), 'aucun reliquat Radar ici')
      .toHaveCount(0)
  })
})
