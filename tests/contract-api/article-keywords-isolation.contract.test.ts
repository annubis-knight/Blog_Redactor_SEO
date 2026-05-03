// @vitest-environment node
/**
 * P1(b) — Contract test : isolation des Lieutenants verrouillés par articleId
 * sur l'endpoint `PUT/GET /api/articles/:id/keywords`.
 *
 * Complément du test composant `lieutenants-selection-isolation.test.ts` (côté UI) :
 * ici on prouve que la persistance backend n'échange JAMAIS les Lieutenants
 * entre deux articles, même quand les écritures sont entrelacées dans le temps.
 *
 * Scénario testé :
 *   1. Créer 2 articles A et B (même cocon).
 *   2. PUT /articles/A/keywords avec lieutenants_A
 *   3. PUT /articles/B/keywords avec lieutenants_B (différents)
 *   4. GET /articles/A/keywords → DOIT retourner UNIQUEMENT lieutenants_A
 *   5. GET /articles/B/keywords → DOIT retourner UNIQUEMENT lieutenants_B
 *   6. Re-PUT A avec une liste différente, puis re-GET A et B → A est mis à jour, B inchangé
 *
 * Pré-requis : le serveur dev doit tourner (cf. helpers/test-context.ts).
 *   AI_PROVIDER=mock conseillé pour ne consommer aucun crédit.
 */
import { describe, it, expect } from 'vitest'
import { setupTestContext } from '../helpers/test-context.js'
import { apiGet, apiPut } from '../helpers/api-client.js'

const ctx = setupTestContext()
function requireServer() { return ctx.serverOk ? { skip: false } : { skip: true } as const }

interface ArticleKeywordsResponse {
  capitaine: string
  lieutenants: string[]
  lexique: string[]
  rootKeywords?: string[]
}

describe('Contract /articles/:id/keywords — isolation par articleId (P1)', () => {
  it('PUT puis GET sur deux articles distincts ne mélangent pas les Lieutenants', async () => {
    if (requireServer().skip) return

    // Setup : 1 cocon, 2 articles
    const silo = await ctx.getSilo('IsoLieutCo')
    const cocoon = await ctx.createCocoon(silo.id, 'IsoLieutCo')
    const articleA = await ctx.createArticle(cocoon.id, 'A-IsoLieut', 'Pilier')
    const articleB = await ctx.createArticle(cocoon.id, 'B-IsoLieut', 'Intermédiaire')

    const lieutenantsA = ['site vitrine professionnel', 'site web pme toulouse']
    const lieutenantsB = ['arborescence site internet']

    // Écriture A
    const putA = await apiPut<ArticleKeywordsResponse>(`/articles/${articleA.id}/keywords`, {
      capitaine: 'creation site web entreprises',
      lieutenants: lieutenantsA,
      lexique: [],
      rootKeywords: [],
    })
    expect(putA.status).toBe(200)
    expect(putA.data?.lieutenants).toEqual(lieutenantsA)

    // Écriture B (entrelacée — c'est le moment où une régression de scoping
    // pourrait écraser ou mélanger les payloads).
    const putB = await apiPut<ArticleKeywordsResponse>(`/articles/${articleB.id}/keywords`, {
      capitaine: 'structure arborescence',
      lieutenants: lieutenantsB,
      lexique: [],
      rootKeywords: [],
    })
    expect(putB.status).toBe(200)
    expect(putB.data?.lieutenants).toEqual(lieutenantsB)

    // Lecture A → strictement lieutenantsA
    const getA = await apiGet<ArticleKeywordsResponse>(`/articles/${articleA.id}/keywords`)
    expect(getA.status).toBe(200)
    expect(getA.data?.lieutenants).toEqual(lieutenantsA)
    for (const ltB of lieutenantsB) {
      expect(getA.data?.lieutenants).not.toContain(ltB)
    }

    // Lecture B → strictement lieutenantsB
    const getB = await apiGet<ArticleKeywordsResponse>(`/articles/${articleB.id}/keywords`)
    expect(getB.status).toBe(200)
    expect(getB.data?.lieutenants).toEqual(lieutenantsB)
    for (const ltA of lieutenantsA) {
      expect(getB.data?.lieutenants).not.toContain(ltA)
    }
  })

  it('mise à jour de A ne contamine pas B (idempotence par articleId)', async () => {
    if (requireServer().skip) return

    const silo = await ctx.getSilo('IsoLieutCo2')
    const cocoon = await ctx.createCocoon(silo.id, 'IsoLieutCo2')
    const articleA = await ctx.createArticle(cocoon.id, 'A2-IsoLieut', 'Pilier')
    const articleB = await ctx.createArticle(cocoon.id, 'B2-IsoLieut', 'Spécialisé')

    const v1 = ['lt-a-v1-x', 'lt-a-v1-y']
    const v2 = ['lt-a-v2-z']
    const ltB = ['lt-b-only']

    await apiPut(`/articles/${articleA.id}/keywords`, {
      capitaine: 'cap-A', lieutenants: v1, lexique: [], rootKeywords: [],
    })
    await apiPut(`/articles/${articleB.id}/keywords`, {
      capitaine: 'cap-B', lieutenants: ltB, lexique: [], rootKeywords: [],
    })

    // Mise à jour de A (remplacement complet)
    await apiPut(`/articles/${articleA.id}/keywords`, {
      capitaine: 'cap-A', lieutenants: v2, lexique: [], rootKeywords: [],
    })

    const getA = await apiGet<ArticleKeywordsResponse>(`/articles/${articleA.id}/keywords`)
    const getB = await apiGet<ArticleKeywordsResponse>(`/articles/${articleB.id}/keywords`)

    // A est bien mis à jour
    expect(getA.data?.lieutenants).toEqual(v2)
    // B n'a pas bougé
    expect(getB.data?.lieutenants).toEqual(ltB)
    // Aucune fuite croisée
    for (const lt of v1.concat(v2)) {
      expect(getB.data?.lieutenants).not.toContain(lt)
    }
    for (const lt of ltB) {
      expect(getA.data?.lieutenants).not.toContain(lt)
    }
  })

  it('GET sur articleId invalide → 400 INVALID_ID (sanity check)', async () => {
    if (requireServer().skip) return
    const res = await apiGet(`/articles/not-a-number/keywords`)
    expect(res.status).toBe(400)
    expect(res.error?.code).toBe('INVALID_ID')
  })
})
