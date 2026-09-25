// @vitest-environment node
/**
 * D3 — docs/prompts-reference.md est généré, et reste à jour.
 *
 * L'ancienne référence, écrite à la main, citait `generate-reduce.md`,
 * `/keywords/translate-pain` et `actions/localize.md` : aucun n'existait ou
 * n'était atteignable. Si ce test échoue : `npm run docs:prompts`.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { buildPromptsReference } from '../../../scripts/prompts-reference'

const ROOT = join(__dirname, '..', '..', '..')

describe('référence des prompts', () => {
  it('le fichier commité est la sortie du générateur (sinon : npm run docs:prompts)', () => {
    const committed = readFileSync(join(ROOT, 'docs/prompts-reference.md'), 'utf8').replaceAll('\r\n', '\n')
    expect(committed).toBe(buildPromptsReference(ROOT))
  })

  it('chaque prompt chargé par le serveur y figure avec au moins un appelant', () => {
    const reference = buildPromptsReference(ROOT)
    const rows = reference.split('\n').filter(l => l.startsWith('| `') && l.includes('.md`'))
    expect(rows.length, 'une ligne par prompt').toBeGreaterThan(40)
    const orphans = rows.filter(l => l.trimEnd().endsWith('| — |'))
    expect(orphans, `prompts que rien ne charge :\n${orphans.join('\n')}`).toEqual([])
  })
})
