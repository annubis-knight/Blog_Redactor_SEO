import { Mark, mergeAttributes } from '@tiptap/core'

export const InternalLink = Mark.create({
  name: 'internalLink',

  addAttributes() {
    return {
      slug: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-slug'),
        renderHTML: (attributes: Record<string, string | null>) => {
          if (!attributes.slug) return {}
          return { 'data-slug': attributes.slug }
        },
      },
      href: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('href'),
        renderHTML: (attributes: Record<string, string | null>) => {
          if (!attributes.href) return {}
          return { href: attributes.href }
        },
      },
    }
  },

  parseHTML() {
    return [{ tag: 'a.internal-link' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['a', mergeAttributes({ class: 'internal-link' }, HTMLAttributes), 0]
  },
})
