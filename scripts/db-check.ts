/**
 * Compare l'empreinte du schéma DB Postgres locale à celle stockée dans
 * server/db/schema.sql.
 *
 * - Empreintes identiques → snapshot fiable, exit 0
 * - Empreintes différentes → DB modifiée depuis le snapshot, exit 1
 * - schema.sql absent → exit 1 (jamais initialisé)
 *
 * Utilisé en `predev` pour warner au démarrage.
 *
 * Usage :
 *   npm run db:check
 */

import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  createPool,
  introspectSchema,
  computeSchemaFingerprint,
} from './db-introspect.js'

const SCHEMA_PATH = resolve('server/db/schema.sql')
const FINGERPRINT_RE = /-- Empreinte schéma : sha256:([a-f0-9]{64})/

function readSnapshotFingerprint(): string | null {
  if (!existsSync(SCHEMA_PATH)) return null
  const content = readFileSync(SCHEMA_PATH, 'utf8')
  const match = content.match(FINGERPRINT_RE)
  return match?.[1] ?? null
}

async function main(): Promise<void> {
  const stored = readSnapshotFingerprint()

  if (stored == null) {
    console.error('✗ Aucun snapshot trouvé à server/db/schema.sql')
    console.error('  → Lance `npm run db:snapshot` pour en générer un.')
    process.exit(1)
  }

  const pool = createPool()
  try {
    const schemaSql = await introspectSchema(pool)
    const live = await computeSchemaFingerprint(pool, schemaSql)

    if (live === stored) {
      console.log('✓ DB et snapshot alignés (empreinte identique)')
      process.exit(0)
    }

    console.error('⚠️  DB modifiée depuis le dernier snapshot')
    console.error(`   Snapshot : sha256:${stored.slice(0, 16)}…`)
    console.error(`   DB live  : sha256:${live.slice(0, 16)}…`)
    console.error('   → Lance `npm run db:snapshot` pour resynchroniser.')
    process.exit(1)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`✗ Échec check : ${message}`)
    console.error('  (DB indisponible ? Vérifie que Postgres tourne.)')
    process.exit(1)
  } finally {
    await pool.end()
  }
}

main()
