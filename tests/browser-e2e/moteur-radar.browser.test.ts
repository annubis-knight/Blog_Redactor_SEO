/**
 * Browser E2E — Onglet Moteur · Radar
 *
 * Durci le 2026-09-23 : les deux tests étaient enrobés d'un `if (count > 0)`
 * toujours faux (repère `phase-tab-radar` inexistant).
 */
import { test, expect } from './helpers/test-fixtures'
import { openMoteur, selectArticleByTitle, tabLocator } from './helpers/moteur-ui'

test.describe('Moteur Radar — structure', () => {
  test('Radar est accessible sur un article neuf (F1)', async ({ page, ctx }) => {
    const article = await ctx.createArticle('Radar Browser')
    await openMoteur(page, article.cocoonId)
    await selectArticleByTitle(page, article.titre)

    await expect(tabLocator(page, 'radar'), 'Radar reste cliquable sans Capitaine verrouillé')
      .toBeEnabled({ timeout: 15000 })
  })

  test('le clic sur Radar ouvre l’onglet et son ajout manuel', async ({ page, ctx }) => {
    const article = await ctx.createArticle('Radar Switch')
    await openMoteur(page, article.cocoonId)
    await selectArticleByTitle(page, article.titre)

    const tab = tabLocator(page, 'radar')
    await expect(tab).toBeEnabled({ timeout: 15000 })
    await tab.click()
    await expect(tab, 'l’onglet devient actif').toHaveAttribute('aria-selected', 'true', { timeout: 10000 })

    // Sans scan, l'onglet propose au moins d'ajouter un mot-clé à la main.
    await expect(page.locator('[data-testid="radar-manual-add"]'), 'l’ajout manuel est proposé')
      .toBeVisible({ timeout: 20000 })
  })
})
