/**
 * Database fixtures and cleanup helpers for e2e/integration tests.
 *
 * Stratégie zéro-pollution :
 *   1. Chaque test s'inscrit avec un `testRunId` unique (cuid/timestamp).
 *   2. Les créations de ressources (silo, cocoon, article, keyword) passent
 *      par `createFixture*` qui tague la row avec un nom/slug préfixé `[test:<runId>]`.
 *   3. En fin de test (afterEach/afterAll), `cleanupTestFixtures(runId)` supprime
 *      en cascade toutes les rows matchées par le préfixe.
 *   4. Si un test crash, un `cleanupAllOrphans()` dans afterAll global purge les
 *      résidus (rows dont le préfixe `[test:` date de + de 1h).
 *
 * Important : on ne touche JAMAIS aux rows utilisateur (pas de prefix de test).
 */
import { pool, query } from '../../server/db/client.js'

/** Prefix injecté dans les noms de ressources créées pour tests. */
export const TEST_PREFIX = '[test:'

export function makeTestRunId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function taggedName(base: string, runId: string): string {
  return `${TEST_PREFIX}${runId}] ${base}`
}

/**
 * Vérifie qu'une chaîne provient bien d'un test (sécurité contre deletes accidentels).
 */
export function isTestTagged(name: string): boolean {
  return typeof name === 'string' && name.startsWith(TEST_PREFIX)
}

// ---------------------------------------------------------------------------
// CREATE fixtures
// ---------------------------------------------------------------------------

export interface TestSilo {
  id: number
  nom: string
}

export interface TestCocoon {
  id: number
  nom: string
  siloId: number
}

export interface TestArticle {
  id: number
  titre: string
  cocoonId: number
  slug: string
  type: 'Pilier' | 'Intermédiaire' | 'Spécialisé'
}

/**
 * Récupère un silo existant non-test pour y rattacher des cocons de test.
 *
 * Stratégie : on réutilise le 1er silo "prod" existant (par id) pour ne pas
 * polluer le count des silos (un test unitaire `getSilos returns 3` casserait
 * si on créait des silos additionnels).
 *
 * Si aucun silo prod n'existe (DB vide), on en crée un de test (sera nettoyé).
 */
export async function getOrCreateTestSilo(runId: string, base = 'Silo'): Promise<TestSilo> {
  const existing = await query<{ id: number; nom: string }>(
    `SELECT id, nom FROM silos WHERE nom NOT LIKE $1 ORDER BY id LIMIT 1`,
    [`${TEST_PREFIX}%`],
  )
  if (existing.rows.length > 0) return existing.rows[0]

  // Fallback : pas de silo prod, on crée un silo de test (cleanup auto)
  const nom = taggedName(base, runId)
  const inserted = await query<{ id: number }>(
    `INSERT INTO silos (nom, description) VALUES ($1, $2) RETURNING id`,
    [nom, 'Test silo (auto-cleanup)'],
  )
  return { id: inserted.rows[0].id, nom }
}

export async function createTestCocoon(runId: string, siloId: number, base = 'Cocoon'): Promise<TestCocoon> {
  const nom = taggedName(base, runId)
  const res = await query<{ id: number }>(
    `INSERT INTO cocoons (nom, silo_id) VALUES ($1, $2) RETURNING id`,
    [nom, siloId],
  )
  return { id: res.rows[0].id, nom, siloId }
}

