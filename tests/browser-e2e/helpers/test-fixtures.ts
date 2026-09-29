/**
 * Helpers Playwright : extension du `test` standard pour ajouter des fixtures
 * partagées (création de cocon/article via API directe avant le test browser,
 * cleanup en teardown).
 *
 * Deux pièges que ce socle absorbe (relevé 2026-09-23, cf.
 * tech-spec-parcours-8-temps § « Cartographie ») :
 *
 *   1. L'identifiant de l'URL `/cocoon/:id/...` est l'**index** du cocon dans
 *      `GET /api/cocoons` (`data.service.ts` réécrit `id: globalCocoonIndex++`),
 *      pas la clé primaire PostgreSQL. Les tests visitaient donc un cocon
 *      quelconque — d'où les nombreuses gardes `if (count > 0)` qui rendaient
 *      les assertions inopérantes. `TestArticle.cocoonId` porte désormais
 *      l'index ; la clé primaire reste disponible via `cocoonDbId`.
 *
 *   2. La barre du haut du Moteur (`MoteurContextRecap`) liste les articles de
 *      la **stratégie du cocon** (`cocoon_strategies.data.proposedArticles`),
 *      pas ceux de la table `articles`. Sans stratégie, aucun article n'est
 *      sélectionnable et la navigation du Moteur n'est jamais rendue.
 */
import { test as base } from '@playwright/test'
import { query, pool } from '../../../server/db/client.js'
import { setMockMode } from './runtime-mode.js'

const TEST_PREFIX = '[browser:'
const API = process.env.TEST_BASE_URL ?? `http://localhost:${process.env.PORT ?? 3400}/api`

/** Type d'article tel que stocké en base. */
type ArticleType = 'Pilier' | 'Intermédiaire' | 'Spécialisé'

/** Forme attendue par la stratégie du cocon (minuscules, sans accent). */
const STRATEGY_TYPE: Record<ArticleType, string> = {
  'Pilier': 'pilier',
  'Intermédiaire': 'intermediaire',
  'Spécialisé': 'specifique',
}

export interface TestArticle {
  id: number
  titre: string
  /** Index du cocon dans `GET /api/cocoons` — celui qui va dans l'URL. */
  cocoonId: number
  /** Clé primaire PostgreSQL du cocon (SQL direct uniquement). */
  cocoonDbId: number
  slug: string
  type: ArticleType
  /** Mot-clé suggéré inscrit dans la stratégie, `null` si l'article n'en a pas. */
  suggestedKeyword: string | null
}

interface CreateArticleOptions {
  /**
   * Faux pour un article sans mot-clé suggéré : le Capitaine n'a alors aucune
   * entrée à valider et affiche son état vide. Vrai par défaut, parce qu'un
   * article issu du Cerveau arrive toujours avec sa proposition.
   */
  withKeyword?: boolean
}

export interface BrowserCtx {
  runId: string
  apiUrl: string
  /** Nom du cocon de ce test, étiqueté `[browser:<runId>]`. */
  cocoonName: string
  /**
   * Crée un article de test, l'inscrit dans la stratégie du cocon (donc
   * sélectionnable dans la barre du haut) et renvoie l'index de cocon à
   * utiliser dans l'URL.
   */
  createArticle: (base?: string, type?: ArticleType, opts?: CreateArticleOptions) => Promise<TestArticle>
}

/** Étape vide de la stratégie — `validated` est un texte, pas un booléen. */
function emptyStep() {
  return { input: '', suggestion: null, validated: '' }
}

