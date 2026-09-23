/**
 * Browser E2E — Capitaine : UI radar-list + CaptainSidePanel.
 *
 * Couvre la migration carrousel → liste verticale (Sprint 2026-04) :
 * - layout `captain-layout` (liste à gauche, tiroir de détail à droite)
 * - état vide de la liste quand l'article n'a aucun mot-clé à valider
 * - aucun reliquat de l'ancienne UI carrousel
 * - le tiroir n'existe qu'une fois une carte sélectionnée (2026-04-30)
 * - la barre du haut passe de l'italique au romain quand le Capitaine est verrouillé
 *
 * Durci le 2026-09-23. Ces tests se mettaient tous en pause
 * (`Selection article impossible : fixture incompatible MoteurContextRecap`)
 * parce que le socle ouvrait un cocon inexistant et ne posait pas de stratégie.
 * Réveillés, ils ont révélé trois attentes périmées, corrigées ici :
 *   1. un article issu de la stratégie arrive AVEC son mot-clé suggéré : la
 *      liste n'est donc pas vide (l'état vide se teste avec `withKeyword: false`) ;
 *   2. `is-suggested` vit sur `.tree-article-keyword`, pas sur le bouton parent ;
 *   3. le tiroir n'apparaît qu'après sélection d'une carte, pas d'un article.
 *
 * Retiré ici : la section « Persistance article sélectionné au reload »
 * (3 tests, Sprint 18). La clé `blog-redactor:moteur-selected-article:{cocoonId}`
 * n'existe dans aucun fichier de `src/` — la fonctionnalité n'a jamais été
 * écrite, seuls les tests l'avaient été. Consigné dans la tech-spec.
 */
import { test, expect, type Page } from '@playwright/test'
import { test as testWithCtx } from './helpers/test-fixtures'
import { dismissLoadPrompt, openMoteur, selectArticleByTitle } from './helpers/moteur-ui'

/** Sélectionne la première entrée de la liste (clavier : les mots du mot-clé captent le clic). */
async function selectFirstEntry(page: Page): Promise<void> {
  const item = page.locator('[data-testid="radar-list-item-0"]')
  await expect(item, 'une entrée à valider doit être listée').toBeVisible({ timeout: 20000 })
  await item.focus()
  await item.press('Enter')
}

testWithCtx.describe('Capitaine — UI radar-list (mode workflow)', () => {
  testWithCtx('un article issu de la stratégie arrive avec son mot-clé à valider', async ({ page, ctx }) => {
    const article = await ctx.createArticle('RadarList Browser')
    await openMoteur(page, article.cocoonId)
    await selectArticleByTitle(page, article.titre)

    await expect(page.locator('[data-testid="captain-layout"]')).toBeVisible()
    await expect(page.locator('[data-testid="radar-list"]')).toBeVisible()

    // Le mot-clé proposé par le Cerveau est présenté, non validé.
    await expect(page.locator('[data-testid="radar-list-item-0"]'), 'le mot-clé suggéré est listé')
      .toBeVisible({ timeout: 20000 })

    // Tant qu'aucune carte n'est sélectionnée, le tiroir de détail n'existe pas
    // (2026-04-30 : v-if sur entry, au lieu d'un drawer vide).
    await expect(page.locator('[data-testid="side-panel"]')).toHaveCount(0)
  })

  testWithCtx('un article sans mot-clé suggéré affiche l’état vide de la liste', async ({ page, ctx }) => {
    const article = await ctx.createArticle('RadarList Empty Browser', 'Pilier', { withKeyword: false })
    await openMoteur(page, article.cocoonId)
    await selectArticleByTitle(page, article.titre)
    await dismissLoadPrompt(page)

    await expect(page.locator('[data-testid="radar-list-empty"]'), 'la liste vide s’explique')
      .toContainText(/Aucun mot-clé/i, { timeout: 20000 })
  })

  testWithCtx('aucun reliquat de l’ancienne UI carrousel', async ({ page, ctx }) => {
    const article = await ctx.createArticle('NoCarousel Browser')
    await openMoteur(page, article.cocoonId)
    await selectArticleByTitle(page, article.titre)

    for (const reliquat of ['carousel-prev', 'carousel-next', 'carousel-section', 'carousel-nav', 'locked-captain-section']) {
      await expect(page.locator(`[data-testid="${reliquat}"]`), `${reliquat} ne doit plus exister`)
        .toHaveCount(0)
    }
  })

  testWithCtx('chargement + sélection article ne génèrent pas d’erreur JS', async ({ page, ctx }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))

    const article = await ctx.createArticle('NoErr Capitaine Browser')
    await openMoteur(page, article.cocoonId)
    await selectArticleByTitle(page, article.titre)

    expect(errors).toEqual([])
  })
})

