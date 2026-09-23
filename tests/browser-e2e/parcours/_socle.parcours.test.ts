/**
 * Parcours — vérification du socle (tech-spec-parcours-8-temps).
 *
 * Avant de tester les 8 temps d'une sous-phase, on s'assure que la préparation
 * tient : le cocon de test existe, ses trois articles sont visibles dans la
 * barre du haut du Moteur, ils sont sélectionnables, et le serveur ne parle à
 * aucune source payante.
 */
import { test, expect } from '@playwright/test'
import { selectArticle, useParcours, type ParcoursLevel } from '../helpers/parcours-fixtures'
import { effectiveMode } from '../helpers/runtime-mode'

test.describe.configure({ mode: 'serial' })

const parcours = useParcours()

test.describe('Socle des parcours', () => {
  test('garde-fou : le serveur est en mode simulé (aucun appel payant)', async () => {
    expect(await effectiveMode()).toBe('mock')
  })

  test('le cocon de test est joignable par son index dans l’URL', async ({ page }) => {
    expect(parcours.cocoonIndex, 'index du cocon résolu depuis GET /cocoons').toBeGreaterThanOrEqual(0)
    await page.goto(parcours.moteurUrl())
    await page.waitForLoadState('networkidle', { timeout: 20000 })
    await expect(page.locator('.tree-article-btn').first()).toBeVisible({ timeout: 10000 })
  })

  const levels: ParcoursLevel[] = ['pilier', 'intermediaire', 'specifique']
  for (const level of levels) {
    test(`l’article ${level} est sélectionnable et monte l’onglet Capitaine`, async ({ page }) => {
      await selectArticle(page, parcours, level)
      await expect(page.locator('[data-testid="captain-layout"]')).toBeVisible()
      await expect(page.locator('[data-testid="radar-list"]')).toBeVisible()
    })
  }

  test('aucune erreur JavaScript pendant la sélection', async ({ page }) => {
    const erreurs: string[] = []
    page.on('pageerror', e => erreurs.push(e.message))
    await selectArticle(page, parcours, 'pilier')
    expect(erreurs).toEqual([])
  })
})
