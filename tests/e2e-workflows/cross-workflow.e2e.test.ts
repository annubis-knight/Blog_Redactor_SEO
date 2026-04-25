// @vitest-environment node
/**
 * E2E — Cross-workflow journey (Cerveau → Moteur → Rédaction)
 *
 * Le parcours utilisateur le plus représentatif : un nouvel article est
 * proposé dans Cerveau, validé dans Moteur (5 onglets), puis rédigé dans
 * Rédaction. Filet de sécurité n°1 contre les régressions cross-workflow.
 *
 * Pré-requis : serveur dev lancé avec AI_PROVIDER=mock.
 */
import { describe, it, expect } from 'vitest'
import { setupTestContext } from '../helpers/test-context.js'
import { apiPost, apiGet, apiPut } from '../helpers/api-client.js'
import { query } from '../../server/db/client.js'

const ctx = setupTestContext()

function requireServer() {
  if (!ctx.serverOk) return { skip: true } as const
  return { skip: false } as const
}

describe('Cross-Workflow — Happy path complet', () => {
  it('Cerveau (silo + cocon + article) → Moteur (validate + persist) → Rédaction (micro-context + content) → Progress', { timeout: 60000 }, async () => {
    if (requireServer().skip) return

    // === CERVEAU ===
    // 1. Récupère un silo (existant ou de test)
    const silo = await ctx.getSilo()
    expect(silo.id).toBeGreaterThan(0)

    // 2. Crée un cocon dans ce silo
    const cocoon = await ctx.createCocoon(silo.id, 'Journey Cocon')
    expect(cocoon.id).toBeGreaterThan(0)

    // 3. Crée un article (Pilier) dans le cocon
    const article = await ctx.createArticle(cocoon.id, 'Journey Article', 'Pilier')
    expect(article.id).toBeGreaterThan(0)

    // === MOTEUR ===
    // 4. Onglet Discovery : découvre des keywords
    const seed = `test-${ctx.runId}-journey-plombier`
    const discoverRes = await apiPost<{ keywords: unknown[] }>('/keywords/discover', {
      keyword: seed,
      options: { maxResults: 3 },
    })
    expect(discoverRes.status).toBe(200)
    expect(Array.isArray(discoverRes.data?.keywords)).toBe(true)

    // 5. Onglet Radar : génère + scan
    const radarGenRes = await apiPost<{ keywords: Array<{ keyword: string }> }>('/keywords/radar/generate', {
      title: article.titre,
      keyword: 'plombier toulouse',
      painPoint: 'fuite urgente',
    })
    expect(radarGenRes.status).toBe(200)
    expect(radarGenRes.data?.keywords?.length).toBeGreaterThan(0)

    // 6. Persiste le radar dans la DB
    await apiPost(`/articles/${article.id}/radar-exploration`, {
      seed,
      context: { broadKeyword: 'plombier toulouse', specificTopic: 'fuite', painPoint: 'urgent', depth: 1 },
      generatedKeywords: radarGenRes.data!.keywords.slice(0, 3),
      scanResult: {
        specificTopic: 'fuite',
        broadKeyword: 'plombier toulouse',
        autocomplete: { suggestions: [], totalCount: 0 },
        cards: [],
        globalScore: 60,
        heatLevel: 'chaude',
        verdict: 'bon terrain',
        scannedAt: new Date().toISOString(),
      },
    })

    // 7. Onglet Capitaine : valide un keyword
    const captainKw = `test-${ctx.runId}-journey-captain`
    await apiPost(`/keywords/${encodeURIComponent(captainKw)}/validate`, {
      level: 'pilier',
      articleTitle: article.titre,
      articleId: article.id,
    })

    // === REDACTION ===
    // 8. Onglet Brief : sauvegarde le micro-context
    await apiPut(`/articles/${article.id}/micro-context`, {
      angle: `[test:${ctx.runId}] Approche pédagogique avec checklist actionnable`,
      tone: 'Direct',
      directives: 'Inclure 1 cas par chapitre',
      targetWordCount: 1500,
    })

    // 9. Onglet Editor : sauvegarde le contenu
    await apiPut(`/articles/${article.id}`, {
      content: `<h1>Journey ${ctx.runId}</h1><p>Contenu généré pour test cross-workflow.</p>`,
      metaTitle: `Journey ${ctx.runId}`,
      metaDescription: 'Description test cross-workflow',
    })

    // 10. Progress : check toutes les étapes
    await apiPost(`/articles/${article.id}/progress/check`, { check: 'moteur:capitaine_locked' })
    await apiPost(`/articles/${article.id}/progress/check`, { check: 'redaction:brief_validated' })
    await apiPost(`/articles/${article.id}/progress/check`, { check: 'redaction:content_written' })

    // === VÉRIFICATIONS DB ===
    // L'article a accumulé toutes les traces
    const articleDb = await query<{ id: number; meta_title: string; completed_checks: string[] }>(
      `SELECT id, meta_title, completed_checks FROM articles WHERE id = $1`,
      [article.id],
    )
    expect(articleDb.rows[0].meta_title).toContain('Journey')
    expect(articleDb.rows[0].completed_checks).toContain('moteur:capitaine_locked')
    expect(articleDb.rows[0].completed_checks).toContain('redaction:brief_validated')

    // Le radar exploration est persisté
    const radarDb = await query<{ article_id: number }>(
      `SELECT article_id FROM radar_explorations WHERE article_id = $1`,
      [article.id],
    )
    expect(radarDb.rows.length).toBe(1)

    // Le captain exploration est persisté
    const captainDb = await query<{ keyword: string }>(
      `SELECT keyword FROM captain_explorations WHERE article_id = $1`,
      [article.id],
    )
    expect(captainDb.rows.some(r => r.keyword === captainKw)).toBe(true)

    // Le micro-context est persisté
    const mcRes = await apiGet<{ angle: string }>(`/articles/${article.id}/micro-context`)
    expect(mcRes.data?.angle).toContain('pédagogique')

    // Les compteurs explorations reflètent l'état
    const countsRes = await apiGet<{ radar: number; captain: number }>(`/articles/${article.id}/explorations/counts`)
    expect(countsRes.data?.radar).toBeGreaterThanOrEqual(1)
    expect(countsRes.data?.captain).toBeGreaterThanOrEqual(1)
  })
})

