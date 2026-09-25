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
import { answerGateAlarm, passThroughGate } from './gate-alarm'

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
  // Le verrou passe par la porte (FR-CAP-LOCK-GATE) : sur données simulées,
  // l'alarme peut s'ouvrir ; on y répond comme un utilisateur qui assume.
  await passThroughGate(page, 'captain-lock', () => lock.click())
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

/** Les six onglets du Moteur, dans l'ordre de la navigation (Structure : FR-HN-TAB). */
export const MOTEUR_TABS = ['discovery', 'radar', 'capitaine', 'lieutenants', 'structure', 'lexique'] as const
type MoteurTab = (typeof MOTEUR_TABS)[number]

/** Repère de l'onglet dans la navigation (`WorkflowNav.vue`). */
export function tabLocator(page: Page, tab: MoteurTab | 'finalisation') {
  return page.locator(`[data-testid="wf-item-${tab}"]`)
}

/** Progression workflow de l'article, lue en base via l'API. */
export async function checksDeLArticle(page: Page, articleId: number): Promise<string[]> {
  const port = process.env.PORT ?? 3400
  const res = await page.request.get(`http://localhost:${port}/api/articles/${articleId}/progress`)
  if (!res.ok()) return []
  return ((await res.json())?.data?.completedChecks ?? []) as string[]
}

/**
 * Sous-phase Lieutenants complète : analyse SERP, propositions retenues. La
 * structure H1/H2/H3 a désormais son onglet (`validerStructure`, FR-HN-TAB) ;
 * avant C6, l'étape exigeait un plan produit avant même le choix (M7).
 */
export async function lockLieutenants(page: Page, articleId: number): Promise<void> {
  await tabLocator(page, 'lieutenants').click()
  await dismissLoadPrompt(page)

  const cartes = page.locator('[data-testid="lieutenant-cards-list"]')
  if (await cartes.count() === 0) {
    const analyser = page.locator('.btn-analyze', { hasText: 'Analyser SERP' }).first()
    await expect(analyser, 'le bouton d’analyse SERP doit être actif').toBeEnabled({ timeout: 30000 })
    await Promise.all([
      page.waitForResponse(r => r.url().endsWith('/api/serp/analyze') && r.request().method() === 'POST', { timeout: 180000 }),
      analyser.click(),
    ])

    // Une analyse peut échouer pour une raison qui n'est pas un défaut du
    // produit : un mot-clé trop étroit ne renvoie aucune page de résultats.
    // Le test doit le dire tel quel, plutôt que de laisser croire à une panne.
    const bandeau = page.locator('[data-testid="serp-error"]').first()
    await expect(cartes.or(bandeau).first(), 'l’analyse doit aboutir ou s’expliquer')
      .toBeVisible({ timeout: 180000 })
    if (await bandeau.count() > 0 && await bandeau.isVisible()) {
      throw new Error(
        `analyse SERP sans résultat exploitable — ce n'est pas forcément un défaut du produit : ${(await bandeau.innerText()).trim()}`,
      )
    }

    await expect(cartes, 'les propositions IA doivent arriver').toBeVisible({ timeout: 180000 })
  }

  // Un pilier appelle au moins 3 lieutenants (FR-LIE-LOCK-GATE) : on en retient
  // autant qu'un utilisateur le ferait, pas seulement le premier.
  const cases = page.locator('[data-testid="lt-card-checkbox"]')
  await expect(cases.first()).toBeVisible({ timeout: 60000 })
  const retenus = Math.min(3, await cases.count())
  for (let i = 0; i < retenus; i++) {
    if (!(await cases.nth(i).isChecked())) await cases.nth(i).check()
  }

  // La porte peut encore retenir l'étape (cannibalisation, trop peu de
  // propositions) : le bandeau le dit, l'alarme s'ouvre à la demande. Chaque
  // case cochée relance la porte : le bandeau « trop peu de lieutenants » peut
  // apparaître puis s'effacer à la dernière case. On attend un état stable
  // (deux lectures identiques à une seconde d'écart) avant d'agir.
  const bandeau = page.locator('[data-testid="lieutenants-gate-banner"]')
  const etat = async () => {
    if (await bandeau.isVisible()) return 'bandeau'
    return (await checksDeLArticle(page, articleId)).includes('moteur:lieutenants_locked') ? 'validée' : 'en attente'
  }
  let precedent = ''
  await expect.poll(async () => {
    const courant = await etat()
    const stable = courant !== 'en attente' && courant === precedent
    precedent = courant
    return stable
  }, { timeout: 60000, intervals: [1000] }).toBe(true)
  if (await bandeau.isVisible()) {
    await page.locator('[data-testid="lieutenants-gate-review"]').click()
    await answerGateAlarm(page)
  }

  await expect.poll(() => checksDeLArticle(page, articleId), { timeout: 60000 })
    .toContain('moteur:lieutenants_locked')
}

