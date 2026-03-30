import { ref, computed } from 'vue'

export type PanelId = 'seo' | 'geo' | 'linking' | null

export function usePanelToggle(defaultPanel: PanelId = 'seo') {
  const activePanel = ref<PanelId>(defaultPanel)

  function toggle(panel: PanelId) {
    activePanel.value = activePanel.value === panel ? null : panel
  }

  const showSeoPanel = computed(() => activePanel.value === 'seo')
  const showGeoPanel = computed(() => activePanel.value === 'geo')
  const showLinkSuggestions = computed(() => activePanel.value === 'linking')
  const hasActivePanel = computed(() => activePanel.value !== null)

  return {
    activePanel,
    toggle,
    showSeoPanel,
    showGeoPanel,
    showLinkSuggestions,
    hasActivePanel,
  }
}
