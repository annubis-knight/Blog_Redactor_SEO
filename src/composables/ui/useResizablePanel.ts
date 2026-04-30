import { ref, computed } from 'vue'
import { useLocalStorage, useEventListener } from '@vueuse/core'

const PANEL_MIN_WIDTH = 240
const PANEL_DEFAULT_WIDTH = 300
const STORAGE_KEY = 'blog-redactor:panel-width'

/**
 * Composable de redimensionnement du side-panel Capitaine.
 *
 * 2026-04-30 — Plus de borne `PANEL_MAX_WIDTH` (demande UX) :
 * le panel est `position: fixed` (flottant), donc l'utilisateur peut l'étirer
 * autant qu'il veut sans perturber le container de radar list. Seul le floor
 * minimum est conservé (240px) pour garder le panel ergonomique.
 */
export function useResizablePanel() {
  const storedWidth = useLocalStorage(STORAGE_KEY, PANEL_DEFAULT_WIDTH)
  const isResizing = ref(false)
  const startX = ref(0)
  const startWidth = ref(0)

  // Pas de borne haute : on respecte juste le floor minimum.
  const panelWidth = computed(() => Math.max(PANEL_MIN_WIDTH, storedWidth.value))

  function onPointerDown(e: PointerEvent) {
    isResizing.value = true
    startX.value = e.clientX
    startWidth.value = panelWidth.value
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  function onPointerMove(e: PointerEvent) {
    if (!isResizing.value) return
    // Panel à droite → drag vers la gauche = élargissement.
    const delta = startX.value - e.clientX
    storedWidth.value = Math.max(PANEL_MIN_WIDTH, startWidth.value + delta)
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
  }
}
