/**
 * Portes de qualité — un test NÉGATIF navigateur par porte (NFR-TEST-BEHAVIORAL).
 *
 * Chaque porte est prise en défaut comme un utilisateur le ferait :
 *   - l'action interdite ouvre l'alarme et ne passe pas ;
 *   - une raison trop courte laisse le bouton grisé ;
 *   - une vraie raison fait passer, et la dérogation est enregistrée ;
 *   - des données qui changent font tomber la dérogation (capitaine) ;
 *   - un défaut ⛔ ne se déroge jamais (publication).
 *
 * Les défauts sont posés en base (volume à zéro, un seul lieutenant, meta
 * description coupée) : le test ne dépend pas du hasard des données simulées.
 * FR-CAP-LOCK-GATE, FR-LIE-LOCK-GATE, FR-RED-PUBLISH-GATE, FR-INFRA-GATE-WAIVER.
 */
import { expect, type Page } from '@playwright/test'
import { test } from './helpers/test-fixtures'
import { checksDeLArticle, dismissLoadPrompt, openMoteur, selectArticleByTitle, tabLocator } from './helpers/moteur-ui'
import { GATE_TEST_REASON } from './helpers/gate-alarm'
import { query } from '../../server/db/client.js'

const alarm = (page: Page) => page.locator('[data-testid="gate-alarm"]')

async function scanFirstKeyword(page: Page, keyword: string): Promise<void> {
  const field = page.locator('[data-testid="keyword-input"] input').first()
  await expect(field).toBeVisible({ timeout: 15000 })
  await field.fill(keyword)
  await Promise.all([
    page.waitForResponse(r => /\/api\/keywords\/.+\/scan$/.test(r.url()) && r.request().method() === 'POST', { timeout: 60000 }),
    field.press('Enter'),
  ])
  await expect(page.locator('[data-testid="radar-list-item-0-loading"]'), 'fin du scan').toHaveCount(0, { timeout: 60000 })
}

/** Remplit un point 🔴 de l'alarme ; laisse les 🟠 à cocher par l'appelant. */
async function fillRisk(page: Page, rule: string, reason: string): Promise<void> {
  const issue = alarm(page).locator(`[data-testid="gate-issue"][data-rule="${rule}"]`)
  await issue.locator('[data-testid="gate-category"]').selectOption('donnee-manquante')
  await issue.locator('[data-testid="gate-reason"]').fill(reason)
}

/** Répond à tous les points sauf `except` : 🟠 lus, 🔴 motivés. */
async function answerAllBut(page: Page, except: string): Promise<void> {
  const acks = alarm(page).locator('[data-testid="gate-ack"]')
  for (let i = 0; i < await acks.count(); i++) await acks.nth(i).check()
  const risks = alarm(page).locator('[data-testid="gate-issue"][data-level="risque"]')
  for (let i = 0; i < await risks.count(); i++) {
    const rule = await risks.nth(i).getAttribute('data-rule')
    if (rule && rule !== except) await fillRisk(page, rule, GATE_TEST_REASON)
  }
}

test.describe('Porte « verrouiller le capitaine »', () => {
  test('volume nul : alarme, raison trop courte refusée, vraie raison acceptée, dérogation qui tombe', async ({ page, ctx }) => {
    test.setTimeout(180_000)
    const article = await ctx.createArticle('Porte capitaine')
    const keyword = article.suggestedKeyword ?? `porte capitaine ${ctx.runId}`
    await openMoteur(page, article.cocoonId)
    await selectArticleByTitle(page, article.titre)
    await scanFirstKeyword(page, keyword)

    // Personne ne cherche ce mot-clé : c'est ce que dit désormais la base.
    await query(`UPDATE keyword_metrics SET search_volume = 0 WHERE LOWER(keyword) = LOWER($1)`, [keyword])

    const lock = page.locator('[data-testid="radar-card-lock"]').first()
    await lock.click()
    await expect(alarm(page), '① l’action interdite ouvre l’alarme').toBeVisible({ timeout: 20000 })
    await expect(alarm(page).locator('[data-rule="captain-volume-zero"]')).toHaveAttribute('data-level', 'risque')

    await alarm(page).locator('[data-testid="gate-cancel"]').click()
    await expect(alarm(page)).toBeHidden()
    await expect(lock, 'revenir corriger ne verrouille rien').toHaveAttribute('aria-pressed', 'false')
    expect(await checksDeLArticle(page, article.id)).not.toContain('moteur:capitaine_locked')

    await lock.click()
    await expect(alarm(page)).toBeVisible({ timeout: 20000 })
    await answerAllBut(page, 'captain-volume-zero')
    await fillRisk(page, 'captain-volume-zero', 'trop court')
    const accept = alarm(page).locator('[data-testid="gate-accept"]')
    await expect(accept, '② une raison de 10 caractères laisse le bouton grisé').toBeDisabled()
    await expect(alarm(page).locator('[data-rule="captain-volume-zero"] [data-testid="gate-reason-counter"]')).toHaveText('10 / 20')

    await fillRisk(page, 'captain-volume-zero', GATE_TEST_REASON)
    await expect(accept).toBeEnabled()
    await accept.click()
    await expect(alarm(page), '③ une vraie raison fait passer').toBeHidden({ timeout: 15000 })
    await expect(lock).toHaveAttribute('aria-pressed', 'true', { timeout: 15000 })
    await expect.poll(() => checksDeLArticle(page, article.id), { timeout: 20000 }).toContain('moteur:capitaine_locked')

    const waivers = await (await page.request.get(`${ctx.apiUrl}/articles/${article.id}/waivers`)).json()
    expect(waivers.data.some((w: { rule: string; reason: string }) => w.rule === 'captain-volume-zero' && w.reason === GATE_TEST_REASON),
      'la dérogation est enregistrée avec sa raison').toBe(true)

    // ④ les données changent : la dérogation ne couvre plus rien.
    await lock.click()
    await expect(lock).toHaveAttribute('aria-pressed', 'false', { timeout: 15000 })
    await query(
      `UPDATE keyword_metrics SET autocomplete_suggestions = '["${keyword} prix"]'::jsonb, autocomplete_source = 'google' WHERE LOWER(keyword) = LOWER($1)`,
      [keyword],
    )
    await lock.click()
    await expect(alarm(page), '④ données changées : l’alarme revient').toBeVisible({ timeout: 20000 })
    await expect(alarm(page).locator('[data-rule="captain-volume-zero"]')).toBeVisible()
  })
})

