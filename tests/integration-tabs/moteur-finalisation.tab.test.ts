// @vitest-environment node
/**
 * Integration — Onglet Moteur · Finalisation (F7)
 */
import { describe, it, expect } from 'vitest'
import { setupTestContext } from '../helpers/test-context.js'
import { apiGet } from '../helpers/api-client.js'
import { grantCheck } from '../helpers/gates.js'

const ctx = setupTestContext()
function requireServer() { return ctx.serverOk ? { skip: false } : { skip: true } as const }

describe('Tab moteur/finalisation — Gates (côté DB : completed_checks)', () => {
  it('Article neuf n\'a aucun des 3 checks Moteur', async ({ skip }) => {
    if (requireServer().skip) skip()
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'FGates Cocon')
    const article = await ctx.createArticle(cocoon.id, 'FGates Article')

    const res = await apiGet<{ completed_checks?: string[]; completedChecks?: string[] }>(`/articles/${article.id}/progress`)
    const checks = (res.data as { completedChecks?: string[]; completed_checks?: string[] })
    const list = checks.completedChecks ?? checks.completed_checks ?? []
    expect(list).not.toContain('moteur:capitaine_locked')
    expect(list).not.toContain('moteur:lieutenants_locked')
    expect(list).not.toContain('moteur:lexique_validated')
  })

  it('Après ajout des 3 checks, ils sont bien présents', async ({ skip }) => {
    if (requireServer().skip) skip()

    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'FGates2 Cocon')
    const article = await ctx.createArticle(cocoon.id, 'FGates2 Article')
    const { apiPut } = await import('../helpers/api-client.js')
    await apiPut(`/articles/${article.id}/keywords`, {
      capitaine: `test-${ctx.runId}-fgates`, lieutenants: [], lexique: [], rootKeywords: [], hnStructure: [],
    })

    // Étapes gardées : elles passent leur porte, comme pour un utilisateur qui assume.
    await grantCheck(article.id, 'moteur:capitaine_locked')
    await grantCheck(article.id, 'moteur:lieutenants_locked')
    await grantCheck(article.id, 'moteur:lexique_validated')

    const res = await apiGet<{ completed_checks?: string[]; completedChecks?: string[] }>(`/articles/${article.id}/progress`)
    const checks = (res.data as { completedChecks?: string[]; completed_checks?: string[] })
    const list = checks.completedChecks ?? checks.completed_checks ?? []
    expect(list).toContain('moteur:capitaine_locked')
    expect(list).toContain('moteur:lieutenants_locked')
    expect(list).toContain('moteur:lexique_validated')
  })

  it.todo('Gate frontend : onglet finalisation visible uniquement si 3 checks — Playwright')
})

describe('Tab moteur/finalisation — Affichage agrégé', () => {
  it('GET /articles/:id/explorations agrège tous les domaines', async ({ skip }) => {
    if (requireServer().skip) skip()
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'Final Cocon')
    const article = await ctx.createArticle(cocoon.id, 'Final Article')

    const res = await apiGet<{
      capitaineKeyword: unknown
      radar: unknown
      captain: unknown[]
      lieutenants: unknown[]
      paa: unknown[]
      lexique: unknown[]
    }>(`/articles/${article.id}/explorations`)
    expect(res.status).toBe(200)
    // Toutes les clés présentes même si vides
    // Shape réelle (server/routes/article-explorations.routes.ts) :
    // capitaineKeyword, radar, captain, lieutenants, intent, local, contentGap, lexique
    expect(res.data).toHaveProperty('captain')
    expect(res.data).toHaveProperty('lieutenants')
    expect(res.data).toHaveProperty('lexique')
    expect(res.data).toHaveProperty('radar')
    expect(res.data).toHaveProperty('intent')
    expect(res.data).toHaveProperty('local')
    expect(res.data).toHaveProperty('contentGap')
    expect(res.data).toHaveProperty('capitaineKeyword')
    // Note: 'paa' n'est pas une clé top-level — les PAA sont incluses dans chaque captain[].paaQuestions
  })

  it.todo('Section Capitaine : keyword + 6 KPIs + verdict (frontend lecture seule)')
  it.todo('Section Lieutenants : liste + H2 (frontend)')
  it.todo('Section Lexique : termes par catégorie (frontend)')
})

describe('Tab moteur/finalisation — Sortie Rédaction', () => {
  it.todo('CTA "Aller à la Rédaction" en bas (frontend)')
  it.todo('Cycle-back : article 100% validé → finalisation par défaut (frontend)')
})
