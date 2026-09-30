/**
 * Extensions de l'éditeur de l'article (FR-RED-EDITOR-TIPTAP), chacune déclarée
 * une seule fois.
 *
 * `StarterKit` (tiptap 3) embarque déjà l'extension Link, avec ses réglages par
 * défaut : nouvel onglet au clic et `rel="noopener noreferrer nofollow"`. Elle
 * était déclarée une seconde fois (avertissement « Duplicate extension names
 * found: ['link'] ») et s'emparait aussi des liens internes : enregistrés en
 * `nofollow` + `target="_blank"`, et ouverts dans un onglet parasite au clic
 * (recette du 2026-09-30). Ici, StarterKit n'apporte plus son Link, et le seul
 * Link laisse les liens internes (`a.internal-link`) à `InternalLink`.
 */
import type { AnyExtension } from '@tiptap/core'
import type { ParseRule, TagParseRule } from '@tiptap/pm/model'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import { TableKit } from '@tiptap/extension-table'
import Placeholder from '@tiptap/extension-placeholder'
import { ContentValeur } from './extensions/content-valeur'
import { ContentReminder } from './extensions/content-reminder'
import { AnswerCapsule } from './extensions/answer-capsule'
import { InternalLink } from './extensions/internal-link'
import { ToSource } from './extensions/to-source'
import { DragHandle } from './extensions/drag-handle'
import { DynamicBlock } from './extensions/dynamic-block'
import { DynamicBlockDrop } from './extensions/dynamic-block-drop'

/**
 * Lien vers une autre page (bouton 🔗) : tout `<a href>` sauf un lien interne,
 * qui reste une marque `InternalLink` (sans `nofollow` ni nouvel onglet).
 */
const isTagRule = (rule: ParseRule): rule is TagParseRule => typeof (rule as TagParseRule).tag === 'string'

const PageLink = Link.extend({
  parseHTML(): ParseRule[] {
    return (this.parent?.() ?? []).map((rule): ParseRule => (isTagRule(rule) ? { ...rule, tag: 'a[href]:not(.internal-link)' } : rule))
  },
})

export interface EditorExtensionOptions {
  placeholder: string
  articleId: number
  getKeyword: () => string | undefined
  getKeywords: () => string[]
}

export function createEditorExtensions(options: EditorExtensionOptions): AnyExtension[] {
  return [
    StarterKit.configure({ link: false }),
    // Un clic dans l'éditeur place le curseur : il n'ouvre pas le lien.
    PageLink.configure({ openOnClick: false }),
    // Passes d'enrichissement : sans ces extensions, un tableau ou une image
    // accepté disparaissait au premier rendu (FR-RED-ENRICH-PASSES).
    TableKit.configure({ table: { resizable: false } }),
    Image.configure({ inline: false, allowBase64: false }),
    Placeholder.configure({ placeholder: options.placeholder }),
    ContentValeur,
    ContentReminder,
    AnswerCapsule,
    InternalLink,
    ToSource,
    DynamicBlock,
    DynamicBlockDrop.configure({
      articleId: options.articleId,
      getKeyword: options.getKeyword,
      getKeywords: options.getKeywords,
    }),
    DragHandle,
  ]
}
