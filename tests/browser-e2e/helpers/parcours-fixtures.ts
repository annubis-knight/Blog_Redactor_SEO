/**
 * Socle des parcours « 8 temps » (tech-spec-parcours-8-temps).
 *
 * Crée, pour un fichier de test, un cocon isolé avec sa stratégie et ses trois
 * articles (Pilier, Intermédiaire, Spécifique), puis les rend sélectionnables
 * dans la barre du haut du Moteur. Tout est étiqueté `[test:<runId>]` et
 * supprimé en fin de fichier.
 *
 * Deux pièges que ce socle absorbe :
 *   1. `MoteurContextRecap` lit la **stratégie du cocon** (`cocoon_strategies`),
 *      pas la table `articles` : sans `proposedArticles`, aucun article n'est
 *      sélectionnable (c'est ce qui mettait 11 tests du Capitaine en pause).
 *   2. L'identifiant de l'URL `/cocoon/:id/moteur` est l'**index** du cocon dans
 *      `GET /api/cocoons` (`data.service.ts` réécrit `id: globalCocoonIndex++`),
 *      pas la clé primaire PostgreSQL.
 *
 * Sources externes : le serveur est basculé en mode simulé (`POST /api/runtime-mode`)
 * → IA locale sans réseau, DataForSEO en bac à sable (coût 0).
 */
import { test, expect, type Page } from '@playwright/test'
import { query } from '../../../server/db/client.js'
import {
  makeTestRunId,
  getOrCreateTestSilo,
  createTestCocoon,
  createTestCocoonArticle,
  cleanupTestFixtures,
} from '../../helpers/db-fixtures.js'
import { openMoteur, scanAndLockCaptain, selectArticleByTitle } from './moteur-ui.js'
import { effectiveMode, setMockMode } from './runtime-mode.js'

const API = `http://localhost:${process.env.PORT ?? 3400}/api`

export type ParcoursLevel = 'pilier' | 'intermediaire' | 'specifique'

export interface ParcoursArticle {
  /** Identifiant réel en base — celui que le Moteur utilise partout. */
  id: number
  title: string
  slug: string
  level: ParcoursLevel
  /** Mot-clé de départ, étiqueté pour le nettoyage des tables transverses. */
  keyword: string
  painPoint: string
}

export interface ParcoursCtx {
  runId: string
  cocoonName: string
  /** Index du cocon dans GET /api/cocoons — c'est lui qui va dans l'URL. */
  cocoonIndex: number
  articles: Record<ParcoursLevel, ParcoursArticle>
  /** URL du Moteur pour ce cocon. */
  moteurUrl: () => string
}

interface ApiResult<T> {
  ok: boolean
  status: number
  data?: T
  error?: unknown
}

async function api<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  const json = await res.json().catch(() => null)
  return { ok: res.ok, status: res.status, data: json?.data as T, error: json?.error }
}

const LEVELS: ParcoursLevel[] = ['pilier', 'intermediaire', 'specifique']

const SEEDS: Record<ParcoursLevel, { base: string; keyword: string; painPoint: string }> = {
  pilier: {
    base: 'Pilier creation site internet',
    keyword: 'creation site internet toulouse',
    painPoint: "Mon site actuel ne m'amène aucun client à Toulouse et je ne sais pas par où commencer.",
  },
  intermediaire: {
    base: 'Intermediaire prix site internet',
    keyword: 'prix creation site internet',
    painPoint: "Je n'ai aucune idée du budget à prévoir pour un site et j'ai peur de me faire avoir.",
  },
  specifique: {
    base: 'Specifique site vitrine artisan',
    keyword: 'site vitrine artisan toulouse',
    painPoint: "Je suis artisan et je ne sais pas si un site vitrine peut vraiment m'apporter des chantiers.",
  },
}

/** Étiquette le mot-clé pour que le nettoyage des tables transverses le retrouve. */
function taggedKeyword(keyword: string, runId: string): string {
  return `${keyword} test-${runId}-kw`
}

/** Une étape de la stratégie du cocon (`validated` est un texte, pas un booléen). */
function emptyStep() {
  return { input: '', suggestion: null, validated: '' }
}

/**
 * Prépare le cocon, sa stratégie et ses trois articles. À appeler au niveau
 * module d'un fichier de parcours :
 *
 *     const parcours = useParcours()
 *     test('…', async ({ page }) => { await selectArticle(page, parcours, 'pilier') })
 */
