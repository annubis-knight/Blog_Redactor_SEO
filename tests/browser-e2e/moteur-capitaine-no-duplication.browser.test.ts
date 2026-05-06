/**
 * Sprint 22 — Browser E2E anti-duplication Capitaine (FR-CAP-LOCK-NO-DUPLICATE).
 *
 * Régression Sprint 17 : avant les fixes, l'utilisateur qui faisait plusieurs
 * toggles lock/unlock sur une RadarCard du Capitaine voyait la card se dupliquer
 * dans la liste (parfois 3+ cards identiques verrouillées en haut).
 *
 * Cause racine : watcher `keywords.capitaine` qui appelait `addEntry(persisted)`
 * sans dédoublonner, combiné au `pinnedPredicate` qui matchait toutes les entries
 * == lockedKeyword.
 *
 * Ce test simule plusieurs toggles et vérifie que le nombre de cards reste stable.
 *
 * IMPORTANT : ce test nécessite que le serveur dev tourne (npm run dev:server +
 * npm run dev:client) ET qu'il y ait au moins un article validé avec mots-clés.
 * Sinon il est skippé.
 */
import { test, expect } from '@playwright/test'
import { test as testWithCtx } from './helpers/test-fixtures'

testWithCtx.describe('Capitaine — Anti-duplication FR-CAP-LOCK-NO-DUPLICATE (Sprint 22)', () => {
  testWithCtx('5 toggles lock/unlock consécutifs ne dupliquent pas la card', async ({ page, ctx }) => {
    // Setup : créer un article fixture, naviguer vers Moteur Capitaine.
    const article = await ctx.createArticle('NoDup E2E Browser')
    await page.goto(`/cocoon/${article.cocoonId}/moteur`)
    await page.waitForLoadState('networkidle', { timeout: 15000 })

    // Sélectionner l'article via le tree
    const publishedToggle = page.locator('button:has-text("Articles publiés")').first()
    if (await publishedToggle.count() > 0) {
      try { await publishedToggle.click({ timeout: 2000 }) } catch { /* tolérant */ }
      await page.waitForTimeout(300)
    }
    const articleBtn = page.locator('.tree-article-btn', { hasText: article.titre })
    if (await articleBtn.count() === 0) {
      test.skip(true, 'Article fixture non visible dans le tree — skip (probable serveur dev offline)')
      return
    }
    await articleBtn.first().click()
    await page.waitForLoadState('networkidle', { timeout: 5000 })

    // S'assurer qu'on est dans l'onglet Capitaine
    const captainLayout = page.locator('[data-testid="captain-layout"]')
    if (await captainLayout.count() === 0) {
      test.skip(true, 'CaptainPanel non monté — fixture probablement sans keyword pré-validé')
      return
    }

    // Compter les cards initiales (peut être 0 ou 1 selon fixture)
    const radarListItems = page.locator('[data-testid^="radar-list-item-"]')
    const initialCount = await radarListItems.count()

    if (initialCount === 0) {
      test.skip(true, 'Aucune card initiale — l\'article fixture n\'a pas de keyword pré-validé')
      return
    }

    // Cible : la première card visible (= la card sélectionnée)
    const firstLockBtn = page.locator('[data-testid="radar-card-lock"]').first()
    expect(await firstLockBtn.count()).toBeGreaterThan(0)

    // Simulation : 5 toggles lock/unlock consécutifs
    for (let i = 0; i < 5; i++) {
      await firstLockBtn.click()
      await page.waitForTimeout(150) // laisse le store/watcher se settler
    }

    // Vérification : le nombre de cards n'a PAS augmenté
    const finalCount = await radarListItems.count()
    expect(finalCount).toBe(initialCount)
  })
})
