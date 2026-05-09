/**
 * Génère server/db/schema.sql à partir de la DB Postgres locale.
 *
 * Le snapshot inclut un header avec :
 *   - empreinte du schéma (hash SHA-256) → seul critère de fraîcheur fiable
 *   - infos git (commit, branche, working tree clean/dirty) → repère temporel
 *   - timestamp de génération
 *
 * Usage :
 *   npm run db:snapshot
 */

import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { execSync } from 'node:child_process'
import {
  createPool,
  introspectSchema,
  computeSchemaFingerprint,
  getTableCount,
} from './db-introspect.js'

const SCHEMA_PATH = resolve('server/db/schema.sql')

interface GitInfo {
  commit: string
  branch: string
  subject: string
  clean: boolean
}

function getGitInfo(): GitInfo {
  const safe = (cmd: string): string => {
    try {
      return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
    } catch {
      return '(git non disponible)'
    }
  }

  const status = safe('git status --porcelain')
  return {
    commit: safe('git rev-parse --short HEAD'),
    branch: safe('git rev-parse --abbrev-ref HEAD'),
    subject: safe('git log -1 --pretty=%s'),
    clean: status === '',
  }
}

function buildHeader(opts: {
  fingerprint: string
  tableCount: number
  git: GitInfo
}): string {
  const now = new Date().toISOString()
  const cleanLabel = opts.git.clean ? 'oui' : '⚠️  NON (modifs non commitées)'
  return [
    '-- ============================================================',
    '-- SCHEMA SNAPSHOT — Blog Redactor SEO',
    '-- ============================================================',
    `-- Généré le        : ${now}`,
    `-- Commit git       : ${opts.git.commit} (${opts.git.branch})`,
    `-- Sujet commit     : ${opts.git.subject}`,
    `-- Working tree     : ${cleanLabel}`,
    `-- Tables           : ${opts.tableCount}`,
    `-- Empreinte schéma : sha256:${opts.fingerprint}`,
    '-- ============================================================',
    "-- ⚠️  Fichier généré automatiquement. NE PAS éditer à la main.",
    '--',
    '-- Vérifier la fraîcheur : npm run db:check',
    '--   → compare l\'empreinte de la DB live à celle ci-dessus.',
    '--   → si différentes, la DB a été modifiée depuis ce snapshot.',
    '--',
    '-- Régénérer            : npm run db:snapshot',
    '-- ============================================================',
    '',
    '',
  ].join('\n')
}

async function main(): Promise<void> {
  const pool = createPool()
  try {
    const schemaSql = await introspectSchema(pool)
    const fingerprint = await computeSchemaFingerprint(pool, schemaSql)
    const tableCount = await getTableCount(pool)
    const git = getGitInfo()

    const header = buildHeader({ fingerprint, tableCount, git })
    const fullContent = header + schemaSql

    writeFileSync(SCHEMA_PATH, fullContent, 'utf8')

    console.log(`✓ Snapshot écrit : ${SCHEMA_PATH}`)
    console.log(`  Tables           : ${tableCount}`)
    console.log(`  Empreinte schéma : sha256:${fingerprint.slice(0, 16)}…`)
    console.log(`  Commit           : ${git.commit} (${git.branch})${git.clean ? '' : '  ⚠️  dirty'}`)
  } finally {
    await pool.end()
  }
}

main().catch((err) => {
  console.error('✗ Échec snapshot :', err.message)
  process.exit(1)
})
