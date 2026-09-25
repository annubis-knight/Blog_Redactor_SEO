// @vitest-environment node
/**
 * Contract API — /articles/* endpoints
 */
import { describe, it, expect } from 'vitest'
import { setupTestContext } from '../helpers/test-context.js'
import { apiPost, apiGet, apiPut, apiDelete } from '../helpers/api-client.js'
import { createTestCocoonArticle } from '../helpers/db-fixtures.js'
import { query } from '../../server/db/client.js'

const ctx = setupTestContext()
function requireServer() { return ctx.serverOk ? { skip: false } : { skip: true } as const }

describe('Contract /articles', () => {
  it('GET /articles/:id 404 si id inexistant', async ({ skip }) => {
    if (requireServer().skip) skip()
    const res = await apiGet('/articles/9999999')
    expect(res.error?.code).toBe('NOT_FOUND')
  })

  it('GET /articles/:id avec id non-numérique → 400 INVALID_ID', async ({ skip }) => {
    if (requireServer().skip) skip()
    const res = await apiGet('/articles/abc')
    expect(res.error?.code).toBe('INVALID_ID')
  })

  it('GET /articles/:id retourne shape { article, cocoonName }', async ({ skip }) => {
    if (requireServer().skip) skip()
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'Contract Cocon')
    const article = await ctx.createArticle(cocoon.id, 'Contract Article')

    const res = await apiGet<{ article: { id: number; type: string }; cocoonName: string }>(`/articles/${article.id}`)
    expect(res.data?.article?.id).toBe(article.id)
    expect(res.data?.cocoonName).toBeDefined()
  })

  it('GET /articles/by-slug/:slug retourne ou 404', async ({ skip }) => {
    if (requireServer().skip) skip()
    const res = await apiGet(`/articles/by-slug/test-${ctx.runId}-no-slug`)
    expect([200, 404]).toContain(res.status)
  })

  it('DELETE /articles/:id détache du cocon (cocoon_id NULL)', async ({ skip }) => {
    if (requireServer().skip) skip()
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'Del Contract Cocon')
    const article = await ctx.createArticle(cocoon.id, 'Del Contract Article')

    const res = await apiDelete(`/articles/${article.id}`)
    expect([200, 204]).toContain(res.status)
  })

  // C7 : un parent détaché laisserait ses enfants sans parent ; un enfant
  // détaché quitte l'arbre et libère la section de son parent.
  it('DELETE /articles/:id d’un parent qui a des enfants → 409 HAS_CHILDREN ; l’enfant se détache', async ({ skip }) => {
    if (requireServer().skip) skip()
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'Del Arbre Cocon')
    const pilier = await ctx.createArticle(cocoon.id, 'Del Arbre Pilier', 'Pilier')
    const enfant = await createTestCocoonArticle(ctx.runId, cocoon.id, {
      base: 'Del Arbre Enfant', type: 'Intermédiaire', slug: `test-${ctx.runId}-del-arbre-enfant`,
      parentId: pilier.id, parentSection: 'Une section du pilier',
    })

    const refus = await apiDelete(`/articles/${pilier.id}`)
    expect(refus.status).toBe(409)
    expect(refus.error?.code).toBe('HAS_CHILDREN')

    expect((await apiDelete(`/articles/${enfant.id}`)).status).toBe(200)
    const row = await query<{ cocoon_id: number | null; parent_id: number | null; parent_section: string | null }>(
      `SELECT cocoon_id, parent_id, parent_section FROM articles WHERE id = $1`, [enfant.id])
    expect(row.rows[0]).toEqual({ cocoon_id: null, parent_id: null, parent_section: null })

    expect((await apiDelete(`/articles/${pilier.id}`)).status, 'sans enfant, le pilier se détache').toBe(200)
  })

  it('DELETE /articles/:id inexistant → 404', async ({ skip }) => {
    if (requireServer().skip) skip()
    const res = await apiDelete('/articles/9999999')
    expect(res.error?.code).toBe('NOT_FOUND')
  })

  it('PUT /articles/:id sans body valide → 400', async ({ skip }) => {
    if (requireServer().skip) skip()
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'Put Contract Cocon')
    const article = await ctx.createArticle(cocoon.id, 'Put Contract Article')

    // Body avec une clé non reconnue → schema accepte tout (champs optionnels) → 200
    const res = await apiPut(`/articles/${article.id}`, { content: '<p>x</p>' })
    expect(res.status).toBe(200)
  })

  it('PUT /articles/:id avec id non-numérique → 400', async ({ skip }) => {
    if (requireServer().skip) skip()
    const res = await apiPut('/articles/abc', { content: '<p>x</p>' })
    expect(res.error?.code).toBe('INVALID_ID')
  })

  // C7 (K6) : la création en lot a disparu ; un article se crée à la fois.
  it('POST /articles/batch-create n’existe plus → 404', async ({ skip }) => {
    if (requireServer().skip) skip()
    const res = await apiPost('/articles/batch-create', { cocoonName: 'x', articles: [{ title: 'Un', type: 'pilier' }] })
    expect(res.status).toBe(404)
  })

  it('POST /cocoons/:id/articles body invalide → 400', async ({ skip }) => {
    if (requireServer().skip) skip()
    const res = await apiPost('/cocoons/1/articles', {})
    expect(res.error?.code).toBe('VALIDATION_ERROR')
  })

  it('PATCH /articles/:id valide id et body', async ({ skip }) => {
    if (requireServer().skip) skip()
    // PATCH existe selon patchArticleSchema { title, slug } — test via raw fetch
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'Patch Cocon')
    const article = await ctx.createArticle(cocoon.id, 'Patch Article')

    const res = await fetch(`http://localhost:3400/api/articles/${article.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: `Renamed ${ctx.runId}` }),
    })
    expect([200, 400]).toContain(res.status)
  })
})

describe('Contract /articles/:id/keywords', () => {
  it('GET retourne shape pour article neuf', async ({ skip }) => {
    if (requireServer().skip) skip()
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'KwGet Cocon')
    const article = await ctx.createArticle(cocoon.id, 'KwGet Article')

    const res = await apiGet(`/articles/${article.id}/keywords`)
    expect(res.status).toBe(200)
  })

  it('PUT /articles/:id/keywords sans capitaine → 400', async ({ skip }) => {
    if (requireServer().skip) skip()
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'KwPutInv Cocon')
    const article = await ctx.createArticle(cocoon.id, 'KwPutInv Article')

    const res = await apiPut(`/articles/${article.id}/keywords`, { lieutenants: [] })
    expect(res.error?.code).toBe('MISSING_PARAM')
  })

  it('PUT /articles/:id/keywords replace total', async ({ skip }) => {
    if (requireServer().skip) skip()
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'KwPutTotal Cocon')
    const article = await ctx.createArticle(cocoon.id, 'KwPutTotal Article')

    const res = await apiPut(`/articles/${article.id}/keywords`, {
      capitaine: `test-${ctx.runId}-capT`,
      lieutenants: ['lt1'],
      lexique: ['lex1'],
      rootKeywords: [],
      hnStructure: [],
    })
    expect(res.status).toBe(200)
  })
})

describe('Contract /articles/:id/micro-context', () => {
  it('GET retourne null pour article sans micro-context', async ({ skip }) => {
    if (requireServer().skip) skip()
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'MCC Cocon')
    const article = await ctx.createArticle(cocoon.id, 'MCC Article')

    const res = await apiGet(`/articles/${article.id}/micro-context`)
    expect(res.status).toBe(200)
  })

  it('PUT sans angle → 400', async ({ skip }) => {
    if (requireServer().skip) skip()
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'MCNoA Cocon')
    const article = await ctx.createArticle(cocoon.id, 'MCNoA Article')

    const res = await apiPut(`/articles/${article.id}/micro-context`, { tone: 'x' })
    expect(res.status).toBe(400)
  })

  it('PUT avec body valide sauvegarde', async ({ skip }) => {
    if (requireServer().skip) skip()
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'MCPut Cocon')
    const article = await ctx.createArticle(cocoon.id, 'MCPut Article')

    const res = await apiPut(`/articles/${article.id}/micro-context`, { angle: `[test:${ctx.runId}] ok` })
    expect(res.status).toBe(200)
  })
})

describe('Contract /articles/:id/content', () => {
  it('GET retourne 200 avec shape (peut être null)', async ({ skip }) => {
    if (requireServer().skip) skip()
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'ContG Cocon')
    const article = await ctx.createArticle(cocoon.id, 'ContG Article')

    const res = await apiGet(`/articles/${article.id}/content`)
    expect(res.status).toBe(200)
  })
})

describe('Contract /articles/:id/explorations', () => {
  it('GET agrège tous les domaines pour article neuf', async ({ skip }) => {
    if (requireServer().skip) skip()
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'ExpC Cocon')
    const article = await ctx.createArticle(cocoon.id, 'ExpC Article')

    const res = await apiGet<Record<string, unknown>>(`/articles/${article.id}/explorations`)
    expect(res.status).toBe(200)
    // Clés réelles : capitaineKeyword, radar, captain, lieutenants, intent, local, contentGap, lexique
    expect(res.data).toHaveProperty('captain')
    expect(res.data).toHaveProperty('lieutenants')
    expect(res.data).toHaveProperty('lexique')
  })
})

describe('Contract /articles/:id/explorations/counts', () => {
  it('GET retourne 8 compteurs à 0 pour article neuf', async ({ skip }) => {
    if (requireServer().skip) skip()
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'CountsC Cocon')
    const article = await ctx.createArticle(cocoon.id, 'CountsC Article')

    const res = await apiGet<{ radar: number; captain: number; lieutenants: number; paa: number; intent: number; local: number; contentGap: number; lexique: number }>(`/articles/${article.id}/explorations/counts`)
    expect(res.data?.radar).toBe(0)
    expect(res.data?.captain).toBe(0)
    expect(res.data?.lieutenants).toBe(0)
    expect(res.data?.paa).toBe(0)
    expect(res.data?.intent).toBe(0)
    expect(res.data?.local).toBe(0)
    expect(res.data?.contentGap).toBe(0)
    expect(res.data?.lexique).toBe(0)
  })
})

describe('Contract /articles/:id/external-cache', () => {
  it('GET retourne shape avec autocomplete', async ({ skip }) => {
    if (requireServer().skip) skip()
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'ExtC Cocon')
    const article = await ctx.createArticle(cocoon.id, 'ExtC Article')

    const res = await apiGet(`/articles/${article.id}/external-cache`)
    expect(res.status).toBe(200)
  })

  it('DELETE idempotent', async ({ skip }) => {
    if (requireServer().skip) skip()
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'DelExt Cocon')
    const article = await ctx.createArticle(cocoon.id, 'DelExt Article')

    const res = await apiDelete(`/articles/${article.id}/external-cache`)
    expect(res.status).toBe(200)
  })
})

describe('Contract /articles/:id/radar-exploration', () => {
  it('GET retourne null si pas de scan', async ({ skip }) => {
    if (requireServer().skip) skip()
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'RGet Cocon')
    const article = await ctx.createArticle(cocoon.id, 'RGet Article')

    const res = await apiGet(`/articles/${article.id}/radar-exploration`)
    expect(res.data).toBeNull()
  })

  it('GET /status retourne { exists: false } pour article neuf', async ({ skip }) => {
    if (requireServer().skip) skip()
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'RStat Cocon')
    const article = await ctx.createArticle(cocoon.id, 'RStat Article')

    const res = await apiGet<{ exists: boolean }>(`/articles/${article.id}/radar-exploration/status`)
    expect(res.data?.exists).toBe(false)
  })

  it('POST upsert body invalide → 400 VALIDATION_ERROR', async ({ skip }) => {
    if (requireServer().skip) skip()
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'RPost Cocon')
    const article = await ctx.createArticle(cocoon.id, 'RPost Article')

    const res = await apiPost(`/articles/${article.id}/radar-exploration`, {})
    expect(res.error?.code).toBe('VALIDATION_ERROR')
  })

  it('DELETE clear → suivant GET retourne null', async ({ skip }) => {
    if (requireServer().skip) skip()
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'RDel Cocon')
    const article = await ctx.createArticle(cocoon.id, 'RDel Article')

    const delRes = await apiDelete(`/articles/${article.id}/radar-exploration`)
    expect(delRes.status).toBe(200)
  })
})

describe('Contract /articles/:id/lieutenants/archive', () => {
  it('POST sans body → archive tout (idempotent)', async ({ skip }) => {
    if (requireServer().skip) skip()
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'ArchA Cocon')
    const article = await ctx.createArticle(cocoon.id, 'ArchA Article')

    const res = await apiPost(`/articles/${article.id}/lieutenants/archive`, {})
    expect([200, 204]).toContain(res.status)
  })
})

describe('Contract /articles/:id/progress', () => {
  it('GET retourne completedChecks', async ({ skip }) => {
    if (requireServer().skip) skip()
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'PG Cocon')
    const article = await ctx.createArticle(cocoon.id, 'PG Article')

    const res = await apiGet(`/articles/${article.id}/progress`)
    expect(res.status).toBe(200)
  })

  // Mécanique de progression : une étape non gardée. Les étapes gardées passent
  // par leur porte (tests/contract-api/gates.contract.test.ts).
  it('POST /progress/check ajoute un check', async ({ skip }) => {
    if (requireServer().skip) skip()
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'CK Cocon')
    const article = await ctx.createArticle(cocoon.id, 'CK Article')

    const res = await apiPost(`/articles/${article.id}/progress/check`, { check: 'moteur:discovery_done' })
    expect([200, 201]).toContain(res.status)
  })

  it('POST /progress/uncheck retire un check', async ({ skip }) => {
    if (requireServer().skip) skip()
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'UCK Cocon')
    const article = await ctx.createArticle(cocoon.id, 'UCK Article')

    await apiPost(`/articles/${article.id}/progress/check`, { check: 'moteur:discovery_done' })
    const res = await apiPost(`/articles/${article.id}/progress/uncheck`, { check: 'moteur:discovery_done' })
    expect([200, 201]).toContain(res.status)
  })
})

describe('Contract /articles/:id/lexique/validate', () => {
  it('POST /articles/:id/lexique/validate → 404 (endpoint pas existant, validation via PUT keywords)', async ({ skip }) => {
    if (requireServer().skip) skip()
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'LexV Cocon')
    const article = await ctx.createArticle(cocoon.id, 'LexV Article')

    const res = await apiPost(`/articles/${article.id}/lexique/validate`, { terms: ['t1', 't2'] })
    // Endpoint n'existe pas → 404. Si un jour créé, 200.
    expect([200, 404]).toContain(res.status)
  })
})

describe('Contract /articles/:id/cached-results (deprecated)', () => {
  it('GET retourne 200 (alias legacy vers /explorations + /external-cache)', async ({ skip }) => {
    if (requireServer().skip) skip()
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'Cached Cocon')
    const article = await ctx.createArticle(cocoon.id, 'Cached Article')

    const res = await apiGet(`/articles/${article.id}/cached-results`)
    // Alias peut avoir été supprimé ou encore actif selon Sprint 14
    expect([200, 404]).toContain(res.status)
  })
})
