// @vitest-environment node
/**
 * Les tests navigateur parcourent les onglets du Moteur à partir d'une liste
 * recopiée à la main (`MOTEUR_TABS`, helper Playwright). Si l'application
 * gagne un onglet (l'onglet Structure du chantier C6, par exemple) et que la
 * liste n'est pas mise à jour, les parcours l'ignorent sans rien dire
 * (épopée qualité SEO, T5).
 *
 * Règle : les onglets du helper, plus « finalisation » (qui a son propre
 * repère), sont exactement ceux de l'application, dans le même ordre.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(__dirname, '..', '..', '..')

function readTuple(file: string, name: string): string[] {
  const source = readFileSync(join(ROOT, file), 'utf8')
  const match = source.match(new RegExp(`export const ${name} = \\[([^\\]]*)\\] as const`))
  expect(match, `${name} introuvable dans ${file}`).not.toBeNull()
  return [...match![1]!.matchAll(/'([^']+)'/g)].map(m => m[1]!)
}

describe('Onglets du Moteur — le helper des tests suit l’application', () => {
  it('MOTEUR_TABS + finalisation = TAB_IDS', () => {
    const app = readTuple('src/composables/moteur/useMoteurTabs.ts', 'TAB_IDS')
    const helper = readTuple('tests/browser-e2e/helpers/moteur-ui.ts', 'MOTEUR_TABS')
    expect(app.length, 'la lecture de TAB_IDS doit trouver des onglets').toBeGreaterThan(3)
    expect([...helper, 'finalisation']).toEqual(app)
  })
})
