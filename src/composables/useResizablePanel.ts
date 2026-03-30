import { ref, computed } from 'vue'
import { useLocalStorage, useEventListener } from '@vueuse/core'

const PANEL_MIN_WIDTH = 240
const PANEL_MAX_WIDTH = 480
const PANEL_DEFAULT_WIDTH = 300
const STORAGE_KEY = 'blog-redactor:panel-width'

export function useResizablePanel() {
  const storedWidth = useLocalStorage(STORAGE_KEY, PANEL_DEFAULT_WIDTH)
  const isResizing = ref(false)
  const startX = ref(0)
  const startWidth = ref(0)

  const panelWidth = computed(() =>
    Math.max(PANEL_MIN_WIDTH, Math.min(PANEL_MAX_WIDTH, storedWidth.value)),
  )

  function onPointerDown(e: PointerEvent) {
    isResizing.value = true
    startX.value = e.clientX
    startWidth.value = panelWidth.value
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  function onPointerMove(e: PointerEvent) {
    if (!isResizing.value) return
    // Panel is on the right → dragging left = wider panel
    const delta = startX.value - e.clientX
    storedWidth.value = Math.max(PANEL_MIN_WIDTH, Math.min(PANEL_MAX_WIDTH, startWidth.value + delta))
  }

  function onPointerUp() {
    if (!isResizing.value) return
    isResizing.value = false
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }

  useEventListener(document, 'pointermove', onPointerMove)
  useEventListener(document, 'pointerup', onPointerUp)

  return {
    panelWidth,
    isResizing,
    onPointerDown,
    PANEL_MIN_WIDTH,
    PANEL_MAX_WIDTH,
  }
}
