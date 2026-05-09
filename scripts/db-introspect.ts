/**
 * Introspecte le schéma PostgreSQL via information_schema + pg_catalog
 * et produit du SQL `CREATE TABLE / INDEX / CONSTRAINT` reproductible.
 *
 * Utilisé par scripts/db-snapshot.ts et scripts/db-check.ts.
 */

import 'dotenv/config'
import pg from 'pg'

const { Pool } = pg

export function createPool(): pg.Pool {
  return new Pool({
    host: process.env.PG_HOST ?? 'localhost',
    port: Number(process.env.PG_PORT ?? 5432),
    user: process.env.PG_USER ?? 'postgres',
    password: process.env.PG_PASSWORD,
    database: process.env.PG_DATABASE ?? 'blog_redactor_seo',
    max: 2,
    idleTimeoutMillis: 5000,
    connectionTimeoutMillis: 5000,
  })
}

interface ColumnRow {
  table_name: string
  column_name: string
  ordinal_position: number
  is_nullable: 'YES' | 'NO'
  data_type: string
  udt_name: string
  character_maximum_length: number | null
  numeric_precision: number | null
  numeric_scale: number | null
  column_default: string | null
}

interface ConstraintRow {
  table_name: string
  constraint_name: string
  constraint_type: 'PRIMARY KEY' | 'UNIQUE' | 'FOREIGN KEY' | 'CHECK'
  definition: string
}

interface IndexRow {
  table_name: string
  index_name: string
  index_def: string
  is_unique: boolean
  is_primary: boolean
  is_constraint: boolean
}

interface SequenceRow {
  sequence_name: string
}

function formatColumn(col: ColumnRow): string {
  const parts: string[] = [`  "${col.column_name}"`]

  // Type
  let type = col.udt_name.toUpperCase()
  if (col.data_type === 'ARRAY') {
    // udt_name pour ARRAY est de la forme `_text`, `_int4`, etc.
    const baseType = col.udt_name.startsWith('_')
      ? col.udt_name.slice(1).toUpperCase()
      : col.udt_name.toUpperCase()
    type = `${normalizeType(baseType)}[]`
  } else {
    type = normalizeType(type)
    if (col.character_maximum_length != null && type === 'VARCHAR') {
      type = `VARCHAR(${col.character_maximum_length})`
    } else if (
      col.numeric_precision != null &&
      col.numeric_scale != null &&
      type === 'NUMERIC'
    ) {
      type = `NUMERIC(${col.numeric_precision},${col.numeric_scale})`
    }
  }
  parts.push(type)

  // NOT NULL
  if (col.is_nullable === 'NO') parts.push('NOT NULL')

  // DEFAULT
  if (col.column_default != null) {
    parts.push(`DEFAULT ${col.column_default}`)
  }

  return parts.join(' ')
}

function normalizeType(type: string): string {
  // Mappe les noms internes Postgres vers les noms SQL standards
  const map: Record<string, string> = {
    INT4: 'INTEGER',
    INT8: 'BIGINT',
    INT2: 'SMALLINT',
    BPCHAR: 'CHAR',
    VARCHAR: 'VARCHAR',
    TIMESTAMPTZ: 'TIMESTAMPTZ',
    TIMESTAMP: 'TIMESTAMP',
    BOOL: 'BOOLEAN',
    FLOAT4: 'REAL',
    FLOAT8: 'DOUBLE PRECISION',
  }
  return map[type] ?? type
}

/**
 * Génère un SQL canonique reproductible du schéma actuel.
 * L'ordre est déterministe (alphabétique) pour permettre le hash stable.
 */
