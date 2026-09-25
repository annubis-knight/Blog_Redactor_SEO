/**
 * Parcours Cerveau — de la page blanche aux articles créés en base.
 *
 * Aucun test navigateur ne couvrait le Cerveau : le seul qui touchait son URL
 * se contentait de vérifier que la page n'était pas vide. Ce parcours suit le
 * chemin réel d'un utilisateur :
 *
 *   ① les cinq étapes de questionnement (cible → douleur → angle → promesse → CTA),
 *     saisie libre, suggestion IA, et les trois façons de valider ;
 *   ② l'étape « Articles » : la carte indicative (proposer ne crée rien), puis
 *     le pilier créé depuis le constructeur du cocon (C7) ;
 *   ③ la persistance : la stratégie du cocon et le pilier en base.
 *
 * Sources simulées par défaut (gratuit). Le même fichier sert au passage réel
 * via `useCerveau('real')`.
 */
import { test, expect, type Page } from '@playwright/test'
import { query } from '../../../server/db/client.js'
import { ETAPES_STRATEGIE, REPONSES, useCerveau } from '../helpers/cerveau-fixtures'
import { createPillar, openCocoonTree } from '../helpers/cocoon-builder-ui'

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

/** Nombre d'articles du cocon en base. */
async function articlesEnBase(): Promise<number> {
  const r = await query<{ n: string }>(
    `SELECT count(*) n FROM articles a JOIN cocoons c ON c.id = a.cocoon_id WHERE c.nom = $1`,
    [cerveau.cocoonName],
  )
  return Number(r.rows[0].n)
}

// FR-CER-COCOON-PROGRESSIVE : la proposition de plan est une carte indicative.
// Avant C7, « accepter » une ligne ou « Tout valider » créait les articles en
// lot, dans n'importe quel ordre et sans parent.
test('Cerveau — l’étape Articles : la carte indicative guide, elle ne crée rien', async ({ page }) => {
  test.setTimeout(420_000)
  await page.goto(cerveau.cerveauUrl())
  await page.waitForLoadState('networkidle', { timeout: 20000 })
  await page.locator('[data-testid="wf-step-articles"]').click()

  // U7 : « Générer avec Claude » est un menu. Il propose le pilier (de vrais
  // articles) ou la carte complète (un aperçu) ; ici, la carte.
  const menu = page.locator('[data-testid="brain-generate-menu"]')
  await expect(menu, 'le menu de génération est là').toBeVisible({ timeout: 30000 })
  await expect(menu).toBeEnabled({ timeout: 60000 })
  await menu.click()
  await expect(page.locator('[data-testid="brain-generate-pillar"]'), 'cocon vide : le pilier peut naître').toBeEnabled()
  await page.locator('[data-testid="brain-generate-articles"]').click()

  const lignes = page.locator('[data-testid="proposal-item"]')
  await expect(lignes.first(), 'des articles sont proposés').toBeVisible({ timeout: 300000 })
  await expect(menu, 'la génération doit être terminée').toBeEnabled({ timeout: 300000 })

  await expect(page.locator('[data-testid="proposal-indicative-note"]'), 'la carte se dit indicative').toBeVisible()
  await expect(page.locator('[data-testid="brain-validate-all"]'), 'plus de « Tout valider »').toHaveCount(0)
  await expect(lignes.first().locator('[data-testid="proposal-accept-header"]'), 'plus d’« accepter » par ligne').toHaveCount(0)
  expect(await articlesEnBase(), 'proposer n’a créé aucun article').toBe(0)
})

// Le bouton « Créer le pilier » est parcouru par bout-en-bout.parcours ; ici,
// le pilier naît par le menu « Générer avec Claude » (U7) : même chemin.
test('Cerveau — le pilier naît du constructeur, avec un mot-clé mesuré', async ({ page }) => {
  test.setTimeout(240_000)
  const tree = await openCocoonTree(page, cerveau.cerveauUrl())

  await expect(tree.locator('[data-testid="tree-section-create"]'), 'un cocon vide n’offre que le pilier').toHaveCount(0)
  const pilier = await createPillar(page, tree, 120_000, 'menu')

  const res = await query<{ titre: string; type: string; parent_id: number | null; suggested_keyword: string | null; pain_point: string | null }>(
    `SELECT titre, type, parent_id, suggested_keyword, pain_point FROM articles WHERE id = $1`, [pilier.id])
  expect(res.rows[0], 'le pilier est en base').toBeTruthy()
  expect(res.rows[0]!.type).toBe('Pilier')
  expect(res.rows[0]!.parent_id, 'un pilier n’a pas de parent').toBeNull()
  expect(res.rows[0]!.suggested_keyword, 'le mot-clé est le candidat choisi').toBe(pilier.keyword)
  expect(res.rows[0]!.titre.trim(), 'un titre non vide').toBeTruthy()

  // Le pilier créé : plus de « Créer le pilier », et il attend d'être rédigé
  // avant que ses sections puissent donner naissance à des articles.
  await expect(tree.locator('[data-testid="cocoon-create-pillar"]')).toHaveCount(0)
  await expect(tree.locator(`[data-testid="tree-node-${pilier.id}"] [data-testid="tree-node-state"]`)).toHaveText('À rédiger')
  expect(await articlesEnBase(), 'un seul article, le pilier').toBe(1)

  // Le menu le sait aussi : plus de second pilier, et il dit où continuer.
  await page.locator('[data-testid="brain-generate-menu"]').click()
  const choixPilier = page.locator('[data-testid="brain-generate-pillar"]')
  await expect(choixPilier, 'un seul pilier par cocon').toBeDisabled()
  await expect(choixPilier).toContainText('Le pilier existe déjà')
  await page.keyboard.press('Escape')

  // La carte indicative l'a inscrit : le Moteur en tire sa liste.
  await expect.poll(async () => {
    const r = await query<{ n: string }>(
      `SELECT count(*) n FROM cocoon_strategies cs JOIN cocoons c ON c.id = cs.cocoon_id,
         jsonb_array_elements(cs.data->'proposedArticles') p
       WHERE c.nom = $1 AND (p->>'dbId')::int = $2`,
      [cerveau.cocoonName, pilier.id],
    )
    return Number(r.rows[0]?.n)
  }, { timeout: 30000, message: 'le pilier est inscrit sur la carte du cocon' }).toBe(1)
})
