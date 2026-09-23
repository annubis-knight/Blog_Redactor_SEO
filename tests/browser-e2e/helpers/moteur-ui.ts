/**
 * Gestes d'interface du Moteur, partagés par les deux socles de tests
 * navigateur (`test-fixtures.ts` pour les tests de structure,
 * `parcours-fixtures.ts` pour les parcours « 8 temps »).
 *
 * Ces fonctions absorbent les pièges d'affichage relevés le 2026-09-22 :
 * panneau « Articles suggérés » replié qui intercepte les clics, onglet
 * rouvert sur le dernier visité, carte du Capitaine encore en cours de scan.
 */
import { expect, type Page } from '@playwright/test'

/** Ouvre le Moteur d'un cocon (l'index, pas la clé primaire). */
export async function openMoteur(page: Page, cocoonIndex: number): Promise<void> {
  await page.goto(`/cocoon/${cocoonIndex}/moteur`)
  await page.waitForLoadState('networkidle', { timeout: 20000 })
}

/**
 * Sélectionne un article dans la barre du haut du Moteur. L'article doit être
 * présent dans la stratégie du cocon (`cocoon_strategies.data.proposedArticles`),
 * sinon il n'apparaît pas — c'est la barre du haut qui la lit, pas la table
 * `articles`.
 */
export async function selectArticleByTitle(page: Page, title: string): Promise<void> {
  // Le panneau « Articles suggérés » est replié par défaut : il intercepte les clics.
  const toggle = page.locator('.recap-toggle-btn', { hasText: 'Articles suggérés' }).first()
  await expect(toggle, 'le panneau « Articles suggérés » doit exister').toHaveCount(1, { timeout: 10000 })
  if ((await toggle.getAttribute('aria-expanded')) === 'false') {
    await toggle.click()
  }

  const button = page.locator('.tree-article-btn', { hasText: title })
  await expect(button, `l'article « ${title} » doit apparaître dans la barre du haut`)
    .toHaveCount(1, { timeout: 10000 })
  await button.first().click()

  // L'article est monté : le Capitaine est dans la page. Il peut être masqué si
  // un autre onglet est actif (l'application rouvre le dernier onglet visité).
  await expect(page.locator('[data-testid="captain-layout"]'), 'l’article doit être monté dans le Moteur')
    .toBeAttached({ timeout: 15000 })
}

/**
 * Scanne un mot-clé Capitaine puis le verrouille — préalable des sous-phases
 * Lieutenants et Lexique. Attend la fin de la validation : tant que la carte
 * est en cours de scan, elle n'affiche pas encore son cadenas.
 */
export async function scanAndLockCaptain(page: Page, keyword: string): Promise<void> {
  const field = page.locator('[data-testid="keyword-input"] input').first()
  await expect(field, 'le champ Capitaine doit être présent').toBeVisible({ timeout: 15000 })
  await field.fill(keyword)
  await Promise.all([
    page.waitForResponse(r => /\/api\/keywords\/.+\/scan$/.test(r.url()) && r.request().method() === 'POST', { timeout: 60000 }),
    field.press('Enter'),
  ])

  const item = page.locator('[data-testid="radar-list-item-0"]')
  await expect(item, 'la carte du Capitaine doit apparaître').toBeVisible({ timeout: 30000 })
  await expect(page.locator('[data-testid="radar-list-item-0-loading"]'), 'la validation doit être terminée')
    .toHaveCount(0, { timeout: 60000 })

  const lock = page.locator('[data-testid="radar-card-lock"]').first()
  await expect(lock, 'le cadenas de la carte doit être rendu').toBeVisible({ timeout: 30000 })
  await lock.click()
  await expect(lock).toHaveAttribute('aria-pressed', 'true', { timeout: 15000 })
}

/**
 * Écarte l'invite « Charger <onglet> » que l'application propose quand les
 * données de l'onglet ne sont pas encore hydratées (TabLoadPrompt). Sans ce
 * clic, l'onglet reste sur l'invite et aucun de ses repères n'existe.
 */
export async function dismissLoadPrompt(page: Page): Promise<void> {
  const prompt = page.locator('[data-testid="tlp-load-db"]')
  if (await prompt.count() > 0) {
    await prompt.first().click().catch(() => {})
  }
}

/** Les cinq onglets du Moteur, dans l'ordre de la navigation. */
export const MOTEUR_TABS = ['discovery', 'radar', 'capitaine', 'lieutenants', 'lexique'] as const
type MoteurTab = (typeof MOTEUR_TABS)[number]

/** Repère de l'onglet dans la navigation (`WorkflowNav.vue`). */
export function tabLocator(page: Page, tab: MoteurTab | 'finalisation') {
  return page.locator(`[data-testid="wf-item-${tab}"]`)
}
