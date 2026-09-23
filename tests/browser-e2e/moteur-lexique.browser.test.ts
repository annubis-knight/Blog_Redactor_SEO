/**
 * Browser E2E — Onglet Moteur · Lexique
 *
 * Durci le 2026-09-23 : les deux tests d'origine s'appuyaient sur
 * `expect(count).toBeGreaterThanOrEqual(0)`, vrai par définition.
 */
import { test, expect } from './helpers/test-fixtures'
import { openMoteur, selectArticleByTitle, tabLocator } from './helpers/moteur-ui'

test.describe('Moteur Lexique — structure', () => {
  test('l’onglet Lexique est rendu et visitable', async ({ page, ctx }) => {
    const article = await ctx.createArticle('Lex Browser')
    await openMoteur(page, article.cocoonId)
    await selectArticleByTitle(page, article.titre)

    await expect(tabLocator(page, 'lexique'), 'l’onglet Lexique est dans la navigation')
      .toBeVisible({ timeout: 15000 })
  })

  test('l’extraction n’est proposée qu’une fois sur l’onglet, et dit ce qui bloque', async ({ page, ctx }) => {
    const article = await ctx.createArticle('LexExtract Browser')
    await openMoteur(page, article.cocoonId)
    await selectArticleByTitle(page, article.titre)

    // Avant le switch : le bouton d'extraction n'est pas monté ailleurs dans la page.
    await expect(page.locator('[data-testid="btn-extract"]'), 'rien ne fuit hors de l’onglet')
      .toHaveCount(0)

    const tab = tabLocator(page, 'lexique')
    await expect(tab).toBeEnabled({ timeout: 15000 })
    await tab.click()

    // Après le switch : soit l'extraction est proposée, soit l'écran nomme le
    // préalable manquant (analyse SERP). Jamais un onglet muet.
    const extraire = page.locator('[data-testid="btn-extract"]')
    const précheck = page.locator('[data-testid="precheck-missing"]')
    await expect(extraire.or(précheck).first(), 'l’onglet dit quoi faire')
      .toBeVisible({ timeout: 20000 })
  })
})
