import { Node, mergeAttributes } from '@tiptap/core'

export const AnswerCapsule = Node.create({
  name: 'answerCapsule',
  group: 'block',
  content: 'inline*',

  parseHTML() {
    return [{ tag: 'p.answer-capsule' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['p', mergeAttributes({ class: 'answer-capsule' }, HTMLAttributes), 0]
  },
})
