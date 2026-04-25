/**
 * Helpers Playwright : extension du `test` standard pour ajouter des fixtures
 * partagées (création de cocon/article via API directe avant le test browser,
 * cleanup en teardown).
 */
import { test as base } from '@playwright/test'
import { query, pool } from '../../../server/db/client.js'

const TEST_PREFIX = '[browser:'
const API = process.env.TEST_BASE_URL ?? 'http://localhost:3005/api'

export interface TestArticle {
  id: number
  titre: string
  cocoonId: number
  slug: string
}

export interface BrowserCtx {
  runId: string
  apiUrl: string
  /** Crée un article de test prêt à être chargé dans l'UI */
  createArticle: (base?: string, type?: 'Pilier' | 'Intermédiaire' | 'Spécialisé') => Promise<TestArticle>
}

export const test = base.extend<{ ctx: BrowserCtx }>({
  ctx: async ({}, use, testInfo) => {
    const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const tagged = (b: string) => `${TEST_PREFIX}${runId}] ${b}`

    // Récupère un silo existant
    const siloRes = await query<{ id: number }>(
      `SELECT id FROM silos WHERE nom NOT LIKE $1 ORDER BY id LIMIT 1`,
      [`${TEST_PREFIX}%`],
    )
    if (siloRes.rows.length === 0) throw new Error('No silo available for browser tests — seed the DB first')
    const siloId = siloRes.rows[0].id

    // Crée un cocon pour ce test
    const cocoonRes = await query<{ id: number }>(
      `INSERT INTO cocoons (nom, silo_id) VALUES ($1, $2) RETURNING id`,
      [tagged('Cocon'), siloId],
    )
    const cocoonId = cocoonRes.rows[0].id

    const ctx: BrowserCtx = {
      runId,
      apiUrl: API,
      createArticle: async (b = 'Article', type = 'Pilier') => {
        const titre = tagged(b)
        const slug = `browser-${runId}-${b.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`
        for (let attempt = 0; attempt < 5; attempt++) {
          const maxRes = await query<{ max: number | null }>(`SELECT COALESCE(MAX(id), 0) AS max FROM articles`)
          const nextId = (maxRes.rows[0].max ?? 0) + 1 + attempt
          try {
            await query(
              `INSERT INTO articles (id, titre, cocoon_id, slug, type, status, phase, completed_checks, check_timestamps)
               VALUES ($1, $2, $3, $4, $5, 'à rédiger', 'proposed', ARRAY[]::TEXT[], '{}'::jsonb)`,
              [nextId, titre, cocoonId, slug, type],
            )
            return { id: nextId, titre, cocoonId, slug }
          } catch (err) {
            if (!/articles_pkey|articles_slug_key/.test((err as Error).message)) throw err
          }
        }
        throw new Error('createArticle failed after 5 retries')
      },
    }

    await use(ctx)

    // Cleanup
    const pattern = `${TEST_PREFIX}${runId}]%`
    try {
      await query(`DELETE FROM articles WHERE titre LIKE $1`, [pattern])
      await query(`DELETE FROM cocoons WHERE nom LIKE $1`, [pattern])
    } catch (err) {
      console.warn(`[browser-test cleanup] ${(err as Error).message}`)
    }

    void testInfo
  },
})

export { expect } from '@playwright/test'

/** À appeler dans globalTeardown pour fermer le pool pg proprement */
export async function closeDbPool() {
  await pool.end()
}
