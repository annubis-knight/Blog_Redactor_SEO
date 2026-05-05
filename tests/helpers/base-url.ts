/**
 * AUTHORITY: tests/helpers/base-url.ts (constantes URL pour les tests)
 * READS FROM: process.env.TEST_BASE_URL, process.env.PORT
 * CONSUMERS: tests/helpers/api-client.ts, tests/helpers/test-context.ts,
 *            tests/browser-e2e/helpers/test-fixtures.ts, tests/contract-api/*,
 *            tests/e2e-workflows/*, tests/integration-tabs/*
 * RELATED FR: NFR-CFG-APP-PORTS
 *
 * Centralise l'URL de base utilisée par tous les tests qui appellent l'API.
 * Permet de surcharger via TEST_BASE_URL (utilisé par playwright webServer
 * pour pointer sur un autre port en parallèle).
 */
export const TEST_API_PORT = Number(process.env.PORT) || 3400
export const TEST_API_BASE_URL =
  process.env.TEST_BASE_URL ?? `http://localhost:${TEST_API_PORT}/api`

/** URL absolue d'un endpoint /api/...  */
export function apiUrl(path: string): string {
  const cleaned = path.startsWith('/') ? path : `/${path}`
  // path peut commencer par "/api/..." (anciens tests) ou "/..."
  if (cleaned.startsWith('/api/')) {
    const root = TEST_API_BASE_URL.replace(/\/api\/?$/, '')
    return `${root}${cleaned}`
  }
  return `${TEST_API_BASE_URL}${cleaned}`
}
