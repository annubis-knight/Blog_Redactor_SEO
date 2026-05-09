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

// --- AC.LIE-SCRAPE.1 -------------------------------------------------------

describe('AC.LIE-SCRAPE.1 — lieutenants-analysis.service.ts n\'importe ni tfidf ni lexique-', () => {
  it('aucun import dont le path matche /tfidf|lexique-/i', async () => {
    const src = await readServiceSource('server/services/keyword/lieutenants-analysis.service.ts')
    const imports = extractImportPaths(src)

    const forbidden = [/tfidf/i, /lexique-/i]

    for (const path of imports) {
      if (path.includes('shared/')) continue
      const match = pathContainsAny(path, forbidden)
      expect(
        match,
        `lieutenants-analysis.service.ts ne doit pas importer "${path}" (matche ${match?.source ?? '?'})`,
      ).toBeNull()
    }
  })

  it('importe bien scrape-corpus.service (filet positif)', async () => {
    const src = await readServiceSource('server/services/keyword/lieutenants-analysis.service.ts')
    expect(src).toMatch(/from\s+['"][^'"]*scrape-corpus\.service/)
  })
})

// --- AC.LEX-SCRAPE.1 -------------------------------------------------------

describe('AC.LEX-SCRAPE.1 — lexique-analysis.service.ts n\'importe pas Lieutenants', () => {
  it('aucun import dont le path matche /lieutenants-/i ou /components\\/moteur\\/Lieutenants/i', async () => {
    const src = await readServiceSource('server/services/keyword/lexique-analysis.service.ts')
    const imports = extractImportPaths(src)

    const forbidden = [
      /lieutenants-/i,
      /components\/moteur\/Lieutenants/i,
    ]

    for (const path of imports) {
      if (path.includes('shared/')) continue
      const match = pathContainsAny(path, forbidden)
      expect(
        match,
        `lexique-analysis.service.ts ne doit pas importer "${path}" (matche ${match?.source ?? '?'})`,
      ).toBeNull()
    }
  })

  it('importe bien scrape-corpus.service + tfidf.service (filet positif)', async () => {
    const src = await readServiceSource('server/services/keyword/lexique-analysis.service.ts')
    expect(src).toMatch(/from\s+['"][^'"]*scrape-corpus\.service/)
    expect(src).toMatch(/from\s+['"][^'"]*tfidf\.service/)
  })
})

// --- AC.DECOUPLAGE.3 — vérification croisée explicite ----------------------

describe('AC.DECOUPLAGE.3 — Lieutenants ↮ Lexique zéro import croisé', () => {
  it('lieutenants-analysis.service.ts n\'importe pas lexique-analysis.service.ts', async () => {
    const src = await readServiceSource('server/services/keyword/lieutenants-analysis.service.ts')
    const imports = extractImportPaths(src)
    for (const path of imports) {
      expect(path, `import interdit "${path}"`).not.toMatch(/lexique-analysis\.service/)
    }
  })

  it('lexique-analysis.service.ts n\'importe pas lieutenants-analysis.service.ts', async () => {
    const src = await readServiceSource('server/services/keyword/lexique-analysis.service.ts')
    const imports = extractImportPaths(src)
    for (const path of imports) {
      expect(path, `import interdit "${path}"`).not.toMatch(/lieutenants-analysis\.service/)
    }
  })
})
