// @vitest-environment node
/**
 * FR-INFRA-COST-LOG-STORE — les écritures en base de toutes les routes
 * arrivent dans la pile d'activité.
 *
 * Recette 2026-09-30 : valider une structure n'ajoutait aucune ligne à la pile.
 * Cause : le middleware qui rapporte les opérations en base
 * (`server/middleware/db-telemetry.middleware.ts`) était testé mais jamais
 * monté ; seules quelques routes rapportaient leurs opérations à la main.
 * Ce valideur garde le montage : le pool est instrumenté au démarrage, le
 * middleware passe avant toutes les routes de `/api` (après la lecture du
 * corps JSON), et les panneaux IA en flux joignent leurs écritures à leur
 * événement `done`.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(__dirname, '..', '..', '..')
const read = (path: string) => readFileSync(join(ROOT, path), 'utf-8')

describe('FR-INFRA-COST-LOG-STORE — le middleware des opérations en base est monté', () => {
  const index = read('server/index.ts')

  it('le pool est instrumenté au démarrage du serveur', () => {
    expect(index).toMatch(/^patchPoolForTelemetry\(\)/m)
  })

  it('le middleware passe après la lecture du JSON et avant la première route', () => {
    const json = index.indexOf('app.use(express.json(')
    const mount = index.search(/app\.use\('\/api', dbTelemetryMiddleware\)/)
    const firstRoute = index.search(/app\.use\('\/api(\/[a-z]+)?', [a-zA-Z]+Routes\)/)
    expect(json).toBeGreaterThan(-1)
    expect(mount, 'app.use(\'/api\', dbTelemetryMiddleware) absent').toBeGreaterThan(json)
    expect(firstRoute).toBeGreaterThan(mount)
  })

  it('les panneaux IA en flux joignent leurs écritures à l’événement « done »', () => {
    const runner = read('server/services/external/ai-panel-runner.service.ts')
    expect(runner).toMatch(/requestDbOps\(\)/)
  })
})
