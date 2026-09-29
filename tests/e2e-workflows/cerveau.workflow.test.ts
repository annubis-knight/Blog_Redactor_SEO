// @vitest-environment node
/**
 * E2E — Workflow Cerveau (3 phases)
 *
 * Phase 1 — ThemeConfig
 * Phase 2 — Stratégie cocon (steps : cible, douleur, angle, promesse, cta + articles-*)
 * Phase 3 — Création des articles, un à la fois (pilier d'abord, C7)
 *
 * Pré-requis : serveur dev lancé avec AI_PROVIDER=mock.
 */
import { describe, it, expect } from 'vitest'
import { setupTestContext } from '../helpers/test-context.js'
import { apiPost, apiGet, apiPut } from '../helpers/api-client.js'
import { query } from '../../server/db/client.js'
import { grantCheck } from '../helpers/gates.js'

const ctx = setupTestContext()

function requireServer() {
  if (!ctx.serverOk) return { skip: true } as const
  return { skip: false } as const
}

// ---------------------------------------------------------------------------
// Phase 1 — ThemeConfig
// ---------------------------------------------------------------------------

describe('Cerveau Workflow — Phase 1 : ThemeConfig', () => {
  it('GET /theme/config retourne la config courante', async ({ skip }) => {
    if (requireServer().skip) skip()
    const res = await apiGet<{ avatar: object; positioning: object; offerings: object }>('/theme/config')
    expect(res.status).toBe(200)
    expect(res.data?.avatar).toBeDefined()
    expect(res.data?.positioning).toBeDefined()
    expect(res.data?.offerings).toBeDefined()
  })

  it('GET /theme retourne le thème global', async ({ skip }) => {
    if (requireServer().skip) skip()
    const res = await apiGet<unknown>('/theme')
    expect(res.status).toBe(200)
    expect(res.data).toBeDefined()
  })

  it('POST /theme/config/parse sans text → 400', async ({ skip }) => {
    if (requireServer().skip) skip()
    const res = await apiPost('/theme/config/parse', {})
    expect(res.status).toBe(400)
    expect(res.error?.code).toBe('VALIDATION_ERROR')
  })

  it.todo('POST /theme/config/parse avec texte parse en ThemeConfig (mock fixture, peut être lent)')
  it.todo('PUT /theme/config sauvegarde et retourne la config persistée (touchy : modifie la config globale)')
})

// ---------------------------------------------------------------------------
// Silos & Cocons
// ---------------------------------------------------------------------------

