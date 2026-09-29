/**
 * Browser E2E — passes d'enrichissement (FR-RED-ENRICH-PASSES,
 * FR-RED-ENRICH-SOURCES, FR-RED-SECTION-REWRITE), en mode simulé.
 *
 * Le second temps de la rédaction, tel que l'utilisateur le vit :
 *   ① la passe sources ne vise que le chapitre qui a un « à sourcer » ;
 *   ② rien ne change dans l'éditeur tant qu'on n'a pas accepté ;
 *   ③ acceptée, la source devient un lien réel, et le reste de l'article ne bouge pas ;
 *   ④ un tableau accepté survit à l'éditeur, puis à l'enregistrement ;
 *   ⑤ une image acceptée garde sa place « à fournir » — que la publication refusera.
 */
import { test, expect } from './helpers/test-fixtures'
import type { Page } from '@playwright/test'

const panel = (page: Page) => page.locator('[data-testid="enrichment-panel"]')

async function contenuEnregistre(page: Page, apiUrl: string, id: number): Promise<string> {
  const res = await page.request.get(`${apiUrl}/articles/${id}/content`)
  const json = await res.json() as { data?: { content?: string } }
  return json.data?.content ?? ''
}

test.describe('Enrichir le premier jet', () => {
  test('sources, tableau, image : proposer, accepter, enregistrer', async ({ page, ctx }) => {
    test.setTimeout(180_000)
    const article = await ctx.createArticle('Enrichir')
    const captain = article.suggestedKeyword ?? `site vitrine ${ctx.runId}`
    await page.request.put(`${ctx.apiUrl}/articles/${article.id}/keywords`, {
      data: { capitaine: captain, lieutenants: [], lexique: [], rootKeywords: [], hnStructure: [] },
    })
    await page.request.put(`${ctx.apiUrl}/articles/${article.id}`, {
      data: {
        content: [
          `<h1>${captain} : le guide</h1><p>Un chapeau qui cite ${captain}.</p>`,
          '<h2>Le budget</h2><p>Beaucoup d’artisans <mark data-a-sourcer>[à sourcer : part des TPE sans site]</mark> hésitent encore.</p>',
          '<h2>Les étapes</h2><p>On commence par le message, puis on choisit les pages.</p><h3>Le message</h3><p>Une phrase claire.</p><h3>Les pages</h3><p>Accueil, services, contact.</p>',
          '<h2>Conclusion</h2><p>Passez à l’action dès cette semaine.</p>',
        ].join(''),
      },
    })

    await page.goto(`/article/${article.id}/editor`)
    const editeur = page.locator('.ProseMirror').first()
    await expect(page.locator('.ProseMirror', { hasText: 'Beaucoup d’artisans' })).toBeVisible({ timeout: 30000 })

    await page.locator('[data-testid="toggle-enrich"]').click()
    await expect(panel(page)).toBeVisible()

    // ① + ② — Sources : un seul chapitre visé, proposition sans rien appliquer.
    await panel(page).locator('[data-testid="enrich-pass-sources"]').click()
    const budget = panel(page).locator('[data-testid="proposal-0"]')
    await expect(budget).toHaveAttribute('data-status', 'ready', { timeout: 30000 })
    await expect(panel(page).locator('li.proposal'), '① seul le chapitre à sourcer est visé').toHaveCount(1)
    await expect(budget.locator('.sources a').first()).toHaveAttribute('href', /insee\.fr/)
    await expect(page.locator('.ProseMirror a[href*="insee.fr"]'), '② rien ne change sans accord').toHaveCount(0)

    // ③ — Accepter : le lien apparaît, le reste de l'article ne bouge pas.
    await budget.locator('[data-testid="proposal-accept"]').click()
    await expect(budget).toHaveAttribute('data-status', 'accepted')
    await expect(page.locator('.ProseMirror a[href*="insee.fr"]')).toHaveCount(1)
    await expect(page.locator('.ProseMirror', { hasText: 'Accueil, services, contact.' })).toBeVisible()

    // ④ — Tableaux : le chapitre des étapes reçoit un tableau à en-tête.
    await panel(page).locator('[data-testid="enrich-pass-tableaux"]').click()
    const etapes = panel(page).locator('[data-testid="proposal-1"]')
    await expect(etapes).toHaveAttribute('data-status', 'ready', { timeout: 30000 })
    await etapes.locator('[data-testid="proposal-accept"]').click()
    await expect(page.locator('.ProseMirror table th').first()).toBeVisible()

    // ⑤ — Images : la place « à fournir » et son texte alternatif.
    await panel(page).locator('[data-testid="enrich-pass-images"]').click()
    const imageBudget = panel(page).locator('[data-testid="proposal-0"]')
    await expect(imageBudget).toHaveAttribute('data-status', 'ready', { timeout: 30000 })
    await imageBudget.locator('[data-testid="proposal-accept"]').click()
    await expect(page.locator('.ProseMirror img[src="/images/image-a-fournir.svg"]')).toHaveAttribute('alt', /\S{3,}/)

    // Enregistré : lien, tableau et image survivent à la sauvegarde.
    await editeur.click()
    await page.keyboard.press('Control+s')
    await expect.poll(() => contenuEnregistre(page, ctx.apiUrl, article.id), { timeout: 20000 }).toContain('insee.fr')
    const enregistre = await contenuEnregistre(page, ctx.apiUrl, article.id)
    expect(enregistre).toMatch(/<table[\s\S]*<th/)
    expect(enregistre).toContain('src="/images/image-a-fournir.svg"')
    expect(enregistre, 'le marqueur a été remplacé par sa source').not.toContain('data-a-sourcer')

    // La publication refuse une image encore à fournir (⛔, sans dérogation).
    const porte = await page.request.get(`${ctx.apiUrl}/articles/${article.id}/gates/publish`)
    expect(porte.ok()).toBe(true)
    const verdict = await porte.json() as { data: { passed: boolean; blocking: Array<{ rule: string; level: string }> } }
    expect(verdict.data.passed).toBe(false)
    expect(verdict.data.blocking.find(i => i.rule === 'image-to-provide')?.level).toBe('technique')
  })

  test('réécrire un chapitre : une consigne, une proposition, puis le texte', async ({ page, ctx }) => {
    test.setTimeout(120_000)
    const article = await ctx.createArticle('Réécrire')
    const captain = article.suggestedKeyword ?? `réécriture ${ctx.runId}`
    await page.request.put(`${ctx.apiUrl}/articles/${article.id}/keywords`, {
      data: { capitaine: captain, lieutenants: [], lexique: [], rootKeywords: [], hnStructure: [] },
    })
    await page.request.put(`${ctx.apiUrl}/articles/${article.id}`, {
      data: { content: `<h1>${captain}</h1><p>Chapeau.</p><h2>Le budget</h2><p>Un site se prévoit tôt.</p><h2>Conclusion</h2><p>Fin.</p>` },
    })

    await page.goto(`/article/${article.id}/editor`)
    await expect(page.locator('.ProseMirror', { hasText: 'Un site se prévoit tôt.' })).toBeVisible({ timeout: 30000 })
    await page.locator('[data-testid="toggle-enrich"]').click()

    await panel(page).locator('[data-testid="rewrite-chapter"]').selectOption({ label: 'Le budget' })
    await panel(page).locator('[data-testid="rewrite-instruction"]').fill('Plus direct, dès la première phrase')
    await panel(page).locator('[data-testid="rewrite-submit"]').click()
    const proposition = panel(page).locator('[data-testid="proposal-0"]')
    await expect(proposition).toHaveAttribute('data-status', 'ready', { timeout: 30000 })
    await expect(page.locator('.ProseMirror', { hasText: 'Allons droit au but.' })).toHaveCount(0)

    await proposition.locator('[data-testid="proposal-accept"]').click()
    await expect(page.locator('.ProseMirror', { hasText: 'Allons droit au but.' })).toBeVisible()
  })
})
