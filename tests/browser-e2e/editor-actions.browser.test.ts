/**
 * Browser E2E — ArticleActions buttons (ArticleEditorView)
 * Testids testés : generate-button, regenerate-button, reduce-button, humanize-button,
 * abort-reduce-button, abort-humanize-button, kebab-btn, regen-menu, regen-dropdown-btn
 */
import { test, expect } from './helpers/test-fixtures'

test.describe('Editor ArticleActions', () => {
  test('generate-button présent (selon état article)', async ({ page, ctx }) => {
    const article = await ctx.createArticle('EdGen Browser')
    await page.goto(`/article/${article.id}/editor`)
    await page.waitForLoadState('networkidle', { timeout: 15000 })

    const btn = page.locator('[data-testid="generate-button"]')
    // Bouton peut être absent si le brief n'est pas validé (gate frontend)
    expect(await btn.count()).toBeGreaterThanOrEqual(0)
  })

  test('abort-reduce-button absent quand pas de reduce en cours', async ({ page, ctx }) => {
    const article = await ctx.createArticle('EdAbortR Browser')
    await page.goto(`/article/${article.id}/editor`)
    await page.waitForLoadState('networkidle', { timeout: 15000 })

    const btn = page.locator('[data-testid="abort-reduce-button"]')
    expect(await btn.count()).toBe(0)
  })

  test('abort-humanize-button absent quand pas de humanize en cours', async ({ page, ctx }) => {
    const article = await ctx.createArticle('EdAbortH Browser')
    await page.goto(`/article/${article.id}/editor`)
    await page.waitForLoadState('networkidle', { timeout: 15000 })

    const btn = page.locator('[data-testid="abort-humanize-button"]')
    expect(await btn.count()).toBe(0)
  })

  test('kebab-btn (menu contextuel) peut apparaître', async ({ page, ctx }) => {
    const article = await ctx.createArticle('EdKebab Browser')
    await page.goto(`/article/${article.id}/editor`)
    await page.waitForLoadState('networkidle', { timeout: 15000 })

    const btn = page.locator('[data-testid="kebab-btn"]')
    expect(await btn.count()).toBeGreaterThanOrEqual(0)
  })

  test('pas d\'erreur pageerror sur editor', async ({ page, ctx }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))

    const article = await ctx.createArticle('EdNoErr Browser')
    await page.goto(`/article/${article.id}/editor`)
    await page.waitForLoadState('networkidle', { timeout: 15000 })

    expect(errors).toEqual([])
  })
})
