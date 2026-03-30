import { computed } from 'vue'
import type { Editor } from '@tiptap/core'
import { useLinkingStore } from '@/stores/linking.store'
import { useEditorStore } from '@/stores/editor.store'
import { log } from '@/utils/logger'
import type { LinkSuggestion, InternalLink } from '@shared/types/index.js'

export function useInternalLinking(articleSlug: string) {
  const linkingStore = useLinkingStore()
  const editorStore = useEditorStore()

  const suggestions = computed(() => linkingStore.suggestions)
  const isSuggesting = computed(() => linkingStore.isSuggesting)
  const error = computed(() => linkingStore.error)

  async function requestSuggestions() {
    const content = editorStore.content
    if (!content) return
    log.info(`[internal-linking] requesting suggestions for ${articleSlug}`)
    await linkingStore.fetchSuggestions(articleSlug, content)
    log.debug(`[internal-linking] ${linkingStore.suggestions.length} suggestions received`)
  }

  function applySuggestion(suggestion: LinkSuggestion, editor: Editor) {
    const content = editor.getHTML()
    const anchor = suggestion.suggestedAnchor

    // Find the anchor text in the editor content
    const textContent = editor.state.doc.textContent
    const anchorIndex = textContent.toLowerCase().indexOf(anchor.toLowerCase())
    if (anchorIndex < 0) return

    // Resolve text position to prosemirror position
    let charCount = 0
    let from = 0
    let to = 0
    editor.state.doc.descendants((node, pos) => {
      if (node.isText && from === 0) {
        const nodeText = node.text || ''
        const relativeIndex = anchorIndex - charCount
        if (relativeIndex >= 0 && relativeIndex < nodeText.length) {
          from = pos + relativeIndex
          to = from + anchor.length
        }
        charCount += nodeText.length
      } else if (node.isText) {
        charCount += (node.text || '').length
      }
    })

    if (from > 0 && to > from) {
      log.debug(`[internal-linking] applying link: "${anchor}" → ${suggestion.targetSlug}`)
      editor
        .chain()
        .focus()
        .setTextSelection({ from, to })
        .setMark('internalLink', {
          slug: suggestion.targetSlug,
          href: `/${suggestion.targetSlug}`,
        })
        .run()

      // Save the link to the matrix
      const link: InternalLink = {
        sourceSlug: articleSlug,
        targetSlug: suggestion.targetSlug,
        anchorText: anchor,
        position: `char-${anchorIndex}`,
      }
      linkingStore.saveLinks([link])
    }

    // Remove the suggestion from the list
    linkingStore.suggestions = linkingStore.suggestions.filter(
      (s) => s.targetSlug !== suggestion.targetSlug,
    )
  }

  function dismissSuggestion(suggestion: LinkSuggestion) {
    linkingStore.suggestions = linkingStore.suggestions.filter(
      (s) => s.targetSlug !== suggestion.targetSlug,
    )
  }

  function clearSuggestions() {
    linkingStore.clearSuggestions()
  }

  return {
    suggestions,
    isSuggesting,
    error,
    requestSuggestions,
    applySuggestion,
    dismissSuggestion,
    clearSuggestions,
  }
}
