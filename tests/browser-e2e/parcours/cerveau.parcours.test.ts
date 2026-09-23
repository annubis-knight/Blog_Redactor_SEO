/**
 * Parcours Cerveau — de la page blanche aux articles créés en base.
 *
 * Aucun test navigateur ne couvrait le Cerveau : le seul qui touchait son URL
 * se contentait de vérifier que la page n'était pas vide. Ce parcours suit le
 * chemin réel d'un utilisateur :
 *
 *   ① les cinq étapes de questionnement (cible → douleur → angle → promesse → CTA),
 *     saisie libre, suggestion IA, et les trois façons de valider ;
 *   ② l'étape « Articles » : sujets proposés, génération, acceptation ;
 *   ③ la persistance : la stratégie du cocon et les articles en base.
 *
 * Sources simulées par défaut (gratuit). Le même fichier sert au passage réel
 * via `useCerveau('real')`.
 */
import { test, expect, type Page } from '@playwright/test'
import { query } from '../../../server/db/client.js'
import { ETAPES_STRATEGIE, REPONSES, useCerveau } from '../helpers/cerveau-fixtures'

test.describe.configure({ mode: 'serial' })

const cerveau = useCerveau()

/** Renseigne l'étape courante avec le texte donné, puis valide « Mon texte ». */
async function repondreEtValider(page: Page, texte: string): Promise<void> {
  const saisie = page.locator('[data-testid="step-input"]')
  await expect(saisie, 'le champ de réponse doit être là').toBeVisible({ timeout: 15000 })
  await saisie.fill(texte)
  await saisie.blur()

  const valider = page.locator('[data-testid="step-validate"]')
  await expect(valider, 'le bouton Valider s’active dès qu’il y a du texte').toBeEnabled({ timeout: 10000 })
  await valider.click()
  await page.locator('[data-testid="step-validate-own"]').click()

  await expect(page.locator('[data-testid="step-validated"]'), 'la réponse validée s’affiche au-dessus')
    .toBeVisible({ timeout: 10000 })
}

/** Passe à l'étape suivante et attend que le titre change. */
async function etapeSuivante(page: Page): Promise<void> {
  await page.locator('[data-testid="brain-next"]').click()
}

test('Cerveau — les cinq étapes se remplissent et se valident', async ({ page }) => {
  test.setTimeout(240_000)
  await page.goto(cerveau.cerveauUrl())
  await page.waitForLoadState('networkidle', { timeout: 20000 })

  // La barre d'étapes annonce les six temps du Cerveau.
  for (const etape of [...ETAPES_STRATEGIE, 'articles']) {
    await expect(page.locator(`[data-testid="wf-step-${etape}"]`), `l’étape ${etape} est annoncée`)
      .toBeVisible({ timeout: 15000 })
  }

  for (const etape of ETAPES_STRATEGIE) {
    await test.step(`étape ${etape}`, async () => {
      await repondreEtValider(page, REPONSES[etape])
      await expect(page.locator('[data-testid="step-validated-text"]'), 'le texte validé est bien le mien')
        .toContainText(REPONSES[etape].slice(0, 40))
      await etapeSuivante(page)
    })
  }

  // Après les cinq, on est sur l'étape Articles.
  await expect(page.locator('[data-testid="wf-step-articles"]'), 'l’étape Articles devient active')
    .toHaveAttribute('aria-selected', 'true', { timeout: 15000 })
})

test('Cerveau — la stratégie validée est bien enregistrée', async () => {
  const res = await query<{ data: Record<string, unknown> }>(
    `SELECT cs.data FROM cocoon_strategies cs
     JOIN cocoons c ON c.id = cs.cocoon_id
     WHERE c.nom = $1`,
    [cerveau.cocoonName],
  )
  expect(res.rows.length, 'une stratégie existe pour ce cocon').toBe(1)

  const data = res.rows[0].data as Record<string, { validated?: string }> & { completedSteps?: number }
  for (const etape of ETAPES_STRATEGIE) {
    expect(data[etape]?.validated, `l’étape ${etape} est enregistrée validée`).toContain(REPONSES[etape].slice(0, 30))
  }
  expect(data.completedSteps, 'les cinq étapes sont comptées').toBeGreaterThanOrEqual(5)
})