export function useParcours(): ParcoursCtx {
  const ctx = {
    runId: '',
    cocoonName: '',
    cocoonIndex: -1,
    articles: {} as Record<ParcoursLevel, ParcoursArticle>,
    moteurUrl: () => `/cocoon/${ctx.cocoonIndex}/moteur`,
  } as ParcoursCtx

  test.beforeAll(async () => {
    ctx.runId = makeTestRunId()

    // Sources externes simulées avant toute action.
    await setMockMode('mock')
    expect(await effectiveMode(), 'le serveur doit être en mode simulé').toBe('mock')

    const silo = await getOrCreateTestSilo(ctx.runId, 'Silo parcours')
    const cocoon = await createTestCocoon(ctx.runId, silo.id, 'Cocon parcours')
    ctx.cocoonName = cocoon.nom

    // 1. Les articles, en SQL et dans l'ordre du cocon (C7) : le pilier, puis
    //    l'intermédiaire né d'une de ses sections, puis le spécialisé né d'une
    //    section de l'intermédiaire. La création unitaire (`POST /cocoons/:id/articles`)
    //    exige un parent rédigé et un mot-clé mesuré : elle a ses propres tests.
    const DB_TYPE: Record<ParcoursLevel, 'Pilier' | 'Intermédiaire' | 'Spécialisé'> = {
      pilier: 'Pilier', intermediaire: 'Intermédiaire', specifique: 'Spécialisé',
    }
    let parentId: number | null = null
    for (const level of LEVELS) {
      const keyword = taggedKeyword(SEEDS[level].keyword, ctx.runId)
      const row = await createTestCocoonArticle(ctx.runId, cocoon.id, {
        base: SEEDS[level].base,
        type: DB_TYPE[level],
        slug: `test-${ctx.runId}-${level}`,
        parentId,
        parentSection: parentId === null ? null : `Section ${SEEDS[level].keyword}`,
        suggestedKeyword: keyword,
        painPoint: SEEDS[level].painPoint,
        painIntentExpected: 'commercial',
      })
      ctx.articles[level] = { id: row.id, title: row.titre, slug: row.slug, level, keyword, painPoint: SEEDS[level].painPoint }
      parentId = row.id
    }

    // 2. La stratégie du cocon — c'est elle que lit la barre du haut du Moteur.
    const strategy = {
      cocoonSlug: ctx.cocoonName,
      cible: emptyStep(),
      douleur: emptyStep(),
      angle: emptyStep(),
      promesse: emptyStep(),
      cta: emptyStep(),
      suggestedTopics: [],
      topicsUserContext: '',
      completedSteps: 6,
      updatedAt: new Date().toISOString(),
      proposedArticles: LEVELS.map(level => ({
        id: `${ctx.runId}-${level}`,
        title: ctx.articles[level].title,
        suggestedTitles: [],
        type: level,
        parentTitle: level === 'pilier' ? null : ctx.articles.pilier.title,
        rationale: 'Article de parcours automatisé',
        painPoint: ctx.articles[level].painPoint,
        painIntentExpected: 'commercial',
        suggestedKeyword: ctx.articles[level].keyword,
        suggestedKeywords: [],
        suggestedSlug: ctx.articles[level].slug,
        suggestedSlugs: [],
        validatedSearchQuery: null,
        keywordValidated: false,
        searchQueryValidated: false,
        titleValidated: false,
        accepted: true,
        createdInDb: true,
        dbId: ctx.articles[level].id,
      })),
    }
    const saved = await api(`/strategy/cocoon/${encodeURIComponent(ctx.cocoonName)}`, {
      method: 'PUT',
      body: JSON.stringify(strategy),
    })
    if (!saved.ok) throw new Error(`stratégie du cocon non enregistrée (HTTP ${saved.status})`)

    // 3. L'index du cocon : c'est lui qui va dans l'URL, pas la clé primaire.
    const cocoons = await api<Array<{ id: number; name: string }>>('/cocoons')
    const found = cocoons.data?.find(c => c.name === ctx.cocoonName)
    if (!found) throw new Error(`cocon "${ctx.cocoonName}" absent de GET /cocoons`)
    ctx.cocoonIndex = found.id
  })

  test.afterAll(async () => {
    if (!ctx.runId) return
    // Tables sans clé étrangère vers le cocon : à nettoyer à la main.
    await query(`DELETE FROM keywords_seo WHERE cocoon_name = $1`, [ctx.cocoonName]).catch(() => {})
    await cleanupTestFixtures(ctx.runId)
    await setMockMode(null).catch(() => {})
  })

  return ctx
}

/** Ouvre le Moteur sur le cocon de test et sélectionne l'article du niveau demandé. */
export async function selectArticle(page: Page, ctx: ParcoursCtx, level: ParcoursLevel): Promise<void> {
  await openMoteur(page, ctx.cocoonIndex)
  await selectArticleByTitle(page, ctx.articles[level].title)
}

export { scanAndLockCaptain }
