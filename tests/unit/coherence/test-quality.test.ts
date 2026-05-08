// @vitest-environment node
/**
 * Garde-fou anti-régression qualité de la suite de tests.
 *
 * Pourquoi ce fichier ?
 * ----------------------
 * Une suite de tests peut donner un faux sentiment de sécurité quand elle
 * accumule des tests "verts mais vides" : tautologies (`expect(true).toBe(true)`),
 * branches conditionnelles silencieuses (`if (status === 200) { ... }` sans
 * else qui valide le cas inverse), tests `.todo()` jamais implémentés, tests
 * `.skip()` qu'on a oublié de réactiver. Ces patterns gonflent le compteur de
 * tests verts sans fournir aucune garantie réelle.
 *
 * Ce fichier scanne le repo et fait ÉCHOUER la suite si l'un de ces seuils
 * augmente vs la baseline figée le 2026-05-05 (juste après le chantier de
 * cleanup). Le but n'est pas d'imposer 0 todo/skip — c'est de forcer une
 * décision consciente quand on en ajoute (relâcher la baseline ici, ce qui
 * apparaîtra en code review).
 *
 * Mise à jour des seuils :
 *   - Si vous résorbez de la dette (par ex. implémentez 5 it.todo), vous
 *     POUVEZ baisser la limite ci-dessous (encouragé).
 *   - Si vous ajoutez du nouveau code legitimement non testable maintenant,
 *     créez un it.todo et MONTEZ la limite ici, en justifiant en commit.
 *
 * Voir aussi :
 *   - CLAUDE.md §2.1 (TDD strict)
 *   - tests/helpers/api-client.ts → expectSuccessOrKnownError()
 *     (helper qui remplace les `if (status === 200)` silencieux)
 */

