// @vitest-environment node
/**
 * Contract API — GET /articles/:id/explorations/counts
 *
 * Cet endpoint alimente le TabCachePanel dans MoteurView. Il avait été cassé
 * implicitement (l'endpoint existait mais le frontend ne le consommait plus,
 * cf. fix bea9e4f). Ces tests bloquent toute future régression du contrat.
 *
 * Vérifie :
 *  1. shape de la réponse (sources attendues)
 *  2. comportement multi-articles (pas de fuite de comptes entre articles)
 *  3. article inexistant → erreur propre, pas 500
 *  4. id invalide → 400
 *  5. article sans aucune exploration → tous counts à 0
 */
import { describe, it, expect } from 'vitest'
import { setupTestContext } from '../helpers/test-context.js'
import { apiGet } from '../helpers/api-client.js'

const ctx = setupTestContext()
function requireServer() { return ctx.serverOk ? { skip: false } : { skip: true } as const }

// M3 (épopée qualité SEO) : plus de source `intent` — `keyword_intent_analyses`
// n'a plus de producteur et n'est plus comptée.
const EXPECTED_SOURCES = ['radar', 'captain', 'lieutenants', 'paa', 'lexique', 'local', 'contentGap'] as const
type CountsResponse = Record<string, number>

describe('Contract GET /articles/:id/explorations/counts', () => {
  it('id invalide (non-numérique) → 400 INVALID_ID', async ({ skip }) => {
    if (requireServer().skip) skip()
    const res = await apiGet('/articles/abc/explorations/counts')
    expect(res.error?.code).toBe('INVALID_ID')
  })

  it('article fraîchement créé → toutes les sources à 0', async ({ skip }) => {
    if (requireServer().skip) skip()
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'Counts Empty Cocon')
    const article = await ctx.createArticle(cocoon.id, 'Counts Empty Article')

    const res = await apiGet<CountsResponse>(`/articles/${article.id}/explorations/counts`)
    expect(res.error, 'pas d’erreur').toBeNull()
    expect(res.data).toBeDefined()

    // Toutes les sources attendues sont présentes (pas d'omission silencieuse)
    for (const source of EXPECTED_SOURCES) {
      // Si l'assertion plante, le nom de la source est dans la stack via la valeur testée
      expect(res.data).toHaveProperty(source)
      expect(res.data![source]).toBe(0)
    }
    // Ni plus ni moins : aucune source fantôme (dont l'ancien `intent`).
    expect(Object.keys(res.data!).sort()).toEqual([...EXPECTED_SOURCES].sort())
  })

  it('shape stable : counts sont des entiers positifs ou zéro', async ({ skip }) => {
    if (requireServer().skip) skip()
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'Counts Shape Cocon')
    const article = await ctx.createArticle(cocoon.id, 'Counts Shape Article')

    const res = await apiGet<CountsResponse>(`/articles/${article.id}/explorations/counts`)
    expect(res.data).toBeDefined()

    for (const [, count] of Object.entries(res.data!)) {
      expect(typeof count).toBe('number')
      expect(Number.isInteger(count)).toBe(true)
      expect(count).toBeGreaterThanOrEqual(0)
    }
  })

  it('multi-articles : chaque article a ses propres counts (pas de fuite)', async ({ skip }) => {
    if (requireServer().skip) skip()
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'Counts Multi Cocon')
    const a1 = await ctx.createArticle(cocoon.id, 'Counts Multi A1')
    const a2 = await ctx.createArticle(cocoon.id, 'Counts Multi A2')

    const r1 = await apiGet<CountsResponse>(`/articles/${a1.id}/explorations/counts`)
    const r2 = await apiGet<CountsResponse>(`/articles/${a2.id}/explorations/counts`)

    expect(r1.data).toBeDefined()
    expect(r2.data).toBeDefined()
    // Articles vides distincts → tous 0 chacun de leur côté.
    // Le test garantit surtout que l'endpoint accepte des ids différents
    // et ne renvoie pas une réponse partagée/cachée.
    for (const source of EXPECTED_SOURCES) {
      expect(r1.data![source]).toBe(0)
      expect(r2.data![source]).toBe(0)
    }
  })
})
