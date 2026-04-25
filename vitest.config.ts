import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      exclude: [
        ...configDefaults.exclude,
        'e2e/**',
        'tests/browser-e2e/**',  // tests Playwright (lancés via npm run test:browser)
      ],
      root: fileURLToPath(new URL('./', import.meta.url)),
    },
  }),
)
