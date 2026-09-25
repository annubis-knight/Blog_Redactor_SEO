/**
 * Base dédiée aux tests navigateur (épopée qualité SEO, checklist T10).
 *
 * Les tests navigateur écrivaient dans la base de développement : fixtures
 * `[test:…]` présentes pendant l'exécution (et restées quand un test plantait),
 * caches permanents (`keyword_metrics`) remplis des données factices du bac à
 * sable. Avant chaque passage (`pretest:browser`), ce script recrée une base
 * jetable depuis `server/db/bootstrap.sql`, amorcée comme en CI.
 *
 *   npm run test:browser          → base `blog_redactor_seo_test` recréée
 *   PARCOURS_REEL=1 …              → rien : le passage réel garde ses données
 *   PLAYWRIGHT_NO_SERVER=1 …       → rien : les tests visent un serveur existant
 *
 * Garde-fou : seule une base dont le nom finit par `_test`, et qui n'est pas
 * celle de `.env`, peut être recréée.
 */
import 'dotenv/config'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import pg from 'pg'
import { e2eDatabaseName, e2eUsesOwnDatabase } from '../tests/browser-e2e/e2e-database.js'

const connection = {
  host: process.env.PG_HOST ?? 'localhost',
  port: Number(process.env.PG_PORT ?? 5432),
  user: process.env.PG_USER ?? 'postgres',
  password: process.env.PG_PASSWORD,
}

async function withClient<T>(database: string, fn: (client: pg.Client) => Promise<T>): Promise<T> {
  const client = new pg.Client({ ...connection, database })
  await client.connect()
  try {
    return await fn(client)
  } finally {
    await client.end()
  }
}

async function main(): Promise<void> {
  if (!e2eUsesOwnDatabase(process.env)) {
    console.log('[e2e-test-db] base de développement conservée (passage réel ou serveur existant).')
    return
  }
  const target = e2eDatabaseName(process.env)
  const devDatabase = process.env.PG_DATABASE ?? 'blog_redactor_seo'
  if (!target.endsWith('_test') || target === devDatabase) {
    throw new Error(`[e2e-test-db] refus de recréer « ${target} » : le nom doit finir par _test et différer de la base de .env (${devDatabase}).`)
  }

  const started = Date.now()
  await withClient('postgres', async (admin) => {
    // Un serveur de test d'un passage précédent tiendrait encore des connexions.
    await admin.query(`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`, [target])
    await admin.query(`DROP DATABASE IF EXISTS "${target}"`)
    await admin.query(`CREATE DATABASE "${target}"`)
  })
  const bootstrap = readFileSync(join(process.cwd(), 'server', 'db', 'bootstrap.sql'), 'utf8')
  await withClient(target, client => client.query(bootstrap))
  // Nouvelle connexion : bootstrap.sql vide le search_path de la sienne.
  await withClient(target, client => client.query(
    `INSERT INTO silos (nom, description) VALUES ('Stratégie & Visibilité', 'Silo des tests navigateur') ON CONFLICT DO NOTHING`,
  ))
  console.log(`[e2e-test-db] base « ${target} » recréée depuis bootstrap.sql (${Date.now() - started} ms).`)
}

main().catch((err: Error) => {
  console.error(err.message)
  process.exit(1)
})