export async function createTestArticle(
  runId: string,
  cocoonId: number,
  base = 'Article',
  type: 'Pilier' | 'Intermédiaire' | 'Spécialisé' = 'Pilier',
): Promise<TestArticle> {
  const titre = taggedName(base, runId)
  const slug = `test-${runId}-${base.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

  // articles.id n'a pas de SERIAL — on calcule le prochain id manuellement.
  // Race condition possible si plusieurs tests parallèles : on retry jusqu'à 5x
  // sur conflit de clé primaire en incrémentant.
  for (let attempt = 0; attempt < 10; attempt++) {
    const maxRes = await query<{ max: number | null }>(`SELECT COALESCE(MAX(id), 0) AS max FROM articles`)
    const nextId = (maxRes.rows[0].max ?? 0) + 1 + attempt
    try {
      await query(
        `INSERT INTO articles (id, titre, cocoon_id, slug, type, status, phase, completed_checks, check_timestamps)
         VALUES ($1, $2, $3, $4, $5, 'à rédiger', 'proposed', ARRAY[]::TEXT[], '{}'::jsonb)`,
        [nextId, titre, cocoonId, slug, type],
      )
      return { id: nextId, titre, cocoonId, slug, type }
    } catch (err) {
      const msg = (err as Error).message
      if (!msg.includes('articles_pkey') && !msg.includes('articles_slug_key')) throw err
      // Sinon on retry avec id+1
    }
  }
  throw new Error(`createTestArticle: failed after 10 attempts (race conditions)`)
}

/**
 * Article de test complet, écrit en SQL : titre étiqueté, parent et section du
 * parent (C7), mot-clé, douleur. Pour préparer un cocon sans passer par la
 * création unitaire, qui exige un parent rédigé et un mot-clé mesuré — elle a
 * ses propres tests (`cocoon-article.service.test.ts`, contrat, parcours).
 */
export async function createTestCocoonArticle(
  runId: string,
  cocoonId: number,
  article: {
    base: string
    type: 'Pilier' | 'Intermédiaire' | 'Spécialisé'
    slug: string
    parentId?: number | null
    parentSection?: string | null
    suggestedKeyword?: string | null
    painPoint?: string | null
    painIntentExpected?: string | null
  },
): Promise<TestArticle> {
  const titre = taggedName(article.base, runId)
  for (let attempt = 0; attempt < 10; attempt++) {
    const maxRes = await query<{ max: number | null }>(`SELECT COALESCE(MAX(id), 0) AS max FROM articles`)
    const nextId = (maxRes.rows[0].max ?? 0) + 1 + attempt
    try {
      await query(
        `INSERT INTO articles (id, titre, cocoon_id, slug, type, status, phase, completed_checks, check_timestamps,
                               parent_id, parent_section, suggested_keyword, pain_point, pain_intent_expected)
         VALUES ($1, $2, $3, $4, $5, 'à rédiger', 'proposed', ARRAY[]::TEXT[], '{}'::jsonb, $6, $7, $8, $9, $10)`,
        [nextId, titre, cocoonId, article.slug, article.type, article.parentId ?? null, article.parentSection ?? null,
          article.suggestedKeyword ?? null, article.painPoint ?? null, article.painIntentExpected ?? null],
      )
      return { id: nextId, titre, cocoonId, slug: article.slug, type: article.type }
    } catch (err) {
      if (!(err as Error).message.includes('articles_pkey')) throw err
    }
  }
  throw new Error('createTestCocoonArticle: failed after 10 attempts (race conditions)')
}

// ---------------------------------------------------------------------------
// CLEANUP — par runId (strict)
// ---------------------------------------------------------------------------

/**
 * Supprime toutes les fixtures taguées avec ce runId. Opère en cascade via
 * les FK ON DELETE CASCADE des tables articles / cocoons.
 */
export async function cleanupTestFixtures(runId: string): Promise<void> {
  const pattern = `${TEST_PREFIX}${runId}]%`

  // 1. Articles (cascade sur *_explorations, article_keywords, article_content, etc.)
  //    Deux filets, car un test peut RENOMMER l'article (PATCH /articles/:id) :
  //    le titre perd alors son tag et n'est plus retrouvé. Le slug, lui, n'est
  //    jamais modifié — c'est la clé de nettoyage fiable.
  //    Sans ce second DELETE, 28 articles « Renamed <timestamp> » s'étaient
  //    accumulés dans la base de dev (audit 2026-09-19).
  // C7 : un parent ne se supprime pas tant qu'il a des enfants (ON DELETE
  // RESTRICT). Les enfants des articles de test sont détachés d'abord.
  await query(
    `UPDATE articles SET parent_id = NULL WHERE parent_id IN (
       SELECT id FROM articles
       WHERE titre LIKE $1 OR slug LIKE $2 OR cocoon_id IN (SELECT id FROM cocoons WHERE nom LIKE $1))`,
    [pattern, testSlugPattern(runId)],
  )
  await query(`DELETE FROM articles WHERE titre LIKE $1`, [pattern])
  await query(`DELETE FROM articles WHERE slug LIKE $1`, [testSlugPattern(runId)])

  // 1.bis Articles créés PAR LE PRODUIT dans un cocon de test (Cerveau).
  //    Leur titre et leur slug viennent de l'IA : ils ne portent aucune
  //    étiquette et échappent donc aux deux filets précédents. Et comme
  //    `articles.cocoon_id` est en ON DELETE SET NULL, supprimer le cocon les
  //    détache au lieu de les supprimer : ils deviennent des articles
  //    fantômes, invisibles dans l'app mais dont le slug reste pris — au point
  //    de faire échouer silencieusement les créations suivantes.
  await query(
    `DELETE FROM articles WHERE cocoon_id IN (SELECT id FROM cocoons WHERE nom LIKE $1)`,
    [pattern],
  )

  // 2. Cocoons (cascade sur cocoon_strategies)
  await query(`DELETE FROM cocoons WHERE nom LIKE $1`, [pattern])

  // 3. Silos créés par les tests (rare, seulement si DB vide au boot)
  await query(`DELETE FROM silos WHERE nom LIKE $1`, [pattern])

  // 4. Cross-article tables qu'on a pu créer (keyword_metrics, keyword_intent_analyses…)
  //    Pas de tag possible ici (clé = keyword), on cible les formes que le runId
  //    peut prendre une fois passé dans le produit (cf. testKeywordPatterns).
  for (const p of testKeywordPatterns(runId)) {
    await query(`DELETE FROM keyword_metrics WHERE keyword LIKE $1`, [p])
    await query(`DELETE FROM keyword_intent_analyses WHERE keyword LIKE $1`, [p])
    await query(`DELETE FROM keyword_discoveries WHERE seed LIKE $1`, [p])
    await query(`DELETE FROM external_api_cache WHERE cache_key LIKE $1`, [p])
  }
}

/**
 * Motifs SQL couvrant toutes les formes qu'un identifiant de run peut prendre
 * dans les tables indexées par mot-clé.
 *
 * Le produit ne se contente pas de stocker le mot-clé qu'on lui donne : il en
 * dérive des variantes racines en retirant des mots. `[test:<runId>] Specifique
 * site vitrine artisan` devient ainsi `<suffixe> specifique`, qui ne contient
 * plus ni le préfixe `test-` ni l'horodatage. Le seul fragment qui survit à
 * toutes ces dérivations est le suffixe aléatoire du runId — six caractères
 * base36, assez distinctifs pour ne jamais croiser un vrai mot-clé français.
 *
 * Sans ce filet, 1303 lignes de mots-clés de test s'étaient accumulées dans
 * `keyword_metrics` (relevé du 2026-09-23), avec les données factices du bac à
 * sable dans un cache pourtant permanent et partagé entre articles.
 */
export function testKeywordPatterns(runId: string): string[] {
  const suffix = runId.split('-').pop() ?? runId
  return [`%test-${runId}-%`, `%${runId}%`, `%${suffix}%`]
}

/**
 * Purge d'orphelins : supprime toutes les fixtures `[test:...]` dont le
 * timestamp (partie entre `test:` et `-` suivant) est > à 1h. Appelé au
 * début de la suite pour éviter l'accumulation si un test a crashé avant
 * son cleanup.
 */
export async function cleanupOrphanedFixtures(maxAgeMs = 60 * 60 * 1000): Promise<number> {
  const cutoff = Date.now() - maxAgeMs

  // On extrait le timestamp du préfixe `[test:<timestamp>-<rand>]` via regexp
  const articlesRes = await query<{ id: number; titre: string }>(
    `SELECT id, titre FROM articles WHERE titre LIKE $1`,
    [`${TEST_PREFIX}%`],
  )
  let deleted = 0
  for (const row of articlesRes.rows) {
    const ts = parseTimestampFromTag(row.titre)
    if (ts !== null && ts < cutoff) {
      await query(`UPDATE articles SET parent_id = NULL WHERE parent_id = $1`, [row.id])
      await query(`DELETE FROM articles WHERE id = $1`, [row.id])
      deleted++
    }
  }

  // Articles renommés par un test : le titre n'est plus tagué, mais le slug
  // reste `test-<timestamp>-…`. C'est l'origine des « Renamed … » orphelins.
  const renamedRes = await query<{ id: number; slug: string }>(
    `SELECT id, slug FROM articles WHERE slug LIKE 'test-%'`,
  )
  for (const row of renamedRes.rows) {
    const ts = parseTimestampFromSlug(row.slug)
    if (ts !== null && ts < cutoff) {
      await query(`UPDATE articles SET parent_id = NULL WHERE parent_id = $1`, [row.id])
      await query(`DELETE FROM articles WHERE id = $1`, [row.id])
      deleted++
    }
  }

  const cocoonsRes = await query<{ id: number; nom: string }>(
    `SELECT id, nom FROM cocoons WHERE nom LIKE $1`,
    [`${TEST_PREFIX}%`],
  )
  for (const row of cocoonsRes.rows) {
    const ts = parseTimestampFromTag(row.nom)
    if (ts !== null && ts < cutoff) {
      await query(`DELETE FROM cocoons WHERE id = $1`, [row.id])
      deleted++
    }
  }

  const silosRes = await query<{ id: number; nom: string }>(
    `SELECT id, nom FROM silos WHERE nom LIKE $1`,
    [`${TEST_PREFIX}%`],
  )
  for (const row of silosRes.rows) {
    const ts = parseTimestampFromTag(row.nom)
    if (ts !== null && ts < cutoff) {
      await query(`DELETE FROM silos WHERE id = $1`, [row.id])
      deleted++
    }
  }
  return deleted
}

function parseTimestampFromTag(tagged: string): number | null {
  const match = tagged.match(/\[test:(\d+)-/)
  if (!match || !match[1]) return null
  const ts = Number(match[1])
  return Number.isFinite(ts) ? ts : null
}

/** Motif SQL des slugs d'un run : `test-<runId>-%`. */
export function testSlugPattern(runId: string): string {
  return `test-${runId}-%`
}

/**
 * Horodatage contenu dans un slug de test (`test-<timestamp>-<rand>-…`).
 * Renvoie `null` si le slug n'est pas un slug de test — garde-fou contre toute
 * suppression d'une row utilisateur.
 */
export function parseTimestampFromSlug(slug: string): number | null {
  const match = /^test-(\d{10,})-/.exec(slug)
  if (!match || !match[1]) return null
  const ts = Number(match[1])
  return Number.isFinite(ts) ? ts : null
}

// ---------------------------------------------------------------------------
// CLOSE pool — pour afterAll global
// ---------------------------------------------------------------------------

export async function closeDbPool(): Promise<void> {
  await pool.end()
}
