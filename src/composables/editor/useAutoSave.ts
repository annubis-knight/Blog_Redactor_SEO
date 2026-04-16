import { useIntervalFn } from '@vueuse/core'
import { useEditorStore } from '@/stores/editor.store'
import { log } from '@/utils/logger'

export function useAutoSave(articleId: number, intervalMs = 30_000) {
  const editorStore = useEditorStore()
  log.debug(`[auto-save] initialized for article #${articleId} (interval=${intervalMs}ms)`)

  const { pause, resume, isActive } = useIntervalFn(async () => {
    // Guard: never auto-save during pipeline operations (G2)
    if (editorStore.isReducing || editorStore.isHumanizing) return
    if (editorStore.isDirty && !editorStore.isSaving && !editorStore.isGenerating) {
      log.debug(`[auto-save] saving article #${articleId}`)
      await editorStore.saveArticle(articleId)
    }
  }, intervalMs)

  return { pause, resume, isActive }
}
