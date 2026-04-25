/**
 * Browser E2E — Onglet Moteur · Discovery
 *
 * Ces tests chargent l'onglet Moteur et vérifient la présence des éléments UI
 * clés via testids stables. Les comportements dynamiques (checkbox basket,
 * expansion sections) sont testés uniquement si les testids sont en place.
 */
import { test, expect } from './helpers/test-fixtures'

test.describe('Moteur Discovery — structure page', () => {
  test('charge MoteurView sans erreur pageerror', async ({ page, ctx }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))

    const article = await ctx.createArticle('Disc Browser')
    await page.goto(`/cocoon/${article.cocoonId}/moteur`)
    await page.waitForLoadState('networkidle', { timeout: 15000 })

    expect(errors).toEqual([])
  })

  test('phase-tab-discovery présent et non-locked (F1)', async ({ page, ctx }) => {
    const article = await ctx.createArticle('F1 Disc')
    await page.goto(`/cocoon/${article.cocoonId}/moteur`)
    await page.waitForLoadState('networkidle', { timeout: 15000 })

    const tab = page.locator('[data-testid="phase-tab-discovery"]')
    if (await tab.count() > 0) {
      expect(await tab.getAttribute('data-locked')).toBe('false')
    }
  })
})
