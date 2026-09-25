/**
 * La base des tests navigateur (T10) : une seule définition pour la
 * configuration Playwright (serveur de test, helpers) et pour le script qui la
 * recrée avant chaque passage (`scripts/e2e-test-db.ts`).
 */
type Env = Record<string, string | undefined>

/** Nom de la base des tests navigateur. */
export function e2eDatabaseName(env: Env): string {
  return env.E2E_PG_DATABASE || 'blog_redactor_seo_test'
}

/**
 * Vrai quand les tests ont leur propre base. Faux pour un passage réel
 * (`PARCOURS_REEL=1` : ses données sont gardées pour être relues) et quand les
 * tests visent un serveur déjà lancé (`PLAYWRIGHT_NO_SERVER` : c'est sa base).
 */
export function e2eUsesOwnDatabase(env: Env): boolean {
  return env.PARCOURS_REEL !== '1' && !env.PLAYWRIGHT_NO_SERVER
}

/**
 * Garde-fou avant de recréer la base : seule une base jetable (nom en `_test`)
 * qui n'est pas celle de développement peut l'être. Rend le motif du refus,
 * ou `null` si la base peut être recréée.
 */
export function refuseToRecreate(target: string, devDatabase: string): string | null {
  if (!target.endsWith('_test')) return `le nom « ${target} » doit finir par _test`
  if (target === devDatabase) return `« ${target} » est la base de .env`
  return null
}