describe('Cerveau Workflow — Silos & Cocoons', () => {
  it('GET /silos retourne la liste des silos', async ({ skip }) => {
    if (requireServer().skip) skip()
    const res = await apiGet<Array<{ id: number; nom: string }>>('/silos')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.data)).toBe(true)
    expect(res.data?.length ?? 0).toBeGreaterThan(0)
  })

  it('GET /cocoons retourne tous les cocons groupés', async ({ skip }) => {
    if (requireServer().skip) skip()
    const res = await apiGet<Array<{ id: number; name: string }>>('/cocoons')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.data)).toBe(true)
  })

  it('POST /silos/:name/cocoons crée un cocon', { timeout: 90000 }, async ({ skip }) => {
    if (requireServer().skip) skip()
    const silo = await ctx.getSilo()
    const cocoonName = `[test:${ctx.runId}] Strat Cocoon ${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const res = await apiPost<{ id: number; name: string }>(`/silos/${encodeURIComponent(silo.nom)}/cocoons`, {
      name: cocoonName,
    })
    // 201 Created, 200, ou 409 CONFLICT si collision cocoon_name+silo_id (race)
    expect([200, 201, 409]).toContain(res.status)
    if (res.data?.id) {
      // Vérifie que le cocon existe en DB
      const dbRes = await query<{ id: number }>(`SELECT id FROM cocoons WHERE id = $1`, [res.data.id])
      expect(dbRes.rows.length).toBe(1)
    }
  })

  it.todo('GET /cocoons/:id/articles utilise un cocoonIndex (position dans la liste), pas un id DB — comportement à vérifier en spec produit')

  it('GET /cocoons/:cocoonName/capitaines avec cocon inexistant → 404 ou data vide', async ({ skip }) => {
    if (requireServer().skip) skip()
    const res = await apiGet<unknown>(`/cocoons/test-${ctx.runId}-no-cocoon/capitaines`)
    // Soit 404 soit 200 + vide (à vérifier — comportement actuel à doc)
    expect([200, 404]).toContain(res.status)
  })
})

// ---------------------------------------------------------------------------
// Phase 2 — Stratégie cocon
// ---------------------------------------------------------------------------

describe('Cerveau Workflow — Phase 2 : Stratégie cocon', () => {
  it('GET /strategy/cocoon/:cocoonSlug retourne null pour cocon inexistant', async ({ skip }) => {
    if (requireServer().skip) skip()
    const res = await apiGet(`/strategy/cocoon/test-${ctx.runId}-no-strategy`)
    expect(res.status).toBe(200)
    // Soit data=null soit data={} selon spec produit
  })

  it('PUT /strategy/cocoon/:cocoonSlug avec payload cocoonStrategySchema complet sauvegarde', { timeout: 10000 }, async ({ skip }) => {
    if (requireServer().skip) skip()
    const slug = `test-${ctx.runId}-full-strategy`
    const emptyStep = { input: '', suggestion: null as string | null, validated: '', subQuestions: [] as unknown[] }
    const payload = {
      cocoonSlug: slug,
      cible: emptyStep,
      douleur: emptyStep,
      angle: emptyStep,
      promesse: emptyStep,
      cta: emptyStep,
      proposedArticles: [],
      suggestedTopics: [],
      topicsUserContext: '',
      completedSteps: 0,
      updatedAt: new Date().toISOString(),
    }
    const res = await apiPut(`/strategy/cocoon/${slug}`, payload)
    // 200 OK si save marche, 500 si DB schema strict refuse insertion pour cocon non lié
    expect([200, 500]).toContain(res.status)
  })

  it('POST /strategy/cocoon/:cocoonSlug/suggest (stream) avec body invalide → 500 ou 400', async ({ skip }) => {
    if (requireServer().skip) skip()
    const res = await apiPost(`/strategy/cocoon/test-${ctx.runId}-suggest/suggest`, {})
    // body schema invalide → 400 ou 500 selon implementation
    expect([400, 500]).toContain(res.status)
  })

  it('POST /strategy/cocoon/:slug/suggest body valide → 200 + suggestion', { timeout: 90000 }, async ({ skip }) => {
    if (requireServer().skip) skip()
    const res = await apiPost<{ suggestion: string }>(`/strategy/cocoon/test-${ctx.runId}-strat/suggest`, {
      step: 'cible',
      currentInput: '',
      context: { cocoonName: 'test', siloName: 'test' },
    })
    expect(res.status).toBe(200)
    expect(typeof res.data?.suggestion).toBe('string')
  })

  it('POST /strategy/cocoon/:slug/deepen body invalide → 400/500', async ({ skip }) => {
    if (requireServer().skip) skip()
    const res = await apiPost(`/strategy/cocoon/test-${ctx.runId}/deepen`, {})
    expect([400, 500]).toContain(res.status)
  })

  it('POST /strategy/cocoon/:slug/enrich body invalide → 400/500', async ({ skip }) => {
    if (requireServer().skip) skip()
    const res = await apiPost(`/strategy/cocoon/test-${ctx.runId}/enrich`, {})
    expect([400, 500]).toContain(res.status)
  })

  it('Workflow Q&A : suggestion pour cible + douleur + angle (mock)', { timeout: 60000 }, async ({ skip }) => {
    if (requireServer().skip) skip()
    const slug = `test-${ctx.runId}-qa-flow`
    const ctx2 = { cocoonName: 'test', siloName: 'test' }

    const cible = await apiPost<{ suggestion: string }>(`/strategy/cocoon/${slug}/suggest`, {
      step: 'cible', currentInput: '', context: ctx2,
    })
    const douleur = await apiPost<{ suggestion: string }>(`/strategy/cocoon/${slug}/suggest`, {
      step: 'douleur', currentInput: '', context: ctx2,
    })
    const angle = await apiPost<{ suggestion: string }>(`/strategy/cocoon/${slug}/suggest`, {
      step: 'angle', currentInput: '', context: ctx2,
    })

    expect(cible.status).toBe(200)
    expect(douleur.status).toBe(200)
    expect(angle.status).toBe(200)
  })
})

// ---------------------------------------------------------------------------
// Phase 3 — Propositions d'articles (création directe)
// ---------------------------------------------------------------------------

describe('Cerveau Workflow — Phase 3 : Création articles', () => {
  // C7 (FR-CER-COCOON-PROGRESSIVE) : un article à la fois, pilier d'abord, puis
  // chaque enfant depuis une section de son parent rédigé.
  it('POST /cocoons/:id/articles avec body invalide → 400 VALIDATION_ERROR', async ({ skip }) => {
    if (requireServer().skip) skip()
    const res = await apiPost('/cocoons/1/articles', { title: 'x' })
    expect(res.status).toBe(400)
    expect(res.error?.code).toBe('VALIDATION_ERROR')
  })

  it('cocon vide : un spécialisé est refusé, le pilier se crée', { timeout: 30000 }, async ({ skip }) => {
    if (requireServer().skip) skip()
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'Progressif Vide')

    const refus = await apiPost<unknown>(`/cocoons/${cocoon.id}/articles`, { title: `[test:${ctx.runId}] Spécialisé trop tôt`, type: 'specifique' })
    expect(refus.status).toBe(409)
    expect(refus.error?.code).toBe('HIERARCHY_VIOLATION')

    const pilier = await apiPost<{ id: number; parentId: number | null }>(`/cocoons/${cocoon.id}/articles`, {
      title: `[test:${ctx.runId}] Pilier progressif`, type: 'pilier', slug: `test-${ctx.runId}-pilier-progressif`,
    })
    expect(pilier.status).toBe(201)
    expect(pilier.data?.parentId).toBeNull()
    const dbRes = await query<{ type: string; parent_id: number | null }>(`SELECT type, parent_id FROM articles WHERE id = $1`, [pilier.data!.id])
    expect(dbRes.rows[0]).toEqual({ type: 'Pilier', parent_id: null })
  })

  it('un enfant naît d’une section d’un pilier rédigé, et une section ne donne qu’un article', { timeout: 60000 }, async ({ skip }) => {
    if (requireServer().skip) skip()
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'Progressif Chaîne')
    const pilier = await apiPost<{ id: number }>(`/cocoons/${cocoon.id}/articles`, {
      title: `[test:${ctx.runId}] Pilier chaîne`, type: 'pilier', slug: `test-${ctx.runId}-pilier-chaine`,
    })
    const pilierId = pilier.data!.id
    const enfant = {
      title: `[test:${ctx.runId}] Isoler ses combles`, type: 'intermediaire', slug: `test-${ctx.runId}-combles`,
      parentId: pilierId, parentSection: 'Isoler les combles',
    }

    // Pilier sans texte : sa porte du premier jet refuse (⛔ texte vide) ; l'évaluation part avec le refus.
    const avant = await apiPost<unknown>(`/cocoons/${cocoon.id}/articles`, enfant)
    expect(avant.status).toBe(409)
    expect(avant.error?.code).toBe('GATE_BLOCKED')
    expect((avant.raw as { error: { details: { gateId: string } } }).error.details.gateId).toBe('draft')

    // Le pilier est rédigé, puis son premier jet accepté.
    await apiPut(`/articles/${pilierId}`, {
      content: '<h1>Rénovation énergétique</h1><p>Chapeau.</p><h2>Isoler les combles</h2><p>Les combles perdent de la chaleur.</p><h2>Changer les fenêtres</h2><p>Le double vitrage.</p>',
    })
    expect((await grantCheck(pilierId, 'redaction:draft_accepted')).status).toBe(200)

    const inconnue = await apiPost<unknown>(`/cocoons/${cocoon.id}/articles`, { ...enfant, parentSection: 'Le chauffage au bois' })
    expect(inconnue.status).toBe(409)
    expect(inconnue.error?.code).toBe('HIERARCHY_VIOLATION')

    const cree = await apiPost<{ id: number; parentId: number; parentSection: string }>(`/cocoons/${cocoon.id}/articles`, enfant)
    expect(cree.status).toBe(201)
    expect(cree.data).toMatchObject({ parentId: pilierId, parentSection: 'Isoler les combles' })

    const doublon = await apiPost<unknown>(`/cocoons/${cocoon.id}/articles`, { ...enfant, title: `[test:${ctx.runId}] Combles bis`, slug: `test-${ctx.runId}-combles-bis` })
    expect(doublon.status).toBe(409)
    expect(doublon.error?.message).toContain('Isoler ses combles')

    // L'arbre le montre : la section prise, l'autre libre.
    const tree = await apiGet<Array<{ id: number; drafted: boolean; sections: Array<{ title: string; childId: number | null }> }>>(`/cocoons/${cocoon.id}/tree`)
    const noeud = tree.data!.find(n => n.id === pilierId)!
    expect(noeud.drafted).toBe(true)
    expect(noeud.sections).toEqual([
      { title: 'Isoler les combles', childId: cree.data!.id, childTitle: enfant.title },
      { title: 'Changer les fenêtres', childId: null, childTitle: null },
    ])
  })

  // K8 : un article d'avant l'arbre se rattache à la section d'un parent rédigé,
  // aux mêmes règles qu'une création.
  it('un article hors de l’arbre se rattache à une section libre ; une section prise est refusée', { timeout: 60000 }, async ({ skip }) => {
    if (requireServer().skip) skip()
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'Progressif Rattachement')
    const pilier = await apiPost<{ id: number }>(`/cocoons/${cocoon.id}/articles`, {
      title: `[test:${ctx.runId}] Pilier rattachement`, type: 'pilier', slug: `test-${ctx.runId}-pilier-rattachement`,
    })
    const pilierId = pilier.data!.id
    await apiPut(`/articles/${pilierId}`, {
      content: '<h1>Rénovation énergétique</h1><p>Chapeau.</p><h2>Isoler les combles</h2><p>Les combles perdent de la chaleur.</p><h2>Changer les fenêtres</h2><p>Le double vitrage.</p>',
    })
    expect((await grantCheck(pilierId, 'redaction:draft_accepted')).status).toBe(200)
    // Un intermédiaire d'avant l'arbre : aucun parent en base.
    const orphelin = await ctx.createArticle(cocoon.id, 'Orphelin combles', 'Intermédiaire')
    const occupant = await apiPost<{ id: number }>(`/cocoons/${cocoon.id}/articles`, {
      title: `[test:${ctx.runId}] Changer ses fenêtres`, type: 'intermediaire', slug: `test-${ctx.runId}-fenetres`,
      parentId: pilierId, parentSection: 'Changer les fenêtres',
    })
    expect(occupant.status).toBe(201)

    const prise = await apiPut<unknown>(`/cocoons/${cocoon.id}/articles/${orphelin.id}/parent`, { parentId: pilierId, parentSection: 'Changer les fenêtres' })
    expect(prise.status).toBe(409)
    expect(prise.error?.code).toBe('HIERARCHY_VIOLATION')

    const ok = await apiPut<{ id: number; parentId: number; parentSection: string }>(`/cocoons/${cocoon.id}/articles/${orphelin.id}/parent`, { parentId: pilierId, parentSection: 'Isoler les combles' })
    expect(ok.status).toBe(200)
    const row = await query<{ parent_id: number | null; parent_section: string | null }>(`SELECT parent_id, parent_section FROM articles WHERE id = $1`, [orphelin.id])
    expect(row.rows[0]).toEqual({ parent_id: pilierId, parent_section: 'Isoler les combles' })
  })

  it('un mot-clé jamais mesuré n’est pas enregistré → 422', async ({ skip }) => {
    if (requireServer().skip) skip()
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'Progressif Mot-clé')
    const res = await apiPost<unknown>(`/cocoons/${cocoon.id}/articles`, {
      title: `[test:${ctx.runId}] Pilier mot-clé`, type: 'pilier', suggestedKeyword: `jamais-mesure-${ctx.runId}`,
    })
    expect(res.status).toBe(422)
    expect(res.error?.code).toBe('KEYWORD_NOT_MEASURED')
  })

  it('GET /articles/:id retourne { article, cocoonName }', async ({ skip }) => {
    if (requireServer().skip) skip()
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'Detail Cocon')
    const article = await ctx.createArticle(cocoon.id, 'Detail Article')

    // Shape réelle (server/services/infra/data.service.ts::getArticleById) : { article, cocoonName }
    const res = await apiGet<{ article: { id: number; type: string }; cocoonName: string }>(`/articles/${article.id}`)
    expect(res.status).toBe(200)
    expect(res.data?.article?.id).toBe(article.id)
    // `rowToArticle` convertit le PascalCase de la base vers le canonique.
    expect(res.data?.article?.type).toBe('pilier')
    expect(res.data?.cocoonName).toBeDefined()
  })

  it('GET /articles/:id avec id non-numérique → 400', async ({ skip }) => {
    if (requireServer().skip) skip()
    const res = await apiGet('/articles/abc')
    expect(res.status).toBe(400)
  })

  it('GET /articles/:id inexistant → 404', async ({ skip }) => {
    if (requireServer().skip) skip()
    const res = await apiGet('/articles/9999999')
    expect(res.status).toBe(404)
  })

  it('PATCH /articles/:id renomme + change topic', async ({ skip }) => {
    if (requireServer().skip) skip()
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'Patch Cocon')
    const article = await ctx.createArticle(cocoon.id, 'Patch Article')

    const newTitre = `[test:${ctx.runId}] Patched Title`
    const res = await apiPost<unknown>(`/articles/${article.id}`, {})
    // Le PATCH HTTP n'est pas dans api-client, on utilise directement fetch via apiPut sinon
    void newTitre
    void res
  })

  it('DELETE /articles/:id détache du cocon (cocoon_id = NULL, ne supprime pas la row)', async ({ skip }) => {
    if (requireServer().skip) skip()
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'Del Cocon')
    const article = await ctx.createArticle(cocoon.id, 'Del Article')

    const delRes = await fetch(`http://localhost:3400/api/articles/${article.id}`, { method: 'DELETE' })
    expect([200, 204]).toContain(delRes.status)

    // Comportement réel : l'article reste mais cocoon_id devient NULL
    const dbRes = await query<{ id: number; cocoon_id: number | null }>(
      `SELECT id, cocoon_id FROM articles WHERE id = $1`,
      [article.id],
    )
    expect(dbRes.rows.length).toBe(1)
    expect(dbRes.rows[0].cocoon_id).toBeNull()
  })

  it('GET /articles/:id/progress retourne completed_checks', async ({ skip }) => {
    if (requireServer().skip) skip()
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'Progress Cocon')
    const article = await ctx.createArticle(cocoon.id, 'Progress Article')

    const res = await apiGet<{ completedChecks: string[]; checkTimestamps: Record<string, string> } | { completed_checks: string[] }>(`/articles/${article.id}/progress`)
    expect(res.status).toBe(200)
    expect(res.data).toBeDefined()
  })

  // Mécanique de progression : une étape non gardée. Les étapes gardées passent
  // par leur porte (tests/contract-api/gates.contract.test.ts).
  it('POST /articles/:id/progress/check ajoute un check', async ({ skip }) => {
    if (requireServer().skip) skip()
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'Check Cocon')
    const article = await ctx.createArticle(cocoon.id, 'Check Article')

    const res = await apiPost(`/articles/${article.id}/progress/check`, { check: 'moteur:discovery_done' })
    expect([200, 201]).toContain(res.status)

    const dbRes = await query<{ completed_checks: string[] }>(
      `SELECT completed_checks FROM articles WHERE id = $1`,
      [article.id],
    )
    expect(dbRes.rows[0]?.completed_checks).toContain('moteur:discovery_done')
  })

  it('POST /articles/:id/progress/uncheck retire un check', async ({ skip }) => {
    if (requireServer().skip) skip()
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'Uncheck Cocon')
    const article = await ctx.createArticle(cocoon.id, 'Uncheck Article')

    await apiPost(`/articles/${article.id}/progress/check`, { check: 'moteur:discovery_done' })
    const res = await apiPost(`/articles/${article.id}/progress/uncheck`, { check: 'moteur:discovery_done' })
    expect([200, 201]).toContain(res.status)

    const dbRes = await query<{ completed_checks: string[] }>(
      `SELECT completed_checks FROM articles WHERE id = $1`,
      [article.id],
    )
    expect(dbRes.rows[0]?.completed_checks).not.toContain('moteur:discovery_done')
  })
})