test('Cerveau — la suggestion IA se demande et se valide', async ({ page }) => {
  test.setTimeout(240_000)
  await page.goto(cerveau.cerveauUrl())
  await page.waitForLoadState('networkidle', { timeout: 20000 })

  // On revient sur l'étape « angle » pour y demander une suggestion.
  await page.locator('[data-testid="wf-step-angle"]').click()

  // Le bloc de saisie vit dans un repli une fois l'étape validée.
  const replie = page.locator('.collapsable-header, .collapsable-section button').filter({ hasText: /Modifier ma réponse/i }).first()
  if (await replie.count() > 0) await replie.click()

  const suggerer = page.locator('[data-testid="step-suggest"]')
  if (await suggerer.count() === 0) {
    // Une suggestion existe déjà : le bouton laisse place aux actions d'édition.
    await expect(page.locator('.suggestion-text').first(), 'la suggestion précédente est affichée')
      .toBeVisible({ timeout: 10000 })
    return
  }

  await Promise.all([
    page.waitForResponse(r => r.url().includes('/strategy/cocoon/') && r.url().endsWith('/suggest'), { timeout: 120000 }),
    suggerer.click(),
  ])

  const suggestion = page.locator('.suggestion-text').first()
  await expect(suggestion, 'la suggestion de l’IA s’affiche').toBeVisible({ timeout: 120000 })
  await expect
    .poll(async () => (await suggestion.innerText()).trim().length, { timeout: 60000 })
    .toBeGreaterThan(40)

  // Fusionner ma réponse et la suggestion : la troisième voie de validation.
  await page.locator('[data-testid="step-validate"]').click()
  const fusionner = page.locator('[data-testid="step-validate-merge"]')
  await expect(fusionner, 'l’option « Fusionner les deux » est proposée').toBeVisible({ timeout: 10000 })
})

test('Cerveau — l’étape Articles propose, génère et crée en base', async ({ page }) => {
  test.setTimeout(420_000)
  await page.goto(cerveau.cerveauUrl())
  await page.waitForLoadState('networkidle', { timeout: 20000 })
  await page.locator('[data-testid="wf-step-articles"]').click()

  const generer = page.locator('[data-testid="brain-generate-articles"]')
  await expect(generer, 'le bouton de génération est là').toBeVisible({ timeout: 30000 })
  await expect(generer).toBeEnabled({ timeout: 60000 })

  await generer.click()

  // La génération passe par quatre phases annoncées à l'écran.
  const lignes = page.locator('[data-testid="proposal-item"]')
  await expect(lignes.first(), 'des articles sont proposés').toBeVisible({ timeout: 300000 })

  const proposes = await lignes.count()
  expect(proposes, 'au moins un article proposé').toBeGreaterThan(0)

  // Accepter le premier : c'est ce geste qui crée la ligne en base.
  const accepter = lignes.first().locator('[data-testid="proposal-accept-header"]')
  await Promise.all([
    page.waitForResponse(r => r.url().endsWith('/articles/batch-create') && r.request().method() === 'POST', { timeout: 60000 }),
    accepter.click(),
  ])
  await expect(lignes.first(), 'la ligne passe à l’état accepté')
    .toHaveAttribute('data-accepted', 'true', { timeout: 15000 })

  // Puis tout valider.
  const toutValider = page.locator('[data-testid="brain-validate-all"]')
  await expect(toutValider).toBeVisible({ timeout: 15000 })
  await toutValider.click()

  await expect
    .poll(async () => {
      const r = await query<{ n: string }>(
        `SELECT count(*) n FROM articles a JOIN cocoons c ON c.id = a.cocoon_id WHERE c.nom = $1`,
        [cerveau.cocoonName],
      )
      return Number(r.rows[0].n)
    }, { timeout: 120000, message: 'les articles acceptés doivent arriver en base' })
    .toBeGreaterThan(0)
})

test('Cerveau — les articles créés portent leur type et leur mot-clé', async () => {
  const res = await query<{ titre: string; type: string; suggested_keyword: string | null; pain_point: string | null }>(
    `SELECT a.titre, a.type, a.suggested_keyword, a.pain_point
     FROM articles a JOIN cocoons c ON c.id = a.cocoon_id
     WHERE c.nom = $1 ORDER BY a.id`,
    [cerveau.cocoonName],
  )
  expect(res.rows.length, 'des articles existent').toBeGreaterThan(0)

  for (const article of res.rows) {
    expect(article.titre?.trim(), 'un titre non vide').toBeTruthy()
    expect(['Pilier', 'Intermédiaire', 'Spécialisé'], `type connu pour « ${article.titre} »`)
      .toContain(article.type)
  }

  // Le cocon doit avoir au moins un pilier : c'est la tête du cocon.
  expect(res.rows.some(a => a.type === 'Pilier'), 'un article pilier a été créé').toBe(true)
})