export async function introspectSchema(pool: pg.Pool): Promise<string> {
  const sections: string[] = []

  // ─── Tables + colonnes ───────────────────────────────────────────────
  const tablesRes = await pool.query<{ table_name: string }>(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `)

  const tables = tablesRes.rows.map((r) => r.table_name)

  const colsRes = await pool.query<ColumnRow>(`
    SELECT
      table_name,
      column_name,
      ordinal_position,
      is_nullable,
      data_type,
      udt_name,
      character_maximum_length,
      numeric_precision,
      numeric_scale,
      column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position
  `)

  // Contraintes (PK, UNIQUE, CHECK, FK)
  // On filtre les CHECK auto-générés pour NOT NULL (présents dans information_schema
  // sur Postgres récents) — ils sont déjà rendus par la colonne avec NOT NULL.
  const constraintsRes = await pool.query<ConstraintRow>(`
    SELECT
      tc.table_name,
      tc.constraint_name,
      tc.constraint_type,
      pg_get_constraintdef(c.oid) AS definition
    FROM information_schema.table_constraints tc
    JOIN pg_constraint c ON c.conname = tc.constraint_name
    JOIN pg_namespace n ON n.oid = c.connamespace AND n.nspname = tc.table_schema
    WHERE tc.table_schema = 'public'
      AND tc.constraint_type IN ('PRIMARY KEY', 'UNIQUE', 'FOREIGN KEY', 'CHECK')
      AND c.contype <> 'n'  -- exclut les NOT NULL implicites (Postgres 17+)
    ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name
  `)

  for (const table of tables) {
    const cols = colsRes.rows.filter((c) => c.table_name === table)
    const tableConstraints = constraintsRes.rows.filter(
      (c) => c.table_name === table
    )

    const lines: string[] = []
    lines.push(`CREATE TABLE "${table}" (`)

    const colDefs = cols.map(formatColumn)
    const constraintDefs = tableConstraints.map(
      (c) => `  CONSTRAINT "${c.constraint_name}" ${c.definition}`
    )

    lines.push([...colDefs, ...constraintDefs].join(',\n'))
    lines.push(');')

    sections.push(lines.join('\n'))
  }

  // ─── Index (hors ceux liés aux contraintes PK/UNIQUE) ────────────────
  const indexesRes = await pool.query<IndexRow>(`
    SELECT
      t.relname AS table_name,
      i.relname AS index_name,
      pg_get_indexdef(ix.indexrelid) AS index_def,
      ix.indisunique AS is_unique,
      ix.indisprimary AS is_primary,
      EXISTS (
        SELECT 1 FROM pg_constraint con
        WHERE con.conindid = ix.indexrelid
      ) AS is_constraint
    FROM pg_index ix
    JOIN pg_class t ON t.oid = ix.indrelid
    JOIN pg_class i ON i.oid = ix.indexrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relkind = 'r'
    ORDER BY t.relname, i.relname
  `)

  const standaloneIndexes = indexesRes.rows.filter(
    (i) => !i.is_primary && !i.is_constraint
  )

  if (standaloneIndexes.length > 0) {
    sections.push('-- Indexes')
    for (const idx of standaloneIndexes) {
      sections.push(`${idx.index_def};`)
    }
  }

  // ─── Sequences ───────────────────────────────────────────────────────
  const seqRes = await pool.query<SequenceRow>(`
    SELECT sequence_name
    FROM information_schema.sequences
    WHERE sequence_schema = 'public'
    ORDER BY sequence_name
  `)

  if (seqRes.rows.length > 0) {
    sections.push('-- Sequences')
    for (const seq of seqRes.rows) {
      sections.push(`-- (auto-créée par SERIAL/IDENTITY) "${seq.sequence_name}"`)
    }
  }

  return sections.join('\n\n') + '\n'
}

/**
 * Empreinte stable du schéma : hash SHA-256 du SQL canonique introspecté.
 * Indépendant de la date, du commit, des données.
 */
export async function computeSchemaFingerprint(
  pool: pg.Pool,
  schemaSql: string
): Promise<string> {
  void pool
  const { createHash } = await import('node:crypto')
  return createHash('sha256').update(schemaSql, 'utf8').digest('hex')
}

export async function getTableCount(pool: pg.Pool): Promise<number> {
  const res = await pool.query<{ count: string }>(`
    SELECT COUNT(*)::text AS count
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  `)
  return Number(res.rows[0]?.count ?? 0)
}
