/**
 * Browser E2E — ThemeConfig (Cerveau §4.1)
 */
import { test, expect } from './helpers/test-fixtures'

test.describe('ThemeConfig', () => {
  test('charge /config sans erreur', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    await page.goto('/config')
    await page.waitForLoadState('networkidle', { timeout: 15000 })
    expect(errors).toEqual([])
  })

  test('le thème courant est lu (avatar / positioning / offerings)', async ({ page }) => {
    await page.goto('/config')
    await page.waitForLoadState('networkidle', { timeout: 15000 })
    const body = await page.textContent('body')
    // L'un de ces mots-clés doit apparaître dans la UI ThemeConfig
    expect(/avatar|positionnement|positioning|offre|cible/i.test(body ?? '')).toBe(true)
  })
})
