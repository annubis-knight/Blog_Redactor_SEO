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