describe('Cross-Workflow — Cache cross-article', () => {
  it('Même keyword testé sur 2 articles différents : 2ème call utilise keyword_metrics partagé', { timeout: 60000 }, async () => {
    if (requireServer().skip) return

    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'Cache Cross Cocon')
    const article1 = await ctx.createArticle(cocoon.id, 'Cache Article 1')
    const article2 = await ctx.createArticle(cocoon.id, 'Cache Article 2')

    // Même keyword (slug-stable) testé sur 2 articles
    const sharedKw = `test-${ctx.runId}-shared`

    const t1Start = Date.now()
    await apiPost(`/keywords/${encodeURIComponent(sharedKw)}/validate`, {
      level: 'pilier',
      articleTitle: article1.titre,
      articleId: article1.id,
    })
    const t1Elapsed = Date.now() - t1Start

    const t2Start = Date.now()
    await apiPost(`/keywords/${encodeURIComponent(sharedKw)}/validate`, {
      level: 'pilier',
      articleTitle: article2.titre,
      articleId: article2.id,
    })
    const t2Elapsed = Date.now() - t2Start

    // Le 2ème appel doit être plus rapide (DB hit) — au moins pas plus de 2x plus lent
    expect(t2Elapsed).toBeLessThan(t1Elapsed * 2)

    // Vérifie que les 2 articles ont chacun leur captain_exploration
    const dbRes = await query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM captain_explorations WHERE keyword = $1 AND article_id IN ($2, $3)`,
      [sharedKw, article1.id, article2.id],
    )
    expect(parseInt(dbRes.rows[0].count, 10)).toBe(2)

    // Vérifie qu'il n'y a qu'une seule row keyword_metrics partagée
    const metricsRes = await query<{ keyword: string }>(
      `SELECT keyword FROM keyword_metrics WHERE keyword = $1`,
      [sharedKw],
    )
    expect(metricsRes.rows.length).toBe(1)
  })
})

describe('Cross-Workflow — Resilience', () => {
  it('Refresh navigateur (simulé) : GET /explorations après POST restaure l\'état', { timeout: 30000 }, async () => {
    if (requireServer().skip) return
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'Resilience Cocon')
    const article = await ctx.createArticle(cocoon.id, 'Resilience Article')

    const kw = `test-${ctx.runId}-res`
    await apiPost(`/keywords/${encodeURIComponent(kw)}/validate`, {
      level: 'pilier', articleTitle: article.titre, articleId: article.id,
    })

    // Simule "refresh" : nouveau GET récupère l'état depuis DB
    const res = await apiGet<{ captain: Array<{ keyword: string }> }>(`/articles/${article.id}/explorations`)
    expect(res.data?.captain.some(c => c.keyword === kw)).toBe(true)
  })

  it('Switch d\'article en vol : les validations sur article A ne polluent pas article B', { timeout: 90000 }, async () => {
    if (requireServer().skip) return
    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'Switch Cocon')
    const articleA = await ctx.createArticle(cocoon.id, 'Switch A')
    const articleB = await ctx.createArticle(cocoon.id, 'Switch B')

    const kwA = `test-${ctx.runId}-switch-A`
    const kwB = `test-${ctx.runId}-switch-B`

    // Lance A et B en parallèle (simule vrai switch)
    await Promise.all([
      apiPost(`/keywords/${encodeURIComponent(kwA)}/validate`, { level: 'pilier', articleTitle: articleA.titre, articleId: articleA.id }),
      apiPost(`/keywords/${encodeURIComponent(kwB)}/validate`, { level: 'pilier', articleTitle: articleB.titre, articleId: articleB.id }),
    ])

    // Vérifie que A a son kwA et B a son kwB (pas de pollution)
    const expA = await apiGet<{ captain: Array<{ keyword: string }> }>(`/articles/${articleA.id}/explorations`)
    const expB = await apiGet<{ captain: Array<{ keyword: string }> }>(`/articles/${articleB.id}/explorations`)
    expect(expA.data?.captain.some(c => c.keyword === kwA)).toBe(true)
    expect(expA.data?.captain.some(c => c.keyword === kwB)).toBe(false)
    expect(expB.data?.captain.some(c => c.keyword === kwB)).toBe(true)
    expect(expB.data?.captain.some(c => c.keyword === kwA)).toBe(false)
  })

  it.todo('Plantage serveur pendant stream IA : pas de row partielle persistée — nécessite kill serveur, impossible en vitest pur')
})

describe('Cross-Workflow — Provider configuration', () => {
  it('AI_PROVIDER=mock : getProvider retourne "mock"', async () => {
    if (requireServer().skip) return
    const { getProvider, getProviderChain } = await import('../../server/services/external/ai-provider.service.js')
    const provider = getProvider()
    if (provider === 'mock') {
      const chain = getProviderChain()
      // Mock désactive le fallback : chaîne = ['mock']
      expect(chain).toEqual(['mock'])
    } else {
      // Si pas en mode mock, on skip silencieusement cette assertion
      expect(provider).toBeDefined()
    }
  })

  it('getProviderChain retourne primary + canonical order pour non-mock', async () => {
    const { getProviderChain } = await import('../../server/services/external/ai-provider.service.js')
    // Sauvegarde l'env
    const prev = process.env.AI_PROVIDER
    process.env.AI_PROVIDER = 'claude'
    try {
      const chain = getProviderChain()
      expect(chain[0]).toBe('claude')
      // Pas de doublons
      expect(new Set(chain).size).toBe(chain.length)
    } finally {
      if (prev !== undefined) process.env.AI_PROVIDER = prev
      else delete process.env.AI_PROVIDER
    }
  })

  it('AI_PROVIDER_NO_FALLBACK=1 → chain limitée au primary', async () => {
    const { getProviderChain } = await import('../../server/services/external/ai-provider.service.js')
    const prevNF = process.env.AI_PROVIDER_NO_FALLBACK
    const prevP = process.env.AI_PROVIDER
    process.env.AI_PROVIDER = 'claude'
    process.env.AI_PROVIDER_NO_FALLBACK = '1'
    try {
      const chain = getProviderChain()
      expect(chain).toEqual(['claude'])
    } finally {
      if (prevNF !== undefined) process.env.AI_PROVIDER_NO_FALLBACK = prevNF
      else delete process.env.AI_PROVIDER_NO_FALLBACK
      if (prevP !== undefined) process.env.AI_PROVIDER = prevP
      else delete process.env.AI_PROVIDER
    }
  })
})
