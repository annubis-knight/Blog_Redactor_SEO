/**
 * Vitest config dédié à `npm run verify` — le filet RAPIDE.
 *
 * Ne garde que les tests purs, qui n'ont besoin ni du serveur, ni de la base,
 * ni d'un navigateur simulé : la logique métier partagée, les heuristiques du
 * robot, les règles d'architecture, et les services testés sans I/O.
 * Environnement `node` : on évite les ~25 s de démarrage de jsdom par worker.
 *
 * Mesuré le 2026-09-21 : ~540 tests en ~10 s.
 * La suite complète reste disponible via `npm run verify:full`.
 */
import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'node',
      include: [
        'tests/unit/shared/**/*.test.ts',
        'tests/unit/scripts/**/*.test.ts',
        'tests/unit/architecture/**/*.test.ts',
        'tests/unit/services/export-page-structure.test.ts',
        'tests/unit/services/claude-stream-filter.test.ts',
        'tests/unit/services/linking.service.test.ts',
        'tests/unit/services/linking-anchor.test.ts',
        'tests/unit/infra/test-fixtures-cleanup.test.ts',
      ],
      root: fileURLToPath(new URL('./', import.meta.url)),
    },
  }),
)
