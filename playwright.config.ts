import { defineConfig, devices } from '@playwright/test'
import { e2eDatabaseName, e2eUsesOwnDatabase } from './tests/browser-e2e/e2e-database'

/**
 * Ports propres aux tests navigateur (épopée qualité SEO, checklist T8).
 *
 * Les tests réutilisaient le serveur de développement (3400 / 5400) et
 * basculaient son mode global : un mode réel posé par l'utilisateur leur a fait
 * appeler la vraie IA, et à l'inverse l'utilisateur voyait arriver des données
 * simulées. Ils démarrent désormais leur propre serveur sur d'autres ports.
 * `PORT` est posé ici pour que les helpers (`process.env.PORT`) suivent.
 */
const E2E_SERVER_PORT = Number(process.env.E2E_SERVER_PORT) || 3410
const E2E_CLIENT_PORT = Number(process.env.E2E_CLIENT_PORT) || 5410
// Seulement quand Playwright démarre lui-même le serveur : sinon (PLAYWRIGHT_NO_SERVER),
// c'est l'appelant qui choisit PORT pour viser son propre serveur.
if (!process.env.PLAYWRIGHT_NO_SERVER) process.env.PORT = String(E2E_SERVER_PORT)

/**
 * Base propre aux tests navigateur (T10), recréée par `pretest:browser`
 * (`scripts/e2e-test-db.ts`) : le serveur de test et les helpers (qui lisent la
 * base directement) y pointent, jamais sur celle de développement. Un passage
 * réel (`PARCOURS_REEL=1`) garde la base de développement : ses données sont
 * faites pour être relues.
 */
const E2E_DATABASE = e2eUsesOwnDatabase(process.env) ? e2eDatabaseName(process.env) : null
if (E2E_DATABASE) process.env.PG_DATABASE = E2E_DATABASE

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
  // `*.parcours.test.ts` : parcours « 8 temps » par sous-phase (tech-spec-parcours-8-temps).
  testMatch: ['**/*.browser.test.ts', '**/*.parcours.test.ts'],
  fullyParallel: false,             // Tests UI séquentiels — évite collisions DB
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${E2E_CLIENT_PORT}`,
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
          port: E2E_SERVER_PORT,
          reuseExistingServer: true,
          timeout: 60000,
          env: {
            AI_PROVIDER: 'mock',
            NODE_ENV: 'development',
            PORT: String(E2E_SERVER_PORT),
            ...(E2E_DATABASE ? { PG_DATABASE: E2E_DATABASE } : {}),
          },
        },
        {
          command: 'npm run dev:client',
          port: E2E_CLIENT_PORT,
          reuseExistingServer: true,
          timeout: 60000,
          // Cache Vite séparé : une ré-optimisation côté tests ne doit pas recharger le front de l'utilisateur.
          env: { PORT: String(E2E_SERVER_PORT), VITE_PORT: String(E2E_CLIENT_PORT), VITE_CACHE_DIR: 'node_modules/.vite-e2e' },
        },
      ],
})