/**
 * Sous-phase Structure complète (FR-HN-TAB) : structure proposée à partir des
 * lieutenants retenus, puis validée. La porte `hn-lock` peut retenir l'étape :
 * l'alarme s'ouvre alors, et l'utilisateur corrige ou assume.
 */
export async function validerStructure(page: Page, articleId: number): Promise<void> {
  await tabLocator(page, 'structure').click()
  await dismissLoadPrompt(page)

  if ((await checksDeLArticle(page, articleId)).includes('moteur:hn_locked')) return

  const panneau = page.locator('[data-testid="structure-panel"]')
  await expect(panneau, 'l’onglet Structure doit s’afficher').toBeVisible({ timeout: 30000 })
  if (await panneau.locator('[data-testid="hn-structure-empty"]').count() > 0) {
    const generer = panneau.locator('[data-testid="hn-generate-btn"]')
    await expect(generer, 'la génération suppose des lieutenants retenus').toBeEnabled({ timeout: 20000 })
    await generer.click()
  }
  await expect(panneau.locator('.hn-structure-item').first(), 'une structure doit s’afficher')
    .toBeVisible({ timeout: 180000 })

  const valider = panneau.locator('[data-testid="structure-validate"]')
  await expect(valider).toBeEnabled({ timeout: 20000 })
  await valider.click()

  const alarme = page.locator('[data-testid="gate-alarm"]')
  await expect.poll(async () => {
    if (await alarme.isVisible()) return 'alarme'
    return (await checksDeLArticle(page, articleId)).includes('moteur:hn_locked') ? 'validée' : 'en attente'
  }, { timeout: 60000 }).not.toBe('en attente')
  if (await alarme.isVisible()) await answerGateAlarm(page)

  await expect.poll(() => checksDeLArticle(page, articleId), { timeout: 60000 })
    .toContain('moteur:hn_locked')
}

/** Sous-phase Lexique complète : extraction puis au moins un terme retenu. */
export async function validerLexique(page: Page, articleId: number): Promise<void> {
  await tabLocator(page, 'lexique').click()
  await dismissLoadPrompt(page)

  if ((await checksDeLArticle(page, articleId)).includes('moteur:lexique_validated')) return

  const resultats = page.locator('[data-testid="lexique-results"]')
  if (await resultats.count() === 0) {
    const extraire = page.locator('[data-testid="btn-extract"]')
    await expect(extraire, 'l’extraction doit être proposée').toBeVisible({ timeout: 30000 })
    await expect(extraire).toBeEnabled({ timeout: 30000 })
    await extraire.click()
    await expect(resultats, 'les termes extraits doivent s’afficher').toBeVisible({ timeout: 180000 })
  }

  const cases = resultats.locator('.term-checkbox')
  if (await cases.count() > 0) {
    const premiere = cases.first()
    if (!(await premiere.isDisabled()) && !(await premiere.isChecked())) await premiere.check()
  }

  // La porte du lexique (FR-LEX-METIER-ONLY) peut retenir l'étape : le
  // bandeau le dit, et l'utilisateur assume depuis l'alarme.
  const bandeau = page.locator('[data-testid="lexique-gate-banner"]')
  await expect.poll(async () => {
    if (await bandeau.isVisible()) return 'bandeau'
    return (await checksDeLArticle(page, articleId)).includes('moteur:lexique_validated') ? 'validée' : 'en attente'
  }, { timeout: 60000 }).not.toBe('en attente')
  if (await bandeau.isVisible()) {
    await page.locator('[data-testid="lexique-gate-review"]').click()
    await answerGateAlarm(page)
  }

  await expect.poll(() => checksDeLArticle(page, articleId), { timeout: 60000 })
    .toContain('moteur:lexique_validated')
}
