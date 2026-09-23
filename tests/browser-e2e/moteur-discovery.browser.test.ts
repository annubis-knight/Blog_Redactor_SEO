/**
 * Browser E2E — Onglet Moteur · Découverte
 *
 * Durci le 2026-09-23 : le test « non-locked » n'était jamais exécuté (repère
 * `phase-tab-discovery` inexistant — la nav émet `wf-item-*`).
 */
import { test, expect } from './helpers/test-fixtures'
import { openMoteur, selectArticleByTitle, tabLocator } from './helpers/moteur-ui'

test.describe('Moteur Discovery — structure page', () => {
  test('charge MoteurView sans erreur pageerror', async ({ page, ctx }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))

    const article = await ctx.createArticle('Disc Browser')
    await openMoteur(page, article.cocoonId)

    expect(errors).toEqual([])
  })

  test('Découverte est accessible sur un article neuf (F1) et rend son panneau', async ({ page, ctx }) => {
    const article = await ctx.createArticle('F1 Disc')
    await openMoteur(page, article.cocoonId)
    await selectArticleByTitle(page, article.titre)

    const tab = tabLocator(page, 'discovery')
    await expect(tab, 'Découverte reste cliquable quel que soit l’état du Capitaine')
      .toBeEnabled({ timeout: 15000 })
    await tab.click()
    await expect(tab).toHaveAttribute('aria-selected', 'true', { timeout: 10000 })

    await expect(page.locator('[data-testid="discovery-ai-panel"]'), 'le panneau Découverte se rend')
      .toBeVisible({ timeout: 20000 })
  })
})
