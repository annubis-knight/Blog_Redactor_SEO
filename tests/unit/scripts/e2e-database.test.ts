// @vitest-environment node
/**
 * T10 — la base des tests navigateur est recréée avant chaque passage. Le
 * garde-fou est la seule chose qui sépare ce DROP DATABASE de la base de
 * développement : il est testé.
 */
import { describe, it, expect } from 'vitest'
import { e2eDatabaseName, e2eUsesOwnDatabase, refuseToRecreate } from '../../browser-e2e/e2e-database'

describe('base des tests navigateur', () => {
  it('nom par défaut, ou celui de E2E_PG_DATABASE', () => {
    expect(e2eDatabaseName({})).toBe('blog_redactor_seo_test')
    expect(e2eDatabaseName({ E2E_PG_DATABASE: 'autre_test' })).toBe('autre_test')
  })

  it('un passage réel et un serveur existant gardent leur base', () => {
    expect(e2eUsesOwnDatabase({})).toBe(true)
    expect(e2eUsesOwnDatabase({ PARCOURS_REEL: '1' })).toBe(false)
    expect(e2eUsesOwnDatabase({ PLAYWRIGHT_NO_SERVER: '1' })).toBe(false)
  })

  it('refuse de recréer une base sans _test, ou celle de .env', () => {
    expect(refuseToRecreate('blog_redactor_seo', 'blog_redactor_seo')).toMatch(/_test/)
    expect(refuseToRecreate('clients', 'blog_redactor_seo')).toMatch(/_test/)
    expect(refuseToRecreate('prod_test', 'prod_test')).toMatch(/base de \.env/)
    expect(refuseToRecreate('blog_redactor_seo_test', 'blog_redactor_seo')).toBeNull()
  })
})
