import { useIntervalFn } from '@vueuse/core'
import { useEditorStore } from '@/stores/editor.store'
import { log } from '@/utils/logger'

export function useAutoSave(slug: string, intervalMs = 30_000) {
  const editorStore = useEditorStore()
  log.debug(`[auto-save] initialized for "${slug}" (interval=${intervalMs}ms)`)

  const { pause, resume, isActive } = useIntervalFn(async () => {
    if (editorStore.isDirty && !editorStore.isSaving && !editorStore.isGenerating) {
      log.debug(`[auto-save] saving "${slug}"`)
      await editorStore.saveArticle(slug)
    }
  }, intervalMs)

  return { pause, resume, isActive }
}
