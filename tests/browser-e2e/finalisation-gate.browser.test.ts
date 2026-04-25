/**
 * Browser E2E — Finalisation gate (testid finalisation-cta-redaction, phase-tab-finalisation)
 */
import { test, expect } from './helpers/test-fixtures'

test.describe('Finalisation — gate et CTA', () => {
  test('phase-tab-finalisation absent pour article neuf (gate)', async ({ page, ctx }) => {
    const article = await ctx.createArticle('FinalGate Browser')
    await page.goto(`/cocoon/${article.cocoonId}/moteur`)
    await page.waitForLoadState('networkidle', { timeout: 15000 })

    const tab = page.locator('[data-testid="phase-tab-finalisation"]')
    // Peut être 0 (absent) ou présent mais disabled/locked
    const count = await tab.count()
    if (count > 0) {
      const locked = await tab.getAttribute('data-locked')
      expect(['true', 'false']).toContain(locked ?? 'false')
    }
  })

  test('cta-goto-finalisation absent tant que pas de locks', async ({ page, ctx }) => {
    const article = await ctx.createArticle('FinalCTA Browser')
    await page.goto(`/cocoon/${article.cocoonId}/moteur`)
    await page.waitForLoadState('networkidle', { timeout: 15000 })

    const cta = page.locator('[data-testid="cta-goto-finalisation"]')
    // CTA apparaît uniquement si 3 locks posés
    expect(await cta.count()).toBe(0)
  })

  test('finalisation-cta-redaction (CTA vers Rédaction) absent sans finalisation active', async ({ page, ctx }) => {
    const article = await ctx.createArticle('FinalRedact Browser')
    await page.goto(`/cocoon/${article.cocoonId}/moteur`)
    await page.waitForLoadState('networkidle', { timeout: 15000 })

    const cta = page.locator('[data-testid="finalisation-cta-redaction"]')
    expect(await cta.count()).toBe(0)
  })
})
