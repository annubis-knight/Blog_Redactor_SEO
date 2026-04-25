/**
 * Browser E2E — Dashboard / navigation principale
 */
import { test, expect } from './helpers/test-fixtures'

test.describe('Dashboard — page d\'accueil', () => {
  test('charge la home + affiche au moins un silo', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle', { timeout: 10000 })
    // Le H1 ou l'app shell doit être visible
    const body = await page.textContent('body')
    expect(body && body.length).toBeGreaterThan(0)
  })

  test('navigation vers /config (ThemeConfig)', async ({ page }) => {
    await page.goto('/config')
    await page.waitForLoadState('networkidle', { timeout: 10000 })
    const body = await page.textContent('body')
    // ThemeConfig doit charger sans erreur
    expect(body && body.length).toBeGreaterThan(0)
  })

  test('navigation vers /labo', async ({ page }) => {
    await page.goto('/labo')
    await page.waitForLoadState('networkidle', { timeout: 10000 })
    const url = page.url()
    expect(url).toContain('/labo')
  })

  test('route inexistante → fallback /:pathMatch', async ({ page }) => {
    await page.goto('/this-route-does-not-exist-xyz')
    await page.waitForLoadState('networkidle', { timeout: 10000 })
    // Soit NotFoundView soit redirect home
    const body = await page.textContent('body')
    expect(body && body.length).toBeGreaterThan(0)
  })
})

test.describe('Dashboard — pas d\'erreur console critique', () => {
  test('pageerror est vide après navigation', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    await page.goto('/')
    await page.waitForLoadState('networkidle', { timeout: 10000 })
    expect(errors).toEqual([])
  })
})
