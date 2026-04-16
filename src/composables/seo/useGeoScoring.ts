import { watch } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { useEditorStore } from '@/stores/article/editor.store'
import { useGeoStore } from '@/stores/article/geo.store'
import { log } from '@/utils/logger'

/**
 * Composable that watches editor content and recalculates GEO score
 * with a 300ms debounce (NFR3).
 */
export function useGeoScoring() {
  const editorStore = useEditorStore()
  const geoStore = useGeoStore()

  const debouncedRecalculate = useDebounceFn(() => {
    const content = editorStore.content
    if (!content) {
      geoStore.reset()
      return
    }
    log.debug('[geo-scoring] recalculating', { contentLength: content.length })
    geoStore.recalculate(content)
  }, 300)

  watch(
    () => editorStore.content,
    () => { debouncedRecalculate() },
  )

  return { geoStore }
}
