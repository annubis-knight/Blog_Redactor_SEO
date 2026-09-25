/**
 * Construire le cocon depuis l'écran du Cerveau (C7, FR-CER-COCOON-PROGRESSIVE) :
 * le pilier d'abord, puis chaque article depuis une section (H2) de son parent
 * rédigé, son mot-clé choisi parmi des candidats mesurés.
 *
 * Les gestes sont ceux d'un utilisateur : ouvrir l'étape Articles, demander les
 * candidats, choisir un candidat **mesuré** (un candidat « Non mesuré » ne se
 * choisit pas), garder le titre proposé, créer. La réponse du serveur (201) est
 * attendue, jamais un délai.
 */
import { expect, type Locator, type Page } from '@playwright/test'

export interface CreatedArticle {
  id: number
  title: string
  keyword: string
  /** La section du parent dont l'article est né (`null` pour le pilier). */
  section: string | null
}

/** Ouvre l'étape Articles du Cerveau et attend l'arbre du cocon chargé. */
export async function openCocoonTree(page: Page, cerveauUrl: string): Promise<Locator> {
  await page.goto(cerveauUrl)
  await page.waitForLoadState('networkidle', { timeout: 30_000 })
  await page.locator('[data-testid="wf-step-articles"]').click()
  const tree = page.locator('[data-testid="cocoon-tree"]')
  await expect(tree, 'le constructeur du cocon s’affiche à l’étape Articles').toBeVisible({ timeout: 30_000 })
  await expect(tree.getByText('Chargement de l’arbre du cocon'), 'l’arbre est chargé').toHaveCount(0, { timeout: 30_000 })
  return tree
}

/** Dans un panneau de candidats ouvert : choisit le premier candidat mesuré et crée l'article. */
async function createFromCandidates(page: Page, panel: Locator, timeout: number): Promise<Omit<CreatedArticle, 'section'>> {
  const measured = panel.locator('[data-testid="candidate"]')
    .filter({ hasNot: page.locator('[data-testid="candidate-unmeasured"]') })
  await expect(measured.first(), 'au moins un candidat est mesuré (volume, SERP)').toBeVisible({ timeout })
  const keyword = await measured.first().getAttribute('data-keyword')
  expect(keyword, 'le candidat porte son mot-clé').toBeTruthy()
  await measured.first().locator('input[type="radio"]').check()

  const title = panel.locator('[data-testid="candidate-title-input"]')
  await expect(title, 'le titre est prérempli par le candidat choisi').not.toHaveValue('')

  const created = page.waitForResponse(
    r => r.request().method() === 'POST' && /\/api\/cocoons\/\d+\/articles$/.test(r.url()),
    { timeout: 60_000 },
  )
  await panel.locator('[data-testid="candidate-create"]').click()
  const response = await created
  expect(response.status(), `la création doit réussir : ${await response.text()}`).toBe(201)
  const body = await response.json() as { data: { id: number; title: string } }
  await expect(panel, 'le panneau se ferme une fois l’article créé').toBeHidden({ timeout: 30_000 })
  return { id: body.data.id, title: body.data.title, keyword: keyword! }
}

/** Crée le pilier d'un cocon qui n'en a pas. */
export async function createPillar(page: Page, tree: Locator, timeout = 120_000): Promise<CreatedArticle> {
  await tree.locator('[data-testid="cocoon-create-pillar"]').click()
  const panel = tree.locator('[data-testid="cocoon-candidates-panel"]')
  await expect(panel, 'les candidats du pilier sont proposés').toBeVisible({ timeout: 15_000 })
  return { ...(await createFromCandidates(page, panel, timeout)), section: null }
}

/**
 * Crée l'article né de la première section libre d'un parent. Le parent doit
 * être rédigé : c'est ce que l'arbre affiche avant d'ouvrir ses sections.
 */
export async function createChildFromSection(page: Page, tree: Locator, parentId: number, timeout = 120_000): Promise<CreatedArticle> {
  const node = tree.locator(`[data-testid="tree-node-${parentId}"]`)
  await expect(node, 'le parent figure dans l’arbre').toBeVisible({ timeout: 30_000 })
  await expect(node.locator('[data-testid="tree-node-state"]'), 'le parent est rédigé').toHaveText('Rédigé', { timeout: 30_000 })

  const create = node.locator('[data-testid="tree-section-create"]').first()
  await expect(create, 'une section du parent attend son article').toBeEnabled({ timeout: 30_000 })
  const section = await create.getAttribute('data-section')
  expect(section, 'le bouton dit de quelle section l’article naît').toBeTruthy()
  await create.click()

  const panel = node.locator('[data-testid="cocoon-candidates-panel"]')
  await expect(panel, 'les candidats de la section sont proposés').toBeVisible({ timeout: 15_000 })
  return { ...(await createFromCandidates(page, panel, timeout)), section }
}
