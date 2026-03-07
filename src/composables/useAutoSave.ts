import { useIntervalFn } from '@vueuse/core'
import { useEditorStore } from '@/stores/editor.store'

export function useAutoSave(slug: string, intervalMs = 30_000) {
  const editorStore = useEditorStore()

  const { pause, resume, isActive } = useIntervalFn(async () => {
    if (editorStore.isDirty && !editorStore.isSaving && !editorStore.isGenerating) {
      await editorStore.saveArticle(slug)
    }
  }, intervalMs)

  return { pause, resume, isActive }
}
