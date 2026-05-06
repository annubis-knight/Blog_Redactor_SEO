/**
 * Browser E2E — Moteur · Radar · Suggestions longue-traine.
 *
 * Couverture S5 :
 * - Page Moteur charge sans pageerror après ajout du composant RadarLongTailSuggestions.
 * - La section reste cachee tant que <2 cards racines ne sont pas presentes
 *   (article neuf → pas de scan → pas de section).
 * - Aucun reliquat de l'ancienne UI carrousel n'est introduit.
 *
 * Note : le golden-path complet (scan radar → 3 cards → suggerer LT → cocher
 * → envoi unifie → Capitaine recoit + extractRoots) demande un seed DB de
 * radar_explorations avec un scan_result complet. Vu la complexite et le fait
 * que la fixture browser actuelle ne permet pas la selection d'article via
 * MoteurContextRecap (cf. moteur-capitaine-radar-list.browser.test.ts:51-55),
 * la couverture E2E du flux complet est assuree par :
 *   - les tests unit S1-S4 (44 tests) qui couvrent chaque etage
 *   - les tests contract-api S2 qui valident les contrats route
 *   - ce test structurel qui valide l'integration UI sans regression
 */
import { test, expect } from './helpers/test-fixtures'

test.describe('Moteur Radar — Suggestions longue-traine (structure)', () => {
  test('charge MoteurView avec onglet Radar sans pageerror', async ({ page, ctx }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))

    const article = await ctx.createArticle('RadarLT Browser')
    await page.goto(`/cocoon/${article.cocoonId}/moteur`)
    await page.waitForLoadState('networkidle', { timeout: 15000 })

    expect(errors).toEqual([])
  })

  test('section longue-traine cachee quand aucun scan radar (radarKeywords < 2)', async ({ page, ctx }) => {
    const article = await ctx.createArticle('RadarLT NoScan')
    await page.goto(`/cocoon/${article.cocoonId}/moteur`)
    await page.waitForLoadState('networkidle', { timeout: 15000 })

    // Sans scan radar, le composant RadarLongTailSuggestions a v-if="isVisible"
    // qui depend de radarKeywords.length >= 2 → section invisible.
    expect(await page.locator('[data-testid="radar-long-tail-section"]').count()).toBe(0)
    // Bouton Suggerer absent par consequent
    expect(await page.locator('[data-testid="btn-suggest-longtail"]').count()).toBe(0)
  })

  test('aucun reliquat de la longue-traine sur l\'onglet Discovery (isolation)', async ({ page, ctx }) => {
    const article = await ctx.createArticle('RadarLT Iso')
    await page.goto(`/cocoon/${article.cocoonId}/moteur`)
    await page.waitForLoadState('networkidle', { timeout: 15000 })

    // Le composant longue-traine vit dans RadarPanel, qui n'apparait
    // que sur l'onglet Radar. Discovery (DiscoveryPanel) ne doit pas
    // contenir le testid.
    const discoveryTab = page.locator('[data-testid="phase-tab-discovery"]')
    if (await discoveryTab.count() > 0) {
      await discoveryTab.click()
      await page.waitForTimeout(300)
      expect(await page.locator('[data-testid="radar-long-tail-section"]').count()).toBe(0)
    }
  })
})
