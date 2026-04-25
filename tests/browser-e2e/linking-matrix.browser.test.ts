/**
 * Browser E2E — LinkingMatrixView
 */
import { test, expect } from './helpers/test-fixtures'

test.describe('Linking Matrix', () => {
  test('charge /linking sans erreur', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    await page.goto('/linking')
    await page.waitForLoadState('networkidle', { timeout: 15000 })
    expect(errors).toEqual([])
  })
})

test.describe('Post-Publication', () => {
  test('charge /post-publication sans erreur', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    await page.goto('/post-publication')
    await page.waitForLoadState('networkidle', { timeout: 15000 })
    expect(errors).toEqual([])
  })
})

test.describe('Explorateur', () => {
  test('charge /explorateur sans erreur', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    await page.goto('/explorateur')
    await page.waitForLoadState('networkidle', { timeout: 15000 })
    expect(errors).toEqual([])
  })
})
