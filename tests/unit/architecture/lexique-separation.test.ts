// @vitest-environment node
/**
 * Chantier 3 — E3-S3 (FR-LEX-LECTURE-VS-VERROUILLAGE / AC.LEX-SEP.3).
 *
 * Tests architecturaux PERMANENTS : filet de régression contre la
 * réintroduction de couplage entre les deux familles de fonctions Lexique.
 *
 *   - useLexiqueExplorations (LECTURE) ne doit JAMAIS appeler addLexiqueTerm /
 *     removeLexiqueTerm / saveDecisions / toggleTerm (qui muteraient
 *     `article_keywords.lexique`).
 *   - useLexiqueLocking (VERROUILLAGE) ne doit JAMAIS lire `lexique_explorations`
 *     (hydrateFromDb / mergeFromDb / pastExplorations / route /explorations).
 *
 * Implémentation : lecture du source + regex sur les usages.
 */
import { describe, it, expect } from 'vitest'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('../../../', import.meta.url))

async function readSource(relPath: string): Promise<string> {
  return readFile(`${ROOT}${relPath}`, 'utf8')
}

/** Retire les commentaires JS/TS pour ne tester que la logique exécutable. */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\s\/\/.*$/gm, '')
}

describe('Architecture — séparation LECTURE / VERROUILLAGE Lexique (chantier 3 E3-S3)', () => {
  it('AC.LEX-SEP.3 — useLexiqueExplorations.ts ne contient AUCUNE fonction VERROUILLAGE (code, hors commentaires)', async () => {
    const code = stripComments(await readSource('src/composables/lexique/useLexiqueExplorations.ts'))
    expect(code).not.toMatch(/\.addLexiqueTerm\s*\(/)
    expect(code).not.toMatch(/\.removeLexiqueTerm\s*\(/)
    expect(code).not.toMatch(/\.saveDecisions\s*\(/)
    expect(code).not.toMatch(/import\s+[^'";]+from\s+['"][^'"]*article-keywords\.store/)
  })

  it('AC.LEX-SEP.3 — useLexiqueLocking.ts ne contient AUCUNE fonction LECTURE (code, hors commentaires)', async () => {
    const code = stripComments(await readSource('src/composables/lexique/useLexiqueLocking.ts'))
    expect(code).not.toMatch(/\bhydrateFromDb\b/)
    expect(code).not.toMatch(/\bmergeFromDb\b/)
    expect(code).not.toMatch(/\bpastExplorations\b/)
    expect(code).not.toMatch(/\/explorations/)
  })

  it('AC.LEX-SEP.1 — useLexiqueExplorations.ts ne contient pas apiPut/apiPost/apiDelete', async () => {
    const src = await readSource('src/composables/lexique/useLexiqueExplorations.ts')
    // L'import depuis api.service ne doit ramener QUE apiGet (pas apiPut/apiPost/apiDelete).
    const apiServiceImportMatch = src.match(/import\s+\{([^}]+)\}\s+from\s+['"]@\/services\/api\.service['"]/)
    expect(apiServiceImportMatch).not.toBeNull()
    const imported = (apiServiceImportMatch?.[1] ?? '').replace(/\s+/g, '')
    expect(imported).toBe('apiGet')
  })

  it('AC.LEX-SEP.2 — useLexiqueLocking.ts n\'utilise pas apiGet vers /explorations (code, hors commentaires)', async () => {
    const code = stripComments(await readSource('src/composables/lexique/useLexiqueLocking.ts'))
    expect(code).not.toMatch(/apiGet[^\n]*\/explorations/)
    expect(code).not.toMatch(/apiGet[^\n]*explorations/)
  })
})
