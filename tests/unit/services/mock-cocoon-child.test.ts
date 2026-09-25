// @vitest-environment node
/**
 * FR-CER-KEYWORD-REAL-DATA (NFR-TEST-BEHAVIORAL) — la simulation des candidats
 * répond au prompt réellement assemblé : entre 3 et 5 candidats, mots-clés en
 * minuscules tirés de la section du parent (ou du cocon pour un pilier), titres
 * qui contiennent leur mot-clé en entier.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { streamFixtures } from '../../../server/services/external/mock-registry'
import '../../../server/services/external/mock-fixtures/index'
import { renderPromptTemplate } from '../../../server/utils/prompt-loader'
import { renderCocoonContext } from '../../../shared/cocoon-context'
import { describeTypeRules } from '../../../shared/constants/article-type-rules'
import { keywordCoverage } from '../../../shared/seo-validators'

const TEMPLATE = readFileSync(resolve('server/prompts/cocoon-child-keywords.md'), 'utf8')

function answer(vars: Record<string, string>): { candidates: Array<{ keyword: string; title: string }> } {
  const { text: userPrompt, missing, unused } = renderPromptTemplate(TEMPLATE, { strategy_context: '', ...vars })
  expect({ missing, unused }, 'le prompt et ses variables concordent').toEqual({ missing: [], unused: [] })
  const fixture = streamFixtures.find(f => f.matcher({ systemPrompt: '', userPrompt }))
  expect(fixture?.name).toBe('cocoon-child-keywords')
  return JSON.parse(fixture!.builder({ systemPrompt: '', userPrompt }) as string)
}

describe('simulation des candidats d’un nouvel article', () => {
  it('un enfant : les candidats viennent de la section du parent', () => {
    const tree = [{ id: 10, title: 'Rénovation : le guide', level: 'pilier' as const, parentId: null, parentSection: null, keyword: null, drafted: true, sections: [{ title: 'Changer les fenêtres', childId: null, childTitle: null }] }]
    const { candidates } = answer({
      cocoon_context: renderCocoonContext({ cocoonName: 'Rénovation', tree, focus: { parentId: 10, parentSection: 'Changer les fenêtres' } }),
      articleLevel: 'intermédiaire',
      parentSection: 'Changer les fenêtres',
      type_rules: describeTypeRules('intermediaire'),
    })
    expect(candidates.length).toBeGreaterThanOrEqual(3)
    expect(candidates.length).toBeLessThanOrEqual(5)
    expect(candidates[0]!.keyword).toBe('changer fenêtres')
    for (const c of candidates) {
      expect(c.keyword).toBe(c.keyword.toLowerCase())
      expect(keywordCoverage(c.keyword, c.title), `« ${c.title} » contient « ${c.keyword} »`).toBe(1)
    }
  })

  it('un pilier : les candidats viennent du nom du cocon', () => {
    const { candidates } = answer({
      cocoon_context: renderCocoonContext({ cocoonName: 'Rénovation énergétique', tree: [], focus: { parentId: null, parentSection: null } }),
      articleLevel: 'pilier',
      parentSection: '',
      type_rules: describeTypeRules('pilier'),
    })
    expect(candidates[0]!.keyword).toBe('rénovation énergétique')
  })
})
