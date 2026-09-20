/**
 * Sauvegarde complète de la base PostgreSQL (structure + données) via pg_dump.
 *
 * Pourquoi ce script : `server/db/schema.sql` ne contient que la STRUCTURE et
 * n'est pas rejouable (les séquences y sont en commentaire). Les articles
 * rédigés n'existent donc que dans la base tant qu'aucun dump n'est pris.
 *
 * Usage :
 *   npm run db:backup                 # → data/_backup_pg_<horodatage>.sql
 *   npm run db:backup -- --out=x.sql  # chemin de sortie explicite
 *
 * Le binaire pg_dump est cherché dans cet ordre :
 *   1. $PG_DUMP_PATH   2. le PATH   3. les installations Windows standard
 *
 * Les fichiers `data/_backup_*.sql` sont gitignorés (volumineux, données métier).
 */

import 'dotenv/config'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, statSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'

const BACKUP_DIR = resolve('data')

/** Horodatage local `YYYYMMDD-HHmm`, lisible et triable. */
function timestamp(): string {
  const d = new Date()
  const p = (n: number): string => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`
}

/** Emplacements d'installation Windows les plus courants (versions décroissantes). */
function windowsCandidates(): string[] {
  const roots = ['C:/Program Files/PostgreSQL', 'C:/Program Files (x86)/PostgreSQL']
  const found: string[] = []
  for (const root of roots) {
    if (!existsSync(root)) continue
    const versions = readdirSync(root).sort().reverse()
    for (const v of versions) {
      const exe = `${root}/${v}/bin/pg_dump.exe`
      if (existsSync(exe)) found.push(exe)
    }
  }
  return found
}

/** Renvoie un binaire pg_dump utilisable, ou lève une erreur explicite. */
export function resolvePgDump(env: NodeJS.ProcessEnv = process.env): string {
  const candidates = [env.PG_DUMP_PATH, 'pg_dump', ...windowsCandidates()].filter(
    (c): c is string => Boolean(c),
  )

  for (const candidate of candidates) {
    try {
      execFileSync(candidate, ['--version'], { stdio: 'ignore' })
      return candidate
    } catch {
      // candidat suivant
    }
  }

  throw new Error(
    'pg_dump introuvable. Renseigne PG_DUMP_PATH dans .env ' +
      '(ex. C:/Program Files/PostgreSQL/18/bin/pg_dump.exe).',
  )
}

/** Chemin de sortie : `--out=<fichier>` sinon `data/_backup_pg_<horodatage>.sql`. */
export function resolveOutPath(argv: string[], now: string = timestamp()): string {
  const flag = argv.find((a) => a.startsWith('--out='))
  if (flag) return resolve(flag.slice('--out='.length))
  return resolve(BACKUP_DIR, `_backup_pg_${now}.sql`)
}

function main(): void {
  const outPath = resolveOutPath(process.argv.slice(2))
  const database = process.env.PG_DATABASE ?? 'blog_redactor_seo'
  const host = process.env.PG_HOST ?? 'localhost'
  const port = process.env.PG_PORT ?? '5432'
  const user = process.env.PG_USER ?? 'postgres'

  const pgDump = resolvePgDump()
  mkdirSync(dirname(outPath), { recursive: true })

  console.log(`→ Sauvegarde de « ${database} » (${host}:${port}) …`)
  execFileSync(
    pgDump,
    [
      '--host', host,
      '--port', String(port),
      '--username', user,
      '--dbname', database,
      '--format', 'plain',
      '--no-owner',
      '--no-privileges',
      '--file', outPath,
    ],
    {
      stdio: ['ignore', 'inherit', 'inherit'],
      env: { ...process.env, PGPASSWORD: process.env.PG_PASSWORD ?? '' },
    },
  )

  const size = statSync(outPath).size
  console.log(`✓ Sauvegarde écrite : ${outPath}`)
  console.log(`  Taille : ${(size / 1024 / 1024).toFixed(2)} Mo`)
  if (size < 10_000) {
    console.warn('⚠️  Fichier suspicieusement petit — vérifie son contenu.')
    process.exitCode = 1
  }
}

// Exécuté directement (pas importé par un test)
if (process.argv[1] && process.argv[1].includes('db-backup')) {
  main()
}
