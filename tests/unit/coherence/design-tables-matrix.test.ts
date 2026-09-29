// @vitest-environment node
/**
 * Cohérence schéma SQL ↔ matrice tables ↔ exigences du document de design
 *
 * Ce test garantit qu'aucune table vivante en DB n'est invisible au design :
 *   1. Parse le snapshot `server/db/schema.sql` (état courant du schéma ; les
 *      anciennes migrations sont archivées et ne font plus foi).
 *   2. Parse la matrice « Matrice tables ↔ exigences » du chapitre
 *      `design/02-donnees.md` (modèle de données) pour extraire les tables référencées.
 *   3. Assertion : tout `live_table` doit avoir une ligne dans la matrice.
 *
 * Couvre la règle de maintenance de la matrice :
 * « toute table créée ou modifiée reçoit ou met à jour sa ligne ».
 *
 * Avant la consolidation de la documentation (2026-09-28), la matrice vivait
 * dans `prd.md` §8.14.bis ; celle-ci reste pour l'historique, elle n'est plus lue.
 *
 * Voir aussi :
 *   - design/02-donnees.md (modèle de données)
 *   - CLAUDE.md §3.2 (header AUTHORITY:)
 */

import { describe, it, expect } from 'vitest'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

const PROJECT_ROOT = join(__dirname, '..', '..', '..')
const SCHEMA_PATH = join(PROJECT_ROOT, 'server', 'db', 'schema.sql')
const DESIGN_PATH = join(PROJECT_ROOT, 'design', '02-donnees.md')
const MATRIX_TITLE = '## Matrice tables ↔ exigences'

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
// PART 2: Helpers — parse la matrice du document de design
// ============================================================================

/**
 * Parse la matrice « Matrice tables ↔ exigences » de `design/02-donnees.md` et
 * retourne la liste des tables référencées, jusqu'au titre suivant.
 * Format attendu : lignes Markdown commençant par `| \`table_name\` |`.
 */
async function getMatrixTables(): Promise<Set<string>> {
  const md = await readFile(DESIGN_PATH, 'utf8')
  const matrixHeaderIdx = md.indexOf(MATRIX_TITLE)
  expect(matrixHeaderIdx, `Section « ${MATRIX_TITLE} » introuvable dans design/02-donnees.md`).toBeGreaterThan(-1)
  const afterHeader = matrixHeaderIdx + MATRIX_TITLE.length
  const nextHeading = md.slice(afterHeader).search(/^#{1,2} /m)
  const matrixBlock = md.slice(matrixHeaderIdx, nextHeading > -1 ? afterHeader + nextHeading : undefined)

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

describe('Design — matrice tables ↔ exigences (cohérence schéma)', () => {
  it('toute table vivante du schéma figure dans la matrice du design', async () => {
    const live = await getLiveTables()
    const matrix = await getMatrixTables()
    const missing: string[] = []
    for (const t of live) {
      if (!matrix.has(t)) missing.push(t)
    }
    expect(
      missing,
      `Tables vivantes en DB non documentées dans la matrice de design/02-donnees.md : ${missing.join(', ') || '(aucune)'}\n` +
        `→ Ajoute une ligne dans la matrice, et une exigence FR-INFRA-* dans spec/requirements.md si la table mérite une autorité dédiée.`,
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
