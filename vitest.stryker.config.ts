/**
 * Vitest config dédié à Stryker (Sprint 6).
 *
 * Restreint la suite aux tests pertinents pour shared/score/ uniquement.
 * Sinon, Stryker bloque sur les 15 tests préexistants en échec dans le reste
 * de la codebase (chantier indépendant non lié au sprint stabilisation).
 */
import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'node',
      include: ['tests/unit/shared/**/*.test.ts'],
      root: fileURLToPath(new URL('./', import.meta.url)),
    },
  }),
)
