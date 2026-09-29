/**
 * Browser E2E — onglet Structure (FR-HN-TAB, FR-HN-LOCK-GATE), en mode simulé.
 *
 *   ① une structure sans H1 ne se valide pas : ⛔, aucune dérogation possible ;
 *   ② une structure proposée à partir des lieutenants retenus se valide :
 *      l'étape `moteur:hn_locked` est posée et la structure devient le sommaire
 *      de la Rédaction (introduction et conclusion ajoutées une seule fois).
 */
import { expect, type Page } from '@playwright/test'
import { test } from './helpers/test-fixtures'
import { checksDeLArticle, dismissLoadPrompt, openMoteur, selectArticleByTitle, tabLocator } from './helpers/moteur-ui'

const alarm = (page: Page) => page.locator('[data-testid="gate-alarm"]')

async function preparer(page: Page, apiUrl: string, articleId: number, captain: string, structure: unknown[]): Promise<void> {
  const lieutenants = ['prix du service', 'délai de réalisation']
  await page.request.put(`${apiUrl}/articles/${articleId}/keywords`, {
    data: { capitaine: captain, lieutenants, lexique: [], rootKeywords: [], hnStructure: structure },
  })
  await page.request.post(`${apiUrl}/articles/${articleId}/lieutenant-explorations`, {
    data: {
      captainKeyword: captain,
      entries: lieutenants.map(keyword => ({ keyword, status: 'locked', reasoning: 'Retenu pour le test', sources: [], suggestedHnLevel: 2, score: 80 })),
    },
  })
}

test.describe('Onglet Structure', () => {
  test('① une structure sans H1 est refusée, sans dérogation possible', async ({ page, ctx }) => {
    test.setTimeout(120_000)
    const article = await ctx.createArticle('Structure sans H1', 'Spécialisé')
    const captain = article.suggestedKeyword ?? `structure ${ctx.runId}`
    await preparer(page, ctx.apiUrl, article.id, captain, [
      { level: 2, text: 'Le prix du service' },
      { level: 2, text: 'Le délai de réalisation' },
      { level: 2, text: 'Les erreurs à éviter' },
    ])

    await openMoteur(page, article.cocoonId)
    await selectArticleByTitle(page, article.titre)
    await tabLocator(page, 'structure').click()
    await dismissLoadPrompt(page)

    const panneau = page.locator('[data-testid="structure-panel"]')
    await expect(panneau.locator('.hn-structure-item').first(), 'la structure enregistrée s’affiche').toBeVisible({ timeout: 30000 })
    await panneau.locator('[data-testid="structure-validate"]').click()

    await expect(alarm(page), 'la porte refuse et l’alarme s’ouvre').toBeVisible({ timeout: 30000 })
    const defaut = alarm(page).locator('[data-testid="gate-issue"][data-level="technique"]', { hasText: 'H1' })
    await expect(defaut, '⛔ le H1 manque').toBeVisible()
    await expect(defaut.locator('[data-testid="gate-reason"]'), '⛔ n’offre aucun champ de dérogation').toHaveCount(0)
    await expect(alarm(page).locator('[data-testid="gate-accept"]')).toBeDisabled()
    await alarm(page).locator('[data-testid="gate-cancel"]').click()

    expect(await checksDeLArticle(page, article.id), 'l’étape n’est pas posée').not.toContain('moteur:hn_locked')
  })

  test('② proposée à partir des lieutenants retenus, validée, elle devient le sommaire', async ({ page, ctx }) => {
    test.setTimeout(180_000)
    const article = await ctx.createArticle('Structure valide', 'Spécialisé')
    const captain = article.suggestedKeyword ?? `structure valide ${ctx.runId}`
    await preparer(page, ctx.apiUrl, article.id, captain, [])

    await openMoteur(page, article.cocoonId)
    await selectArticleByTitle(page, article.titre)
    await tabLocator(page, 'structure').click()
    await dismissLoadPrompt(page)

    const panneau = page.locator('[data-testid="structure-panel"]')
    await expect(panneau.locator('.lieutenant-chip'), 'les lieutenants retenus sont rappelés').toHaveCount(2, { timeout: 30000 })
    await panneau.locator('[data-testid="hn-generate-btn"]').click()
    await expect(panneau.locator('.hn-structure-item').first(), 'la structure est proposée').toBeVisible({ timeout: 120000 })

    await panneau.locator('[data-testid="structure-validate"]').click()
    const alarme = alarm(page)
    await expect.poll(async () => {
      if (await alarme.isVisible()) return 'alarme'
      return (await checksDeLArticle(page, article.id)).includes('moteur:hn_locked') ? 'validée' : 'en attente'
    }, { timeout: 60000 }).toBe('validée')
    await expect(panneau.locator('[data-testid="structure-validated"]')).toBeVisible()

    const res = await page.request.get(`${ctx.apiUrl}/articles/${article.id}/content`)
    const outline = (await res.json() as { data: { outline: { sections: Array<{ level: number; title: string }> } | string } }).data.outline
    const sections = (typeof outline === 'string' ? JSON.parse(outline) : outline).sections as Array<{ level: number; title: string }>
    const titres = sections.map(s => s.title)
    expect(sections[0]!.level, 'le sommaire commence par le H1').toBe(1)
    expect(titres.filter(t => t.startsWith('Introduction')), 'une seule introduction').toHaveLength(1)
    expect(titres.filter(t => t.startsWith('Conclusion')), 'une seule conclusion').toHaveLength(1)
    expect(titres.some(t => /prix du service/i.test(t)), 'un lieutenant retenu devient un chapitre').toBe(true)
  })
})
