/**
 * FR-RED-ENRICH-PASSES / FR-RED-SECTION-REWRITE — remplacer UN chapitre sans
 * toucher aux autres (aucun utilitaire ne le faisait : la réduction et
 * l'humanisation recomposaient tout l'article en fin de boucle).
 */
import { describe, it, expect } from 'vitest'
import { listChapters, replaceChapter, insertChapter, faqInsertIndex, articlePlainText } from '../../../shared/chapters'

const HTML = '<h1>Titre</h1><p>Chapeau.</p><h2>Un</h2><p>A.</p><h2>Deux</h2><p>B.</p><h3>Sous</h3><p>C.</p><h2>Trois</h2><p>D.</p>'

describe('listChapters', () => {
  it('le chapeau (-1), puis un chapitre par H2 avec ses H3', () => {
    expect(listChapters(HTML).map(c => `${c.index}:${c.title}`)).toEqual(['-1:Introduction', '0:Un', '1:Deux', '2:Trois'])
    expect(listChapters(HTML)[2]!.html).toBe('<h2>Deux</h2><p>B.</p><h3>Sous</h3><p>C.</p>')
  })

  it('sans chapeau, pas de chapitre -1', () => {
    expect(listChapters('<h2>Un</h2><p>A.</p>').map(c => c.index)).toEqual([0])
  })
})

describe('replaceChapter', () => {
  it('remplace le seul chapitre visé', () => {
    const out = replaceChapter(HTML, 1, '<h2>Deux</h2><p>B enrichi.</p>')
    expect(out).toContain('<p>B enrichi.</p>')
    expect(out).not.toContain('<h3>Sous</h3>')
    expect(out).toContain('<h2>Un</h2><p>A.</p>')
    expect(out).toContain('<h2>Trois</h2><p>D.</p>')
    expect(listChapters(out)).toHaveLength(4)
  })

  it('remplace le chapeau', () => {
    expect(replaceChapter(HTML, -1, '<h1>Titre</h1><p>Nouveau chapeau.</p>').startsWith('<h1>Titre</h1><p>Nouveau chapeau.</p>')).toBe(true)
  })

  it('un chapitre inconnu ne change rien', () => {
    expect(replaceChapter(HTML, 9, '<h2>X</h2>')).toBe(HTML)
  })
})

describe('insertChapter / faqInsertIndex', () => {
  it('la FAQ s’insère avant la conclusion (le dernier H2)', () => {
    const at = faqInsertIndex(HTML)
    expect(at).toBe(2)
    const out = insertChapter(HTML, at, '<h2>Questions fréquentes</h2><h3>Pourquoi ?</h3><p>Parce que.</p>')
    expect(listChapters(out).map(c => c.title)).toEqual(['Introduction', 'Un', 'Deux', 'Questions fréquentes', 'Trois'])
  })

  it('un article d’un seul chapitre reçoit la FAQ à la fin', () => {
    const html = '<h2>Seul</h2><p>A.</p>'
    expect(listChapters(insertChapter(html, faqInsertIndex(html), '<h2>FAQ</h2>')).map(c => c.title)).toEqual(['Seul', 'FAQ'])
  })
})

describe('articlePlainText', () => {
  it('garde une ligne par bloc, sans balises, borné', () => {
    expect(articlePlainText('<h2>Un</h2><p>A b.</p>')).toBe('Un\nA b.')
    expect(articlePlainText(`<p>${'mot '.repeat(10)}</p>`, 12).endsWith('…')).toBe(true)
  })
})
