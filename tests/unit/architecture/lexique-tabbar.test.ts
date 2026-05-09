// @vitest-environment node
/**
 * Chantier 3 — E2-S3 (FR-LEX-MULTI-KEYWORD-TABS / AC.LEX-TABS.5).
 *
 * Test architectural permanent : `LexiquePanel.vue` consomme bien le
 * composant partagé `<TabBar>` plutôt qu'une réimplémentation locale d'un
 * système d'onglets. Garantit la réutilisabilité future (SeoPanel, GeoPanel)
 * et empêche la duplication CSS / ARIA cross-onglets.
 */
import { describe, it, expect } from 'vitest'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('../../../', import.meta.url))

async function readSource(relPath: string): Promise<string> {
  return readFile(`${ROOT}${relPath}`, 'utf8')
}

describe('Architecture — LexiquePanel utilise TabBar partagé', () => {
  it('AC.LEX-TABS.5 — LexiquePanel.vue importe TabBar depuis @/components/shared/', async () => {
    const src = await readSource('src/components/moteur/LexiquePanel.vue')
    // Match `import TabBar from '@/components/shared/TabBar.vue'`
    const importRe = /import\s+TabBar\s+from\s+['"]@\/components\/shared\/TabBar\.vue['"]/
    expect(src).toMatch(importRe)
  })

  it('LexiquePanel.vue ne contient pas de définition locale de role="tablist" hors TabBar', async () => {
    const src = await readSource('src/components/moteur/LexiquePanel.vue')
    // Aucun `role="tablist"` ne doit apparaître dans le template directement —
    // le composant TabBar est seul à porter cet attribut ARIA.
    const tabRoleInTemplate = /role\s*=\s*["']tablist["']/
    expect(src).not.toMatch(tabRoleInTemplate)
  })

  it('TabBar.vue est un composant pur (pas d\'import logique métier)', async () => {
    const src = await readSource('src/components/shared/TabBar.vue')
    // Pas d'import de stores/composables/services Lexique (regex stricte
    // sur la grammaire d'import — les commentaires d'usage qui mentionnent
    // « Lexique » dans la documentation ne déclenchent pas le test).
    expect(src).not.toMatch(/import\s+[^'";]+from\s+['"][^'"]*lexique/i)
    expect(src).not.toMatch(/import\s+[^'";]+from\s+['"][^'"]*article-keywords/i)
    expect(src).not.toMatch(/import\s+[^'";]+from\s+['"][^'"]*tfidf/i)
    // Pas d'import depuis @/components/moteur/.
    expect(src).not.toMatch(/import\s+[^'";]+from\s+['"]@\/components\/moteur/)
  })
})
