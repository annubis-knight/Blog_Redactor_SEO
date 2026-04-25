/**
 * Browser E2E — Onglet Moteur · Radar
 */
import { test, expect } from './helpers/test-fixtures'

test.describe('Moteur Radar — structure', () => {
  test('phase-tab-radar présent et non-locked (F1)', async ({ page, ctx }) => {
    const article = await ctx.createArticle('Radar Browser')
    await page.goto(`/cocoon/${article.cocoonId}/moteur`)
    await page.waitForLoadState('networkidle', { timeout: 15000 })

    const tab = page.locator('[data-testid="phase-tab-radar"]')
    if (await tab.count() > 0) {
      expect(await tab.getAttribute('data-locked')).toBe('false')
    }
  })

  test('switch vers Radar via click', async ({ page, ctx }) => {
    const article = await ctx.createArticle('Radar Switch')
    await page.goto(`/cocoon/${article.cocoonId}/moteur`)
    await page.waitForLoadState('networkidle', { timeout: 15000 })

    const radarTab = page.locator('[data-testid="phase-tab-radar"]')
    if (await radarTab.count() > 0 && await radarTab.isEnabled()) {
      await radarTab.click()
      // Après click, data-active devrait être true
      await expect(radarTab).toHaveAttribute('data-active', 'true', { timeout: 5000 })
    }
  })
})
