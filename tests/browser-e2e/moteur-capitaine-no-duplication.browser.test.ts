/**
 * Browser E2E anti-duplication Capitaine (FR-CAP-LOCK-NO-DUPLICATE, Sprint 22).
 *
 * Régression Sprint 17 : verrouiller puis déverrouiller plusieurs fois une même
 * carte la dupliquait dans la liste (jusqu'à 3 copies identiques épinglées en
 * haut). Cause : un watcher sur `keywords.capitaine` qui rajoutait l'entrée sans
 * dédoublonner, combiné au prédicat d'épinglage.
 *
 * Durci le 2026-09-23 : ce test se mettait en pause faute de pouvoir
 * sélectionner l'article (socle), et cliquait 5 fois sans attendre la
 * persistance — il n'aurait de toute façon rien prouvé.
 */
import { expect } from '@playwright/test'
import { test as testWithCtx } from './helpers/test-fixtures'
import { openMoteur, selectArticleByTitle } from './helpers/moteur-ui'
import { passThroughGate } from './helpers/gate-alarm'

testWithCtx.describe('Capitaine — Anti-duplication FR-CAP-LOCK-NO-DUPLICATE', () => {
  testWithCtx('cinq verrouillages/déverrouillages ne dupliquent pas la carte', async ({ page, ctx }) => {
    testWithCtx.setTimeout(180_000)

    const article = await ctx.createArticle('NoDup E2E Browser')
    await openMoteur(page, article.cocoonId)
    await selectArticleByTitle(page, article.titre)

    // Une carte verrouillable suppose un mot-clé scanné.
    const field = page.locator('[data-testid="keyword-input"] input').first()
    await expect(field).toBeVisible({ timeout: 15000 })
    await field.fill(article.suggestedKeyword ?? 'creation site internet toulouse')
    await Promise.all([
      page.waitForResponse(r => /\/api\/keywords\/.+\/scan$/.test(r.url()) && r.request().method() === 'POST', { timeout: 60000 }),
      field.press('Enter'),
    ])
    await expect(page.locator('[data-testid="radar-list-item-0-loading"]'), 'fin du scan')
      .toHaveCount(0, { timeout: 60000 })

    const cartes = page.locator('[data-testid^="radar-list-item-"]:not([data-testid$="-loading"])')
    const avant = await cartes.count()
    expect(avant, 'au moins une carte à verrouiller').toBeGreaterThan(0)

    // Cinq bascules, en attendant chaque fois que l'état soit vraiment posé :
    // c'est la succession lock → unlock → lock qui déclenchait la duplication.
    const lock = page.locator('[data-testid="radar-card-lock"]').first()
    // Chaque verrouillage passe par la porte (FR-CAP-LOCK-GATE) ; la dérogation
    // posée au premier vaut pour les suivants, puisque les données n'ont pas changé.
    for (let i = 0; i < 5; i++) {
      const verrouille = i % 2 === 0
      if (verrouille) await passThroughGate(page, 'captain-lock', () => lock.click())
      else await lock.click()
      await expect(lock, `bascule ${i + 1}`).toHaveAttribute('aria-pressed', String(verrouille), { timeout: 20000 })
    }

    await expect(cartes, 'la liste n’a pas grossi d’un doublon').toHaveCount(avant, { timeout: 10000 })
  })
})
