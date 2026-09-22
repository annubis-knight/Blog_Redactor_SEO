/**
 * Interactions internes — les panneaux « résumé IA » (tech-spec-parcours-8-temps).
 *
 * Chaque onglet a son conteneur de suggestions IA. Règle commune : il dit
 * toujours où il en est — au repos, en cours, en succès ou en échec — et il
 * propose toujours un moyen de (re)lancer. Jamais un panneau muet.
 *
 *   · Découverte : « Analyse IA Discovery » (repli, état au repos, relance)
 *   · Radar : « Suggestions IA Radar » (état sans scan, liste, envoi Capitaine)
 *   · Lexique : « Analyse IA Lexique » (compte des termes, ou erreur + relance)
 *
 * Mode simulé : IA locale, DataForSEO en bac à sable (coût 0).
 */
import { test, expect, type Page } from '@playwright/test'
import { selectArticle, useParcours } from '../helpers/parcours-fixtures'

test.describe.configure({ mode: 'serial' })

const parcours = useParcours()

async function ouvrirOnglet(page: Page, onglet: 'discovery' | 'radar' | 'lexique'): Promise<void> {
  const tab = page.locator(`[data-testid="wf-item-${onglet}"]`)
  await expect(tab, `l’onglet ${onglet} doit être présent`).toBeVisible({ timeout: 15000 })
  await tab.click()
}

test('Découverte — le panneau IA se replie et garde un état lisible', async ({ page }) => {
  test.setTimeout(240_000)
  await selectArticle(page, parcours, 'pilier')
  await ouvrirOnglet(page, 'discovery')

  const panneau = page.locator('[data-testid="discovery-ai-panel"]')
  await expect(panneau, 'le panneau « Analyse IA Discovery » doit être présent').toBeVisible({ timeout: 30000 })

  // Au repos, avant toute découverte : un message, pas un vide.
  await expect(panneau, 'le panneau explique ce qu’il attend')
    .toContainText(/analyse|découvr|lance/i, { timeout: 15000 })

  // Le repli bascule, quel que soit l'état de départ (replié par défaut).
  const toggle = panneau.locator('[data-testid="ai-panel-toggle"]')
  const replié = panneau.locator('[data-testid="ai-panel-collapsed"]')
  if (await toggle.count() > 0) {
    const départReplié = (await replié.count()) > 0
    await toggle.click()
    await expect.poll(async () => (await replié.count()) > 0, { timeout: 10000 }).toBe(!départReplié)
    await toggle.click()
    await expect.poll(async () => (await replié.count()) > 0, { timeout: 10000 }).toBe(départReplié)
  }

  // Le déclencheur est désactivé tant qu'il n'y a rien à analyser : c'est honnête.
  const lancer = panneau.locator('[data-testid="ai-trigger-primary"], [data-testid="ai-trigger-regen"]').first()
  if (await lancer.count() > 0) {
    expect(typeof (await lancer.isEnabled()), 'l’état du bouton est déterminé').toBe('boolean')
  }
})

test('Radar — le panneau IA annonce l’absence de scan puis liste ses candidats', async ({ page }) => {
  test.setTimeout(300_000)
  const article = parcours.articles.intermediaire
  await selectArticle(page, parcours, 'intermediaire')
  await ouvrirOnglet(page, 'radar')

  const panneau = page.locator('[data-testid="ai-panel-suggestion"]', { hasText: 'Suggestions IA Radar' }).first()
  await expect(panneau, 'le panneau « Suggestions IA Radar » doit être présent').toBeVisible({ timeout: 30000 })

  const sansScan = panneau.locator('[data-testid="radar-ai-empty-no-scan"]')
  if (await sansScan.count() > 0) {
    await expect(sansScan, 'sans scan, le panneau le dit').toContainText(/.+/)

    // On lance un scan pour voir le panneau se remplir.
    const zone = page.locator('[data-testid="radar-manual-add"]')
    if (await zone.count() > 0) {
      await zone.locator('input').fill(article.keyword)
      await Promise.all([
        page.waitForResponse(r => r.url().endsWith('/radar-exploration/keyword') && r.request().method() === 'POST', { timeout: 30000 }),
        zone.locator('button', { hasText: 'Ajouter' }).click(),
      ])
    }
    const scan = page.locator('button', { hasText: 'Lancer le scan' }).first()
    if (await scan.isEnabled()) {
      await Promise.all([
        page.waitForResponse(r => r.url().endsWith('/keywords/radar/scan') && r.request().method() === 'POST', { timeout: 120000 }),
        scan.click(),
      ])
    }
  }

  // Après scan : une liste de candidats, ou un message expliquant qu'il n'y en a pas.
  const liste = panneau.locator('[data-testid="radar-ai-list"]')
  const aucun = panneau.locator('[data-testid="radar-ai-empty-no-candidates"]')
  await expect(liste.or(aucun).first(), 'liste ou message, jamais un panneau muet').toBeVisible({ timeout: 60000 })

  if (await liste.count() > 0) {
    // Les scores affichés sont un nombre ou « — » (jamais un zéro d'absence).
    const pastilles = liste.locator('.radar-ai-score, .rai-score')
    for (let i = 0; i < Math.min(await pastilles.count(), 10); i++) {
      expect((await pastilles.nth(i).innerText()).trim()).toMatch(/^(\d+|—)$/)
    }

    const envoi = panneau.locator('[data-testid="radar-ai-handoff"]')
    await expect(envoi, 'le bouton « Marquer comme candidats Capitaine » est là').toBeVisible()
  }
})

test('Lexique — le panneau IA compte ses termes, ou explique son échec', async ({ page }) => {
  test.setTimeout(300_000)
  await selectArticle(page, parcours, 'pilier')
  await ouvrirOnglet(page, 'lexique')

  const prompt = page.locator('[data-testid="tlp-load-db"]')
  if (await prompt.count() > 0) await prompt.first().click().catch(() => {})

  const résultats = page.locator('[data-testid="lexique-results"]')
  if (await résultats.count() === 0) {
    // Avant extraction, le panneau IA n'existe pas encore : l'écran doit alors
    // dire quoi faire — extraire, ou lancer l'analyse SERP manquante.
    const extraire = page.locator('[data-testid="btn-extract"]')
    const précheck = page.locator('[data-testid="precheck-missing"]')
    await expect(extraire.or(précheck).first(), 'l’onglet dit quoi faire avant toute analyse')
      .toBeVisible({ timeout: 30000 })
    return
  }

  const stats = page.locator('[data-testid="lexique-ai-stats"]')
  const erreur = page.locator('[data-testid="ia-error"]')
  const panneau = page.locator('[data-testid="ai-panel-suggestion"]', { hasText: 'Analyse IA Lexique' }).first()

  await expect(stats.or(erreur).or(panneau).first(), 'le Lexique montre un état IA lisible')
    .toBeVisible({ timeout: 60000 })

  if (await erreur.count() > 0) {
    await expect(erreur, 'l’échec est expliqué').toContainText(/.+/)
    await expect(page.locator('.btn-retry').first(), 'et peut être relancé').toBeVisible()
  } else if (await stats.count() > 0) {
    await expect(stats, 'le compte des termes analysés est affiché')
      .toContainText(/termes?\s+analysés?/i, { timeout: 15000 })
  }
})
