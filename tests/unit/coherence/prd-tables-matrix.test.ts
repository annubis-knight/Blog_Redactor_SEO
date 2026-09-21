// @vitest-environment node
/**
 * Cohérence schéma SQL ↔ matrice de couverture PRD §8.14.bis
 *
 * Ce test garantit qu'aucune table vivante en DB n'est invisible au PRD :
 *   1. Parse le snapshot `server/db/schema.sql` (état courant du schéma ; les
 *      anciennes migrations sont archivées et ne font plus foi).
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
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

const PROJECT_ROOT = join(__dirname, '..', '..', '..')
const SCHEMA_PATH = join(PROJECT_ROOT, 'server', 'db', 'schema.sql')
const PRD_PATH = join(PROJECT_ROOT, '_bmad-output', 'planning-artifacts', 'prd.md')

// ============================================================================
// PART 1: Helpers — parse schema.sql
// ============================================================================

/** Tables vivantes en DB, lues dans le snapshot `schema.sql` (`CREATE TABLE "foo" (`). */
async function getLiveTables(): Promise<Set<string>> {
  const sql = await readFile(SCHEMA_PATH, 'utf8')
  const live = new Set<string>()
  for (const m of sql.matchAll(/^CREATE TABLE\s+"?([a-z_]+)"?\s*\(/gim)) {
    live.add(m[1]!.toLowerCase())
  }
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

describe('PRD §8.14.bis — matrice tables ↔ FR (cohérence schéma)', () => {
  it('toute table vivante du schéma figure dans la matrice du PRD', async () => {
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
      `La matrice référence des tables absentes de schema.sql : ${realGhosts.join(', ') || '(aucune)'}`,
    ).toEqual([])
  })

  it('au moins 20 tables vivantes (sentinelle anti-régression)', async () => {
    const live = await getLiveTables()
    // Au 2026-05-05, la DB live contient 20 tables. Si ce chiffre baisse,
    // c'est probablement un drop accidentel. Si il monte, ce test ne casse pas
    // (c'est le 1er test qui force la mise à jour de la matrice).
    expect(live.size).toBeGreaterThanOrEqual(20)
  })

  it('intent_explorations a bien disparu du schéma (FR-INFRA-INTENT-EXPLORATIONS-LEGACY)', async () => {
    // Supprimée par l'ancienne migration 016 (archivée) : le schéma courant ne la contient plus.
    const live = await getLiveTables()
    expect(live.has('intent_explorations')).toBe(false)
  })
})
