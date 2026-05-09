// @vitest-environment node
/**
 * Tests architecturaux PERMANENTS du chantier 2 (découplage Lieutenants/Lexique).
 *
 * Filet de régression contre la réintroduction de couplage entre les 3 services :
 *   - scrape-corpus.service.ts          → ne doit dépendre d'aucun onglet métier.
 *   - lieutenants-analysis.service.ts   → ne doit pas importer Lexique ni TF-IDF (Story B3).
 *   - lexique-analysis.service.ts       → ne doit pas importer Lieutenants (Story B3).
 *
 * Story A2 : couvre AC.SCRAPE.1 (no cross-import dans scrape-corpus).
 * Story B3 : étend ce fichier avec AC.LIE-SCRAPE.1 / AC.LEX-SCRAPE.1 / AC.DECOUPLAGE.3.
 *
 * Implémentation : lecture du source + regex sur les `import` statements.
 * On ignore explicitement les types/schemas partagés (`shared/types/...`,
 * `shared/schemas/...`) car ce sont des contrats pas des couplages logiques.
 */
import { describe, it, expect } from 'vitest'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('../../../', import.meta.url))

async function readServiceSource(relPath: string): Promise<string> {
  return readFile(`${ROOT}${relPath}`, 'utf8')
}

/** Extrait toutes les sources d'import d'un fichier TS (côté serveur). */
function extractImportPaths(src: string): string[] {
  const matches: string[] = []
  // Imports ESM standards : import ... from 'X' / import 'X'
  const re = /^\s*(?:import|export)[^'"\n]*?['"]([^'"]+)['"]/gm
  let m: RegExpExecArray | null
  while ((m = re.exec(src)) !== null) {
    matches.push(m[1])
  }
  return matches
}

function pathContainsAny(path: string, patterns: RegExp[]): RegExp | null {
  for (const p of patterns) if (p.test(path)) return p
  return null
}

// --- AC.SCRAPE.1 -----------------------------------------------------------

describe('AC.SCRAPE.1 — scrape-corpus.service.ts ne couple pas aux onglets métier', () => {
  it('aucun import dont le path matche /tfidf|lieutenants-|lexique-/i', async () => {
    const src = await readServiceSource('server/services/external/scrape-corpus.service.ts')
    const imports = extractImportPaths(src)

    const forbidden = [
      /tfidf/i,
      /lieutenants-/i,
      /lexique-/i,
    ]

    for (const path of imports) {
      // shared/* est autorisé (types pures, schemas Zod) — c'est un contrat, pas un couplage.
      if (path.includes('shared/')) continue

      const match = pathContainsAny(path, forbidden)
      expect(
        match,
        `scrape-corpus.service.ts ne doit pas importer "${path}" (matche ${match?.source ?? '?'})`,
      ).toBeNull()
    }
  })

  it('imports valides explicitement listés (filet supplémentaire)', async () => {
    const src = await readServiceSource('server/services/external/scrape-corpus.service.ts')
    // Vérifie que le service importe les briques attendues.
    expect(src).toMatch(/from\s+['"]\.\.\/\.\.\/utils\/logger/)
    expect(src).toMatch(/from\s+['"]\.\/dataforseo\.service/)
    expect(src).toMatch(/from\s+['"]\.\.\/keyword\/keyword-serp\.service/)
  })
})