export const test = base.extend<{ ctx: BrowserCtx }>({
  // Playwright fixture: the empty destructuring is required by the API

  ctx: async ({}, use, testInfo) => {
    const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const tagged = (b: string) => `${TEST_PREFIX}${runId}] ${b}`

    // Sources externes simulées : un test navigateur ne dépense jamais un centime.
    await setMockMode('mock')

    // Récupère un silo existant
    const siloRes = await query<{ id: number }>(
      `SELECT id FROM silos WHERE nom NOT LIKE $1 ORDER BY id LIMIT 1`,
      [`${TEST_PREFIX}%`],
    )
    if (siloRes.rows.length === 0) throw new Error('No silo available for browser tests — seed the DB first')
    const siloId = siloRes.rows[0].id

    // Crée un cocon pour ce test
    const cocoonName = tagged('Cocon')
    const cocoonRes = await query<{ id: number }>(
      `INSERT INTO cocoons (nom, silo_id) VALUES ($1, $2) RETURNING id`,
      [cocoonName, siloId],
    )
    const cocoonDbId = cocoonRes.rows[0].id

    /** Résout l'index du cocon tel que l'URL l'attend. */
    const resolveCocoonIndex = async (): Promise<number> => {
      const res = await fetch(`${API}/cocoons`)
      const json = await res.json().catch(() => null)
      const cocoons = (json?.data ?? []) as Array<{ id: number; name: string }>
      const found = cocoons.find(c => c.name === cocoonName)
      if (!found) throw new Error(`cocon « ${cocoonName} » absent de GET /api/cocoons`)
      return found.id
    }

    const created: TestArticle[] = []

    /** (Ré)écrit la stratégie du cocon avec tous les articles créés jusqu'ici. */
    const syncStrategy = async (): Promise<void> => {
      const pilier = created.find(a => a.type === 'Pilier')
      const strategy = {
        cocoonSlug: cocoonName,
        cible: emptyStep(),
        douleur: emptyStep(),
        angle: emptyStep(),
        promesse: emptyStep(),
        cta: emptyStep(),
        suggestedTopics: [],
        topicsUserContext: '',
        completedSteps: 6,
        updatedAt: new Date().toISOString(),
        proposedArticles: created.map(a => ({
          id: `${runId}-${a.id}`,
          title: a.titre,
          suggestedTitles: [],
          type: STRATEGY_TYPE[a.type],
          parentTitle: a.type === 'Pilier' ? null : (pilier?.titre ?? null),
          rationale: 'Article de test navigateur',
          painPoint: `Point de douleur de test pour ${a.titre}`,
          painIntentExpected: 'commercial',
          // La stratégie attend un texte (`z.string()`), jamais null :
          // l'absence de mot-clé s'y écrit chaîne vide.
          suggestedKeyword: a.suggestedKeyword ?? '',
          suggestedKeywords: [],
          suggestedSlug: a.slug,
          suggestedSlugs: [],
          validatedSearchQuery: null,
          keywordValidated: false,
          searchQueryValidated: false,
          titleValidated: false,
          accepted: true,
          createdInDb: true,
          dbId: a.id,
        })),
      }
      const res = await fetch(`${API}/strategy/cocoon/${encodeURIComponent(cocoonName)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(strategy),
      })
      if (!res.ok) throw new Error(`stratégie du cocon non enregistrée (HTTP ${res.status})`)
    }

    const ctx: BrowserCtx = {
      runId,
      apiUrl: API,
      cocoonName,
      createArticle: async (b = 'Article', type: ArticleType = 'Pilier', opts: CreateArticleOptions = {}) => {
        const titre = tagged(b)
        const slug = `browser-${runId}-${b.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`
        const suggestedKeyword = opts.withKeyword === false ? null : `test-${runId}-kw ${slug}`
        for (let attempt = 0; attempt < 5; attempt++) {
          const maxRes = await query<{ max: number | null }>(`SELECT COALESCE(MAX(id), 0) AS max FROM articles`)
          const nextId = (maxRes.rows[0].max ?? 0) + 1 + attempt
          try {
            await query(
              `INSERT INTO articles (id, titre, cocoon_id, slug, type, status, phase, completed_checks, check_timestamps)
               VALUES ($1, $2, $3, $4, $5, 'à rédiger', 'proposed', ARRAY[]::TEXT[], '{}'::jsonb)`,
              [nextId, titre, cocoonDbId, slug, type],
            )
            const article: TestArticle = {
              id: nextId,
              titre,
              cocoonId: await resolveCocoonIndex(),
              cocoonDbId,
              slug,
              type,
              suggestedKeyword,
            }
            created.push(article)
            await syncStrategy()
            return article
          } catch (err) {
            if (!/articles_pkey|articles_slug_key/.test((err as Error).message)) throw err
          }
        }
        throw new Error('createArticle failed after 5 retries')
      },
    }

    await use(ctx)

    // Cleanup (cocoon_strategies part en cascade avec le cocon)
    const pattern = `${TEST_PREFIX}${runId}]%`
    try {
      // C7 : les enfants créés par le produit (titre sans étiquette) empêcheraient
      // de supprimer leur parent (ON DELETE RESTRICT) : détachés d'abord, puis
      // supprimés avec leur cocon de test au lieu d'y rester orphelins.
      const inTestCocoon = `cocoon_id IN (SELECT id FROM cocoons WHERE nom LIKE $1)`
      await query(`UPDATE articles SET parent_id = NULL WHERE parent_id IN (SELECT id FROM articles WHERE titre LIKE $1 OR ${inTestCocoon})`, [pattern])
      await query(`DELETE FROM articles WHERE titre LIKE $1 OR ${inTestCocoon}`, [pattern])
      await query(`DELETE FROM cocoons WHERE nom LIKE $1`, [pattern])
    } catch (err) {
      console.warn(`[browser-test cleanup] ${(err as Error).message}`)
    }
    await setMockMode(null).catch(() => {})

    void testInfo
  },
})

export { expect } from '@playwright/test'

/** À appeler dans globalTeardown pour fermer le pool pg proprement */
export async function closeDbPool() {
  await pool.end()
}
