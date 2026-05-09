// @vitest-environment node
/**
 * Chantier 3 — E3-S3 (FR-LEX-LECTURE-VS-VERROUILLAGE / AC.LEX-SEP.4).
 *
 * Le watcher `isLocked` du gating workflow (emit check-completed /
 * check-removed `MOTEUR_LEXIQUE_VALIDATED`) reste DANS LexiquePanel.vue —
 * c'est de la propagation de check workflow, distincte des deux familles
 * LECTURE et VERROUILLAGE. Ce test vérifie que ni useLexiqueExplorations
 * ni useLexiqueLocking n'embarquent ce watcher.
 */
import { describe, it, expect } from 'vitest'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('../../../', import.meta.url))

async function readSource(relPath: string): Promise<string> {
  return readFile(`${ROOT}${relPath}`, 'utf8')
}

/**
 * Retire les commentaires JS/TS (// + /* * /) pour tester la logique seule.
 * Évite les faux positifs sur les mentions documentaires d'identifiants.
 */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '') // /* ... */
    .replace(/^\s*\/\/.*$/gm, '') // ligne commençant par //
    .replace(/\s\/\/.*$/gm, '') // // en fin de ligne
}

describe('Architecture — watcher isLocked isolé dans LexiquePanel (chantier 3 E3-S3)', () => {
  it('AC.LEX-SEP.4 — LexiquePanel.vue contient bien le watcher isLocked + emit MOTEUR_LEXIQUE_VALIDATED', async () => {
    const src = await readSource('src/components/moteur/LexiquePanel.vue')
    // Le watcher doit exister
    expect(src).toMatch(/watch\s*\(\s*isLocked/)
    expect(src).toMatch(/emit\s*\(\s*['"]check-completed['"]\s*,\s*MOTEUR_LEXIQUE_VALIDATED/)
    expect(src).toMatch(/emit\s*\(\s*['"]check-removed['"]\s*,\s*MOTEUR_LEXIQUE_VALIDATED/)
  })

  it('AC.LEX-SEP.4 — useLexiqueExplorations.ts ne contient PAS le watcher gating (code, hors commentaires)', async () => {
    const code = stripComments(await readSource('src/composables/lexique/useLexiqueExplorations.ts'))
    expect(code).not.toMatch(/MOTEUR_LEXIQUE_VALIDATED/)
    expect(code).not.toMatch(/check-completed/)
    expect(code).not.toMatch(/check-removed/)
  })

  it('AC.LEX-SEP.4 — useLexiqueLocking.ts ne contient PAS le watcher gating (code, hors commentaires)', async () => {
    const code = stripComments(await readSource('src/composables/lexique/useLexiqueLocking.ts'))
    expect(code).not.toMatch(/MOTEUR_LEXIQUE_VALIDATED/)
    expect(code).not.toMatch(/check-completed/)
    expect(code).not.toMatch(/check-removed/)
  })
})
