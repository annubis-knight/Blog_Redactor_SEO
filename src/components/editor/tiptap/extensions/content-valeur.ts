import { Node, mergeAttributes } from '@tiptap/core'

export const ContentValeur = Node.create({
  name: 'contentValeur',
  group: 'block',
  content: 'block+',

  parseHTML() {
    return [{ tag: 'div.content-valeur' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes({ class: 'content-valeur' }, HTMLAttributes), 0]
  },
})
