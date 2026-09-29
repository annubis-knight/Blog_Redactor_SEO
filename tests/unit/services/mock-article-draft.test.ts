// @vitest-environment node
/**
 * La simulation du premier jet ressemble à un bon premier jet (NFR-TEST-BEHAVIORAL).
 *
 * L'ancienne simulation écrivait le même texte à chaque section, sous le titre
 * du premier H2 : aucun parcours simulé ne pouvait juger la qualité du texte.
 * Celle-ci, rendue sur le VRAI prompt, doit passer la porte « premier jet »
 * sans une seule alerte.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { buildDraftChunks } from '../../../server/services/external/mock-fixtures/article-draft'
import { formatDraftPlan } from '../../../server/routes/generate/article-draft.routes'
import { splitOutlineIntoGroups } from '../../../server/routes/generate/_helpers'
import { renderPromptTemplate } from '../../../server/utils/prompt-loader'
import { verifyDraft } from '../../../shared/verifiers/draft'
import { describeTypeRules, ARTICLE_TYPE_RULES } from '../../../shared/constants/article-type-rules'
import type { Outline } from '../../../shared/types/index'
import type { ArticleLevel } from '../../../shared/types/keyword-validate.types'

const TEMPLATE = readFileSync(join(__dirname, '..', '..', '..', 'server', 'prompts', 'generate-article-draft.md'), 'utf8')

function outline(h2: string[], h3PerH2 = 2): Outline {
  let n = 0
  const sections: Outline['sections'] = [{ id: `s${n++}`, level: 1, title: 'Titre', status: 'pending' }]
  for (const title of h2) {
    sections.push({ id: `s${n++}`, level: 2, title, status: 'pending' })
    for (let i = 0; i < h3PerH2; i++) sections.push({ id: `s${n++}`, level: 3, title: `${title} — point ${i + 1}`, status: 'pending' })
  }
  return { sections } as Outline
}

function prompt(level: ArticleLevel, title: string, keyword: string, h2: string[], continuation = '') {
  const target = ARTICLE_TYPE_RULES[level].targetWords
  const groups = splitOutlineIntoGroups(outline(h2))
  return renderPromptTemplate(TEMPLATE, {
    articleTitle: title, articleType: ARTICLE_TYPE_RULES[level].label, keyword, secondaryKeywords: 'Aucun', cocoonName: 'Cocon',
    strategyContext: '', keywordContext: '', microContext: '', type_rules: describeTypeRules(level),
    wordCountBudget: String(target), outlinePlan: formatDraftPlan(groups, target), continuation, previousText: '',
  }).text
}

const H2 = ['Introduction', 'Pourquoi un site change tout', 'Les étapes de la création', 'Le budget à prévoir', 'Choisir son prestataire', 'Faire vivre son site', 'Conclusion']

describe('simulation du premier jet', () => {
  it.each<[ArticleLevel, string[]]>([
    ['pilier', H2],
    ['intermediaire', H2.slice(0, 5)],
    ['specifique', H2.slice(0, 4)],
  ])('%s : passe la porte « premier jet » sans alerte', (level, h2) => {
    const html = buildDraftChunks(prompt(level, 'Guide de la création de site web pour artisan', 'création site web artisan', h2)).join('')
    // La route enregistre le texte tel quel : les paragraphes restent séparés (R14).
    const issues = verifyDraft({ content: html, captain: 'création site web artisan', targetWords: ARTICLE_TYPE_RULES[level].targetWords, outlineH2Count: h2.length })
    expect(issues, issues.map(i => `${i.rule} — ${i.message}`).join('\n')).toEqual([])
  })

  it('un titre sans le capitaine : le H1 l’intègre', () => {
    const html = buildDraftChunks(prompt('pilier', 'Le guide complet', 'création site web artisan', H2)).join('')
    expect(html).toMatch(/<h1>Création site web artisan : Le guide complet<\/h1>/)
  })

  it('les <h2> arrivent en plusieurs paquets, comme un vrai flux', () => {
    const chunks = buildDraftChunks(prompt('pilier', 'Guide création site web artisan', 'création site web artisan', H2))
    expect(chunks.length).toBeGreaterThan(20)
    expect(chunks.filter(c => c.includes('<h2>')).length).toBeGreaterThan(3)
  })

  it('continuation : ne réécrit que les chapitres à partir du chapitre coupé', () => {
    const html = buildDraftChunks(prompt('pilier', 'Guide création site web artisan', 'création site web artisan', H2, 'Le budget à prévoir')).join('')
    expect(html).not.toContain('<h1>')
    expect(html.startsWith('<h2>Le budget à prévoir</h2>')).toBe(true)
    expect(html.match(/<h2>/g)).toHaveLength(4)
  })
})
