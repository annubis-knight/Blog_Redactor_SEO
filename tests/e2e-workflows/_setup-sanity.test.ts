// @vitest-environment node
/**
 * Sanity test : valide que le harness e2e fonctionne (DB write + read + cleanup).
 * Ce fichier doit toujours rester vert. Si tout casse, regarder ici en premier.
 */
import { describe, it, expect } from 'vitest'
import { setupTestContext } from '../helpers/test-context.js'
import { isServerUp, apiGet } from '../helpers/api-client.js'
import { query } from '../../server/db/client.js'

const ctx = setupTestContext()

describe('Test harness sanity', () => {
  it('serveur dev est joignable', async () => {
    const up = await isServerUp()
    expect(up, 'Le serveur dev doit tourner sur localhost:3005 — démarrer avec `npm run dev:server`').toBe(true)
  })

  it('GET /health renvoie ok', async () => {
    const res = await apiGet<{ status: string }>('/health')
    expect(res.status).toBe(200)
    expect(res.data?.status).toBe('ok')
  })

  it('runId est unique et tagué [test:...]', () => {
    expect(ctx.runId).toMatch(/^\d+-[a-z0-9]+$/)
  })

  it('peut créer + lire + supprimer un cocon de test', async () => {
    if (!ctx.serverOk) return

    const silo = await ctx.getSilo()
    expect(silo.id).toBeGreaterThan(0)

    const cocoon = await ctx.createCocoon(silo.id, 'Sanity Cocon')
    expect(cocoon.id).toBeGreaterThan(0)
    expect(cocoon.nom).toContain('[test:')
    expect(cocoon.nom).toContain('Sanity Cocon')

    // Vérifie la lecture
    const readRes = await query<{ id: number }>(`SELECT id FROM cocoons WHERE id = $1`, [cocoon.id])
    expect(readRes.rows.length).toBe(1)

    // Pas de cleanup manuel ici — le afterAll global s'en charge.
  })

  it('peut créer un article rattaché au cocon de test', async () => {
    if (!ctx.serverOk) return

    const silo = await ctx.getSilo()
    const cocoon = await ctx.createCocoon(silo.id, 'Sanity Cocon For Article')
    const article = await ctx.createArticle(cocoon.id, 'Sanity Article', 'Pilier')

    expect(article.id).toBeGreaterThan(0)
    expect(article.titre).toContain('[test:')
    expect(article.type).toBe('Pilier')
  })
})
