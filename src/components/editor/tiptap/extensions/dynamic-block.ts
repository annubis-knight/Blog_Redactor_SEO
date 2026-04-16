import { Node, mergeAttributes } from '@tiptap/core'

/**
 * DynamicBlock — bloc généré dynamiquement via un appel IA au moment du drop.
 * Trois variantes distinguées par l'attribut `data-type` :
 *  - sources-chiffrees : liste de sources + chiffres validant le paragraphe (web search)
 *  - exemples-reels    : liste d'exemples concrets illustrant le paragraphe (web search)
 *  - ce-quil-faut-retenir : résumé bullet points d'une section H2 (pas de web search)
 *
 * Le nœud peut contenir n'importe quel contenu bloc (header + ul/li en général),
 * et la classe CSS `dynamic-block` + `.{data-type}` assure le styling.
 */
export const DynamicBlock = Node.create({
  name: 'dynamicBlock',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      type: {
        default: 'sources-chiffrees',
        parseHTML: (el) => el.getAttribute('data-type') ?? 'sources-chiffrees',
        renderHTML: (attrs) => ({ 'data-type': attrs.type as string }),
      },
      // Attribut transitoire — sert à retrouver le placeholder pendant le streaming IA.
      // Non sérialisé en HTML (parseHTML/renderHTML retournent null/{}), donc
      // invisible côté sortie et ignoré au parse. Uniquement vivant en mémoire PM.
      pendingId: {
        default: null as string | null,
        parseHTML: () => null,
        renderHTML: () => ({}),
      },
      // Attribut transitoire — indique que le bloc est en cours de génération IA.
      // Expose `data-loading="true"` sur le DOM pour permettre le styling (skeleton,
      // shimmer, spinner). Non sérialisé en sortie (toujours false au parse).
      loading: {
        default: false,
        parseHTML: () => false,
        renderHTML: (attrs) => (attrs.loading ? { 'data-loading': 'true' } : {}),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div.dynamic-block' }]
  },

  renderHTML({ HTMLAttributes }) {
    const type = (HTMLAttributes['data-type'] as string) || 'sources-chiffrees'
    return ['div', mergeAttributes({ class: `dynamic-block ${type}` }, HTMLAttributes), 0]
  },
})
