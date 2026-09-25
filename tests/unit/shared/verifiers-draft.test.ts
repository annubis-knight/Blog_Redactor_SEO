/**
 * FR-RED-DRAFT-SINGLE-PASS — la porte « accepter le premier jet ».
 *
 * Fil conducteur : le vrai pilier 1013 (tests/fixtures/articles/1013-pilier.html)
 * est refusé ; un premier jet propre passe sans alerte.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { verifyDraft, type DraftGateInput } from '../../../shared/verifiers/draft'
import { sectionBudgets } from '../../../shared/section-budget'

const CAPTAIN = 'création site web artisan'
const TITLES = ['Pourquoi un site change tout', 'Les étapes de la création', 'Le budget à prévoir', 'Garder son site vivant']

// Chaque paragraphe a son propre vocabulaire : un premier jet propre ne se
// répète pas (des paragraphes tirés d'un même petit lexique se ressemblent
// vraiment, et la porte le voit).
function paragraph(seed: number, words: number): string {
  const out = Array.from({ length: words }, (_, i) => `terme${seed}x${i}`)
  return `<p>${out.join(' ')}.</p>`
}

function propre(target = 1200): string {
  const budgets = sectionBudgets(TITLES.length, target)
  const intro = `<h1>Création de site web pour artisan : le guide</h1><p>La création d’un site web d’artisan se prépare avec méthode.</p>`
  return intro + TITLES.map((t, i) => {
    const b = budgets[i]!.budget - (i === 0 ? 11 : 0) - t.split(' ').length
    return `<h2>${t}</h2>` + paragraph(i * 11 + 1, Math.floor(b / 2)) + paragraph(i * 11 + 5, Math.ceil(b / 2))
  }).join('')
}

const base = (content: string, extra: Partial<DraftGateInput> = {}): DraftGateInput => ({
  content, captain: CAPTAIN, targetWords: 1200, outlineH2Count: TITLES.length, ...extra,
})
const rules = (input: DraftGateInput) => verifyDraft(input).map(i => `${i.level}:${i.rule.split(':')[0]}`)

describe('verifyDraft', () => {
  it('un premier jet propre passe sans alerte', () => {
    expect(verifyDraft(base(propre()))).toEqual([])
  })

  it('le vrai pilier 1013 est refusé : longueur, chapitres, capitaine', () => {
    const html = readFileSync(join(__dirname, '..', '..', 'fixtures', 'articles', '1013-pilier.html'), 'utf8')
    const found = rules({ content: html, captain: 'stratégie digitale entreprises toulouse', targetWords: 2500, outlineH2Count: 8 })
    expect(found).toContain('risque:draft-length-off-target')
    expect(found).toContain('risque:draft-section-off-budget')
    expect(found).toContain('risque:draft-captain-not-in-h1')
  })

  it('⛔ sans H1', () => {
    expect(rules(base(propre().replace(/<h1>[\s\S]*?<\/h1>/, '')))).toContain('technique:draft-h1-missing')
  })

  it('🔴 un H1 sans le capitaine (et non ⛔ : un titre peut le reformuler)', () => {
    expect(rules(base(propre().replace(/<h1>[\s\S]*?<\/h1>/, '<h1>Le guide complet</h1>')))).toContain('risque:draft-captain-not-in-h1')
  })

  it('🔴 longueur hors ±15 % de la cible', () => {
    expect(rules(base(propre(), { targetWords: 2000 }))).toContain('risque:draft-length-off-target')
    expect(rules(base(propre(), { targetWords: 1300 }))).not.toContain('risque:draft-length-off-target')
  })

  it('🔴 un chapitre vide ou démesuré, nommé dans l’alerte', () => {
    const vide = propre().replace(/(<h2>Le budget à prévoir<\/h2>)[\s\S]*?(<h2>)/, '$1<p>Court.</p>$2')
    const issues = verifyDraft(base(vide))
    expect(issues.find(i => i.rule.startsWith('draft-section-off-budget'))?.message).toContain('Le budget à prévoir')
  })

  it('🔴 phrase anglaise, paragraphe répété, chiffre sans source', () => {
    const p = paragraph(3, 40)
    const html = propre()
      .replace('</h1>', '</h1><p>This is the best way to grow your business with the right tools for you.</p>')
      .replace('<h2>Garder son site vivant</h2>', `<h2>Garder son site vivant</h2>${p}${p}<p>Un site coûte 3 000 € en moyenne.</p>`)
    const found = rules(base(html, { targetWords: 1500 }))
    expect(found).toContain('risque:draft-non-french')
    expect(found).toContain('risque:draft-repeated-paragraph')
    expect(found).toContain('risque:draft-unsourced-figure')
  })

  it('un chiffre posé « à sourcer » n’est pas une alerte du premier jet', () => {
    const html = propre().replace('</h1>', '</h1><p>Beaucoup d’artisans <mark data-a-sourcer>[à sourcer : 60 % des artisans]</mark> n’ont pas de site.</p>')
    expect(rules(base(html))).not.toContain('risque:draft-unsourced-figure')
  })
})
