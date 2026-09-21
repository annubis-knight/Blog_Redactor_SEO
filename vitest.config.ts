import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      // La suite complète (~4 700 tests) sature la machine : les tests qui
      // scannent le dépôt ou importent un gros composant à froid dépassent
      // alors les 5 s par défaut et rougissent au hasard. 20 s absorbe la
      // charge ; un vrai blocage échoue toujours.
      testTimeout: 20_000,
      exclude: [
        ...configDefaults.exclude,
        'e2e/**',
        'tests/browser-e2e/**',  // tests Playwright (lancés via npm run test:browser)
        '.stryker-tmp/**',       // sandbox Stryker (mutation testing) — éviter double exécution
      ],
      root: fileURLToPath(new URL('./', import.meta.url)),
    },
  }),
)
