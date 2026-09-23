/**
 * Browser E2E — Navigation inter-onglets Moteur
 *
 * Durci le 2026-09-23 : `expect(count).toBeGreaterThanOrEqual(0)` et
 * `expect(['true','false',null]).toContain(active)` acceptaient toutes les
 * valeurs possibles — aucun des deux ne pouvait échouer.
 */
import { test, expect } from './helpers/test-fixtures'
import { MOTEUR_TABS, openMoteur, selectArticleByTitle, tabLocator } from './helpers/moteur-ui'

test.describe('Moteur — Navigation tabs', () => {
  test('les 5 onglets sont présents et portent leur libellé', async ({ page, ctx }) => {
    const article = await ctx.createArticle('AllTabs Browser')
    await openMoteur(page, article.cocoonId)
    await selectArticleByTitle(page, article.titre)

    const libellés: Record<string, RegExp> = {
      discovery: /Découverte|Discovery/i,
      radar: /Radar/i,
      capitaine: /Capitaine/i,
      lieutenants: /Lieutenants/i,
      lexique: /Lexique/i,
    }
    for (const tab of MOTEUR_TABS) {
      const locator = tabLocator(page, tab)
      await expect(locator, `l'onglet ${tab} est rendu`).toBeVisible({ timeout: 15000 })
      await expect(locator, `l'onglet ${tab} est nommé`).toHaveText(libellés[tab])
    }
  })

  test('un seul onglet est actif à la fois', async ({ page, ctx }) => {
    const article = await ctx.createArticle('DefaultTab Browser')
    await openMoteur(page, article.cocoonId)
    await selectArticleByTitle(page, article.titre)

    const actifs = page.locator('[data-testid^="wf-item-"][aria-selected="true"]')
    await expect(actifs, 'un onglet actif, et un seul').toHaveCount(1, { timeout: 15000 })

    // Après un switch, l'ancien onglet a rendu la main.
    await tabLocator(page, 'lexique').click()
    await expect(tabLocator(page, 'lexique')).toHaveAttribute('aria-selected', 'true', { timeout: 10000 })
    await expect(actifs, 'toujours un seul onglet actif').toHaveCount(1)
  })
})

test.describe('Moteur — pas d\'erreur pageerror sur chargement', () => {
  test('chargement cocoon/X/moteur ne génère pas d\'erreur JS', async ({ page, ctx }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))

    const article = await ctx.createArticle('NoErr Browser')
    await openMoteur(page, article.cocoonId)

    expect(errors).toEqual([])
  })

  test('chargement redaction ne génère pas d\'erreur JS', async ({ page, ctx }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))

    const article = await ctx.createArticle('NoErr Red Browser')
    await page.goto(`/cocoon/${article.cocoonId}/redaction`)
    await page.waitForLoadState('networkidle', { timeout: 15000 })

    expect(errors).toEqual([])
  })
})
