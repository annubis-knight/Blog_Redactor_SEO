/**
 * Génère server/db/bootstrap.sql : le schéma REJOUABLE de la base (tables,
 * séquences, contraintes, index), produit par `pg_dump --schema-only`.
 *
 * Pourquoi un second fichier à côté de schema.sql ?
 *   - schema.sql est une introspection lisible, triée par nom, qui sert à
 *     `db:check` (empreinte). Elle n'est pas rejouable : une clé étrangère peut
 *     y précéder la table qu'elle vise, et les séquences n'y sont qu'en
 *     commentaire.
 *   - La CI doit pouvoir créer une base vide. Elle bouclait sur
 *     server/db/migrations/*.sql, archivées depuis mai : plus aucune table
 *     n'était créée (épopée qualité SEO, réparation de la CI).
 *
 * L'en-tête reprend l'empreinte de schema.sql : le test
 * `db-bootstrap-sync` compare les deux, si bien qu'un schéma modifié sans
 * régénérer le bootstrap ne passe pas `npm run verify`.
 *
 * Usage : npm run db:bootstrap (appelé aussi par npm run db:snapshot).
 * pg_dump est cherché dans PG_DUMP, puis dans le PATH, puis dans l'installation
 * Windows par défaut (C:/Program Files/PostgreSQL/<version>/bin). Il doit être
 * de la même version majeure que le serveur, ou plus récent.
 */
import { writeFileSync, existsSync, readdirSync, readFileSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import 'dotenv/config'
import { cleanDump, readFingerprint } from './db-bootstrap-clean.js'

const BOOTSTRAP_PATH = resolve('server/db/bootstrap.sql')
const SCHEMA_PATH = resolve('server/db/schema.sql')

function findPgDump(): string | null {
  if (process.env.PG_DUMP) {
    if (existsSync(process.env.PG_DUMP)) return process.env.PG_DUMP
    console.warn(`⚠️  PG_DUMP=${process.env.PG_DUMP} introuvable : recherche dans le PATH.`)
  }
  try {
    execFileSync('pg_dump', ['--version'], { stdio: 'ignore' })
    return 'pg_dump'
  } catch { /* pas dans le PATH */ }
  const root = 'C:/Program Files/PostgreSQL'
  if (existsSync(root)) {
    const versions = readdirSync(root).filter(v => /^\d+$/.test(v)).sort((a, b) => Number(b) - Number(a))
    for (const v of versions) {
      const candidate = join(root, v, 'bin', 'pg_dump.exe')
      if (existsSync(candidate)) return candidate
    }
  }
  return null
}

/**
 * Régénère bootstrap.sql. Renvoie `false` (avec un message) si pg_dump est
 * introuvable ou échoue : l'appelant décide d'en faire une erreur.
 */
export function generateBootstrap(): boolean {
  const pgDump = findPgDump()
  if (!pgDump) {
    console.error('✗ pg_dump introuvable : server/db/bootstrap.sql n’a pas été régénéré (définir PG_DUMP).')
    return false
  }
  const env = { ...process.env }
  if (process.env.PG_PASSWORD !== undefined) env.PGPASSWORD = process.env.PG_PASSWORD
  let dump: string
  try {
    dump = execFileSync(pgDump, [
      '--schema-only', '--no-owner', '--no-privileges', '--no-comments', '-w',
      '-h', process.env.PG_HOST ?? 'localhost',
      '-p', process.env.PG_PORT ?? '5432',
      '-U', process.env.PG_USER ?? 'postgres',
      '-d', process.env.PG_DATABASE ?? 'blog_redactor_seo',
    ], { encoding: 'utf8', env, stdio: ['ignore', 'pipe', 'pipe'] })
  } catch (err) {
    const stderr = (err as { stderr?: string }).stderr ?? (err as Error).message
    console.error(`✗ pg_dump a échoué (${pgDump}) : ${stderr.trim()}`)
    console.error('  Un pg_dump plus ancien que le serveur refuse de le lire : utiliser celui de la même version (PG_DUMP).')
    return false
  }

  const fingerprint = existsSync(SCHEMA_PATH) ? readFingerprint(readFileSync(SCHEMA_PATH, 'utf8')) : null
  const header = [
    '-- ============================================================',
    '-- BOOTSTRAP — schéma rejouable de Blog Redactor SEO',
    '-- ============================================================',
    '-- ⚠️  Fichier généré par `npm run db:bootstrap` (ou db:snapshot).',
    '-- NE PAS éditer à la main. Sert à créer une base vide (CI).',
    '-- Usage : psql -v ON_ERROR_STOP=1 -d <base> -f server/db/bootstrap.sql',
    `-- Empreinte schéma (schema.sql) : sha256:${fingerprint ?? 'inconnue'}`,
    '-- ============================================================',
    '',
  ].join('\n')
  writeFileSync(BOOTSTRAP_PATH, header + cleanDump(dump), 'utf8')
  console.log(`✓ ${BOOTSTRAP_PATH} régénéré`)
  return true
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (!generateBootstrap()) process.exit(1)
}