testWithCtx.describe('Capitaine — tiroir de détail', () => {
  testWithCtx('le tiroir monte en drawer fixe à droite, avec ses repères d’accessibilité', async ({ page, ctx }) => {
    const article = await ctx.createArticle('SidePanel Mount Browser')
    await openMoteur(page, article.cocoonId)
    await selectArticleByTitle(page, article.titre)
    await selectFirstEntry(page)

    const sidePanel = page.locator('[data-testid="side-panel"]')
    await expect(sidePanel, 'le tiroir s’ouvre sur la carte sélectionnée').toBeVisible({ timeout: 15000 })

    // Drawer fixe : c'est ce qui lui permet de sortir du max-width de MoteurView.
    expect(await sidePanel.evaluate(el => window.getComputedStyle(el).position)).toBe('fixed')

    // Collé au bord droit (tolère la barre de défilement système).
    const rightOffset = await sidePanel.evaluate(el => window.innerWidth - el.getBoundingClientRect().right)
    expect(rightOffset).toBeLessThanOrEqual(40)

    await expect(sidePanel).toHaveAttribute('aria-live', 'polite')
    await expect(sidePanel).toHaveAttribute('aria-label', /détails|Détails/i)
  })

  testWithCtx('la croix referme le tiroir', async ({ page, ctx }) => {
    const article = await ctx.createArticle('ClosePanel Browser')
    await openMoteur(page, article.cocoonId)
    await selectArticleByTitle(page, article.titre)
    await selectFirstEntry(page)

    await expect(page.locator('[data-testid="side-panel"]')).toBeVisible({ timeout: 15000 })
    await page.locator('[data-testid="side-panel-close"]').click()
    await expect(page.locator('[data-testid="side-panel"]'), 'le tiroir disparaît du DOM')
      .toHaveCount(0, { timeout: 10000 })
  })
})

/**
 * La chaîne complète : verrouiller une carte → PUT /captain-keyword →
 * rafraîchissement des cocons → la barre du haut repasse le mot-clé en romain.
 */
testWithCtx.describe('Barre du haut — le mot-clé passe de suggéré à verrouillé', () => {
  /** Le mot-clé affiché dans la barre du haut pour cet article. */
  function keywordChip(page: Page, titre: string) {
    return page.locator('.tree-article-btn', { hasText: titre }).first().locator('.tree-article-keyword')
  }

  testWithCtx('un mot-clé seulement suggéré est marqué comme tel', async ({ page, ctx }) => {
    const article = await ctx.createArticle('SuggestedClassCheck Browser')
    await openMoteur(page, article.cocoonId)
    await selectArticleByTitle(page, article.titre)

    await expect(keywordChip(page, article.titre), 'le mot-clé proposé est affiché en suggéré')
      .toHaveClass(/is-suggested/, { timeout: 15000 })
  })

  testWithCtx('après verrouillage il ne l’est plus, et le redevient au déverrouillage', async ({ page, ctx }) => {
    testWithCtx.setTimeout(180_000)
    const article = await ctx.createArticle('LockSyncRecap Browser')
    await openMoteur(page, article.cocoonId)
    await selectArticleByTitle(page, article.titre)

    const chip = keywordChip(page, article.titre)
    await expect(chip).toHaveClass(/is-suggested/, { timeout: 15000 })

    // Le mot-clé suggéré doit d'abord être scanné pour devenir verrouillable.
    const field = page.locator('[data-testid="keyword-input"] input').first()
    await field.fill(article.suggestedKeyword ?? 'mot cle de secours')
    await Promise.all([
      page.waitForResponse(r => /\/api\/keywords\/.+\/scan$/.test(r.url()) && r.request().method() === 'POST', { timeout: 60000 }),
      field.press('Enter'),
    ])
    await expect(page.locator('[data-testid="radar-list-item-0-loading"]'), 'fin du scan')
      .toHaveCount(0, { timeout: 60000 })

    const lock = page.locator('[data-testid="radar-card-lock"]').first()
    await expect(lock).toBeVisible({ timeout: 30000 })

    await lock.click()
    await expect(lock).toHaveAttribute('aria-pressed', 'true', { timeout: 15000 })
    await expect(chip, 'verrouillé : le mot-clé n’est plus une suggestion')
      .not.toHaveClass(/is-suggested/, { timeout: 20000 })

    await lock.click()
    await expect(lock).toHaveAttribute('aria-pressed', 'false', { timeout: 15000 })
    await expect(chip, 'déverrouillé : il redevient une suggestion')
      .toHaveClass(/is-suggested/, { timeout: 20000 })
  })
})

test.describe('Capitaine — Cloisonnement workflow vs libre (LaboView)', () => {
  test('mode libre (/labo) ne rend PAS la nouvelle UI radar-list ni le tiroir', async ({ page }) => {
    await page.goto(`/labo`)
    await page.waitForLoadState('networkidle', { timeout: 15000 })

    for (const repère of ['captain-layout', 'radar-list', 'side-panel']) {
      await expect(page.locator(`[data-testid="${repère}"]`), `${repère} est réservé au workflow`)
        .toHaveCount(0)
    }
  })

  test('mode libre ne génère pas d\'erreur JS', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))

    await page.goto(`/labo`)
    await page.waitForLoadState('networkidle', { timeout: 15000 })

    expect(errors).toEqual([])
  })
})
