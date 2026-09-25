import { Mark, mergeAttributes } from '@tiptap/core'

/**
 * Marqueur « à sourcer » (FR-RED-DRAFT-TO-SOURCE).
 *
 * Le premier jet ne cite aucun chiffre qu'il ne peut garantir : il pose
 * `<mark data-a-sourcer>[à sourcer : …]</mark>` à la place, que la passe
 * « sources » remplacera. Sans cette marque, l'éditeur perdait la balise et ne
 * gardait que le texte : le passage n'était plus surligné, et la porte de
 * publication ne le reconnaissait plus que par son texte.
 */
export const ToSource = Mark.create({
  name: 'toSource',

  parseHTML() {
    return [{ tag: 'mark[data-a-sourcer]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['mark', mergeAttributes({ 'data-a-sourcer': '', class: 'to-source' }, HTMLAttributes), 0]
  },
})
