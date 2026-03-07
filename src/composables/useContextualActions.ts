import { ref, getCurrentInstance, onUnmounted } from 'vue'
import type { Editor } from '@tiptap/core'
import { useStreaming } from '@/composables/useStreaming'
import type { ActionType, ActionContext } from '@shared/types/index.js'

export function useContextualActions() {
  const { isStreaming, startStream, abort } = useStreaming<{ content: string }>()

  // Abort streaming on unmount (only when called inside a component)
  if (getCurrentInstance()) {
    onUnmounted(() => abort())
  }

  const isExecuting = ref(false)
  const streamedResult = ref('')
  const actionError = ref<string | null>(null)
  const currentAction = ref<ActionType | null>(null)

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

    isExecuting.value = true
    streamedResult.value = ''
    actionError.value = null
    currentAction.value = actionType

    await startStream('/api/generate/action', {
      actionType,
      selectedText,
      articleSlug: context.articleSlug,
      keyword: context.keyword,
      keywords: context.keywords,
    }, {
      onChunk: (accumulated) => {
        streamedResult.value = accumulated
      },
      onDone: (data) => {
        streamedResult.value = data.content
      },
      onError: (message) => {
        actionError.value = message
      },
    })

    isExecuting.value = false
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
    currentAction.value = null
    savedFrom = 0
    savedTo = 0
  }

  return {
    isExecuting,
    isStreaming,
    streamedResult,
    actionError,
    currentAction,
    executeAction,
    acceptResult,
    rejectResult,
    abort,
  }
}
