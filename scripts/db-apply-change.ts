/**
 * Applique un changement de schéma daté (`server/db/changes/*.sql`) à la base
 * de `.env`, dans une transaction : tout passe, ou rien.
 *
 *   npm run db:apply -- server/db/changes/2026-09-25-article-parent.sql
 *
 * Les changements sont écrits idempotents (rejouables sans risque). Après
 * application, `npm run db:snapshot` capture le nouvel état dans
 * `server/db/schema.sql` et `server/db/bootstrap.sql`.
 */
import 'dotenv/config'
import { readFileSync, existsSync } from 'node:fs'
import { resolve, relative, sep } from 'node:path'
import { pool } from '../server/db/client.js'

async function main(): Promise<void> {
  const arg = process.argv.slice(2).find(a => !a.startsWith('--'))
  if (!arg) throw new Error('Préciser le fichier : npm run db:apply -- server/db/changes/<date>-<sujet>.sql')
  const file = resolve(arg)
  const changesDir = resolve('server/db/changes')
  if (!file.startsWith(changesDir + sep) || !file.endsWith('.sql')) {
    throw new Error(`Seuls les changements de server/db/changes/ s'appliquent (reçu : ${arg}).`)
  }
  if (!existsSync(file)) throw new Error(`Fichier introuvable : ${arg}`)

  const sql = readFileSync(file, 'utf8')
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(sql)
    await client.query('COMMIT')
    console.log(`✓ ${relative(process.cwd(), file)} appliqué à ${process.env.PG_DATABASE ?? 'la base'}.`)
    console.log('  Étape suivante : npm run db:snapshot')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

main()
  .catch((err: Error) => {
    console.error(`✗ ${err.message}`)
    process.exitCode = 1
  })
  .finally(() => pool.end())
