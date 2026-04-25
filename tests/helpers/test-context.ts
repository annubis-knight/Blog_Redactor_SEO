/**
 * Shared test-context helper.
 *
 * Usage pattern dans chaque fichier de test e2e/integration :
 *
 *   import { setupTestContext } from '../helpers/test-context.js'
 *   const ctx = setupTestContext()     // auto-gère beforeAll/afterAll
 *
 *   it('does something', async () => {
 *     const article = await ctx.createArticle()    // auto-tagué
 *     // ...
 *   })
 *
 * Les ressources créées via `ctx.create*` sont automatiquement supprimées
 * en `afterAll`, même si un test plante.
 */
import { beforeAll, afterAll } from 'vitest'
import { isServerUp } from './api-client.js'
import {
  makeTestRunId,
  createTestCocoon,
  createTestArticle,
  getOrCreateTestSilo,
  cleanupTestFixtures,
  cleanupOrphanedFixtures,
  closeDbPool,
  type TestSilo,
  type TestCocoon,
  type TestArticle,
} from './db-fixtures.js'

export interface TestContext {
  runId: string
  serverOk: boolean
  getSilo: (base?: string) => Promise<TestSilo>
  createCocoon: (siloId: number, base?: string) => Promise<TestCocoon>
  createArticle: (cocoonId: number, base?: string, type?: 'Pilier' | 'Intermédiaire' | 'Spécialisé') => Promise<TestArticle>
}

/**
 * Appelle cette fonction au niveau module d'un fichier de test. Elle hooke
 * automatiquement beforeAll (check serveur + purge orphelins) et afterAll
 * (cleanup strict du runId courant).
 *
 * Si AI_PROVIDER != mock, les tests qui dépendent de l'IA seront skippés via
 * `ctx.serverOk` false + un warn.
 */
export function setupTestContext(): TestContext {
  const ctx: TestContext = {
    runId: makeTestRunId(),
    serverOk: false,
    getSilo: async (base = 'Silo') => {
      return getOrCreateTestSilo(ctx.runId, base)
    },
    createCocoon: async (siloId: number, base = 'Cocoon') => {
      return createTestCocoon(ctx.runId, siloId, base)
    },
    createArticle: async (cocoonId: number, base = 'Article', type = 'Pilier') => {
      return createTestArticle(ctx.runId, cocoonId, base, type)
    },
  }

  beforeAll(async () => {
    // 1. Purge des orphelins anciens (sécurité).
    try {
      const n = await cleanupOrphanedFixtures()
      if (n > 0) console.warn(`[test-context] cleaned up ${n} orphaned test fixtures`)
    } catch (err) {
      console.warn(`[test-context] orphan cleanup failed: ${(err as Error).message}`)
    }
    // 2. Check que le serveur dev tourne (nécessaire pour tous les tests HTTP).
    ctx.serverOk = await isServerUp()
    if (!ctx.serverOk) {
      console.warn(`[test-context] server not reachable at ${process.env.TEST_BASE_URL ?? 'http://localhost:3005/api'} — HTTP tests will be skipped`)
    }
    // 3. Warning si provider != mock (les tests assument des fixtures déterministes)
    const provider = (process.env.AI_PROVIDER ?? 'claude').toLowerCase()
    if (provider !== 'mock') {
      console.warn(`[test-context] AI_PROVIDER=${provider} (not "mock") — AI-dependent assertions may be flaky`)
    }
  })

  afterAll(async () => {
    try {
      await cleanupTestFixtures(ctx.runId)
    } catch (err) {
      console.error(`[test-context] cleanup failed for runId ${ctx.runId}: ${(err as Error).message}`)
      throw err
    }
  })

  return ctx
}

/**
 * À appeler UNE fois dans le globalTeardown si on veut fermer le pool pg
 * proprement. Pour l'instant les tests laissent le pool ouvert (vitest kill
 * le process à la fin).
 */
export { closeDbPool }