test.describe('Porte « valider les lieutenants »', () => {
  test('un pilier avec un seul lieutenant : étape retenue, bandeau, alarme, puis dérogation', async ({ page, ctx }) => {
    test.setTimeout(180_000)
    const article = await ctx.createArticle('Porte lieutenants')
    const captain = article.suggestedKeyword ?? `porte lieutenants ${ctx.runId}`
    const seul = `${captain} prix`
    await page.request.put(`${ctx.apiUrl}/articles/${article.id}/keywords`, {
      data: { capitaine: captain, lieutenants: [seul], lexique: [], rootKeywords: [], hnStructure: [{ level: 2, text: `Combien coûte ${captain}` }] },
    })
    await page.request.post(`${ctx.apiUrl}/articles/${article.id}/lieutenant-explorations`, {
      data: {
        captainKeyword: captain,
        entries: [{ keyword: seul, status: 'locked', reasoning: 'Question de budget', sources: [], suggestedHnLevel: 2, score: 80 }],
      },
    })

    await openMoteur(page, article.cocoonId)
    await selectArticleByTitle(page, article.titre)
    await tabLocator(page, 'lieutenants').click()
    await dismissLoadPrompt(page)

    const bandeau = page.locator('[data-testid="lieutenants-gate-banner"]')
    await expect(bandeau, '① l’étape est retenue, et l’écran le dit').toBeVisible({ timeout: 30000 })
    await expect(bandeau).toContainText('le minimum conseillé est 3')
    expect(await checksDeLArticle(page, article.id)).not.toContain('moteur:lieutenants_locked')

    await page.locator('[data-testid="lieutenants-gate-review"]').click()
    await expect(alarm(page)).toBeVisible({ timeout: 20000 })
    await answerAllBut(page, 'lieutenants-too-few')
    await fillRisk(page, 'lieutenants-too-few', 'un seul suffit')
    await expect(alarm(page).locator('[data-testid="gate-accept"]'), '② raison trop courte').toBeDisabled()
    await fillRisk(page, 'lieutenants-too-few', GATE_TEST_REASON)
    await alarm(page).locator('[data-testid="gate-accept"]').click()
    await expect(alarm(page)).toBeHidden({ timeout: 15000 })

    await expect.poll(() => checksDeLArticle(page, article.id), { timeout: 20000 }).toContain('moteur:lieutenants_locked')
    await expect(bandeau, '③ l’étape est accordée : le bandeau s’efface').toBeHidden()
  })
})

test.describe('Porte « publier »', () => {
  test('une meta description coupée ne se publie pas : ⛔ sans dérogation possible, ni statut ni fichier', async ({ page, ctx }) => {
    test.setTimeout(120_000)
    const article = await ctx.createArticle('Porte publication')
    const captain = article.suggestedKeyword ?? 'porte publication'
    await page.request.put(`${ctx.apiUrl}/articles/${article.id}`, {
      data: {
        content: `<h1>${captain}</h1><h2>Pourquoi</h2><p>${'Un paragraphe de test. '.repeat(30)}</p>`,
        // Coupée en plein vol, comme celle du pilier 1013 : un défaut ⛔.
        metaTitle: `${captain} : le guide`,
        metaDescription: `Tout savoir sur ${captain} : méthode, budget et erreurs à éviter pour obtenir des clients en...`,
      },
    })

    let downloads = 0
    page.on('download', () => { downloads++ })
    await page.goto(`/article/${article.id}/preview`)
    const exporter = page.locator('[data-testid="preview-export"]')
    await expect(exporter).toBeEnabled({ timeout: 20000 })
    await exporter.click()

    await expect(alarm(page), '① publier ouvre l’alarme').toBeVisible({ timeout: 20000 })
    const technique = alarm(page).locator('[data-testid="gate-issue"][data-level="technique"]')
    expect(await technique.count(), 'au moins un défaut ⛔').toBeGreaterThan(0)
    await expect(technique.first().locator('[data-testid="gate-reason"]'), '⛔ n’offre aucun champ de dérogation').toHaveCount(0)
    const accept = alarm(page).locator('[data-testid="gate-accept"]')
    await expect(accept).toHaveText('Correction nécessaire')
    await expect(accept).toBeDisabled()

    await alarm(page).locator('[data-testid="gate-cancel"]').click()
    await expect(page.locator('[data-testid="preview-export-notice"]')).toContainText('Publication annulée')
    const statut = await (await page.request.get(`${ctx.apiUrl}/articles/${article.id}`)).json()
    expect(statut.data.status ?? statut.data.article?.status, '② le statut n’a pas bougé').not.toBe('publié')
    expect(downloads, '③ aucun fichier exporté').toBe(0)
  })
})
