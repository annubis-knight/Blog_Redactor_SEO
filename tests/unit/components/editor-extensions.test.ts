/**
 * FR-RED-EDITOR-TIPTAP, FR-RED-LINKING-MANUAL — les liens de l'éditeur.
 *
 * Recette du 2026-09-30 (express 9, RED-18) : l'extension Link était déclarée
 * deux fois (StarterKit l'embarque déjà ; avertissement tiptap « Duplicate
 * extension names found: ['link'] »). Chaque lien interne était alors enregistré
 * en `rel="nofollow"` + `target="_blank"` — une faute SEO dans le fichier publié —
 * et un clic dans l'éditeur ouvrait un onglet parasite (`…/editor#article-1336`).
 */
import { describe, it, expect, afterEach } from 'vitest'
import { Editor } from '@tiptap/core'
import { createEditorExtensions } from '../../../src/components/editor/tiptap/editor-extensions'

let editor: Editor | null = null
afterEach(() => { editor?.destroy(); editor = null })

function render(html: string): string {
  editor = new Editor({
    extensions: createEditorExtensions({ placeholder: 'Corps…', articleId: 7, getKeyword: () => 'site vitrine', getKeywords: () => [] }),
    content: html,
  })
  return editor.getHTML()
}

describe('éditeur — extensions et liens', () => {
  it('chaque extension n’est déclarée qu’une fois', () => {
    render('<p>Texte.</p>')
    const names = editor!.extensionManager.extensions.map(e => e.name)
    expect(names.filter(n => n === 'link')).toHaveLength(1)
    expect(new Set(names).size).toBe(names.length)
  })

  it('un lien interne reste un lien interne : ni nofollow, ni nouvel onglet', () => {
    const out = render('<p>Voir <a class="internal-link" href="#article-1336">le budget</a>.</p>')
    expect(out).toContain('<a class="internal-link" href="#article-1336">le budget</a>')
    expect(out).not.toMatch(/nofollow|target=/)
  })

  it('un lien interne déjà enregistré en nofollow est rendu propre', () => {
    const out = render('<p>Voir <a target="_blank" rel="noopener noreferrer nofollow" class="internal-link" href="#article-1336">le budget</a>.</p>')
    expect(out).toContain('<a class="internal-link" href="#article-1336">le budget</a>')
    expect(out).not.toMatch(/nofollow|target=/)
  })

  it('un clic sur un lien n’ouvre pas d’onglet ; un lien vers un autre site reste un lien', () => {
    const out = render('<p>Selon <a href="https://www.insee.fr/etude">l’Insee</a>.</p>')
    expect(out).toContain('href="https://www.insee.fr/etude"')
    const link = editor!.extensionManager.extensions.find(e => e.name === 'link')
    expect(link?.options.openOnClick).toBe(false)
  })
})
