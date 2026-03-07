import { Node, mergeAttributes } from '@tiptap/core'

export const ContentReminder = Node.create({
  name: 'contentReminder',
  group: 'block',
  content: 'block+',

  parseHTML() {
    return [{ tag: 'div.content-reminder' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes({ class: 'content-reminder' }, HTMLAttributes), 0]
  },
})
