import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { NavGroup, NavItem } from '@/components/shared/WorkflowNav.vue'

/**
 * Global "workflow nav" bridge — lets the currently-active view (MoteurView,
 * CerveauView, ArticleWorkflowView) publish its navigation state, which the
 * AppNavbar then renders in its right slot.
 *
 * Why a store (not props/emits): AppNavbar lives at the app root and doesn't
 * know which view is mounted. A view that mounts calls `setWorkflowNav(...)`
 * and its `onBeforeUnmount` calls `clearWorkflowNav()`. The navbar simply
 * reads the store state.
 */

export interface WorkflowNavState {
  /** Which workflow is active — drives the icon / theme. */
  workflow: 'cerveau' | 'moteur' | 'redaction'
  /** Currently selected tab/step id. */
  activeId: string
  /** Emitted back to the publishing view when the user clicks another item. */
  onNavigate: (id: string) => void
  /** Provide ONE of: `groups` (Moteur) or `steps` (Cerveau, Rédaction). */
  groups?: NavGroup[]
  steps?: NavItem[]
}

export const useWorkflowNavStore = defineStore('workflow-nav', () => {
  const state = ref<WorkflowNavState | null>(null)

  function setWorkflowNav(next: WorkflowNavState) {
    state.value = next
  }

  function clearWorkflowNav() {
    state.value = null
  }

  /** Called by the navbar on user click; forwards to the view's handler. */
  function navigate(id: string) {
    state.value?.onNavigate(id)
  }

  return { state, setWorkflowNav, clearWorkflowNav, navigate }
})
