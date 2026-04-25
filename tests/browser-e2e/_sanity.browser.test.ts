/**
 * Sanity browser test — vérifie que l'app charge et que la home rend.
 * Si ce test casse, vérifier que `npm run dev:client` tourne sur :5173.
 */
import { test, expect } from './helpers/test-fixtures'

test('app charge la home page sans erreur', async ({ page }) => {
  await page.goto('/')
  // Attendre que Vue mount + qu'il n'y ait pas d'erreur 500
  await expect(page).toHaveTitle(/.+/)  // un titre quelconque

  // Pas d'erreur React/Vue critique dans la console
  const errors: string[] = []
  page.on('pageerror', err => errors.push(err.message))
  await page.waitForLoadState('networkidle', { timeout: 10000 })
  expect(errors).toEqual([])
})

test('helpers/test-fixtures peut créer un article DB', async ({ ctx }) => {
  const article = await ctx.createArticle('Sanity Browser Article')
  expect(article.id).toBeGreaterThan(0)
  expect(article.titre).toContain('[browser:')
})
