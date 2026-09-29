import { ref, getCurrentInstance, onUnmounted } from 'vue'
import type { Editor } from '@tiptap/core'
import { useStreaming } from '@/composables/editor/useStreaming'
import { useLinkingStore } from '@/stores/keyword/linking.store'
import { log } from '@/utils/logger'
import type { ActionType, ActionContext, Article } from '@shared/types/index.js'

export function useContextualActions() {
  const { isStreaming, startStream, abort } = useStreaming<{ content: string; removedLinks?: string[] }>()

  // Abort streaming on unmount (only when called inside a component)
  if (getCurrentInstance()) {
    onUnmounted(() => abort())
  }

  const isExecuting = ref(false)
  const streamedResult = ref('')
  const actionError = ref<string | null>(null)
  /** Avis du serveur sur le résultat (liens absents de la recherche web, retirés). */
  const actionNotice = ref<string | null>(null)
  const currentAction = ref<ActionType | null>(null)

  /** Internal-link: show article picker instead of SSE pipeline */
  const showArticlePicker = ref(false)
  let pendingLinkEditor: Editor | null = null
  /** L'article d'où part le lien : il entre dans la matrice de maillage. */
  let pendingSourceId: number | null = null

  /** Saved selection range — preserved so we can restore after streaming */
  let savedFrom = 0
  let savedTo = 0

  async function executeAction(
    actionType: ActionType,
    selectedText: string,
    context: ActionContext,
    editor: Editor,
  ) {
    // Save selection before streaming (it may be lost if user interacts)
    const { from, to } = editor.state.selection
    savedFrom = from
    savedTo = to

    currentAction.value = actionType
    log.info(`[contextual-actions] executing "${actionType}"`, { textLength: selectedText.length })

    // Internal-link: bypass SSE pipeline, show article picker
    if (actionType === 'internal-link') {
      pendingLinkEditor = editor
      pendingSourceId = context.articleId ?? null
      showArticlePicker.value = true
      return
    }

    isExecuting.value = true
    streamedResult.value = ''
    actionError.value = null
    actionNotice.value = null

    await startStream('/api/generate/action', {
      actionType,
      selectedText,
      articleId: context.articleId,
      keyword: context.keyword,
      keywords: context.keywords,
    }, {
      onChunk: (accumulated) => {
        streamedResult.value = accumulated
      },
      onDone: (data) => {
        streamedResult.value = data.content
        const removed = data.removedLinks?.length ?? 0
        if (removed > 0) {
          actionNotice.value = removed === 1
            ? '1 lien absent de la recherche web a été retiré (son texte est gardé).'
            : `${removed} liens absents de la recherche web ont été retirés (leur texte est gardé).`
        }
        log.debug(`[contextual-actions] "${actionType}" done (${data.content.length} chars)`)
      },
      onError: (message) => {
        // Un texte partiel (réponse coupée…) ne doit pas pouvoir remplacer la sélection.
        streamedResult.value = ''
        actionError.value = message
        log.error(`[contextual-actions] "${actionType}" failed`, { error: message })
      },
    })

    isExecuting.value = false
  }

  /**
   * Pose le lien interne sur la sélection — le même que le panneau de maillage
   * (`#article-<id>`, résolu à l'export) — et l'enregistre dans la matrice
   * (`internal_links`). Avant C7, ce chemin posait `/<slug>` sans rien
   * enregistrer : la matrice et la publication ignoraient ces liens.
   */
  function applyInternalLink(article: Article) {
    if (!pendingLinkEditor) return
    log.debug(`[contextual-actions] applying internal link to article #${article.id}`)
    const doc = pendingLinkEditor.state.doc
    const anchorText = doc.textBetween(savedFrom, savedTo, ' ')
    const position = `char-${doc.textBetween(0, savedFrom, '').length}`

    pendingLinkEditor
      .chain()
      .focus()
      .setTextSelection({ from: savedFrom, to: savedTo })
      .setMark('internalLink', { targetId: article.id, href: `#article-${article.id}` })
      .run()
    if (pendingSourceId !== null && anchorText.trim()) {
      void useLinkingStore().saveLinks([{ sourceId: pendingSourceId, targetId: article.id, anchorText, position }])
    }
    cancelLink()
  }

  /** Close the article picker without applying a link */
  function cancelLink() {
    showArticlePicker.value = false
    pendingLinkEditor = null
    pendingSourceId = null
    resetState()
  }

  /** Replace the original selection with the streamed result */
  function acceptResult(editor: Editor) {
    if (!streamedResult.value) return
    editor
      .chain()
      .focus()
      .setTextSelection({ from: savedFrom, to: savedTo })
      .insertContent(streamedResult.value)
      .run()
    resetState()
  }

  /** Discard result without modifying the editor */
  function rejectResult() {
    resetState()
  }

  function resetState() {
    streamedResult.value = ''
    actionError.value = null
    actionNotice.value = null
    currentAction.value = null
    savedFrom = 0
    savedTo = 0
  }

  return {
    isExecuting,
    isStreaming,
    streamedResult,
    actionError,
    actionNotice,
    currentAction,
    showArticlePicker,
    executeAction,
    acceptResult,
    rejectResult,
    applyInternalLink,
    cancelLink,
    abort,
  }
}