import { describe, it, expect } from 'vitest'
import { readdir, readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'

const TESTS_ROOT = join(__dirname, '..', '..')

// ============================================================================
// Helpers — walk arborescence tests/
// ============================================================================

/**
 * Le scanner s'exclut lui-même : ce fichier contient les regex en literal
 * dans ses messages d'erreur, ce qui le ferait matcher ses propres patterns.
 */
const SELF_FILE_NAME = 'test-quality.test.ts'

async function walkTestFiles(dir: string): Promise<string[]> {
  const out: string[] = []
  const entries = await readdir(dir)
  for (const e of entries) {
    if (e === SELF_FILE_NAME) continue
    const full = join(dir, e)
    const st = await stat(full)
    if (st.isDirectory()) {
      const sub = await walkTestFiles(full)
      out.push(...sub)
    } else if (full.endsWith('.test.ts') || full.endsWith('.spec.ts')) {
      out.push(full)
    }
  }
  return out
}

interface ScanResult {
  total: number
  byFile: Record<string, number>
}

async function scanPattern(regex: RegExp): Promise<ScanResult> {
  const files = await walkTestFiles(TESTS_ROOT)
  const byFile: Record<string, number> = {}
  let total = 0
  for (const f of files) {
    const content = await readFile(f, 'utf8')
    // Reset lastIndex pour les regex /g
    regex.lastIndex = 0
    const matches = content.match(regex)
    if (matches && matches.length > 0) {
      const rel = f.replace(TESTS_ROOT, 'tests').replace(/\\/g, '/')
      byFile[rel] = matches.length
      total += matches.length
    }
  }
  return { total, byFile }
}

function formatViolations(byFile: Record<string, number>): string {
  return Object.entries(byFile)
    .sort(([, a], [, b]) => b - a)
    .map(([f, n]) => `  ${n}× ${f}`)
    .join('\n')
}

// ============================================================================
// Baselines (figées le 2026-05-05 après chantier A)
// ============================================================================
//
// Limites strictes (= 0 attendus, jamais autorisé) :
const STRICT_LIMITS = {
  tautologies: 0,                  // expect(true).toBe(true) → tueur silencieux
  conditionalSilent: 0,            // if (res.status === 200) { ... } sans else
} as const

// Limites souples (baseline actuelle, ne doit pas AUGMENTER) :
const SOFT_LIMITS = {
  // Sprint 1 (2026-05-05) — Refonte calcul Pertinence à la volée :
  //   29 it.todo ajoutés dans tests/unit/coherence/relevance-live-computation.test.ts
  //   en TDD. Ces todos sont des placeholders pour les tests d'intégration qui seront
  //   activés au fur et à mesure de l'implémentation (Sprints 2-9). Voir
  //   _bmad-output/implementation-artifacts/tech-spec-relevance-live-computation.md.
  // Baseline historique : 101. Nouvelle baseline : 130 (= 101 + 29).
  itTodo: 132,                     // it.todo(...) — non implémentés
  // Sprint 17 (2026-05-06) — Suppression boutons batch Lieutenants/Lexique
  // (FR-LIE-CHECKBOX-LOCK-IMMEDIATE, FR-LEX-CHECKBOX-LOCK-IMMEDIATE) :
  //   2 describe.skip (batch lock/validate),
  //   3 it.skip (resets isLocked, passes disabled, no-op when locked dans tests Lieutenants),
  //   1 it.skip (input désactivé Lexique gaps),
  //   1 it.skip (AC.J.21 lieutenant-lock layout),
  //   1 it.skip (recommendAndPropagateWordCount au lock),
  //   1 it.skip (AC.J.7.bis toggleLieutenant no-op).
  // Tests obsolètes mais conservés pour traçabilité.
  // Sprint 18 (2026-05-06) — 1 it.skip ajouté (saveHnStructure gaps test
  // obsolète post-Sprint 13 isLocked computed). À réécrire avec le nouveau
  // flow checkbox=lock immédiat.
  // Sprint 22 (2026-05-06) — Nouveau test E2E anti-duplication avec 3 test.skip
  // conditionnels (early return si fixture indisponible). Détectés 1 fois mais
  // comptés statiquement 3× par l'audit.
  // 2026-05-08 — Suppression du concept "panel locked" pour les Lieutenants :
  //   1 it.skip ajouté (initialLocked prop sets locked state immediately, obsolète).
  itSkip: 88,                      // it.skip / test.skip / describe.skip
} as const

// ============================================================================
// Tests
// ============================================================================

describe('Test quality — anti-régression qualité de la suite', () => {
  it(`zéro tautologie expect(true).toBe(true) (limite stricte: ${STRICT_LIMITS.tautologies})`, async () => {
    const { total, byFile } = await scanPattern(/expect\(true\)\.toBe\(true\)/g)
    expect(
      total,
      `${total} tautologie(s) trouvée(s). Une tautologie passe toujours, donc ne teste rien. ` +
        `Soit supprime le test, soit écris une vraie assertion. Localisations:\n${formatViolations(byFile)}`,
    ).toBeLessThanOrEqual(STRICT_LIMITS.tautologies)
  })

  it(`zéro pattern conditionnel silencieux (limite stricte: ${STRICT_LIMITS.conditionalSilent})`, async () => {
    // Pattern : `if (res.status === 200) { ... }` sans branche else qui valide
    // le cas inverse. Le test passe vert si l'API renvoie 429/500/404 sans rien
    // tester. Utiliser tests/helpers/api-client.ts → expectSuccessOrKnownError()
    // à la place.
    const { total, byFile } = await scanPattern(/if \(res\.status === 200\) \{/g)
    expect(
      total,
      `${total} pattern(s) "if (res.status === 200) { ... }" trouvé(s). Ce pattern fait passer ` +
        `silencieusement le test si l'API renvoie autre chose que 200. Remplace par ` +
        `expectSuccessOrKnownError(res) (cf. tests/helpers/api-client.ts). Localisations:\n${formatViolations(byFile)}`,
    ).toBeLessThanOrEqual(STRICT_LIMITS.conditionalSilent)
  })

  it(`it.todo() ne doit pas augmenter (baseline: ${SOFT_LIMITS.itTodo})`, async () => {
    // it.todo gonfle le compteur de tests sans rien tester. Acceptable comme
    // marqueur de dette mais on ne veut pas que ça augmente sans contrôle.
    const { total, byFile } = await scanPattern(/^\s*it\.todo\(/gm)
    expect(
      total,
      `${total} it.todo() trouvés (baseline=${SOFT_LIMITS.itTodo}). Si tu en as ajouté, soit ` +
        `implémente-les, soit baisse / monte la baseline dans ce fichier en justifiant en commit. ` +
        `Localisations:\n${formatViolations(byFile)}`,
    ).toBeLessThanOrEqual(SOFT_LIMITS.itTodo)
  })

  it(`it.skip / describe.skip ne doivent pas augmenter (baseline: ${SOFT_LIMITS.itSkip})`, async () => {
    const { total, byFile } = await scanPattern(/^\s*(it|test|describe)\.skip\(/gm)
    expect(
      total,
      `${total} (it|test|describe).skip() trouvés (baseline=${SOFT_LIMITS.itSkip}). ` +
        `Si tu en as ajouté, soit dé-skip et fix, soit baisse / monte la baseline en justifiant. ` +
        `Localisations:\n${formatViolations(byFile)}`,
    ).toBeLessThanOrEqual(SOFT_LIMITS.itSkip)
  })

  // Sentinelle : si la liste de fichiers de tests s'effondre brutalement,
  // c'est probablement un bug du script de scan. Limite basse = 250 (on en a
  // ~300 au 2026-05-05).
  it('au moins 250 fichiers de tests scannés (sentinelle anti-bug du scanner)', async () => {
    const files = await walkTestFiles(TESTS_ROOT)
    expect(files.length).toBeGreaterThanOrEqual(250)
  })
})
