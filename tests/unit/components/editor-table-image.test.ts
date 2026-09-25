/**
 * FR-RED-ENRICH-PASSES (R10) — un tableau ou une image accepté survit à
 * l'éditeur, et ce qu'il en ressort passe encore les vérificateurs.
 *
 * Sans les extensions Table et Image, TipTap jetait ces balises au premier
 * rendu : la proposition acceptée disparaissait sans un mot.
 */
import { describe, it, expect, afterEach } from 'vitest'
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import { TableKit } from '@tiptap/extension-table'
import { validateArticleContent } from '../../../shared/content-validators'
import { verifyEnrichment } from '../../../shared/verifiers/enrichment'
import { IMAGE_TO_PROVIDE_SRC } from '../../../shared/constants/image-placeholder'

let editor: Editor | null = null
afterEach(() => editor?.destroy())

function render(html: string): string {
  editor = new Editor({
    extensions: [StarterKit, TableKit.configure({ table: { resizable: false } }), Image.configure({ inline: false, allowBase64: false })],
    content: html,
  })
  return editor.getHTML()
}

const TABLE = '<h2>Budget</h2><p>Trois postes.</p><table><thead><tr><th>Poste</th><th>Quand</th></tr></thead><tbody><tr><td>Design</td><td>Dès cette semaine</td></tr></tbody></table>'
const IMAGE = `<h2>Atelier</h2><p>Un geste.</p><img src="${IMAGE_TO_PROVIDE_SRC}" alt="Un menuisier ajuste une porte dans son atelier"><p>Suite.</p>`

describe('éditeur — tableaux et images', () => {
  it('garde le tableau et sa ligne d’en-tête', () => {
    const out = render(TABLE)
    expect(out).toContain('<table')
    expect(out).toMatch(/<th[^>]*>(<p>)?Poste/)
    expect(out).toContain('Dès cette semaine')
  })

  it('garde l’image, sa place réservée et son texte alternatif', () => {
    const out = render(IMAGE)
    expect(out).toContain(`src="${IMAGE_TO_PROVIDE_SRC}"`)
    expect(out).toContain('alt="Un menuisier ajuste une porte dans son atelier"')
  })

  it('ce que l’éditeur produit reste admis dans le corps d’un article', () => {
    const issues = validateArticleContent(render(TABLE) + render(IMAGE)).filter(i => i.rule === 'forbidden-tag')
    expect(issues).toEqual([])
  })

  it('un chapitre repassé par l’éditeur ne déclenche pas de faux défaut', () => {
    expect(verifyEnrichment({ pass: 'tableaux', before: '<h2>Budget</h2><p>Trois postes.</p>', after: render(TABLE) }).filter(i => i.level === 'technique')).toEqual([])
  })
})
