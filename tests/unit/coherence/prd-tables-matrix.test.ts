// @vitest-environment node
/**
 * Cohérence migrations SQL ↔ matrice de couverture PRD §8.14.bis
 *
 * Ce test garantit qu'aucune table vivante en DB n'est invisible au PRD :
 *   1. Parse les migrations `server/db/migrations/*.sql` pour calculer la liste
 *      des tables actuellement vivantes (CREATE TABLE - DROP TABLE + RENAME TO).
 *   2. Parse la matrice PRD (§8.14.bis) pour extraire les tables référencées.
 *   3. Assertion : tout `live_table` doit avoir une ligne dans la matrice.
 *
 * Couvre la règle de maintenance documentée en §8.14.bis :
 * « toute migration créant ou modifiant une table doit ajouter / mettre à jour
 *   une ligne dans cette matrice. »
 *
 * Voir aussi :
 *   - _bmad-output/planning-artifacts/prd.md §8.14 et §8.14.bis
 *   - CLAUDE.md §3.2 (header AUTHORITY:)
 */

import { describe, it, expect } from 'vitest'
import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'

const PROJECT_ROOT = join(__dirname, '..', '..', '..')
const MIGRATIONS_DIR = join(PROJECT_ROOT, 'server', 'db', 'migrations')
const PRD_PATH = join(PROJECT_ROOT, '_bmad-output', 'planning-artifacts', 'prd.md')

// ============================================================================
// PART 1: Helpers — parse migrations
// ============================================================================

/**
 * Parse l'ensemble des migrations et retourne la liste des tables actuellement
 * vivantes en DB. Algorithme :
 *   live = (UNION CREATE TABLE) - (UNION DROP TABLE) puis applique les RENAME.
 */
async function getLiveTables(): Promise<Set<string>> {
  const files = (await readdir(MIGRATIONS_DIR))
    .filter(f => f.endsWith('.sql'))
    .sort() // ordre numérique de migration

  const created = new Set<string>()
  const dropped = new Set<string>()
  const renames = new Map<string, string>() // old → new

  for (const file of files) {
    const sql = await readFile(join(MIGRATIONS_DIR, file), 'utf8')

    // CREATE TABLE [IF NOT EXISTS] foo
    for (const m of sql.matchAll(/CREATE TABLE(?:\s+IF NOT EXISTS)?\s+([a-z_]+)/gi)) {
      created.add(m[1].toLowerCase())
    }

    // DROP TABLE [IF EXISTS] foo
    for (const m of sql.matchAll(/DROP TABLE(?:\s+IF EXISTS)?\s+([a-z_]+)/gi)) {
      dropped.add(m[1].toLowerCase())
    }

    // ALTER TABLE foo RENAME TO bar
    for (const m of sql.matchAll(/ALTER TABLE\s+([a-z_]+)\s+RENAME\s+TO\s+([a-z_]+)/gi)) {
      renames.set(m[1].toLowerCase(), m[2].toLowerCase())
    }
  }

  // Tables vivantes = créées - droppées + appliquer renames
  const live = new Set<string>()
  for (const t of created) {
    if (dropped.has(t)) continue
    // Si la table a été renommée, on ne garde que le nouveau nom
    const renamedTo = renames.get(t)
    live.add(renamedTo ?? t)
  }
  // Une table renommée peut ne pas avoir un CREATE TABLE direct sous son nouveau nom
  for (const [, newName] of renames) live.add(newName)

  return live
}

// ============================================================================
// PART 2: Helpers — parse matrice PRD
// ============================================================================

/**
 * Parse la matrice PRD §8.14.bis et retourne la liste des tables référencées.
 * Format attendu : lignes Markdown commençant par `| \`table_name\` |`.
 */
async function getMatrixTables(): Promise<Set<string>> {
  const md = await readFile(PRD_PATH, 'utf8')
  const matrixHeaderIdx = md.indexOf('### 8.14.bis')
  expect(matrixHeaderIdx, 'Section §8.14.bis introuvable dans le PRD').toBeGreaterThan(-1)
  const matrixEnd = md.indexOf('### 8.15', matrixHeaderIdx)
  const matrixBlock = md.slice(matrixHeaderIdx, matrixEnd > -1 ? matrixEnd : undefined)

  const tables = new Set<string>()
  // Format : `| `table_name` | ...
  for (const m of matrixBlock.matchAll(/^\|\s*`([a-z_.]+)`/gim)) {
    // On ignore les colonnes "qualifiées" (ex: `articles.completed_checks`) qui sont
    // des sous-références — la table elle-même (`articles`) doit être présente par ailleurs.
    const ref = m[1].toLowerCase()
    if (!ref.includes('.')) tables.add(ref)
  }
  return tables
}

// ============================================================================
// PART 3: Tests
// ============================================================================

describe('PRD §8.14.bis — matrice tables ↔ FR (cohérence migrations)', () => {
  it('toute table vivante en migration figure dans la matrice du PRD', async () => {
    const live = await getLiveTables()
    const matrix = await getMatrixTables()
    const missing: string[] = []
    for (const t of live) {
      if (!matrix.has(t)) missing.push(t)
    }
    expect(
      missing,
      `Tables vivantes en DB non documentées dans la matrice PRD §8.14.bis : ${missing.join(', ') || '(aucune)'}\n` +
        `→ Ajoute une ligne dans la matrice + une FR-INFRA-* en §8.14 si la table mérite une autorité dédiée.`,
    ).toEqual([])
  })

  it("la matrice ne référence pas de table fantôme (drop ou jamais créée)", async () => {
    const live = await getLiveTables()
    const matrix = await getMatrixTables()
    const ghosts: string[] = []
    for (const t of matrix) {
      if (!live.has(t)) ghosts.push(t)
    }
    // `intent_explorations` est volontairement référencée comme legacy → on l'autorise.
    const allowedLegacy = new Set(['intent_explorations'])
    const realGhosts = ghosts.filter(t => !allowedLegacy.has(t))
    expect(
      realGhosts,
      `La matrice référence des tables qui n'existent pas en migration : ${realGhosts.join(', ') || '(aucune)'}`,
    ).toEqual([])
  })

  it('au moins 20 tables vivantes (sentinelle anti-régression)', async () => {
    const live = await getLiveTables()
    // Au 2026-05-05, la DB live contient 20 tables. Si ce chiffre baisse,
    // c'est probablement un drop accidentel. Si il monte, ce test ne casse pas
    // (c'est le 1er test qui force la mise à jour de la matrice).
    expect(live.size).toBeGreaterThanOrEqual(20)
  })

  it('intent_explorations est bien drop par migration 016 (FR-INFRA-INTENT-EXPLORATIONS-LEGACY)', async () => {
    const file = await readFile(join(MIGRATIONS_DIR, '016_drop_intent_explorations.sql'), 'utf8')
    expect(file).toMatch(/DROP TABLE IF EXISTS intent_explorations/i)
    // Idempotent (ne casse pas un replay sur DB déjà nettoyée)
    expect(file).toMatch(/IF EXISTS/i)
    // CASCADE pour gérer d'éventuelles FK
    expect(file).toMatch(/CASCADE/i)
  })
})
