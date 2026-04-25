import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright config — tests browser pour les comportements UI qui ne peuvent
 * pas être testés via vitest+API (modals, drag/drop, mutex UI, raccourcis,
 * basket Pinia, etc.).
 *
 * Convention : tests dans tests/browser-e2e/, AI_PROVIDER=mock obligatoire.
 *
 * Lancer : npm run test:browser
 */
export default defineConfig({
  testDir: './tests/browser-e2e',
  // Pattern stricte pour éviter de scanner les autres tests/
  testMatch: '**/*.browser.test.ts',
  fullyParallel: false,             // Tests UI séquentiels — évite collisions DB
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Lance le serveur dev (front + back) si non déjà actif
  webServer: process.env.PLAYWRIGHT_NO_SERVER
    ? undefined
    : [
        {
          command: 'npm run dev:server',
          port: 3005,
          reuseExistingServer: true,
          timeout: 30000,
          env: { AI_PROVIDER: 'mock', NODE_ENV: 'development' },
        },
        {
          command: 'npm run dev:client',
          port: 5173,
          reuseExistingServer: true,
          timeout: 30000,
        },
      ],
})
